import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Central API service for hq-mobapp-v2.
/// Endpoint base: http://10.0.2.2:4000/api  (emulator)
///               http://<LOCAL_IP>:4000/api  (physical device — change baseUrl below)
class ApiService {
  // ── Change this to your local IP when testing on a physical device ──
  static const String baseUrl = 'http://192.168.137.1:4000/api';

  static const _storage  = FlutterSecureStorage();
  static const _tokenKey = 'hq_jwt_token';

  // ── Token helpers ────────────────────────────────────────────────────────────
  static Future<void>    saveToken(String t)  async => _storage.write(key: _tokenKey, value: t);
  static Future<String?> getToken()           async => _storage.read(key: _tokenKey);
  static Future<void>    clearToken()         async => _storage.delete(key: _tokenKey);

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  static void _assertOk(http.Response res, String label) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String msg = label;
      try {
        final e = jsonDecode(res.body);
        msg = e['message'] ?? label;
      } catch (_) {}
      throw Exception(msg);
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  /// POST /api/auth/login
  /// Server returns: { token, user: { _id, fullName, email, phone, role, ... } }
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    _assertOk(res, 'Login failed');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['token'] != null) await saveToken(data['token']);
    return data;
  }

  /// POST /api/auth/register
  /// Server returns: { token, user: {...} }
  static Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    _assertOk(res, 'Registration failed');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (data['token'] != null) await saveToken(data['token']);
    return data;
  }

  /// GET /api/auth/me
  /// Server returns: { user: {...} } or the user object directly
  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(Uri.parse('$baseUrl/auth/me'), headers: await _authHeaders());
    _assertOk(res, 'Failed to fetch profile');
    final data = jsonDecode(res.body);
    return (data is Map && data['user'] != null) ? data['user'] : data;
  }

  // ── Clinics ──────────────────────────────────────────────────────────────────
  /// GET /api/clinics/directory  (no auth required)
  /// Server returns: plain JSON array of clinics
  static Future<List<dynamic>> getClinicDirectory() async {
    final res = await http.get(Uri.parse('$baseUrl/clinics/directory'));
    _assertOk(res, 'Failed to load clinics');
    final data = jsonDecode(res.body);
    // Server returns a plain array
    if (data is List) return data;
    // Fallback for wrapped responses
    if (data is Map) return data['clinics'] ?? data['data'] ?? [];
    return [];
  }

  /// GET /api/clinics/recommend  (auth optional)
  static Future<List<dynamic>> getRecommendedClinics() async {
    final res = await http.get(
      Uri.parse('$baseUrl/clinics/recommend'),
      headers: await _authHeaders(),
    );
    _assertOk(res, 'Failed to load recommendations');
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map)  return data['clinics'] ?? data['data'] ?? [];
    return [];
  }

  /// GET /api/clinics/:id
  static Future<Map<String, dynamic>> getClinic(String id) async {
    final res = await http.get(
      Uri.parse('$baseUrl/clinics/$id'),
      headers: await _authHeaders(),
    );
    _assertOk(res, 'Failed to load clinic');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ── Queue ────────────────────────────────────────────────────────────────────
  /// POST /api/queues/join
  /// Body: { clinicId, serviceName, notes? }
  /// Server returns: { message, entry: { _id, queueNumber, clinicName, serviceName,
  ///                   estimatedWaitMinutes, positionAtJoin, status } }
  static Future<Map<String, dynamic>> joinQueue({
    required String clinicId,
    required String serviceName,
    String? notes,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/queues/join'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'clinicId':    clinicId,
        'serviceName': serviceName,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      }),
    );
    _assertOk(res, 'Failed to join queue');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// GET /api/queues/my-status
  /// Server returns: { entry: {...}, peopleAhead, estimatedWaitTime }
  /// or 404 when not in any queue → we return {}
  static Future<Map<String, dynamic>> getMyQueueStatus() async {
    final res = await http.get(
      Uri.parse('$baseUrl/queues/my-status'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 404) return {};   // not in queue — normal
    _assertOk(res, 'Failed to get queue status');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// PUT /api/queues/:id/cancel
  static Future<bool> cancelQueue(String id) async {
    final res = await http.put(
      Uri.parse('$baseUrl/queues/$id/cancel'),
      headers: await _authHeaders(),
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  }

  // ── Appointments ─────────────────────────────────────────────────────────────
  /// GET /api/appointments/my
  /// Server returns: plain array of appointment objects
  static Future<List<dynamic>> getMyAppointments() async {
    final res = await http.get(
      Uri.parse('$baseUrl/appointments/my'),
      headers: await _authHeaders(),
    );
    _assertOk(res, 'Failed to load appointments');
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map)  return data['appointments'] ?? data['data'] ?? [];
    return [];
  }

  /// POST /api/appointments
  /// Body: { clinicId, serviceName, appointmentDate, timeSlot, notes?, patientType? }
  /// Server returns the created appointment object
  static Future<Map<String, dynamic>> bookAppointment(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$baseUrl/appointments'),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );
    _assertOk(res, 'Failed to book appointment');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// PUT /api/appointments/:id/cancel
  static Future<bool> cancelAppointment(String id) async {
    final res = await http.put(
      Uri.parse('$baseUrl/appointments/$id/cancel'),
      headers: await _authHeaders(),
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  }

  /// GET /api/appointments/available-slots?clinicId=&date=
  /// Server returns: array of time slot strings or objects
  static Future<List<dynamic>> getAvailableSlots({
    required String clinicId,
    required String date,
  }) async {
    final res = await http.get(
      Uri.parse('$baseUrl/appointments/available-slots?clinicId=$clinicId&date=$date'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 404) return [];
    _assertOk(res, 'Failed to load slots');
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map)  return data['slots'] ?? data['data'] ?? [];
    return [];
  }

  // ── Chatbot ──────────────────────────────────────────────────────────────────
  /// POST /api/chatbot/message
  /// Body: { message }
  /// Server returns: { reply } or { response } or { answer }
  static Future<Map<String, dynamic>> sendChatMessage(String message) async {
    final res = await http.post(
      Uri.parse('$baseUrl/chatbot/message'),
      headers: await _authHeaders(),
      body: jsonEncode({'message': message}),
    );
    _assertOk(res, 'Chatbot error');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  /// GET /api/users/profile
  /// Server returns: { user: {...} } or the user object directly
  static Future<Map<String, dynamic>> getProfile() async {
    final res = await http.get(
      Uri.parse('$baseUrl/users/profile'),
      headers: await _authHeaders(),
    );
    _assertOk(res, 'Failed to load profile');
    final data = jsonDecode(res.body);
    if (data is Map && data['user'] != null) return data['user'] as Map<String, dynamic>;
    return data as Map<String, dynamic>;
  }

  /// PUT /api/users/profile
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$baseUrl/users/profile'),
      headers: await _authHeaders(),
      body: jsonEncode(body),
    );
    _assertOk(res, 'Failed to update profile');
    final data = jsonDecode(res.body);
    if (data is Map && data['user'] != null) return data['user'] as Map<String, dynamic>;
    return data as Map<String, dynamic>;
  }

  // ── Notifications ────────────────────────────────────────────────────────────
  /// GET /api/notifications
  static Future<List<dynamic>> getNotifications() async {
    final res = await http.get(
      Uri.parse('$baseUrl/notifications'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 404) return [];
    _assertOk(res, 'Failed to load notifications');
    final data = jsonDecode(res.body);
    if (data is List) return data;
    if (data is Map)  return data['notifications'] ?? data['data'] ?? [];
    return [];
  }
  /// PUT /api/users/change-password
  static Future<void> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await http.put(
      Uri.parse('$baseUrl/users/change-password'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'currentPassword': currentPassword,
        'newPassword':     newPassword,
      }),
    );
    _assertOk(res, 'Failed to change password');
  }

}
