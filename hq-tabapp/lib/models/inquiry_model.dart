class InquiryModel {
  final String id;
  final String message;
  final String reply;
  final String patientName;
  final String createdAt;
  final bool   isFallback;
  final String source;
  // Escalation fields
  final bool   isEscalated;
  final String escalationNote;
  final bool   resolvedByStaff;
  final String resolvedNote;

  const InquiryModel({
    required this.id,
    required this.message,
    required this.reply,
    required this.patientName,
    required this.createdAt,
    this.isFallback      = false,
    this.source          = 'faq',
    this.isEscalated     = false,
    this.escalationNote  = '',
    this.resolvedByStaff = false,
    this.resolvedNote    = '',
  });

  String get subject => message;

  factory InquiryModel.fromJson(Map<String, dynamic> j) {
    final fallback = j['isFallback'] == true;
    final src      = j['source']?.toString() ?? (fallback ? 'faq' : 'rasa');
    return InquiryModel(
      id:              j['_id']?.toString() ?? '',
      message:         j['message']?.toString() ?? '',
      reply:           j['reply']?.toString() ?? j['response']?.toString() ?? '',
      patientName:     (j['patient'] is Map
                        ? j['patient']['fullName']
                        : null)?.toString() ?? 'Anonymous',
      createdAt:       _toManilaTime(j['createdAt']?.toString()),
      isFallback:      fallback,
      source:          src,
      isEscalated:     j['isEscalated'] == true,
      escalationNote:  j['escalationNote']?.toString() ?? '',
      resolvedByStaff: j['resolvedByStaff'] == true,
      resolvedNote:    j['resolvedNote']?.toString() ?? '',
    );
  }

  static String _toManilaTime(String? iso) {
    if (iso == null || iso.isEmpty) return '--';
    try {
      final utc    = DateTime.parse(iso).toUtc();
      final manila = utc.add(const Duration(hours: 8));
      final h      = manila.hour % 12 == 0 ? 12 : manila.hour % 12;
      final m      = manila.minute.toString().padLeft(2, '0');
      return '$h:$m ${manila.hour >= 12 ? 'PM' : 'AM'}';
    } catch (_) { return iso; }
  }
}
