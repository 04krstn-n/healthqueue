import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class StaffUser {
  final String id;
  final String fullName;
  final String email;
  final String role;
  final String? clinicId;

  StaffUser({required this.id, required this.fullName, required this.email, required this.role, this.clinicId});

  factory StaffUser.fromJson(Map<String, dynamic> j) => StaffUser(
    id: j['id']?.toString() ?? '',
    fullName: j['fullName'] ?? '',
    email: j['email'] ?? '',
    role: j['role'] ?? 'staff',
    clinicId: j['clinicId']?.toString(),
  );

  Map<String, dynamic> toJson() => {'id': id, 'fullName': fullName, 'email': email, 'role': role, 'clinicId': clinicId};
}

class StaffAppState extends ChangeNotifier {
  StaffUser? _currentStaff;
  List<Map<String, dynamic>> _queueEntries = [];
  List<Map<String, dynamic>> _appointments = [];
  Map<String, dynamic>? _metrics;
  bool _loading = false;

  StaffUser? get currentStaff => _currentStaff;
  bool get isLoggedIn => _currentStaff != null;
  List<Map<String, dynamic>> get queueEntries => _queueEntries;
  List<Map<String, dynamic>> get appointments => _appointments;
  Map<String, dynamic>? get metrics => _metrics;
  bool get loading => _loading;

  String? get clinicId => _currentStaff?.clinicId;

  StaffAppState() { _restoreSession(); }

  Future<void> _restoreSession() async {
    final token = await StaffApiService.getToken();
    if (token == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('hq_staff_user');
      if (raw != null) {
        _currentStaff = StaffUser.fromJson(jsonDecode(raw));
        notifyListeners();
      }
      final data = await StaffApiService.getMe();
      _currentStaff = StaffUser.fromJson(data['user']);
      await _saveToPrefs(_currentStaff!);
      await refreshAll();
    } catch (_) { await logout(); }
  }

  Future<void> _saveToPrefs(StaffUser u) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('hq_staff_user', jsonEncode(u.toJson()));
  }

  Future<void> login(String email, String password) async {
    _loading = true; notifyListeners();
    try {
      final data = await StaffApiService.login(email, password);
      final user = StaffUser.fromJson(data['user'] as Map<String, dynamic>);
      // Only allow staff/facility_admin/super_admin login on tablet
      if (!['staff','facility_admin','super_admin'].contains(user.role)) {
        throw StaffApiException('Access denied. This app is for staff only.');
      }
      await StaffApiService.saveToken(data['token']);
      _currentStaff = user;
      await _saveToPrefs(user);
      await refreshAll();
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<void> logout() async {
    await StaffApiService.deleteToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('hq_staff_user');
    _currentStaff = null;
    _queueEntries = [];
    _appointments = [];
    _metrics = null;
    notifyListeners();
  }

  // ── Refresh all data ──────────────────────────────────────────────────────
  Future<void> refreshAll() async {
    if (clinicId == null) return;
    await Future.wait([refreshQueue(), refreshAppointments(), refreshMetrics()]);
  }

  Future<void> refreshQueue() async {
    if (clinicId == null) return;
    try {
      final data = await StaffApiService.getQueueEntries(clinicId: clinicId);
      _queueEntries = data.cast<Map<String, dynamic>>();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshAppointments() async {
    if (clinicId == null) return;
    try {
      final data = await StaffApiService.getTodayAppointments(clinicId!);
      _appointments = data.cast<Map<String, dynamic>>();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshMetrics() async {
    if (clinicId == null) return;
    try {
      _metrics = await StaffApiService.getFacilityStats(clinicId!);
      notifyListeners();
    } catch (_) {}
  }

  // ── Queue actions ─────────────────────────────────────────────────────────
  Future<void> callPatient(String id) async {
    await StaffApiService.callPatient(id);
    await refreshQueue();
  }

  Future<void> completePatient(String id) async {
    await StaffApiService.completePatient(id);
    await refreshQueue();
  }

  Future<void> skipPatient(String id) async {
    await StaffApiService.skipPatient(id);
    await refreshQueue();
  }

  Future<void> markNoShow(String id) async {
    await StaffApiService.markNoShow(id);
    await refreshQueue();
  }

  Future<Map<String, dynamic>> addWalkIn({
    required String patientName,
    required String serviceName,
    String? patientPhone,
    String? patientType,
    String? notes,
  }) async {
    final result = await StaffApiService.addWalkIn(
      clinicId: clinicId!,
      patientName: patientName,
      serviceName: serviceName,
      patientPhone: patientPhone,
      patientType: patientType,
      notes: notes,
    );
    await refreshQueue();
    return result;
  }

  // ── Appointment actions ───────────────────────────────────────────────────
  Future<void> updateApptStatus(String id, String status) async {
    await StaffApiService.updateAppointmentStatus(id, status);
    await refreshAppointments();
  }

  // ── Queue getters ─────────────────────────────────────────────────────────
  List<Map<String, dynamic>> get waitingQueue =>
    _queueEntries.where((e) => e['status'] == 'waiting').toList()
      ..sort((a, b) => (a['joinedAt'] as String? ?? '').compareTo(b['joinedAt'] as String? ?? ''));

  List<Map<String, dynamic>> get servingQueue =>
    _queueEntries.where((e) => e['status'] == 'serving').toList();

  List<Map<String, dynamic>> get doneQueue =>
    _queueEntries.where((e) => e['status'] == 'done').toList();
}
