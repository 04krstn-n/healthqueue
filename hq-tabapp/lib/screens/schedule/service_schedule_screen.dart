import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/schedule_provider.dart';
import '../../models/schedule_model.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

class ServiceScheduleScreen extends StatefulWidget {
  const ServiceScheduleScreen({super.key});
  @override
  State<ServiceScheduleScreen> createState() => _ServiceScheduleScreenState();
}

class _ServiceScheduleScreenState extends State<ServiceScheduleScreen> {
  String _filter = 'All';
  final _statuses = ['All', 'pending', 'confirmed', 'arrived', 'serving', 'completed', 'cancelled'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().staff?.clinicId;
      if (clinicId != null) context.read<ScheduleProvider>().setClinicId(clinicId);
    });
  }

  Color _statusColor(String s) {
    switch (s.toLowerCase()) {
      case 'confirmed':  return const Color(0xFF16A34A);
      case 'pending':    return const Color(0xFFD97706);
      case 'arrived':    return const Color(0xFF2563EB);
      case 'serving':    return const Color(0xFF7C3AED);
      case 'completed':  return const Color(0xFF6B7280);
      case 'cancelled':  return const Color(0xFFDC2626);
      case 'no_show':    return const Color(0xFFEF4444);
      default:           return const Color(0xFF6B7280);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final provider = context.watch<ScheduleProvider>();
    final all      = provider.schedule;
    final shown    = _filter == 'All'
        ? all
        : all.where((s) => s.status.toLowerCase() == _filter.toLowerCase()).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: auth.staff?.fullName ?? 'Staff', staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(
          child: Column(children: [
            // Header
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.calendar_today_outlined, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text("Today's Schedule", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                  Text("Appointments for today", style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                ]),
                const Spacer(),
                // Total badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(99)),
                  child: Text('${all.length} total', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                ),
                const SizedBox(width: 10),
                IconButton(
                  onPressed: provider.loadSchedule,
                  icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)),
                  tooltip: 'Refresh',
                ),
              ]),
            ),

            // Filter tabs
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _statuses.map((s) {
                    final active = _filter == s;
                    return GestureDetector(
                      onTap: () => setState(() => _filter = s),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8, bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: active ? const Color(0xFF2563EB) : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          s == 'All' ? 'All' : s[0].toUpperCase() + s.substring(1),
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                              color: active ? Colors.white : const Color(0xFF374151)),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const Divider(height: 1),

            // Content
            Expanded(
              child: provider.isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                : provider.error != null
                  ? _errorState(provider.error!)
                  : shown.isEmpty
                    ? _emptyState()
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: shown.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, i) => _apptCard(shown[i]),
                      ),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _apptCard(ScheduleModel s) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
      ),
      child: Row(children: [
        // Time
        Container(
          width: 70, height: 56,
          decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(s.time, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF2563EB))),
          ]),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.patientName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
            const SizedBox(height: 3),
            Text(s.service, style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            if (s.patientPhone.isNotEmpty)
              Text(s.patientPhone, style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
          ]),
        ),
        // Status badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: _statusColor(s.status).withOpacity(0.1),
            borderRadius: BorderRadius.circular(99),
            border: Border.all(color: _statusColor(s.status).withOpacity(0.3)),
          ),
          child: Text(
            s.status[0].toUpperCase() + s.status.substring(1),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _statusColor(s.status)),
          ),
        ),
        const SizedBox(width: 8),
        // Action menu
        PopupMenuButton<String>(
          onSelected: (val) => context.read<ScheduleProvider>().updateAppointmentStatus(s.id, val),
          itemBuilder: (_) => [
            'confirmed', 'arrived', 'serving', 'completed', 'cancelled', 'no_show',
          ].map((st) => PopupMenuItem(value: st,
              child: Text(st[0].toUpperCase() + st.substring(1)))).toList(),
          child: const Icon(Icons.more_vert, color: Color(0xFF6B7280)),
        ),
      ]),
    );
  }

  Widget _emptyState() => const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    Icon(Icons.calendar_today_outlined, size: 48, color: Color(0xFFD1D5DB)),
    SizedBox(height: 12),
    Text('No appointments today', style: TextStyle(fontSize: 15, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500)),
  ]));

  Widget _errorState(String msg) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    const Icon(Icons.error_outline, size: 40, color: Colors.red),
    const SizedBox(height: 10),
    Text(msg, style: const TextStyle(fontSize: 14, color: Colors.red)),
    const SizedBox(height: 12),
    ElevatedButton(onPressed: context.read<ScheduleProvider>().loadSchedule,
        child: const Text('Retry')),
  ]));
}
