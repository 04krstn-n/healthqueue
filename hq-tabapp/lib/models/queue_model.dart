class QueueModel {
  final String id;
  final String queueNumber;
  final String patientName;
  final String patientPhone;
  final String patientType;   // Regular | Senior Citizen | PWD | Pregnant | Priority
  final String serviceName;
  final String queueType;     // Regular | Priority
  final String status;        // waiting | serving | done | completed | no_show | skipped | cancelled
  final String joinedAt;      // Manila-formatted display time
  final String joinedAtRaw;   // ISO — used for sorting
  final bool   isPriority;
  final String notes;
  final int    estimatedWaitMinutes;
  final int    positionAtJoin;

  const QueueModel({
    required this.id,
    required this.queueNumber,
    required this.patientName,
    this.patientPhone         = '',
    this.patientType          = 'Regular',
    required this.serviceName,
    this.queueType            = 'Regular',
    required this.status,
    required this.joinedAt,
    this.joinedAtRaw          = '',
    this.isPriority           = false,
    this.notes                = '',
    this.estimatedWaitMinutes = 0,
    this.positionAtJoin       = 0,
  });

  factory QueueModel.fromJson(Map<String, dynamic> j) {
    final raw = j['joinedAt']?.toString() ?? '';
    // patientName — denormalized on server
    final name = j['patientName']?.toString() ??
        (j['patient'] is Map ? j['patient']['fullName'] : null)?.toString() ??
        'Unknown';
    // phone — denormalized as patientPhone OR from populated patient
    final phone = j['patientPhone']?.toString() ??
        (j['patient'] is Map ? j['patient']['phone'] : null)?.toString() ?? '';

    return QueueModel(
      id:                   j['_id']?.toString() ?? '',
      queueNumber:          j['queueNumber']?.toString() ?? '',
      patientName:          name,
      patientPhone:         phone,
      patientType:          j['patientType']?.toString() ?? 'Regular',
      serviceName:          j['serviceName']?.toString() ?? '',
      queueType:            j['queueType']?.toString() ?? 'Regular',
      status:               j['status']?.toString() ?? 'waiting',
      joinedAt:             _toManilaTime(raw),
      joinedAtRaw:          raw,
      isPriority:           j['priority'] == true || j['queueType'] == 'Priority',
      notes:                j['notes']?.toString() ?? '',
      estimatedWaitMinutes: (j['estimatedWaitMinutes'] ?? 0) as int,
      positionAtJoin:       (j['positionAtJoin'] ?? 0) as int,
    );
  }

  static String _toManilaTime(String isoStr) {
    if (isoStr.isEmpty) return '--';
    try {
      final utc    = DateTime.parse(isoStr).toUtc();
      final manila = utc.add(const Duration(hours: 8));
      final h      = manila.hour % 12 == 0 ? 12 : manila.hour % 12;
      final m      = manila.minute.toString().padLeft(2, '0');
      return '$h:$m ${manila.hour >= 12 ? 'PM' : 'AM'}';
    } catch (_) { return isoStr; }
  }
}
