import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StaffApiService {
  static String get baseUrl {
    if (dotenv.isInitialized) {
      return dotenv.env['API_BASE_URL'] ?? 'http://192.168.137.1:4000';
    }
    return 'http://192.168.137.1:4000';
}

  static const _storage  = FlutterSecureStorage();
  static const _tokenKey = 'hq_staff_jwt';

  static Future<void>    saveToken(String t) => _storage.write(key: _tokenKey, value: t);
  static Future<String?> getToken()          => _storage.read(key: _tokenKey);
  static Future<void>    deleteToken()       => _storage.delete(key: _tokenKey);

  // Public alias used by screens that need headers without underscore
  static Future<Map<String, String>> authHeadersPublic() => _authHeaders();

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Uri _uri(String path) => Uri.parse('$baseUrl$path');

  static dynamic _handle(http.Response res) {
    final body = jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body;
    throw StaffApiException(body['message'] ?? 'Request failed (${res.statusCode})');
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(_uri('/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}));
    return _handle(res) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(_uri('/api/auth/me'), headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  // GET /api/dashboard/facility?clinicId=xxx
  static Future<Map<String, dynamic>> getFacilityStats(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/dashboard/facility')
        .replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  // ── Queue ─────────────────────────────────────────────────────────────────
  // GET /api/queues?clinicId=xxx&status=xxx
  static Future<List<dynamic>> getQueueEntries({String? clinicId, String? status}) async {
    final params = <String, String>{};
    if (clinicId != null) params['clinicId'] = clinicId;
    if (status   != null) params['status']   = status;
    final uri = Uri.parse('$baseUrl/api/queues').replace(queryParameters: params);
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  // GET /api/queues/metrics?clinicId=xxx
  static Future<Map<String, dynamic>> getQueueMetrics(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/queues/metrics')
        .replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  // PUT /api/queues/:id/call
  static Future<void> callPatient(String id) async {
    final res = await http.put(_uri('/api/queues/$id/call'), headers: await _authHeaders());
    _handle(res);
  }

  // PUT /api/queues/:id/complete
  static Future<void> completePatient(String id) async {
    final res = await http.put(_uri('/api/queues/$id/complete'), headers: await _authHeaders());
    _handle(res);
  }

  // PUT /api/queues/:id/skip
  static Future<void> skipPatient(String id) async {
    final res = await http.put(_uri('/api/queues/$id/skip'), headers: await _authHeaders());
    _handle(res);
  }

  // PUT /api/queues/:id/no-show
  static Future<void> markNoShow(String id) async {
    final res = await http.put(_uri('/api/queues/$id/no-show'), headers: await _authHeaders());
    _handle(res);
  }

  // PUT /api/queues/:id/cancel
  static Future<void> cancelQueue(String id) async {
    final res = await http.put(_uri('/api/queues/$id/cancel'), headers: await _authHeaders());
    _handle(res);
  }

  // POST /api/queues/add-walkin
  static Future<Map<String, dynamic>> addWalkIn({
    required String clinicId,
    required String patientName,
    required String serviceName,
    String? patientPhone,
    String? patientType,
    String? notes,
  }) async {
    final res = await http.post(_uri('/api/queues/add-walkin'),
        headers: await _authHeaders(),
        body: jsonEncode({
          'clinicId':    clinicId,
          'patientName': patientName,
          'serviceName': serviceName,
          if (patientPhone != null) 'patientPhone': patientPhone,
          if (patientType  != null) 'patientType':  patientType,
          if (notes        != null) 'notes':        notes,
        }));
    return _handle(res) as Map<String, dynamic>;
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  // GET /api/appointments/today  (scoped by clinicId for facility_admin/staff)
  static Future<List<dynamic>> getTodayAppointments(String clinicId) async {
    final uri = Uri.parse('$baseUrl/api/appointments/today')
        .replace(queryParameters: {'clinicId': clinicId});
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  // GET /api/appointments?clinicId=xxx
  static Future<List<dynamic>> getAppointments({String? clinicId, String? status}) async {
    final params = <String, String>{};
    if (clinicId != null) params['clinicId'] = clinicId;
    if (status   != null) params['status']   = status;
    final uri = Uri.parse('$baseUrl/api/appointments').replace(queryParameters: params);
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  // PUT /api/appointments/:id/status
  static Future<void> updateAppointmentStatus(String id, String status) async {
    final res = await http.put(_uri('/api/appointments/$id/status'),
        headers: await _authHeaders(),
        body: jsonEncode({'status': status}));
    _handle(res);
  }

  // ── Clinic ────────────────────────────────────────────────────────────────
  // GET /api/clinics/:id
  static Future<Map<String, dynamic>> getClinic(String id) async {
    final res = await http.get(_uri('/api/clinics/$id'), headers: await _authHeaders());
    return _handle(res) as Map<String, dynamic>;
  }

  // PUT /api/clinics/:id  — update wait time
  static Future<void> updateClinicWaitTime(String id, int waitMinutes) async {
    final res = await http.put(_uri('/api/clinics/$id'),
        headers: await _authHeaders(),
        body: jsonEncode({'baseWaitTimePerPerson': waitMinutes}));
    _handle(res);
  }

  // ── ChatLogs / Assistance ─────────────────────────────────────────────────
  // GET /api/chatbot-admin/logs
  static Future<List<dynamic>> getChatLogs() async {
    final res = await http.get(_uri('/api/chatbot-admin/logs'), headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }
}


  // ── Escalated inquiries (staff) ───────────────────────────────────────────
  // GET /api/chatbot-admin/escalated?clinicId=xxx&resolved=false
  static Future<List<dynamic>> getEscalatedLogs({String? clinicId, bool? resolved}) async {
    final params = <String, String>{};
    if (clinicId != null) params['clinicId'] = clinicId;
    if (resolved != null) params['resolved'] = resolved.toString();
    final uri = Uri.parse('$baseUrl/api/chatbot-admin/escalated')
        .replace(queryParameters: params);
    final res = await http.get(uri, headers: await _authHeaders());
    return _handle(res) as List<dynamic>;
  }

  // PUT /api/chatbot/resolve/:id
  static Future<void> resolveEscalation(String id, {String note = ''}) async {
    final res = await http.put(_uri('/api/chatbot/resolve/$id'),
        headers: await _authHeaders(),
        body: jsonEncode({'note': note}));
    _handle(res);
  }

  // ── Clinic services (for waiting time per service) ─────────────────────────
  // GET /api/clinics/:id  — returns full clinic including services[]
  // Already exists as getClinic — services are in clinic.services[]

  // PUT /api/clinics/:id  — update a specific service's durationMinutes
  static Future<void> updateServiceDuration(
      String clinicId, String serviceId, int durationMinutes) async {
    // We update the whole clinic services array patch via the clinic update endpoint
    final res = await http.put(_uri('/api/clinics/$clinicId'),
        headers: await _authHeaders(),
        body: jsonEncode({
          'serviceUpdate': {'serviceId': serviceId, 'durationMinutes': durationMinutes}
        }));
    _handle(res);
  }

  // GET /api/queues/metrics?clinicId=xxx  — live queue counts per service
  // Already defined above as getQueueMetrics

class StaffApiException implements Exception {
  final String message;
  StaffApiException(this.message);
  @override
  String toString() => message;
}
