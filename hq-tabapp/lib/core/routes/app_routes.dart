import 'package:flutter/material.dart';
import '../../screens/login/login_screen.dart';
import '../../screens/dashboard/dashboard_screen.dart';
import '../../screens/queue/queue_management_screen.dart';
import '../../screens/queue/queue_status_update_screen.dart';
import '../../screens/queue/queue_monitoring_screen.dart';
import '../../screens/assistance/patient_assistance_screen.dart';
import '../../screens/schedule/service_schedule_screen.dart';
import '../../screens/inquiry/patient_inquiry_screen.dart';
import '../../screens/waiting_time/waiting_time_update_screen.dart';
import '../../screens/dashboard/reports_analytics_screen.dart';

class AppRoutes {
  static const String login = '/';

  static const String dashboard = '/dashboard';

  static const String queueManagement = '/queue-management';
  static const String queueStatusUpdate = '/queue-status-update';
  static const String queueMonitoring = '/queue-monitoring';

  static const String patientAssistance = '/patient-assistance';

  static const String serviceSchedule = '/service-schedule';

  static const String patientInquiryManagement = '/patient-inquiry-management';

  static const String waitingTimeUpdate = '/waiting-time-update';

  static const String reportsAnalytics = '/reports-analytics';

  static Map<String, WidgetBuilder> get routes => {
        login: (context) => const LoginScreen(),
        dashboard: (context) => const StaffDashboardScreen(),
        queueManagement: (context) => const QueueManagementScreen(),
        queueStatusUpdate: (context) => const QueueStatusUpdateScreen(),
        queueMonitoring: (context) => const QueueMonitoringScreen(),
        patientAssistance: (context) => const PatientAssistanceScreen(),
        serviceSchedule: (context) => const ServiceScheduleScreen(),
        patientInquiryManagement: (context) => const PatientInquiryScreen(),
        waitingTimeUpdate: (context) => const WaitingTimeUpdateScreen(),
        reportsAnalytics: (context) => const ReportsAnalyticsScreen(),
      };
}
