import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/queue_provider.dart';
import '../../providers/schedule_provider.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

class StaffDashboardScreen extends StatefulWidget {
  const StaffDashboardScreen({super.key});
  @override
  State<StaffDashboardScreen> createState() => _StaffDashboardScreenState();
}

class _StaffDashboardScreenState extends State<StaffDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().staff?.clinicId;
      if (clinicId != null) {
        context.read<DashboardProvider>().setClinicId(clinicId);
        context.read<QueueProvider>().setClinicId(clinicId);
        context.read<ScheduleProvider>().setClinicId(clinicId);
      }
    });
  }

  String _manilaTime() {
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
    final h   = now.hour % 12 == 0 ? 12 : now.hour % 12;
    final m   = now.minute.toString().padLeft(2, '0');
    final ap  = now.hour >= 12 ? 'PM' : 'AM';
    final day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.weekday % 7];
    final mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.month - 1];
    return '$day, $mon ${now.day} · $h:$m $ap';
  }

  @override
  Widget build(BuildContext context) {
    final auth      = context.watch<AuthProvider>();
    final dashboard = context.watch<DashboardProvider>();
    final queue     = context.watch<QueueProvider>();
    final schedule  = context.watch<ScheduleProvider>();

    final stats      = dashboard.stats;
    final staffName  = auth.staff?.fullName ?? 'Staff';
    final clinicName = stats?.clinicName.isNotEmpty == true
        ? stats!.clinicName : 'Your Clinic';

    // Priority patients from live queue
    final priorityWaiting = queue.entries
        .where((q) => q.isPriority && q.status == 'waiting')
        .length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: staffName, staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(
          child: dashboard.isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
            : RefreshIndicator(
                onRefresh: () async {
                  final clinicId = auth.staff?.clinicId;
                  if (clinicId != null) {
                    await Future.wait([
                      context.read<DashboardProvider>().loadStats(),
                      context.read<QueueProvider>().loadEntries(),
                      context.read<ScheduleProvider>().loadSchedule(),
                    ]);
                  }
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Header ────────────────────────────────────────
                      Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(clinicName,
                            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
                          const SizedBox(height: 4),
                          Text(_manilaTime(),
                            style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                        ])),
                        if (dashboard.error != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFECACA)),
                            ),
                            child: Row(children: [
                              const Icon(Icons.wifi_off, size: 14, color: Colors.red),
                              const SizedBox(width: 6),
                              Text(dashboard.error!,
                                style: const TextStyle(fontSize: 12, color: Colors.red)),
                              const SizedBox(width: 8),
                              GestureDetector(
                                onTap: context.read<DashboardProvider>().loadStats,
                                child: const Text('Retry',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF2563EB),
                                      fontWeight: FontWeight.w700)),
                              ),
                            ]),
                          ),
                      ]),
                      const SizedBox(height: 20),

                      // ── Priority alert (live from queue) ──────────────
                      if (priorityWaiting > 0)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 18),
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF1F2),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFFECACA)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444)),
                            const SizedBox(width: 12),
                            Text(
                              '$priorityWaiting Priority Patient${priorityWaiting > 1 ? 's' : ''} Waiting — Immediate attention required',
                              style: const TextStyle(color: Color(0xFFEF4444),
                                  fontSize: 14, fontWeight: FontWeight.w700),
                            ),
                          ]),
                        ),

                      // ── KPI cards (4 real metrics) ────────────────────
                      Row(children: [
                        _kpiCard('Patients Today', '${stats?.totalPatients ?? 0}',
                          Icons.groups_rounded, const Color(0xFF3B82F6), const Color(0xFFEFF6FF)),
                        const SizedBox(width: 14),
                        _kpiCard('Active Queue', '${stats?.activeQueue ?? queue.waitingCount + queue.servingCount}',
                          Icons.access_time_rounded, const Color(0xFFFF7A1A), const Color(0xFFFFF4ED)),
                        const SizedBox(width: 14),
                        _kpiCard("Today's Appointments", '${stats?.todayAppointments ?? 0}',
                          Icons.calendar_today_outlined, const Color(0xFF22C55E), const Color(0xFFF0FDF4)),
                        const SizedBox(width: 14),
                        _kpiCard('Completed Today', '${stats?.completedToday ?? queue.completedCount}',
                          Icons.task_alt_rounded, const Color(0xFFA855F7), const Color(0xFFFAF5FF)),
                      ]),
                      const SizedBox(height: 14),

                      // ── Secondary metrics row ─────────────────────────
                      Row(children: [
                        _metricCard('Avg Wait Time',
                          stats?.avgWaitTime == 0 ? '--' : '${stats?.avgWaitTime ?? 0} min',
                          Icons.timer_outlined, const Color(0xFF0891B2)),
                        const SizedBox(width: 14),
                        _metricCard('Completion Rate',
                          stats?.completionRate == 0 ? '--' : '${stats?.completionRate ?? 0}%',
                          Icons.pie_chart_outline, const Color(0xFF059669)),
                        const SizedBox(width: 14),
                        _metricCard('Waiting Now', '${queue.waitingCount}',
                          Icons.hourglass_top_rounded, const Color(0xFFD97706)),
                        const SizedBox(width: 14),
                        _metricCard('Serving Now', '${queue.servingCount}',
                          Icons.medical_services_outlined, const Color(0xFF7C3AED)),
                      ]),
                      const SizedBox(height: 20),

                      // ── Two column panels ─────────────────────────────
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [

                        // Service distribution (real from DB)
                        Expanded(child: _panel(
                          title: 'Service Distribution Today',
                          icon: Icons.bar_chart_rounded,
                          child: stats?.serviceDist.isEmpty != false
                            ? _emptyPanel('No queue data yet today')
                            : Column(
                                children: (stats!.serviceDist.take(6).toList()).map((s) {
                                  final name  = s['name']?.toString() ?? '';
                                  final count = (s['count'] ?? 0) as int;
                                  final total = stats.totalPatients == 0 ? 1 : stats.totalPatients;
                                  final pct   = (count / total).clamp(0.0, 1.0);
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Row(children: [
                                        Expanded(child: Text(name,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                                              color: Color(0xFF374151)),
                                          overflow: TextOverflow.ellipsis)),
                                        Text('$count',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                                              color: Color(0xFF2563EB))),
                                      ]),
                                      const SizedBox(height: 5),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(99),
                                        child: LinearProgressIndicator(
                                          value: pct,
                                          minHeight: 7,
                                          backgroundColor: const Color(0xFFE5E7EB),
                                          valueColor: const AlwaysStoppedAnimation(Color(0xFF2563EB)),
                                        ),
                                      ),
                                    ]),
                                  );
                                }).toList(),
                              ),
                        )),
                        const SizedBox(width: 18),

                        // Live queue activity
                        Expanded(child: _panel(
                          title: 'Live Queue Activity',
                          icon: Icons.monitor_heart_rounded,
                          child: queue.entries.isEmpty
                            ? _emptyPanel('No patients in queue yet')
                            : Column(
                                children: queue.entries.take(6).map((q) {
                                  Color c;
                                  String label;
                                  switch (q.status) {
                                    case 'serving':   c = const Color(0xFF7C3AED); label = 'Serving'; break;
                                    case 'waiting':   c = const Color(0xFFD97706); label = 'Waiting'; break;
                                    case 'done':
                                    case 'completed': c = const Color(0xFF16A34A); label = 'Done';    break;
                                    default:          c = const Color(0xFF6B7280); label = q.status;
                                  }
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: Row(children: [
                                      Container(
                                        width: 36, height: 36,
                                        decoration: BoxDecoration(
                                          color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(9)),
                                        child: Center(child: Text(q.queueNumber,
                                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: c))),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Text(q.patientName,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                                              color: Color(0xFF111827)),
                                          overflow: TextOverflow.ellipsis),
                                        Text(q.serviceName,
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                                          overflow: TextOverflow.ellipsis),
                                      ])),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
                                        child: Text(label,
                                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c)),
                                      ),
                                    ]),
                                  );
                                }).toList(),
                              ),
                        )),
                      ]),
                      const SizedBox(height: 18),

                      // ── Today's appointments strip ────────────────────
                      _panel(
                        title: "Today's Appointments",
                        icon: Icons.calendar_today_outlined,
                        child: schedule.schedule.isEmpty
                          ? _emptyPanel('No appointments scheduled today')
                          : Column(
                              children: schedule.schedule.take(5).map((s) {
                                Color c;
                                switch (s.status) {
                                  case 'confirmed':  c = const Color(0xFF16A34A); break;
                                  case 'arrived':    c = const Color(0xFF2563EB); break;
                                  case 'serving':    c = const Color(0xFF7C3AED); break;
                                  case 'completed':  c = const Color(0xFF9CA3AF); break;
                                  case 'cancelled':  c = const Color(0xFFDC2626); break;
                                  default:           c = const Color(0xFFD97706);
                                }
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Row(children: [
                                    Container(
                                      width: 58, height: 38,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                                      child: Center(child: Text(s.time,
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                                            color: Color(0xFF2563EB)))),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Text(s.patientName,
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                                            color: Color(0xFF111827)),
                                        overflow: TextOverflow.ellipsis),
                                      Text(s.service,
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                                    ])),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
                                      child: Text(
                                        s.status[0].toUpperCase() + s.status.substring(1),
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c)),
                                    ),
                                  ]),
                                );
                              }).toList(),
                            ),
                      ),
                    ],
                  ),
                ),
              ),
        ),
      ]),
    );
  }

  Widget _kpiCard(String title, String value, IconData icon, Color color, Color bg) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6)],
        ),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
            Text(title,
              style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), height: 1.3),
              maxLines: 2, overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }

  Widget _metricCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value,
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: color)),
            Text(title,
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
        ]),
      ),
    );
  }

  Widget _panel({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 16, color: const Color(0xFF2563EB)),
          const SizedBox(width: 8),
          Text(title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
        ]),
        const SizedBox(height: 14),
        const Divider(height: 1, color: Color(0xFFF3F4F6)),
        const SizedBox(height: 14),
        child,
      ]),
    );
  }

  Widget _emptyPanel(String msg) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: Center(child: Text(msg,
      style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)))),
  );
}
