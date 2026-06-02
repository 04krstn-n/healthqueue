import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/inquiry_provider.dart';
import '../../models/inquiry_model.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

class PatientInquiryScreen extends StatefulWidget {
  const PatientInquiryScreen({super.key});
  @override
  State<PatientInquiryScreen> createState() => _PatientInquiryScreenState();
}

class _PatientInquiryScreenState extends State<PatientInquiryScreen> {
  final _searchCtrl = TextEditingController();
  int _tabIndex = 0; // 0 = All Logs, 1 = Escalated (needs attention)

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final clinicId = context.read<AuthProvider>().staff?.clinicId;
      context.read<InquiryProvider>().loadInquiries(clinicId: clinicId);
    });
  }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Color _sourceColor(String s) {
    switch (s) {
      case 'rasa':   return const Color(0xFF16A34A);
      case 'openai': return const Color(0xFF2563EB);
      default:       return const Color(0xFFD97706);
    }
  }

  String _sourceLabel(String s) {
    switch (s) {
      case 'rasa':   return 'Rasa NLU';
      case 'openai': return 'OpenAI';
      default:       return 'FAQ';
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final provider = context.watch<InquiryProvider>();

    final escalated = provider.inquiries.where((i) => i.isEscalated).toList();
    final unresolved = escalated.where((i) => !i.resolvedByStaff).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: auth.staff?.fullName ?? 'Staff', staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(child: Column(children: [
          // ── Header ────────────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 0),
            child: Column(children: [
              Row(children: [
                Container(width: 38, height: 38,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)]),
                    borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 19)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Patient Inquiries',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF111827))),
                  const Text('Chatbot logs & escalated concerns',
                    style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                ])),
                // Search
                SizedBox(width: 200, height: 36,
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: context.read<InquiryProvider>().search,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Search…',
                      hintStyle: const TextStyle(fontSize: 12),
                      prefixIcon: const Icon(Icons.search, size: 15, color: Color(0xFF9CA3AF)),
                      filled: true, fillColor: const Color(0xFFF3F4F6), isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: BorderSide.none)),
                  )),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => provider.loadInquiries(
                    clinicId: auth.staff?.clinicId),
                  icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)),
                  tooltip: 'Refresh'),
              ]),
              const SizedBox(height: 10),
              // Tab row
              Row(children: [
                _tabBtn(0, 'All Logs (${provider.inquiries.length})', Icons.history_rounded),
                const SizedBox(width: 6),
                _tabBtn(1, 'Needs Attention ($unresolved)', Icons.priority_high_rounded,
                    urgent: unresolved > 0),
              ]),
            ]),
          ),
          const Divider(height: 1),

          // ── Content ───────────────────────────────────────────────────────
          Expanded(
            child: provider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
              : provider.error != null
                ? _errorState(provider)
                : _tabIndex == 0
                  ? _logsList(provider.inquiries)
                  : _escalatedList(escalated, provider),
          ),
        ])),
      ]),
    );
  }

  Widget _logsList(List<InquiryModel> logs) {
    if (logs.isEmpty) return const Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.chat_bubble_outline_rounded, size: 44, color: Color(0xFFD1D5DB)),
        SizedBox(height: 10),
        Text('No chatbot conversations yet', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
      ]));
    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: logs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _logCard(logs[i]),
    );
  }

  Widget _logCard(InquiryModel inq) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: inq.isEscalated && !inq.resolvedByStaff
            ? Border.all(color: const Color(0xFFFB923C), width: 1.5)
            : Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(inq.patientName,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827)))),
          // Source badge
          _pill(_sourceLabel(inq.source), _sourceColor(inq.source)),
          if (inq.isEscalated) ...[
            const SizedBox(width: 6),
            _pill(inq.resolvedByStaff ? '✓ Resolved' : '⚠ Escalated',
              inq.resolvedByStaff ? const Color(0xFF16A34A) : const Color(0xFFEF4444)),
          ],
          const SizedBox(width: 8),
          Text(inq.createdAt, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        ]),
        const SizedBox(height: 8),
        // Patient message
        _bubble(inq.message, const Color(0xFFF3F4F6), Icons.person_outline, const Color(0xFF6B7280)),
        // Bot reply
        if (inq.reply.isNotEmpty) ...[
          const SizedBox(height: 6),
          _bubble(inq.reply, const Color(0xFFEFF6FF), Icons.smart_toy_outlined, const Color(0xFF2563EB)),
        ],
        // Escalation note
        if (inq.isEscalated && inq.escalationNote.isNotEmpty) ...[
          const SizedBox(height: 6),
          _bubble('Staff note: ${inq.escalationNote}',
            const Color(0xFFFFF7ED), Icons.warning_amber_outlined, const Color(0xFFF97316)),
        ],
      ]),
    );
  }

  Widget _escalatedList(List<InquiryModel> escalated, InquiryProvider provider) {
    final unresolved = escalated.where((i) => !i.resolvedByStaff).toList();
    final resolved   = escalated.where((i) => i.resolvedByStaff).toList();
    final all        = [...unresolved, ...resolved];

    if (all.isEmpty) return const Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.check_circle_outline, size: 44, color: Color(0xFF16A34A)),
        SizedBox(height: 10),
        Text('No escalated inquiries', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
        SizedBox(height: 4),
        Text('All patient concerns are resolved', style: TextStyle(fontSize: 12, color: Color(0xFFD1D5DB))),
      ]));

    return ListView.separated(
      padding: const EdgeInsets.all(14),
      itemCount: all.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final inq = all[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: inq.resolvedByStaff
                  ? const Color(0xFFD1FAE5) : const Color(0xFFFED7AA),
              width: 1.5),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 5)]),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(
                inq.resolvedByStaff ? Icons.check_circle_rounded : Icons.priority_high_rounded,
                size: 16,
                color: inq.resolvedByStaff ? const Color(0xFF16A34A) : const Color(0xFFF97316)),
              const SizedBox(width: 8),
              Expanded(child: Text(inq.patientName,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827)))),
              Text(inq.createdAt, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            ]),
            const SizedBox(height: 8),
            _bubble(inq.message, const Color(0xFFF3F4F6), Icons.person_outline, const Color(0xFF6B7280)),
            if (inq.reply.isNotEmpty) ...[
              const SizedBox(height: 6),
              _bubble(inq.reply, const Color(0xFFEFF6FF), Icons.smart_toy_outlined, const Color(0xFF2563EB)),
            ],
            if (inq.escalationNote.isNotEmpty) ...[
              const SizedBox(height: 6),
              _bubble('Concern: ${inq.escalationNote}',
                const Color(0xFFFFF7ED), Icons.warning_amber_outlined, const Color(0xFFF97316)),
            ],
            if (inq.resolvedNote.isNotEmpty) ...[
              const SizedBox(height: 6),
              _bubble('Resolved: ${inq.resolvedNote}',
                const Color(0xFFF0FDF4), Icons.check_circle_outline, const Color(0xFF16A34A)),
            ],
            if (!inq.resolvedByStaff) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _resolveDialog(inq, provider),
                  icon: const Icon(Icons.check, size: 15),
                  label: const Text('Mark Resolved'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)))),
              ),
            ],
          ]),
        );
      },
    );
  }

  void _resolveDialog(InquiryModel inq, InquiryProvider provider) {
    final noteCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Resolve Inquiry', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Patient: ${inq.patientName}',
            style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
          const SizedBox(height: 12),
          TextField(controller: noteCtrl, maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Resolution note (optional)',
              border: OutlineInputBorder())),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              provider.resolveEscalation(inq.id, note: noteCtrl.text.trim());
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Inquiry marked as resolved.'),
                backgroundColor: Color(0xFF16A34A)));
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A),
                foregroundColor: Colors.white),
            child: const Text('Resolve')),
        ],
      ),
    );
  }

  Widget _tabBtn(int idx, String label, IconData icon, {bool urgent = false}) {
    final active = _tabIndex == idx;
    return GestureDetector(
      onTap: () => setState(() => _tabIndex = idx),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(
            width: 2.5,
            color: active
                ? (urgent ? const Color(0xFFF97316) : const Color(0xFF7C3AED))
                : Colors.transparent))),
        child: Row(children: [
          Icon(icon, size: 14,
            color: active
                ? (urgent ? const Color(0xFFF97316) : const Color(0xFF7C3AED))
                : const Color(0xFF6B7280)),
          const SizedBox(width: 6),
          Text(label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
              color: active
                  ? (urgent ? const Color(0xFFF97316) : const Color(0xFF7C3AED))
                  : const Color(0xFF6B7280))),
        ]),
      ),
    );
  }

  Widget _pill(String t, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(99),
        border: Border.all(color: c.withOpacity(0.25))),
    child: Text(t, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c)));

  Widget _bubble(String text, Color bg, IconData icon, Color iconColor) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 13, color: iconColor),
      const SizedBox(width: 7),
      Expanded(child: Text(text,
        style: TextStyle(fontSize: 12, color: iconColor.withOpacity(0.9)),
        maxLines: 4, overflow: TextOverflow.ellipsis)),
    ]));

  Widget _errorState(InquiryProvider p) => Center(child: Column(
    mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.error_outline, size: 36, color: Colors.red),
      const SizedBox(height: 8),
      Text(p.error!, style: const TextStyle(fontSize: 13, color: Colors.red)),
      const SizedBox(height: 10),
      ElevatedButton(
        onPressed: () => p.loadInquiries(
          clinicId: context.read<AuthProvider>().staff?.clinicId),
        child: const Text('Retry')),
    ]));
}
