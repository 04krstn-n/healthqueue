class DashboardModel {
  final int totalPatients;      // todayPatients
  final int activeQueue;        // activeQueue (waiting + serving)
  final int completedToday;     // completedToday
  final int todayAppointments;  // todayAppointments
  final int avgWaitTime;        // avgWaitTime (minutes)
  final int completionRate;     // completionRate (%)
  final String clinicName;
  final List<Map<String, dynamic>> weeklyTrend;
  final List<Map<String, dynamic>> hourlyData;
  final List<Map<String, dynamic>> serviceDist;
  final List<Map<String, dynamic>> recentActivity;

  const DashboardModel({
    required this.totalPatients,
    required this.activeQueue,
    required this.completedToday,
    required this.todayAppointments,
    required this.avgWaitTime,
    required this.completionRate,
    this.clinicName     = '',
    this.weeklyTrend    = const [],
    this.hourlyData     = const [],
    this.serviceDist    = const [],
    this.recentActivity = const [],
  });

  // Server keys: todayPatients, activeQueue, completedToday,
  //              todayAppointments, avgWaitTime, completionRate,
  //              clinicName, weeklyTrend, hourlyData, serviceDist, recentActivity
  factory DashboardModel.fromJson(Map<String, dynamic> j) {
    return DashboardModel(
      totalPatients:     (j['todayPatients']     ?? 0) as int,
      activeQueue:       (j['activeQueue']        ?? 0) as int,
      completedToday:    (j['completedToday']     ?? 0) as int,
      todayAppointments: (j['todayAppointments']  ?? 0) as int,
      avgWaitTime:       (j['avgWaitTime']        ?? 0) as int,
      completionRate:    (j['completionRate']      ?? 0) as int,
      clinicName:        j['clinicName']?.toString() ?? '',
      weeklyTrend:       List<Map<String, dynamic>>.from(j['weeklyTrend']    ?? []),
      hourlyData:        List<Map<String, dynamic>>.from(j['hourlyData']     ?? []),
      serviceDist:       List<Map<String, dynamic>>.from(j['serviceDist']    ?? j['queueByService'] ?? []),
      recentActivity:    List<Map<String, dynamic>>.from(j['recentActivity'] ?? []),
    );
  }
}
