import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/queue_provider.dart';
import '../../models/queue_model.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

/// Queue Monitoring — read-only live view of today's queue.
/// Does NOT appear in sidebar navigation for staff role — accessible via routes only.
class QueueMonitoringScreen extends StatefulWidget {
  const QueueMonitoringScreen({super.key});
  @override
  State<QueueMonitoringScreen> createState() => _QueueMonitoringScreenState();
}

class _QueueMonitoringScreenState extends State<QueueMonitoringScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().staff?.clinicId;
      if (clinicId != null) context.read<QueueProvider>().setClinicId(clinicId);
    });
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'waiting':   return const Color(0xFFD97706);
      case 'serving':   return const Color(0xFF7C3AED);
      case 'done':
      case 'completed': return const Color(0xFF16A34A);
      default:          return const Color(0xFF9CA3AF);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final provider = context.watch<QueueProvider>();

    // Show only active entries (waiting + serving) for monitoring view
    final active = provider.entries
        .where((q) => q.status == 'waiting' || q.status == 'serving')
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: auth.staff?.fullName ?? 'Staff', staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(child: Column(children: [
          // Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(children: [
              Container(width: 40, height: 40,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)]),
                  borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.monitor_outlined, color: Colors.white, size: 20)),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Queue Monitoring', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                Text('${active.length} active · ${provider.completedCount} done today',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
              ]),
              const Spacer(),
              IconButton(onPressed: provider.loadEntries,
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)), tooltip: 'Refresh'),
            ]),
          ),
          // Summary row
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            child: Row(children: [
              _summaryChip('Waiting', provider.waitingCount, const Color(0xFFD97706)),
              const SizedBox(width: 10),
              _summaryChip('Serving', provider.servingCount, const Color(0xFF7C3AED)),
              const SizedBox(width: 10),
              _summaryChip('Done',    provider.completedCount, const Color(0xFF16A34A)),
              const SizedBox(width: 10),
              _summaryChip('Total',   provider.entries.length, const Color(0xFF2563EB)),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: provider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
              : active.isEmpty
                ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.check_circle_outline, size: 52, color: Color(0xFFD1D5DB)),
                    SizedBox(height: 12),
                    Text('No active patients in queue', style: TextStyle(fontSize: 15, color: Color(0xFF9CA3AF))),
                  ]))
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: active.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final q = active[i];
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: q.status == 'serving'
                              ? Border.all(color: const Color(0xFF7C3AED).withOpacity(0.4), width: 1.5)
                              : null,
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
                        ),
                        child: Row(children: [
                          Container(width: 52, height: 52,
                            decoration: BoxDecoration(
                              color: _statusColor(q.status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12)),
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              Text(q.queueNumber,
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: _statusColor(q.status))),
                            ])),
                          const SizedBox(width: 14),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(q.patientName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                            const SizedBox(height: 2),
                            Text(q.serviceName, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                            const SizedBox(height: 2),
                            Row(children: [
                              const Icon(Icons.access_time_outlined, size: 11, color: Color(0xFF9CA3AF)),
                              const SizedBox(width: 3),
                              Text('Joined ${q.joinedAt}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                              if (q.estimatedWaitMinutes > 0) ...[
                                const SizedBox(width: 8),
                                Text('~${q.estimatedWaitMinutes} min wait',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                              ],
                            ]),
                          ])),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: _statusColor(q.status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(99)),
                            child: Text(
                              q.status == 'waiting' ? 'Waiting' : 'Serving',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _statusColor(q.status))),
                          ),
                        ]),
                      );
                    },
                  ),
          ),
        ])),
      ]),
    );
  }

  Widget _summaryChip(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text('$count', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      ]),
    );
  }
}
