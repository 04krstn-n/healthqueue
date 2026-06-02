import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../core/routes/app_routes.dart';
import '../state/staff_app_state.dart';
// removed unused import

class StaffDashboardScreen extends StatefulWidget {
  const StaffDashboardScreen({super.key});
  @override
  State<StaffDashboardScreen> createState() => _StaffDashboardScreenState();
}

class _StaffDashboardScreenState extends State<StaffDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  Timer? _autoRefresh;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this)
      ..addListener(() => setState(() => _selectedTab = _tabs.index));
    // Auto-refresh queue every 20 seconds
    _autoRefresh = Timer.periodic(const Duration(seconds: 20), (_) {
      context.read<StaffAppState>().refreshAll();
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    _autoRefresh?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<StaffAppState>();
    final staff = state.currentStaff;

    return Scaffold(
      body: Row(
        children: [
          // ── Left sidebar ────────────────────────────────────────────────
          _Sidebar(
            staffName: staff?.fullName ?? '',
            staffRole: staff?.role ?? '',
            selectedTab: _selectedTab,
            onTabChanged: (i) => _tabs.animateTo(i),
            onRefresh: () => state.refreshAll(),
            onLogout: () async {
              await state.logout();
              if (mounted)
                Navigator.pushReplacementNamed(context, AppRoutes.login);
            },
            metrics: state.metrics,
          ),
          // ── Main content ────────────────────────────────────────────────
          Expanded(
            child: Column(
              children: [
                // Top bar
                Container(
                  height: 56,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  color: Colors.white,
                  child: Row(
                    children: [
                      _tabLabel(_selectedTab),
                      const Spacer(),
                      Text(
                          DateFormat('EEE, MMM d · hh:mm a')
                              .format(DateTime.now()),
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 13)),
                      const SizedBox(width: 16),
                      if (_selectedTab == 0)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.person_add_outlined, size: 18),
                          label: const Text('Add Walk-in'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            minimumSize: const Size(0, 36),
                            textStyle: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          onPressed: () => _showAddWalkInDialog(context, state),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 0),
                // Tab content
                Expanded(
                  child: TabBarView(
                    controller: _tabs,
                    children: [
                      _QueueTab(state: state),
                      _AppointmentsTab(state: state),
                      _StatsTab(state: state),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabLabel(int i) {
    const labels = ['Queue Management', "Today's Appointments", 'Statistics'];
    return Text(labels[i],
        style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.textDark));
  }

  void _showAddWalkInDialog(BuildContext context, StaffAppState state) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String? selectedService;
    String patientType = 'Regular';
    final patientTypes = ['Regular', 'Senior Citizen', 'PWD', 'Pregnant'];
    final services = state.queueEntries.isNotEmpty
        ? <String>{
            ...state.queueEntries.map((e) => e['serviceName'] as String? ?? '')
          }.where((s) => s.isNotEmpty).toList()
        : <String>['General Consultation', 'Pediatrics', 'Wound Care'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Add Walk-in Patient'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Patient Name *',
                        prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: 12),
                TextField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        prefixIcon: Icon(Icons.phone_outlined))),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                      labelText: 'Service *',
                      prefixIcon: Icon(Icons.medical_services_outlined)),
                  initialValue: selectedService,
                  items: services
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setS(() => selectedService = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Patient Type'),
                  initialValue: patientType,
                  items: patientTypes
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: (v) => setS(() => patientType = v ?? 'Regular'),
                ),
                const SizedBox(height: 12),
                TextField(
                    controller: notesCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                        labelText: 'Notes (optional)',
                        prefixIcon: Icon(Icons.note_outlined))),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty || selectedService == null) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Name and service are required.'),
                      backgroundColor: AppColors.error));
                  return;
                }
                try {
                  final result = await state.addWalkIn(
                    patientName: nameCtrl.text.trim(),
                    serviceName: selectedService!,
                    patientPhone: phoneCtrl.text.trim(),
                    patientType: patientType,
                    notes: notesCtrl.text.trim(),
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text("Added! Queue #${result['queueNumber']}"),
                      backgroundColor: AppColors.success,
                    ));
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(e.toString()),
                        backgroundColor: AppColors.error));
                  }
                }
              },
              child: const Text('Add to Queue'),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

class _Sidebar extends StatelessWidget {
  final String staffName;
  final String staffRole;
  final int selectedTab;
  final void Function(int) onTabChanged;
  final VoidCallback onRefresh;
  final VoidCallback onLogout;
  final Map<String, dynamic>? metrics;

  const _Sidebar({
    required this.staffName,
    required this.staffRole,
    required this.selectedTab,
    required this.onTabChanged,
    required this.onRefresh,
    required this.onLogout,
    this.metrics,
  });

  @override
  Widget build(BuildContext context) {
    const navItems = [
      (
        Icons.confirmation_num_outlined,
        Icons.confirmation_num_rounded,
        'Queue'
      ),
      (
        Icons.calendar_today_outlined,
        Icons.calendar_today_rounded,
        'Appointments'
      ),
      (Icons.bar_chart_outlined, Icons.bar_chart_rounded, 'Statistics'),
    ];

    return Container(
      width: 200,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.bgTop, AppColors.bgBottom]),
      ),
      child: Column(
        children: [
          // Logo
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Row(children: [
              CircleAvatar(
                  radius: 18,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.local_hospital_rounded,
                      color: AppColors.primary, size: 18)),
              SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('HealthQueue+',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13)),
                Text('Staff Portal',
                    style: TextStyle(color: Colors.white54, fontSize: 10)),
              ]),
            ]),
          ),
          // Staff info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                const CircleAvatar(
                    radius: 16,
                    backgroundColor: Colors.white30,
                    child: Icon(Icons.person, color: Colors.white, size: 18)),
                const SizedBox(width: 10),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(staffName.split(' ').first,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13),
                          overflow: TextOverflow.ellipsis),
                      Text(staffRole.replaceAll('_', ' '),
                          style: const TextStyle(
                              color: Colors.white60, fontSize: 10)),
                    ])),
              ]),
            ),
          ),
          const Divider(color: Colors.white12, height: 0),
          const SizedBox(height: 8),
          // Nav items
          ...navItems.asMap().entries.map((e) {
            final i = e.key;
            final item = e.value;
            final isSelected = selectedTab == i;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              child: Material(
                color: isSelected
                    ? Colors.white.withOpacity(0.18)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => onTabChanged(i),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    child: Row(children: [
                      Icon(isSelected ? item.$2 : item.$1,
                          color: Colors.white, size: 20),
                      const SizedBox(width: 12),
                      Text(item.$3,
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.normal,
                              fontSize: 14)),
                    ]),
                  ),
                ),
              ),
            );
          }),
          const Spacer(),
          // Quick metrics
          if (metrics != null) ...[
            const Divider(color: Colors.white12),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                _metricRow(
                    'Served today', '${metrics!['totalServedToday'] ?? 0}'),
                _metricRow('In queue', '${metrics!['activeQueueCount'] ?? 0}'),
                _metricRow('Avg wait', '${metrics!['avgWaitMinutes'] ?? 0}m'),
              ]),
            ),
          ],
          const Divider(color: Colors.white12, height: 0),
          // Action buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(children: [
              Expanded(
                child: TextButton.icon(
                  icon: const Icon(Icons.refresh,
                      color: Colors.white70, size: 16),
                  label: const Text('Refresh',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                  onPressed: onRefresh,
                ),
              ),
              Expanded(
                child: TextButton.icon(
                  icon:
                      const Icon(Icons.logout, color: Colors.white54, size: 16),
                  label: const Text('Logout',
                      style: TextStyle(color: Colors.white54, fontSize: 12)),
                  onPressed: onLogout,
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _metricRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 11)),
        const Spacer(),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 13)),
      ]),
    );
  }
}

// ─── Queue Tab ────────────────────────────────────────────────────────────────

class _QueueTab extends StatelessWidget {
  final StaffAppState state;
  const _QueueTab({required this.state});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Waiting column
          Expanded(
              child: _column(
                  'Waiting', state.waitingQueue, AppColors.primary, context)),
          const SizedBox(width: 12),
          // Serving column
          Expanded(
              child: _column('Now Serving', state.servingQueue,
                  AppColors.secondary, context)),
          const SizedBox(width: 12),
          // Done column
          Expanded(
              child: _column(
                  'Completed', state.doneQueue, AppColors.textMuted, context)),
        ],
      ),
    );
  }

  Widget _column(String title, List<Map<String, dynamic>> entries, Color color,
      BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            Text(title,
                style: TextStyle(
                    color: color, fontWeight: FontWeight.w700, fontSize: 13)),
            const Spacer(),
            Text('${entries.length}',
                style: TextStyle(
                    color: color, fontWeight: FontWeight.w800, fontSize: 15)),
          ]),
        ),
        Expanded(
          child: entries.isEmpty
              ? Center(
                  child: Text('No patients',
                      style: TextStyle(
                          color: color.withOpacity(0.5), fontSize: 12)))
              : ListView.separated(
                  itemCount: entries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _entryCard(entries[i], color, context),
                ),
        ),
      ],
    );
  }

  Widget _entryCard(Map<String, dynamic> e, Color color, BuildContext context) {
    final status = e['status'] as String? ?? 'waiting';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6)
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6)),
              child: Text(e['queueNumber'] ?? '—',
                  style: TextStyle(
                      color: color, fontWeight: FontWeight.w800, fontSize: 14)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(e['patientName'] ?? '—',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13),
                  overflow: TextOverflow.ellipsis),
            ),
            if (e['patientType'] != null && e['patientType'] != 'Regular')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6)),
                child: Text(e['patientType'],
                    style: const TextStyle(
                        color: AppColors.warning,
                        fontSize: 9,
                        fontWeight: FontWeight.w700)),
              ),
          ]),
          const SizedBox(height: 4),
          Text(e['serviceName'] ?? '',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
          if (e['patientPhone'] != null &&
              (e['patientPhone'] as String).isNotEmpty)
            Text(e['patientPhone'],
                style:
                    const TextStyle(color: AppColors.textMuted, fontSize: 11)),
          const SizedBox(height: 10),
          // Action buttons depending on status
          if (status == 'waiting')
            Row(children: [
              Expanded(
                  child: _btn(
                      'Call',
                      Icons.campaign_outlined,
                      AppColors.secondary,
                      () => state.callPatient(e['_id']?.toString() ?? ''))),
              const SizedBox(width: 6),
              Expanded(
                  child: _btn('Skip', Icons.skip_next, AppColors.warning,
                      () => state.skipPatient(e['_id']?.toString() ?? ''))),
            ]),
          if (status == 'serving')
            Row(children: [
              Expanded(
                  child: _btn(
                      'Done',
                      Icons.check_circle_outline,
                      AppColors.success,
                      () => state.completePatient(e['_id']?.toString() ?? ''))),
              const SizedBox(width: 6),
              Expanded(
                  child: _btn(
                      'No Show',
                      Icons.person_off_outlined,
                      AppColors.error,
                      () => state.markNoShow(e['_id']?.toString() ?? ''))),
            ]),
          if (status == 'done')
            Text(
              e['doneAt'] != null
                  ? 'Served at ${DateFormat('hh:mm a').format(DateTime.tryParse(e['doneAt']) ?? DateTime.now())}'
                  : 'Completed',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
        ],
      ),
    );
  }

  Widget _btn(String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  color: color, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

class _AppointmentsTab extends StatelessWidget {
  final StaffAppState state;
  const _AppointmentsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final appts = state.appointments;
    if (appts.isEmpty) {
      return const Center(
          child: Text("No appointments today.",
              style: TextStyle(color: AppColors.textMuted)));
    }
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
              '${appts.length} appointment${appts.length == 1 ? '' : 's'} scheduled today',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              itemCount: appts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _apptCard(appts[i], context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _apptCard(Map<String, dynamic> a, BuildContext context) {
    final status = a['status'] as String? ?? 'pending';
    final statusColors = {
      'pending': AppColors.warning,
      'confirmed': AppColors.primary,
      'completed': AppColors.success,
      'cancelled': AppColors.error,
      'no_show': AppColors.error,
    };
    final color = statusColors[status] ?? AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)
        ],
      ),
      child: Row(children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(a['timeSlot'] ?? '',
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: AppColors.primary)),
          Text(a['endTime'] ?? '',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ]),
        const SizedBox(width: 16),
        Container(width: 1, height: 40, color: const Color(0xFFEEEEEE)),
        const SizedBox(width: 16),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(a['patientName'] ?? '—',
              style:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          Text(a['serviceName'] ?? '',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          if ((a['reason'] as String? ?? '').isNotEmpty)
            Text('Reason: ${a['reason']}',
                style:
                    const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        const SizedBox(width: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20)),
          child: Text(status.toUpperCase(),
              style: TextStyle(
                  color: color, fontSize: 10, fontWeight: FontWeight.w800)),
        ),
        const SizedBox(width: 8),
        if (status == 'confirmed' || status == 'pending')
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: AppColors.textMuted),
            onSelected: (v) =>
                state.updateApptStatus(a['_id']?.toString() ?? '', v),
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                  value: 'completed', child: Text('Mark Completed')),
              const PopupMenuItem(
                  value: 'no_show', child: Text('Mark No Show')),
              const PopupMenuItem(value: 'cancelled', child: Text('Cancel')),
            ],
          ),
      ]),
    );
  }
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

class _StatsTab extends StatelessWidget {
  final StaffAppState state;
  const _StatsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    final m = state.metrics;
    if (m == null) return const Center(child: CircularProgressIndicator());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Today's Overview",
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark)),
          const SizedBox(height: 16),
          Row(children: [
            _statCard('Total Served', '${m['totalServedToday'] ?? 0}',
                Icons.check_circle_outline, AppColors.success),
            const SizedBox(width: 12),
            _statCard('In Queue', '${m['activeQueueCount'] ?? 0}',
                Icons.confirmation_num_outlined, AppColors.primary),
            const SizedBox(width: 12),
            _statCard('Avg Wait', '${m['avgWaitMinutes'] ?? 0} min',
                Icons.access_time, AppColors.warning),
            const SizedBox(width: 12),
            _statCard("Today's Appts", '${m['todayAppointments'] ?? 0}',
                Icons.calendar_today_outlined, const Color(0xFF7B1FA2)),
          ]),
          const SizedBox(height: 20),
          Row(children: [
            _statCard('Walk-ins', '${m['walkInCount'] ?? 0}',
                Icons.directions_walk, AppColors.secondary),
            const SizedBox(width: 12),
            _statCard('No Shows', '${m['noShowCount'] ?? 0}',
                Icons.person_off_outlined, AppColors.error),
            const SizedBox(width: 12),
            _statCard('Skip/Bypassed', '${m['skippedCount'] ?? 0}',
                Icons.skip_next, AppColors.textMuted),
            const SizedBox(width: 12),
            _statCard('Avg Service Time', '${m['avgServiceMinutes'] ?? 0} min',
                Icons.timer_outlined, AppColors.primary),
          ]),
          const SizedBox(height: 24),
          // Service breakdown
          if ((m['serviceBreakdown'] as List?)?.isNotEmpty == true) ...[
            const Text('Service Breakdown',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textDark)),
            const SizedBox(height: 12),
            ...((m['serviceBreakdown'] as List<dynamic>).map((s) {
              final sMap = s as Map<String, dynamic>;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.04), blurRadius: 6)
                    ]),
                child: Row(children: [
                  const Icon(Icons.medical_services_outlined,
                      color: AppColors.primary, size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Text(sMap['serviceName'] ?? '',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14))),
                  Text('${sMap['count'] ?? 0} patients',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 13)),
                  const SizedBox(width: 16),
                  Text('${sMap['avgWaitMinutes'] ?? 0} min avg wait',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
                ]),
              );
            })),
          ],
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)
          ],
        ),
        child: Row(children: [
          CircleAvatar(
              radius: 20,
              backgroundColor: color.withOpacity(0.12),
              child: Icon(icon, color: color, size: 20)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(label,
                    style: const TextStyle(
                        color: AppColors.textMuted, fontSize: 11)),
                const SizedBox(height: 2),
                Text(value,
                    style: TextStyle(
                        color: color,
                        fontSize: 20,
                        fontWeight: FontWeight.w800)),
              ])),
        ]),
      ),
    );
  }
}
