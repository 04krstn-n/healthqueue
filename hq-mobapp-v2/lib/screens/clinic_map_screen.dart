import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../core/constants/app_colors.dart';
import '../services/clinic_service.dart';

class ClinicMapScreen extends StatefulWidget {
  const ClinicMapScreen({super.key});
  @override
  State<ClinicMapScreen> createState() => _ClinicMapScreenState();
}

class _ClinicMapScreenState extends State<ClinicMapScreen> {
  final Completer<GoogleMapController> _ctrl = Completer();

  List<Clinic> _clinics  = [];
  bool         _loading  = true;
  LatLng?      _userPos;
  Clinic?      _selected;
  Set<Marker>  _markers  = {};
  MapType      _mapType  = MapType.normal;

  static const LatLng _defaultCenter = LatLng(14.5995, 120.9842);

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await Future.wait([_loadClinics(), _locateUser()]);
    _rebuildMarkers();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadClinics() async {
    try {
      final list = await ClinicService.getDirectory();
      if (mounted) setState(() => _clinics = list);
    } catch (_) {}
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
      if (mounted) setState(() => _userPos = LatLng(pos.latitude, pos.longitude));
    } catch (_) {}
  }

  void _rebuildMarkers() {
    final markers = <Marker>{};
    for (final c in _clinics) {
      if (!c.hasLocation) continue;
      final pos   = LatLng(c.latitude!, c.longitude!);
      final isSel = _selected?.id == c.id;
      markers.add(Marker(
        markerId: MarkerId(c.id),
        position: pos,
        icon: BitmapDescriptor.defaultMarkerWithHue(
          isSel ? BitmapDescriptor.hueAzure : BitmapDescriptor.hueRed,
        ),
        infoWindow: InfoWindow(title: c.name, snippet: c.address),
        onTap: () => _selectClinic(c),
      ));
    }
    if (mounted) setState(() => _markers = markers);
  }

  Future<void> _selectClinic(Clinic c) async {
    final isSame = _selected?.id == c.id;
    setState(() => _selected = isSame ? null : c);
    _rebuildMarkers();
    if (!isSame && _ctrl.isCompleted) {
      final ctrl = await _ctrl.future;
      ctrl.animateCamera(CameraUpdate.newLatLngZoom(
          LatLng(c.latitude!, c.longitude!), 15));
    }
  }

  Future<void> _centerOnUser() async {
    if (_userPos == null || !_ctrl.isCompleted) return;
    final ctrl = await _ctrl.future;
    ctrl.animateCamera(CameraUpdate.newLatLngZoom(_userPos!, 14));
  }

  double _distKm(LatLng a, LatLng b) {
    const r = 6371.0;
    final dLat = _rad(b.latitude  - a.latitude);
    final dLon = _rad(b.longitude - a.longitude);
    final x = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_rad(a.latitude)) * math.cos(_rad(b.latitude)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    return r * 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x));
  }

  double _rad(double d) => d * math.pi / 180;

  String _travelLabel(double km) {
    final mins = (km * 1.4 / 25 * 60).round();
    if (mins < 60) return '~$mins min';
    return '~${mins ~/ 60}h ${mins % 60}min';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Find Clinics',
            style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          // Street / Satellite toggle
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton.icon(
              onPressed: () => setState(() => _mapType =
                  _mapType == MapType.normal ? MapType.satellite : MapType.normal),
              icon: Icon(
                _mapType == MapType.normal
                    ? Icons.satellite_alt_outlined
                    : Icons.map_outlined,
                size: 16, color: AppColors.primary,
              ),
              label: Text(
                _mapType == MapType.normal ? 'Satellite' : 'Street',
                style: const TextStyle(fontSize: 12,
                    fontWeight: FontWeight.w600, color: AppColors.primary),
              ),
            ),
          ),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: Stack(children: [

        // ── Google Map ────────────────────────────────────────────────────
        GoogleMap(
          mapType: _mapType,
          initialCameraPosition: CameraPosition(
            target: _userPos ?? _defaultCenter,
            zoom: 13,
          ),
          onMapCreated: (c) { if (!_ctrl.isCompleted) _ctrl.complete(c); },
          myLocationEnabled: true,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          markers: _markers,
          onTap: (_) {
            setState(() => _selected = null);
            _rebuildMarkers();
          },
        ),

        // ── Loading overlay ───────────────────────────────────────────────
        if (_loading)
          const Positioned.fill(
            child: ColoredBox(
              color: Colors.white70,
              child: Center(child: CircularProgressIndicator()),
            ),
          ),

        // ── Clinic count badge ────────────────────────────────────────────
        Positioned(
          top: 12, left: 16,
          child: _Badge(
            icon: Icons.local_hospital_outlined,
            label: '${_clinics.where((c) => c.hasLocation).length} clinics on map',
          ),
        ),

        // ── Selected clinic card ──────────────────────────────────────────
        if (_selected != null)
          Positioned(
            bottom: 24, left: 16, right: 16,
            child: _ClinicCard(
              clinic:      _selected!,
              distLabel:   _userPos != null && _selected!.hasLocation
                  ? '${_distKm(_userPos!, LatLng(_selected!.latitude!, _selected!.longitude!)).toStringAsFixed(1)} km  •  '
                    '${_travelLabel(_distKm(_userPos!, LatLng(_selected!.latitude!, _selected!.longitude!)))}'
                  : null,
              onBook:  () => Navigator.pushNamed(
                  context, '/book-appointment', arguments: _selected),
              onJoin:  () => Navigator.pushNamed(
                  context, '/join-queue',        arguments: _selected),
              onClose: () {
                setState(() => _selected = null);
                _rebuildMarkers();
              },
            ),
          ),

        // ── Locate-me FAB ─────────────────────────────────────────────────
        Positioned(
          bottom: _selected != null ? 220 : 24,
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'locate',
            backgroundColor: Colors.white,
            foregroundColor: AppColors.primary,
            elevation: 4,
            onPressed: _centerOnUser,
            child: const Icon(Icons.my_location_rounded),
          ),
        ),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable widgets
// ─────────────────────────────────────────────────────────────────────────────

class _Badge extends StatelessWidget {
  final IconData icon;
  final String   label;
  const _Badge({required this.icon, required this.label});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [const BoxShadow(color: Colors.black12, blurRadius: 6)],
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: AppColors.primary, size: 14),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(
          fontWeight: FontWeight.w700, fontSize: 11,
          color: AppColors.textDark)),
    ]),
  );
}

class _ClinicCard extends StatelessWidget {
  final Clinic    clinic;
  final String?   distLabel;
  final VoidCallback onBook, onJoin, onClose;
  const _ClinicCard({
    required this.clinic,  required this.onBook,
    required this.onJoin,  required this.onClose,
    this.distLabel,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [BoxShadow(
          color: Colors.black.withOpacity(0.14),
          blurRadius: 18, offset: const Offset(0, 6))],
    ),
    child: Column(mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start, children: [

      // Header row
      Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12)),
          child: const Icon(Icons.local_hospital_outlined,
              color: AppColors.primary, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(clinic.name,
              style: const TextStyle(fontWeight: FontWeight.w800,
                  fontSize: 14, color: AppColors.textDark),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(clinic.address,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              maxLines: 1, overflow: TextOverflow.ellipsis),
        ])),
        GestureDetector(
          onTap: onClose,
          child: const Icon(Icons.close_rounded,
              color: AppColors.textMuted, size: 20),
        ),
      ]),

      // Queue info
      if (clinic.queueCount > 0) ...[
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.people_outline, size: 13, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Text('${clinic.queueCount} in queue  •  ~${clinic.waitMinutes} min wait',
              style: const TextStyle(fontSize: 11,
                  color: AppColors.primary, fontWeight: FontWeight.w600)),
        ]),
      ],

      // Distance / travel time
      if (distLabel != null) ...[
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.directions_car_outlined,
              size: 13, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Text(distLabel!,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        ]),
      ],

      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _Btn(
            label: 'Get Queue Number',
            color: AppColors.primary, onTap: onJoin)),
        const SizedBox(width: 8),
        Expanded(child: _Btn(
            label: 'Book Appointment',
            color: const Color(0xFF2563EB), onTap: onBook)),
      ]),
    ]),
  );
}

class _Btn extends StatelessWidget {
  final String label; final Color color; final VoidCallback onTap;
  const _Btn({required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
          color: color, borderRadius: BorderRadius.circular(10)),
      child: Center(child: Text(label,
          style: const TextStyle(color: Colors.white,
              fontWeight: FontWeight.w700, fontSize: 12))),
    ),
  );
}
