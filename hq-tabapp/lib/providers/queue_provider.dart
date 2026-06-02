import 'package:flutter/material.dart';
import '../models/queue_model.dart';
import '../services/api_service.dart';

class QueueProvider extends ChangeNotifier {
  List<QueueModel> _entries = [];
  bool    _loading  = false;
  String? _error;
  String? _clinicId;

  List<QueueModel> get entries   => _entries;
  bool             get isLoading => _loading;
  String?          get error     => _error;

  // Server status enums: waiting | serving | done | completed | no_show | skipped | cancelled
  List<QueueModel> get waiting   => _entries.where((e) => e.status == 'waiting').toList();
  List<QueueModel> get serving   => _entries.where((e) => e.status == 'serving').toList();
  List<QueueModel> get completed => _entries.where((e) => ['done','completed'].contains(e.status)).toList();
  List<QueueModel> get priority  => _entries.where((e) => e.isPriority).toList();
  int get waitingCount   => waiting.length;
  int get servingCount   => serving.length;
  int get completedCount => completed.length;

  void setClinicId(String id) {
    if (_clinicId != id) { _clinicId = id; loadEntries(); }
  }

  Future<void> loadEntries() async {
    if (_clinicId == null) return;
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await StaffApiService.getQueueEntries(clinicId: _clinicId);
      _entries = data
          .map((e) => QueueModel.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.joinedAtRaw.compareTo(b.joinedAtRaw));
    } on StaffApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = 'Failed to load queue.';
    } finally {
      _loading = false; notifyListeners();
    }
  }

  // Optimistic status update + server call
  Future<void> updateStatus(String entryId, String status) async {
    _optimisticUpdate(entryId, status);
    try {
      switch (status) {
        case 'serving':   await StaffApiService.callPatient(entryId);     break;
        case 'done':
        case 'completed': await StaffApiService.completePatient(entryId); break;
        case 'skipped':   await StaffApiService.skipPatient(entryId);     break;
        case 'no_show':   await StaffApiService.markNoShow(entryId);      break;
        case 'cancelled': await StaffApiService.cancelQueue(entryId);     break;
      }
      // Refresh to get authoritative state
      await loadEntries();
    } on StaffApiException catch (e) {
      _error = e.message; notifyListeners();
      await loadEntries(); // revert to server state
    }
  }

  void _optimisticUpdate(String id, String status) {
    final idx = _entries.indexWhere((e) => e.id == id);
    if (idx < 0) return;
    final old = _entries[idx];
    _entries[idx] = QueueModel(
      id: old.id, queueNumber: old.queueNumber,
      patientName: old.patientName, patientPhone: old.patientPhone,
      patientType: old.patientType, serviceName: old.serviceName,
      queueType: old.queueType, status: status,
      joinedAt: old.joinedAt, joinedAtRaw: old.joinedAtRaw,
      isPriority: old.isPriority, notes: old.notes,
      estimatedWaitMinutes: old.estimatedWaitMinutes,
    );
    notifyListeners();
  }

  Future<void> addPatient({
    required String patientName,
    required String serviceName,
    String patientPhone = '',
    String patientType  = 'Regular',
    String notes        = '',
  }) async {
    if (_clinicId == null) return;
    try {
      await StaffApiService.addWalkIn(
        clinicId: _clinicId!,
        patientName: patientName,
        serviceName: serviceName,
        patientPhone: patientPhone.isEmpty ? null : patientPhone,
        patientType:  patientType,
        notes:        notes.isEmpty ? null : notes,
      );
      await loadEntries();
    } on StaffApiException catch (e) {
      _error = e.message; notifyListeners();
    }
  }
}
