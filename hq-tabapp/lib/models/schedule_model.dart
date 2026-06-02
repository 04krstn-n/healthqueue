class ScheduleModel {
  final String id;
  final String time;         // Manila-formatted
  final String timeRaw;      // ISO for sorting
  final String service;
  final String patientName;
  final String patientPhone;
  final String status;
  final String type;
  final String clinicName;

  ScheduleModel({
    required this.id,
    required this.time,
    this.timeRaw     = '',
    required this.service,
    required this.patientName,
    this.patientPhone = '',
    required this.status,
    this.type        = 'Regular',
    this.clinicName  = '',
  });

  factory ScheduleModel.fromJson(Map<String, dynamic> j) {
    // appointmentDate is the date; timeSlot is "9:00 AM" string from server
    final timeSlot = j['timeSlot']?.toString() ?? '';
    return ScheduleModel(
      id:           j['_id']?.toString() ?? '',
      time:         timeSlot.isNotEmpty ? timeSlot : _dateToManilaTime(j['appointmentDate']),
      timeRaw:      j['appointmentDate']?.toString() ?? '',
      service:      j['serviceName']?.toString() ?? '',
      patientName:  (j['patient'] is Map ? j['patient']['fullName'] : null)?.toString() ??
                    j['patientName']?.toString() ?? 'Unknown',
      patientPhone: (j['patient'] is Map ? j['patient']['phone'] : null)?.toString() ?? '',
      status:       j['status']?.toString() ?? 'pending',
      type:         j['patientType']?.toString() ?? 'Regular',
      clinicName:   (j['clinic'] is Map ? j['clinic']['name'] : null)?.toString() ?? '',
    );
  }

  static String _dateToManilaTime(dynamic isoStr) {
    if (isoStr == null) return '--';
    try {
      final utc    = DateTime.parse(isoStr.toString()).toUtc();
      final manila = utc.add(const Duration(hours: 8));
      final h      = manila.hour % 12 == 0 ? 12 : manila.hour % 12;
      final m      = manila.minute.toString().padLeft(2, '0');
      final ampm   = manila.hour >= 12 ? 'PM' : 'AM';
      return '$h:$m $ampm';
    } catch (_) {
      return '--';
    }
  }
}
