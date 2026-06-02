import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'core/routes/app_routes.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/queue_provider.dart';
import 'providers/inquiry_provider.dart';
import 'providers/schedule_provider.dart';
import 'providers/assistance_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load .env (pubspec.yaml declares .env as the asset)
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    debugPrint('.env not found — using fallback IP');
  }

  // Lock to landscape for tablet use
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => QueueProvider()),
        ChangeNotifierProvider(create: (_) => InquiryProvider()),
        ChangeNotifierProvider(create: (_) => ScheduleProvider()),
        ChangeNotifierProvider(create: (_) => AssistanceProvider()),
      ],
      child: const HealthQueueStaffApp(),
    ),
  );
}

class HealthQueueStaffApp extends StatelessWidget {
  const HealthQueueStaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HealthQueue+ Staff',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      initialRoute: AppRoutes.login,
      routes: AppRoutes.routes,
    );
  }
}
