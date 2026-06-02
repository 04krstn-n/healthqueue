import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/queue_provider.dart';
import '../../models/queue_model.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

/// Quick status update panel — shows only waiting/serving patients.
/// Staff can call next or mark done from here.
class QueueStatusUpdateScreen extends StatefulWidget {
  const QueueStatusUpdateScreen({super.key});
  @override
  State<QueueStatusUpdateScreen> createState() => _QueueStatusUpdateScreenState();
}

class _QueueStatusUpdateScreenState extends State<QueueStatusUpdateScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().staff?.clinicId;
      if (clinicId != null) context.read<QueueProvider>().setClinicId(clinicId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final provider = context.watch<QueueProvider>();
    final pending  = [...provider.serving, ...provider.waiting];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: auth.staff?.fullName ?? 'Staff', staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(child: Column(children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(children: [
              Container(width: 40, height: 40,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF059669), Color(0xFF047857)]),
                  borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.update_outlined, color: Colors.white, size: 20)),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Status Update', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                Text('Call or complete patients', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
              ]),
              const Spacer(),
              IconButton(onPressed: provider.loadEntries,
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280))),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: provider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF059669)))
              : pending.isEmpty
                ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.done_all_rounded, size: 52, color: Color(0xFFD1D5DB)),
                    SizedBox(height: 12),
                    Text('All caught up!', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF))),
                    SizedBox(height: 4),
                    Text('No patients waiting or being served.', style: TextStyle(fontSize: 13, color: Color(0xFFD1D5DB))),
                  ]))
                : ListView.separated(
                    padding: const EdgeInsets.all(14),
                    itemCount: pending.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _card(pending[i], provider),
                  ),
          ),
        ])),
      ]),
    );
  }

  Widget _card(QueueModel q, QueueProvider p) {
    final isServing = q.status == 'serving';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: isServing ? Border.all(color: const Color(0xFF7C3AED).withOpacity(0.35), width: 1.5) : null,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
      ),
      child: Row(children: [
        Container(width: 50, height: 50,
          decoration: BoxDecoration(
            color: (isServing ? const Color(0xFF7C3AED) : const Color(0xFFD97706)).withOpacity(0.1),
            borderRadius: BorderRadius.circular(10)),
          child: Center(child: Text(q.queueNumber,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900,
              color: isServing ? const Color(0xFF7C3AED) : const Color(0xFFD97706))))),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(q.patientName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
          const SizedBox(height: 2),
          Text(q.serviceName, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          if (q.patientType != 'Regular')
            Text(q.patientType, style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
        ])),
        const SizedBox(width: 12),
        if (!isServing)
          ElevatedButton(
            onPressed: () => p.updateStatus(q.id, 'serving'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED), foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9))),
            child: const Text('Call', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)))
        else
          ElevatedButton(
            onPressed: () => p.updateStatus(q.id, 'done'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9))),
            child: const Text('Done', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700))),
      ]),
    );
  }
}
