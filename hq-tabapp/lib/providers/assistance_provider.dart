import 'package:flutter/material.dart';
import '../models/queue_model.dart';
import '../services/api_service.dart';

/// Patient Assistance — shows today's queue so staff can assist walk-ins.
/// Assistance requests are managed locally (no dedicated server endpoint).
class AssistanceProvider extends ChangeNotifier {
  List<QueueModel>        _queue    = [];
  List<Map<String, dynamic>> _localRequests = [];
  bool    _loading  = false;
  String? _clinicId;
  String? _error;

  List<QueueModel>           get queue         => _queue;
  List<Map<String, dynamic>> get localRequests => _localRequests;
  bool                       get isLoading     => _loading;
  String?                    get error         => _error;

  void setClinicId(String id) {
    if (_clinicId != id) { _clinicId = id; loadQueue(); }
  }

  Future<void> loadQueue() async {
    if (_clinicId == null) return;
    _loading = true; _error = null; notifyListeners();
    try {
      final data = await StaffApiService.getQueueEntries(clinicId: _clinicId);
      _queue = data
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

  // Log a local assistance request (staff-side note only)
  void addLocalRequest(Map<String, dynamic> req) {
    _localRequests.insert(0, {
      ...req,
      'time':   _nowManila(),
      'status': 'Pending',
    });
    notifyListeners();
  }

  void resolveRequest(int index) {
    if (index >= 0 && index < _localRequests.length) {
      _localRequests[index]['status'] = 'Resolved';
      notifyListeners();
    }
  }

  static String _nowManila() {
    final manila = DateTime.now().toUtc().add(const Duration(hours: 8));
    final h = manila.hour % 12 == 0 ? 12 : manila.hour % 12;
    final m = manila.minute.toString().padLeft(2, '0');
    return '$h:$m ${manila.hour >= 12 ? 'PM' : 'AM'}';
  }
}
