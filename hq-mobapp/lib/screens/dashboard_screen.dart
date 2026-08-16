import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../services/clinic_service.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/appointment_models.dart' as apt;
import '../models/queue_models.dart';

// ── Scored clinic for Smart Recommender ──────────────────────────────────────
class _ScoredClinic {
  final Clinic clinic;
  final double distKm;
  final int    travelMins;
  final double score; // lower = better

  const _ScoredClinic({
    required this.clinic,
    required this.distKm,
    required this.travelMins,
    required this.score,
  });
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // ── Map ───────────────────────────────────────────────────────────────────
  final Completer<GoogleMapController> _mapCtrl = Completer();
  static const LatLng _metroManila = LatLng(14.5995, 120.9842);
  LatLng?      _userPos;
  Clinic?      _selectedClinic;
  Set<Marker>  _markers = {};

  // ── Data ──────────────────────────────────────────────────────────────────
  List<Clinic>         _clinics        = [];
  List<_ScoredClinic>  _recommended    = [];
  bool                 _clinicsLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAll();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<AppState>().fetchQueueStatus();
      context.read<AppState>().fetchAppointments();
    });
  }

  Future<void> _loadAll() async {
    await Future.wait([_loadClinics(), _locateUser()]);
    _computeRecommendations();
  }

  Future<void> _loadClinics() async {
    try {
      final list = await ClinicService.getDirectory();
      if (mounted) {
        setState(() { _clinics = list; _clinicsLoading = false; });
        _rebuildMarkers();
      }
    } catch (_) {
      if (mounted) setState(() => _clinicsLoading = false);
    }
  }

  Future<void> _locateUser() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied)
        perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 10));
      if (mounted) {
        setState(() => _userPos = LatLng(pos.latitude, pos.longitude));
        if (_mapCtrl.isCompleted) {
          final c = await _mapCtrl.future;
          c.animateCamera(CameraUpdate.newLatLng(_userPos!));
        }
      }
    } catch (_) {}
  }

  // ── Smart Recommender scoring ─────────────────────────────────────────────
  // Score = waitMinutes * 0.6 + distanceKm * 4
  // Lower score = better recommendation
  void _computeRecommendations() {
    if (_clinics.isEmpty) return;
    final user = _userPos;
    final scored = _clinics.map((c) {
      final dist  = (user != null && c.hasLocation)
          ? _distKm(user, LatLng(c.latitude!, c.longitude!))
          : 99.0;
      final travel = (dist * 1.4 / 25 * 60).round(); // 25 km/h Metro Manila
      final score  = c.waitMinutes * 0.6 + dist * 4.0;
      return _ScoredClinic(
          clinic: c, distKm: dist, travelMins: travel, score: score);
    }).toList()
      ..sort((a, b) => a.score.compareTo(b.score));

    if (mounted) setState(() => _recommended = scored.take(3).toList());
  }

  void _rebuildMarkers() {
    final markers = <Marker>{};
    for (final c in _clinics) {
      if (!c.hasLocation) continue;
      final isSel = _selectedClinic?.id == c.id;
      markers.add(Marker(
        markerId: MarkerId(c.id),
        position: LatLng(c.latitude!, c.longitude!),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          isSel ? BitmapDescriptor.hueAzure : BitmapDescriptor.hueRed,
        ),
        infoWindow: InfoWindow(title: c.name, snippet: c.address),
        onTap: () async {
          setState(() => _selectedClinic = _selectedClinic?.id == c.id ? null : c);
          _rebuildMarkers();
          if (_selectedClinic != null && _mapCtrl.isCompleted) {
            final ctrl = await _mapCtrl.future;
            ctrl.animateCamera(CameraUpdate.newLatLngZoom(
                LatLng(c.latitude!, c.longitude!), 15));
          }
        },
      ));
    }
    if (mounted) setState(() => _markers = markers);
  }

  // ── Distance helpers ──────────────────────────────────────────────────────
  double _distKm(LatLng a, LatLng b) {
    const r = 6371.0;
    final dLat = _rad(b.latitude  - a.latitude);
    final dLon = _rad(b.longitude - a.longitude);
    final x = math.sin(dLat/2)*math.sin(dLat/2) +
        math.cos(_rad(a.latitude))*math.cos(_rad(b.latitude))*
        math.sin(dLon/2)*math.sin(dLon/2);
    return r * 2 * math.atan2(math.sqrt(x), math.sqrt(1-x));
  }
  double _rad(double d) => d * math.pi / 180;

  // ── Navigation ────────────────────────────────────────────────────────────
  Future<Clinic?> _pickClinic() async {
    if (_clinics.isEmpty) return null;
    return showModalBottomSheet<Clinic>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _ClinicPickerSheet(clinics: _clinics),
    );
  }

  Future<void> _goToBook({Clinic? clinic}) async {
    final target = clinic ?? await _pickClinic();
    if (target == null || !mounted) return;
    final result = await Navigator.pushNamed(
        context, AppRoutes.bookAppointment, arguments: target);
    if (!mounted) return;
    if (result is apt.Appointment) {
      context.read<AppState>().addAppointment(result);
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment booked!')));
    }
  }

  Future<void> _goToQueue({Clinic? clinic}) async {
    final result = await Navigator.pushNamed(
        context, AppRoutes.joinQueue, arguments: clinic);
    if (!mounted) return;
    if (result is QueueJoinResult)
      context.read<AppState>().addQueueFromJoinResult(result);
    context.read<AppState>().fetchQueueStatus();
  }

  apt.Appointment? _nearestAppt(List<apt.Appointment> list) {
    if (list.isEmpty) return null;
    TimeOfDay parseTod(String lbl) {
      final s = lbl.trim().toUpperCase().split(RegExp(r'\s+'));
      final hm = s.first.split(':');
      int h = int.tryParse(hm[0]) ?? 0;
      final m = int.tryParse(hm.length > 1 ? hm[1] : '0') ?? 0;
      if (s.length > 1 && s[1] == 'PM' && h != 12) h += 12;
      if (s.length > 1 && s[1] == 'AM' && h == 12) h = 0;
      return TimeOfDay(hour: h, minute: m);
    }
    DateTime toDt(apt.Appointment a) {
      final t = parseTod(a.timeLabel);
      return DateTime(a.date.year, a.date.month, a.date.day, t.hour, t.minute);
    }
    return ([...list]..sort((a, b) => toDt(a).compareTo(toDt(b)))).first;
  }

  @override
  Widget build(BuildContext context) {
    final state    = context.watch<AppState>();
    final user     = state.currentUser;
    final queues   = state.activeQueues;
    final appts    = state.upcomingAppointments;
    final nextAppt = _nearestAppt(appts);
    final hasStatus= queues.isNotEmpty || appts.isNotEmpty;
    final moreCnt  = appts.length > 1 ? appts.length - 1 : 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: Column(children: [

          // ── Header ──────────────────────────────────────────────────────
          _Header(
            userName: user?.fullName.split(' ').first ?? 'Patient',
            subtitle: hasStatus ? "Here's your latest updates." : "How can we help you today?",
            onProfileTap: () => Navigator.pushNamed(context, AppRoutes.profile),
          ),

          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  state.fetchQueueStatus(),
                  state.fetchAppointments(),
                  _loadAll(),
                ]);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [

                    // ── Quick Actions (2-button row only) ──────────────────
                    Row(children: [
                      Expanded(child: _QuickAction(
                        filled: true,
                        icon: Icons.calendar_month_outlined,
                        title: 'Book Appointment',
                        onTap: _goToBook,
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: _QuickAction(
                        filled: false,
                        icon: Icons.confirmation_number_outlined,
                        title: 'Get Queue Number',
                        onTap: _goToQueue,
                      )),
                    ]),

                    const SizedBox(height: 22),

                    // ── Current Status ─────────────────────────────────────
                    const Text('Current Status',
                        style: TextStyle(fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark)),
                    const SizedBox(height: 10),

                    if (!hasStatus)
                      _EmptyStatus(onBook: _goToBook, onQueue: _goToQueue)
                    else ...[
                      ...queues.map((q) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _QueueCard(entry: q),
                      )),
                      if (nextAppt != null) _AppointmentCard(appt: nextAppt),
                      if (moreCnt > 0) ...[
                        const SizedBox(height: 10),
                        _MoreApptsBar(
                          count: moreCnt,
                          onTap: () => Navigator.pushNamed(context, AppRoutes.appointments),
                        ),
                      ],
                    ],

                    const SizedBox(height: 22),

                    // ── Nearby Clinics Map ──────────────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Nearby Clinics',
                            style: TextStyle(fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textDark)),
                        TextButton.icon(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.clinicMap),
                          icon: const Icon(Icons.open_in_full_rounded, size: 15),
                          label: const Text('Full map'),
                          style: TextButton.styleFrom(foregroundColor: AppColors.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // ── Embedded Google Map ─────────────────────────────────
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(
                        height: 240,
                        child: Stack(children: [
                          GoogleMap(
                            initialCameraPosition: CameraPosition(
                              target: _userPos ?? _metroManila,
                              zoom: 13,
                            ),
                            onMapCreated: (c) {
                              if (!_mapCtrl.isCompleted) _mapCtrl.complete(c);
                            },
                            myLocationEnabled: true,
                            myLocationButtonEnabled: false,
                            zoomControlsEnabled: false,
                            markers: _markers,
                            onTap: (_) {
                              setState(() => _selectedClinic = null);
                              _rebuildMarkers();
                            },
                          ),
                          if (_clinicsLoading)
                            const Positioned.fill(
                              child: ColoredBox(
                                color: Color(0x88FFFFFF),
                                child: Center(child: CircularProgressIndicator()),
                              ),
                            ),
                          Positioned(
                            top: 10, left: 10,
                            child: _MapBadge(
                                count: _clinics.where((c) => c.hasLocation).length),
                          ),
                          Positioned(
                            bottom: 10, right: 10,
                            child: Column(mainAxisSize: MainAxisSize.min, children: [
                              _MapBtn(icon: Icons.add, onTap: () async {
                                if (!_mapCtrl.isCompleted) return;
                                final c = await _mapCtrl.future;
                                final z = await c.getZoomLevel();
                                c.animateCamera(CameraUpdate.zoomTo(z + 1));
                              }),
                              const SizedBox(height: 4),
                              _MapBtn(icon: Icons.remove, onTap: () async {
                                if (!_mapCtrl.isCompleted) return;
                                final c = await _mapCtrl.future;
                                final z = await c.getZoomLevel();
                                c.animateCamera(CameraUpdate.zoomTo(z - 1));
                              }),
                              const SizedBox(height: 4),
                              _MapBtn(icon: Icons.my_location_rounded, onTap: _locateUser),
                            ]),
                          ),
                        ]),
                      ),
                    ),

                    // ── Selected clinic popup ───────────────────────────────
                    if (_selectedClinic != null) ...[
                      const SizedBox(height: 10),
                      _SelectedClinicCard(
                        clinic: _selectedClinic!,
                        distLabel: _userPos != null && _selectedClinic!.hasLocation
                            ? '${_distKm(_userPos!, LatLng(_selectedClinic!.latitude!, _selectedClinic!.longitude!)).toStringAsFixed(1)} km away'
                            : null,
                        onBook:  () => _goToBook(clinic: _selectedClinic!),
                        onJoin:  () => _goToQueue(clinic: _selectedClinic!),
                        onClose: () {
                          setState(() => _selectedClinic = null);
                          _rebuildMarkers();
                        },
                      ),
                    ],

                    const SizedBox(height: 22),

                    // ── Smart Clinic Recommender ────────────────────────────
                    Row(children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF2563EB)]),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded,
                            color: Colors.white, size: 15),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Recommended Clinics',
                              style: TextStyle(fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textDark)),
                          Text('Ranked by wait time, distance & travel time',
                              style: TextStyle(fontSize: 11,
                                  color: AppColors.textMuted)),
                        ],
                      )),
                    ]),
                    const SizedBox(height: 10),

                    if (_clinicsLoading)
                      const Center(child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: CircularProgressIndicator(),
                      ))
                    else if (_recommended.isEmpty)
                      const _EmptyCard(message: 'No clinic data available.')
                    else
                      ..._recommended.asMap().entries.map((e) {
                        final rank = e.key;
                        final sc   = e.value;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _RecommendedClinicCard(
                            rank:       rank + 1,
                            scored:     sc,
                            onBook:     () => _goToBook(clinic: sc.clinic),
                            onJoin:     () => _goToQueue(clinic: sc.clinic),
                          ),
                        );
                      }),

                  ],
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Recommender Card
// ─────────────────────────────────────────────────────────────────────────────

class _RecommendedClinicCard extends StatelessWidget {
  final int              rank;
  final _ScoredClinic    scored;
  final VoidCallback     onBook, onJoin;

  const _RecommendedClinicCard({
    required this.rank,   required this.scored,
    required this.onBook, required this.onJoin,
  });

  Color get _rankColor {
    if (rank == 1) return const Color(0xFF16A34A); // green — best
    if (rank == 2) return const Color(0xFF2563EB); // blue
    return const Color(0xFF7C3AED);                // purple
  }

  String get _rankLabel {
    if (rank == 1) return 'Best Pick';
    if (rank == 2) return '2nd';
    return '3rd';
  }

  @override
  Widget build(BuildContext context) {
    final c    = scored.clinic;
    final dist = scored.distKm < 99 ? scored.distKm : null;
    final wait = c.waitMinutes;

    // Wait time color
    final waitColor = wait == 0
        ? const Color(0xFF16A34A)
        : wait <= 20
            ? const Color(0xFF16A34A)
            : wait <= 40
                ? const Color(0xFFD97706)
                : const Color(0xFFDC2626);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: rank == 1
            ? Border.all(color: const Color(0xFF16A34A).withOpacity(0.5), width: 1.5)
            : null,
        boxShadow: [BoxShadow(
            color: Colors.black.withOpacity(rank == 1 ? 0.08 : 0.04),
            blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Rank badge
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: _rankColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(_rankLabel,
                style: TextStyle(fontSize: 10,
                    fontWeight: FontWeight.w800, color: _rankColor))),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c.name,
                style: const TextStyle(fontWeight: FontWeight.w800,
                    fontSize: 14, color: AppColors.textDark),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(c.address,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textMuted),
                maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
        ]),

        const SizedBox(height: 10),

        // Metrics row
        Row(children: [
          // Wait time
          _MetricChip(
            icon: Icons.schedule_rounded,
            label: wait == 0 ? 'No wait' : '~$wait min wait',
            color: waitColor,
          ),
          const SizedBox(width: 8),
          // Distance
          if (dist != null) ...[
            _MetricChip(
              icon: Icons.place_outlined,
              label: '${dist.toStringAsFixed(1)} km',
              color: AppColors.textMuted,
            ),
            const SizedBox(width: 8),
            // Travel time
            _MetricChip(
              icon: Icons.directions_car_outlined,
              label: '~${scored.travelMins} min drive',
              color: AppColors.textMuted,
            ),
          ],
          if (c.queueCount > 0) ...[
            const SizedBox(width: 8),
            _MetricChip(
              icon: Icons.people_outline,
              label: '${c.queueCount} in queue',
              color: AppColors.textMuted,
            ),
          ],
        ]),

        const SizedBox(height: 10),

        Row(children: [
          Expanded(child: _ActionBtn(
              label: 'Get Queue', color: AppColors.primary, onTap: onJoin)),
          const SizedBox(width: 8),
          Expanded(child: _ActionBtn(
              label: 'Book', color: const Color(0xFF2563EB), onTap: onBook)),
        ]),
      ]),
    );
  }
}

class _MetricChip extends StatelessWidget {
  final IconData icon; final String label; final Color color;
  const _MetricChip({required this.icon, required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 12, color: color),
    const SizedBox(width: 3),
    Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared map helpers
// ─────────────────────────────────────────────────────────────────────────────

class _MapBadge extends StatelessWidget {
  final int count;
  const _MapBadge({required this.count});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(20),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 6)],
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.local_hospital_outlined, color: AppColors.primary, size: 14),
      const SizedBox(width: 5),
      Text('$count clinics', style: const TextStyle(
          fontWeight: FontWeight.w700, fontSize: 11, color: AppColors.textDark)),
    ]),
  );
}

class _MapBtn extends StatelessWidget {
  final IconData icon; final VoidCallback onTap;
  const _MapBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 34, height: 34,
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(8),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 4)],
      ),
      child: Icon(icon, size: 18, color: AppColors.textDark),
    ),
  );
}

class _SelectedClinicCard extends StatelessWidget {
  final Clinic clinic; final String? distLabel;
  final VoidCallback onBook, onJoin, onClose;
  const _SelectedClinicCard({required this.clinic, required this.onBook,
      required this.onJoin, required this.onClose, this.distLabel});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5),
      boxShadow: [BoxShadow(
          color: AppColors.primary.withOpacity(0.08), blurRadius: 8)],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.local_hospital_outlined,
              color: AppColors.primary, size: 22),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(clinic.name, style: const TextStyle(fontWeight: FontWeight.w800,
              fontSize: 14, color: AppColors.textDark),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          if (distLabel != null)
            Text(distLabel!, style: const TextStyle(
                fontSize: 11, color: AppColors.textMuted)),
        ])),
        GestureDetector(onTap: onClose,
            child: const Icon(Icons.close_rounded,
                color: AppColors.textMuted, size: 20)),
      ]),
      if (clinic.queueCount > 0) ...[
        const SizedBox(height: 8),
        Text('${clinic.queueCount} in queue  •  ~${clinic.waitMinutes} min wait',
            style: const TextStyle(fontSize: 11,
                color: AppColors.primary, fontWeight: FontWeight.w600)),
      ],
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _ActionBtn(
            label: 'Get Queue', color: AppColors.primary, onTap: onJoin)),
        const SizedBox(width: 8),
        Expanded(child: _ActionBtn(
            label: 'Book', color: const Color(0xFF2563EB), onTap: onBook)),
      ]),
    ]),
  );
}

class _ActionBtn extends StatelessWidget {
  final String label; final Color color; final VoidCallback onTap;
  const _ActionBtn({required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
          color: color, borderRadius: BorderRadius.circular(10)),
      child: Center(child: Text(label, style: const TextStyle(
          color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12))),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen-level widgets
// ─────────────────────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final String userName, subtitle;
  final VoidCallback onProfileTap;
  const _Header({required this.userName, required this.subtitle, required this.onProfileTap});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [AppColors.bgTop, AppColors.bgBottom],
        begin: Alignment.topLeft, end: Alignment.bottomRight,
      ),
    ),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Hello, $userName 👋', style: const TextStyle(
            fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
        const SizedBox(height: 2),
        Text(subtitle, style: const TextStyle(
            fontSize: 13, color: Colors.white70, fontWeight: FontWeight.w400)),
      ])),
      GestureDetector(
        onTap: onProfileTap,
        child: Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
          child: const Icon(Icons.person_outline_rounded,
              color: Colors.white, size: 22),
        ),
      ),
    ]),
  );
}

class _QuickAction extends StatelessWidget {
  final bool filled; final IconData icon;
  final String title; final dynamic onTap;
  const _QuickAction({required this.filled, required this.icon,
      required this.title, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => onTap(),
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: filled ? AppColors.primary : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(
            color: filled
                ? AppColors.primary.withOpacity(0.25)
                : Colors.black.withOpacity(0.06),
            blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(children: [
        Icon(icon, color: filled ? Colors.white : AppColors.primary, size: 22),
        const SizedBox(width: 10),
        Flexible(child: Text(title, style: TextStyle(
            fontWeight: FontWeight.w700, fontSize: 13,
            color: filled ? Colors.white : AppColors.textDark))),
      ]),
    ),
  );
}

class _EmptyStatus extends StatelessWidget {
  final dynamic onBook, onQueue;
  const _EmptyStatus({required this.onBook, required this.onQueue});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
    ),
    child: Column(children: [
      const Icon(Icons.inbox_outlined, color: AppColors.textMuted, size: 40),
      const SizedBox(height: 10),
      const Text('No active queue or upcoming appointments.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
      const SizedBox(height: 14),
      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        OutlinedButton(onPressed: () => onQueue(), child: const Text('Join Queue')),
        const SizedBox(width: 10),
        ElevatedButton(onPressed: () => onBook(), child: const Text('Book Now')),
      ]),
    ]),
  );
}

class _QueueCard extends StatelessWidget {
  final dynamic entry;
  const _QueueCard({required this.entry});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6)],
    ),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.confirmation_number_outlined,
            color: AppColors.primary, size: 22),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(entry.clinicName ?? 'Queue',
            style: const TextStyle(fontWeight: FontWeight.w700,
                fontSize: 14, color: AppColors.textDark),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        Text('Queue #${entry.queueNumber ?? '--'}  •  ${entry.status ?? 'Active'}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      ])),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20)),
        child: const Text('Active', style: TextStyle(
            fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w700)),
      ),
    ]),
  );
}

class _AppointmentCard extends StatelessWidget {
  final apt.Appointment appt;
  const _AppointmentCard({required this.appt});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(14),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6)],
    ),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.calendar_month_outlined,
            color: Color(0xFF2563EB), size: 22),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(appt.clinicName, style: const TextStyle(fontWeight: FontWeight.w700,
            fontSize: 14, color: AppColors.textDark),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        Text('${appt.serviceName}  •  ${appt.timeLabel}',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      ])),
    ]),
  );
}

class _MoreApptsBar extends StatelessWidget {
  final int count; final VoidCallback onTap;
  const _MoreApptsBar({required this.count, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border)),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('+$count more appointment${count > 1 ? "s" : ""}',
            style: const TextStyle(fontWeight: FontWeight.w600,
                fontSize: 13, color: AppColors.primary)),
        const SizedBox(width: 4),
        const Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 18),
      ]),
    ),
  );
}

class _EmptyCard extends StatelessWidget {
  final String message;
  const _EmptyCard({required this.message});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14)),
    child: Center(child: Text(message,
        style: const TextStyle(color: AppColors.textMuted, fontSize: 13))),
  );
}

class _ClinicPickerSheet extends StatelessWidget {
  final List<Clinic> clinics;
  const _ClinicPickerSheet({required this.clinics});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
    decoration: const BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 40, height: 4,
          decoration: BoxDecoration(color: AppColors.border,
              borderRadius: BorderRadius.circular(2))),
      const SizedBox(height: 14),
      const Text('Select a Clinic', style: TextStyle(
          fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textDark)),
      const SizedBox(height: 12),
      ...clinics.map((c) => ListTile(
            leading: const Icon(Icons.local_hospital_outlined, color: AppColors.primary),
            title:    Text(c.name),
            subtitle: Text(c.address, maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => Navigator.pop(context, c),
          )),
    ]),
  );
}
