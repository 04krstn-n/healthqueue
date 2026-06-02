import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/queue_provider.dart';
import '../../models/queue_model.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

const _kStatuses    = ['All', 'waiting', 'serving', 'done', 'no_show', 'skipped', 'cancelled'];
const _kPatientTypes = ['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Priority'];

class QueueManagementScreen extends StatefulWidget {
  const QueueManagementScreen({super.key});
  @override
  State<QueueManagementScreen> createState() => _QueueManagementScreenState();
}

class _QueueManagementScreenState extends State<QueueManagementScreen> {
  final _searchCtrl   = TextEditingController();
  String _statusFilter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cid = context.read<AuthProvider>().staff?.clinicId;
      if (cid != null) context.read<QueueProvider>().setClinicId(cid);
    });
  }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  // ── Status helpers ─────────────────────────────────────────────────────────
  Color _sc(String s) {
    switch (s) {
      case 'waiting':   return const Color(0xFFD97706);
      case 'serving':   return const Color(0xFF7C3AED);
      case 'done':
      case 'completed': return const Color(0xFF16A34A);
      case 'no_show':   return const Color(0xFFEF4444);
      case 'skipped':   return const Color(0xFF6B7280);
      case 'cancelled': return const Color(0xFFDC2626);
      default:          return const Color(0xFF6B7280);
    }
  }

  String _sl(String s) {
    switch (s) {
      case 'waiting':   return 'Waiting';
      case 'serving':   return 'Serving';
      case 'done':
      case 'completed': return 'Done';
      case 'no_show':   return 'No Show';
      case 'skipped':   return 'Skipped';
      case 'cancelled': return 'Cancelled';
      default: return s[0].toUpperCase() + s.substring(1);
    }
  }

  // ── Walk-in dialog ─────────────────────────────────────────────────────────
  void _addWalkIn() {
    final nameCtrl    = TextEditingController();
    final phoneCtrl   = TextEditingController();
    final notesCtrl   = TextEditingController();
    final serviceCtrl = TextEditingController();
    String patientType = 'Regular';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(width: 36, height: 36,
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(9)),
                          child: const Icon(Icons.person_add_outlined, color: Color(0xFF2563EB), size: 20)),
                        const SizedBox(width: 10),
                        const Text('Add Walk-in Patient',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                      ]),
                      const SizedBox(height: 20),
                      _lbl('Patient Name *'), const SizedBox(height: 6),
                      TextField(controller: nameCtrl,
                        decoration: _ideco('Full name', Icons.person_outline)),
                      const SizedBox(height: 14),
                      _lbl('Service / Reason for Visit *'), const SizedBox(height: 6),
                      TextField(controller: serviceCtrl,
                        decoration: _ideco('e.g. Laboratory, Ultrasound', Icons.medical_services_outlined)),
                      const SizedBox(height: 14),
                      _lbl('Contact Number (optional)'), const SizedBox(height: 6),
                      TextField(controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: _ideco('09XX XXX XXXX', Icons.phone_outlined)),
                      const SizedBox(height: 14),
                      _lbl('Patient Type'), const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        value: patientType,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13)),
                        items: _kPatientTypes.map((t) =>
                          DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (v) => setS(() => patientType = v ?? 'Regular'),
                      ),
                      const SizedBox(height: 14),
                      _lbl('Notes (optional)'), const SizedBox(height: 6),
                      TextField(controller: notesCtrl, maxLines: 2,
                        decoration: _ideco('Additional concerns', Icons.notes_outlined)),
                      const SizedBox(height: 22),
                      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Add to Queue'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                          onPressed: () {
                            if (nameCtrl.text.trim().isEmpty || serviceCtrl.text.trim().isEmpty) {
                              ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                                content: Text('Patient name and service are required.'),
                                backgroundColor: Colors.red));
                              return;
                            }
                            context.read<QueueProvider>().addPatient(
                              patientName: nameCtrl.text.trim(),
                              serviceName: serviceCtrl.text.trim(),
                              patientPhone: phoneCtrl.text.trim(),
                              patientType:  patientType,
                              notes:        notesCtrl.text.trim(),
                            );
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                              content: Text('Walk-in patient added to queue.'),
                              backgroundColor: Color(0xFF16A34A)));
                          },
                        ),
                      ]),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final provider = context.watch<QueueProvider>();

    final search = _searchCtrl.text.toLowerCase();
    final shown  = provider.entries.where((q) {
      final ms = search.isEmpty ||
          q.patientName.toLowerCase().contains(search) ||
          q.queueNumber.toLowerCase().contains(search) ||
          q.serviceName.toLowerCase().contains(search);
      final mf = _statusFilter == 'All' ||
          q.status == _statusFilter ||
          (_statusFilter == 'done' && q.status == 'completed');
      return ms && mf;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(
          staffName: auth.staff?.fullName ?? 'Staff',
          staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(child: Column(children: [

          // ── Header row: title + Add Walk-in button ─────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 10),
            child: Row(children: [
              Container(width: 38, height: 38,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                  borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.queue_outlined, color: Colors.white, size: 19)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Queue Management',
                  style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                Text('Today · ${provider.entries.length} total',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
              ])),
              IconButton(
                onPressed: provider.loadEntries,
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)),
                tooltip: 'Refresh'),
              const SizedBox(width: 6),
              ElevatedButton.icon(
                onPressed: _addWalkIn,
                icon: const Icon(Icons.add, size: 15),
                label: const Text('Add Walk-in'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)))),
            ]),
          ),

          // ── Filter + badges + search — all on ONE row ──────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 10),
            child: Row(children: [
              // Status filter dropdown
              Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: const Color(0xFFE5E7EB))),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _statusFilter,
                    isDense: true,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                        color: Color(0xFF374151)),
                    icon: const Icon(Icons.expand_more, size: 16, color: Color(0xFF6B7280)),
                    items: _kStatuses.map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s == 'All' ? 'All Status' : _sl(s)),
                    )).toList(),
                    onChanged: (v) => setState(() => _statusFilter = v ?? 'All'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // KPI badges
              _badge('Waiting', provider.waitingCount, const Color(0xFFD97706)),
              const SizedBox(width: 6),
              _badge('Serving', provider.servingCount, const Color(0xFF7C3AED)),
              const SizedBox(width: 6),
              _badge('Done', provider.completedCount, const Color(0xFF16A34A)),
              const Spacer(),
              // Search — compact, right-aligned, won't overflow
              SizedBox(
                width: 180,
                height: 36,
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    hintText: 'Search…',
                    hintStyle: const TextStyle(fontSize: 12),
                    prefixIcon: const Icon(Icons.search, size: 15, color: Color(0xFF9CA3AF)),
                    filled: true, fillColor: const Color(0xFFF3F4F6),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(9),
                      borderSide: BorderSide.none),
                  ),
                ),
              ),
            ]),
          ),
          const Divider(height: 1),

          // ── List ───────────────────────────────────────────────────────────
          Expanded(
            child: provider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
              : provider.error != null
                ? _errView(provider)
                : shown.isEmpty
                  ? _emptyView()
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: shown.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _card(shown[i], provider),
                    ),
          ),
        ])),
      ]),
    );
  }

  Widget _card(QueueModel q, QueueProvider provider) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: q.isPriority
            ? Border.all(color: const Color(0xFFF59E0B), width: 1.5)
            : Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5)],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Queue number
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(
            color: _sc(q.status).withOpacity(0.1),
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: _sc(q.status).withOpacity(0.2))),
          child: Center(child: Text(q.queueNumber,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: _sc(q.status)))),
        ),
        const SizedBox(width: 12),
        // Info
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(q.patientName,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827)))),
            if (q.isPriority)
              _tag('Priority', const Color(0xFFF59E0B)),
          ]),
          const SizedBox(height: 2),
          Text(q.serviceName,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          const SizedBox(height: 3),
          Row(children: [
            const Icon(Icons.access_time_outlined, size: 11, color: Color(0xFF9CA3AF)),
            const SizedBox(width: 3),
            Text(q.joinedAt, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            if (q.patientPhone.isNotEmpty) ...[
              const SizedBox(width: 8),
              const Icon(Icons.phone_outlined, size: 11, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 3),
              Text(q.patientPhone, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            ],
            if (q.patientType != 'Regular') ...[
              const SizedBox(width: 8),
              _tag(q.patientType, const Color(0xFF2563EB)),
            ],
          ]),
          if (q.estimatedWaitMinutes > 0)
            Padding(padding: const EdgeInsets.only(top: 3),
              child: Text('~${q.estimatedWaitMinutes} min estimated',
                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)))),
          if (q.notes.isNotEmpty)
            Padding(padding: const EdgeInsets.only(top: 3),
              child: Text('Note: ${q.notes}',
                style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF),
                    fontStyle: FontStyle.italic),
                maxLines: 1, overflow: TextOverflow.ellipsis)),
        ])),
        // Status + actions
        Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
          _statusPill(q.status),
          const SizedBox(height: 6),
          if (q.status == 'waiting')
            _actionBtn('Call', const Color(0xFF7C3AED),
              () => provider.updateStatus(q.id, 'serving')),
          if (q.status == 'serving')
            _actionBtn('Done', const Color(0xFF16A34A),
              () => provider.updateStatus(q.id, 'done')),
          const SizedBox(height: 4),
          PopupMenuButton<String>(
            onSelected: (v) => provider.updateStatus(q.id, v),
            itemBuilder: (_) {
              final opts = <PopupMenuEntry<String>>[];
              if (q.status == 'waiting') {
                opts.add(const PopupMenuItem(value: 'skipped',   child: Text('Skip')));
                opts.add(const PopupMenuItem(value: 'no_show',   child: Text('No Show')));
                opts.add(const PopupMenuItem(value: 'cancelled', child: Text('Cancel')));
              }
              if (q.status == 'serving') {
                opts.add(const PopupMenuItem(value: 'no_show',   child: Text('No Show')));
                opts.add(const PopupMenuItem(value: 'cancelled', child: Text('Cancel')));
              }
              return opts;
            },
            child: const Icon(Icons.more_vert, color: Color(0xFF9CA3AF), size: 17)),
        ]),
      ]),
    );
  }

  Widget _badge(String label, int count, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(color: c.withOpacity(0.08), borderRadius: BorderRadius.circular(99)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Text('$count', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c)),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c)),
    ]),
  );

  Widget _statusPill(String s) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: _sc(s).withOpacity(0.1), borderRadius: BorderRadius.circular(99),
      border: Border.all(color: _sc(s).withOpacity(0.25))),
    child: Text(_sl(s),
      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _sc(s))),
  );

  Widget _tag(String t, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(99)),
    child: Text(t, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)));

  Widget _actionBtn(String lbl, Color c, VoidCallback fn) => GestureDetector(
    onTap: fn,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(7)),
      child: Text(lbl, style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700))));

  Widget _emptyView() => const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    Icon(Icons.queue_outlined, size: 44, color: Color(0xFFD1D5DB)),
    SizedBox(height: 10),
    Text('No queue entries', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
  ]));

  Widget _errView(QueueProvider p) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    const Icon(Icons.error_outline, size: 36, color: Colors.red),
    const SizedBox(height: 8),
    Text(p.error!, style: const TextStyle(fontSize: 13, color: Colors.red)),
    const SizedBox(height: 10),
    ElevatedButton(onPressed: p.loadEntries, child: const Text('Retry')),
  ]));

  Widget _lbl(String t) => Text(t,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF374151)));

  InputDecoration _ideco(String hint, IconData icon) => InputDecoration(
    hintText: hint, prefixIcon: Icon(icon, size: 17, color: const Color(0xFF9CA3AF)),
    filled: true, fillColor: const Color(0xFFF9FAFB),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)));
}
