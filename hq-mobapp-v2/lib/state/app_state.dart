import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/appointment_models.dart';
import '../models/queue_models.dart';
import '../models/chat_models.dart';
import '../models/user_models.dart';

class AppState extends ChangeNotifier {

  /* ─────────────────────────────────────────────────────────
     AUTH
  ───────────────────────────────────────────────────────── */
  AppUser? _currentUser;
  bool _isAuthLoading = false;

  AppUser? get currentUser   => _currentUser;
  bool     get isLoggedIn    => _currentUser != null;
  bool     get isAuthLoading => _isAuthLoading;

  Future<void> login({required String identifier, required String password}) async {
    _isAuthLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.login(identifier, password);
      _currentUser = _userFromMap(data['user'] ?? data);
      await Future.wait([fetchAppointments(), fetchQueueStatus()]);
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

  Future<void> registerUser({
    required String fullName,
    required String email,
    required String phone,
    required DateTime dob,
    required String password,
  }) async {
    _isAuthLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.register({
        'fullName': fullName, 'email': email, 'phone': phone,
        'dateOfBirth': dob.toIso8601String(),
        'password': password, 'role': 'patient',
      });
      _currentUser = _userFromMap(data['user'] ?? data, fallback: {
        'fullName': fullName, 'email': email, 'phone': phone,
      });
    } finally {
      _isAuthLoading = false;
      notifyListeners();
    }
  }

  AppUser _userFromMap(dynamic u, {Map<String, dynamic>? fallback}) {
    final m = (u is Map<String, dynamic>) ? u : <String, dynamic>{};
    final f = fallback ?? {};
    return AppUser(
      id:               m['_id']      ?? m['id']      ?? '',
      fullName:         m['fullName'] ?? f['fullName'] ?? '',
      email:            m['email']    ?? f['email']    ?? '',
      phone:            m['phone']    ?? f['phone']    ?? '',
      dob:              DateTime.tryParse(m['dateOfBirth'] ?? m['dob'] ?? '') ?? DateTime(2000),
      password:         '',
      patientType:      m['patientType']      ?? 'Regular',
      patientId:        m['patientId']        ?? '',
      age:              m['age']?.toString()  ?? '',
      philHealthNumber: m['philHealthNumber'] ?? '',
      hmoNumber:        m['hmoNumber']        ?? '',
    );
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _currentUser  = null;
    _appointments = [];
    _currentQueue = null;
    _chatMessages = [];
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    try {
      final data = await ApiService.getMe();
      _currentUser = _userFromMap(data);
      notifyListeners();
    } catch (e) { debugPrint('refreshProfile error: $e'); }
  }

  Future<void> updateCurrentUserProfile({
    String? fullName, String? phone, String? age,
    String? patientType, String? philHealthNumber, String? hmoNumber,
  }) async {
    if (_currentUser == null) return;
    final body = <String, dynamic>{};
    if (fullName         != null) body['fullName']         = fullName;
    if (phone            != null) body['phone']            = phone;
    if (age              != null) body['age']              = age;
    if (patientType      != null) body['patientType']      = patientType;
    if (philHealthNumber != null) body['philHealthNumber'] = philHealthNumber;
    if (hmoNumber        != null) body['hmoNumber']        = hmoNumber;
    try {
      final updated = await ApiService.updateProfile(body);
      _currentUser = _userFromMap(updated);
      notifyListeners();
    } catch (e) { debugPrint('updateProfile error: $e'); }
  }

  /* ─────────────────────────────────────────────────────────
     APPOINTMENTS
  ───────────────────────────────────────────────────────── */
  List<Appointment> _appointments = [];
  bool _apptLoading = false;

  List<Appointment> get appointments       => List.unmodifiable(_appointments);
  bool              get apptLoading        => _apptLoading;
  List<Appointment> get upcomingAppointments => _appointments.where((a) => a.isUpcoming).toList();
  List<Appointment> get pastAppointments     => _appointments.where((a) => a.isPast).toList();

  Future<void> fetchAppointments() async {
    _apptLoading = true;
    notifyListeners();
    try {
      final list = await ApiService.getMyAppointments();
      _appointments = list.map((raw) {
        final m = raw as Map<String, dynamic>;
        String clinicName = '';
        if (m['clinicId'] is Map)          clinicName = m['clinicId']['name'] ?? '';
        else if (m['clinicName'] is String) clinicName = m['clinicName']      ?? '';

        String serviceName = '';
        if      (m['serviceName'] is String) serviceName = m['serviceName'];
        else if (m['serviceId']   is Map)    serviceName = m['serviceId']['name'] ?? '';
        else if (m['department']  is String) serviceName = m['department'];

        return Appointment(
          id:         m['_id'] ?? m['id'] ?? '',
          clinicName: clinicName,
          department: serviceName,
          doctor:     (m['staffId'] is Map) ? m['staffId']['fullName'] ?? '' : m['doctor'] ?? '',
          date:       DateTime.tryParse(m['appointmentDate'] ?? m['date'] ?? '') ?? DateTime.now(),
          timeLabel:  m['timeSlot'] ?? m['timeLabel'] ?? '',
          status:     Appointment.parseStatus(m['status']),
          notes:      m['notes'] ?? '',
        );
      }).toList();
    } catch (e) { debugPrint('fetchAppointments error: $e'); }
    finally {
      _apptLoading = false;
      notifyListeners();
    }
  }

  void addAppointment(Appointment appt) {
    _appointments.insert(0, appt);
    notifyListeners();
    fetchAppointments();
  }

  void updateAppointment(String id, {
    AppointmentStatus? status,
    DateTime?          date,
    String?            timeLabel,
    String?            notes,
  }) {
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx == -1) return;
    _appointments[idx] = _appointments[idx].copyWith(
      status: status, date: date, timeLabel: timeLabel, notes: notes,
    );
    notifyListeners();
    if (status == AppointmentStatus.cancelled) {
      ApiService.cancelAppointment(id).catchError((_) {});
    }
    fetchAppointments();
  }

  /* ─────────────────────────────────────────────────────────
     QUEUE
  ───────────────────────────────────────────────────────── */
  QueueEntry? _currentQueue;
  bool _queueLoading = false;

  QueueEntry? get currentQueue => _currentQueue;
  bool        get queueLoading => _queueLoading;
  List<QueueEntry> get activeQueues =>
      _currentQueue == null ? [] : [_currentQueue!];

  Future<void> fetchQueueStatus() async {
    _queueLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.getMyQueueStatus();
      if (data.isEmpty || data['entry'] == null) {
        _currentQueue = null;
      } else {
        final e = data['entry'] as Map<String, dynamic>;
        String clinicName = '';
        if (e['clinic'] is Map)                clinicName = e['clinic']['name'] ?? '';
        else if (e['clinicName'] is String)    clinicName = e['clinicName'] ?? '';

        final wait = (data['estimatedWaitTime'] ?? e['estimatedWaitMinutes'] ?? 0) as int;
        _currentQueue = QueueEntry(
          id:           e['_id']          ?? e['id']   ?? '',
          queueNumber:  e['queueNumber']?.toString()   ?? 'N/A',
          clinicName:   clinicName,
          serviceName:  e['serviceName']  ?? '',
          patientName:  _currentUser?.fullName  ?? '',
          patientEmail: _currentUser?.email,
          patientPhone: _currentUser?.phone,
          status:       QueueEntry.parseStatus(e['status']),
          position:     (data['peopleAhead'] ?? 0) as int,
          estimatedWait: wait,
          joinedAt:     DateTime.tryParse(e['joinedAt'] ?? '') ?? DateTime.now(),
        );
      }
    } catch (e) { debugPrint('fetchQueueStatus error: $e'); }
    finally {
      _queueLoading = false;
      notifyListeners();
    }
  }

  void addQueueFromJoinResult(QueueJoinResult result) {
    _currentQueue = QueueEntry(
      id:           result.entryId,
      queueNumber:  result.queueNumber,
      clinicName:   result.clinicName,
      serviceName:  result.serviceName,
      patientName:  _currentUser?.fullName  ?? result.patientName,
      patientEmail: _currentUser?.email     ?? result.patientEmail,
      patientPhone: _currentUser?.phone     ?? result.patientPhone,
      status:       QueueStatus.waiting,
      position:     result.position,
      estimatedWait: result.estimatedWait,
      joinedAt:     result.joinedAt,
    );
    notifyListeners();
    fetchQueueStatus();
  }

  Future<bool> cancelQueue(String id) async {
    final ok = await ApiService.cancelQueue(id);
    if (ok) { _currentQueue = null; notifyListeners(); }
    return ok;
  }

  /* ─────────────────────────────────────────────────────────
     CHAT  — all methods used by chatbot_screen
  ───────────────────────────────────────────────────────── */
  List<ChatMessage> _chatMessages = [];
  bool _chatLoading = false;

  /// Used by chatbot_screen: context.watch<AppState>().messages
  List<ChatMessage> get messages     => List.unmodifiable(_chatMessages);

  /// Kept for compatibility
  List<ChatMessage> get chatMessages => messages;

  bool get chatLoading => _chatLoading;

  /// Add a single ChatMessage object (internal helper)
  void addChatMessage(ChatMessage msg) {
    _chatMessages.add(msg);
    notifyListeners();
  }

  /// Called by chatbot_screen: appState.addBotText(text, quickReplies: [...])
  void addBotText(String text, {List<String> quickReplies = const []}) {
    _chatMessages.add(ChatMessage(
      text:         text,
      isUser:       false,
      timestamp:    DateTime.now(),
      quickReplies: quickReplies,
    ));
    notifyListeners();
  }

  /// Called by chatbot_screen: appState.addUserText(msg)
  void addUserText(String text) {
    _chatMessages.add(ChatMessage(
      text:      text,
      isUser:    true,
      timestamp: DateTime.now(),
    ));
    notifyListeners();
  }

  /// Called by chatbot_screen on initState: seedChatIfEmpty()
  void seedChatIfEmpty() {
    if (_chatMessages.isNotEmpty) return;
    _chatMessages.add(ChatMessage(
      text:      'Hi! I\'m your HealthQueue+ assistant. How can I help you today?',
      isUser:    false,
      timestamp: DateTime.now(),
      quickReplies: ['Book Appointment', 'Join Queue', 'Queue Status', 'My Appointments'],
    ));
    notifyListeners();
  }

  /// Called by app_state sendMessage (server-based chat)
  Future<void> sendMessage(String text) async {
    addUserText(text);
    _chatLoading = true;
    notifyListeners();
    try {
      final data  = await ApiService.sendChatMessage(text);
      final reply = data['reply'] ?? data['response'] ?? data['answer'] ?? 'No response';
      addBotText(reply.toString());
    } catch (e) {
      addBotText('Sorry, I could not reach the server. Please try again.');
    } finally {
      _chatLoading = false;
      notifyListeners();
    }
  }

  void clearChat() {
    _chatMessages = [];
    notifyListeners();
  }
}
