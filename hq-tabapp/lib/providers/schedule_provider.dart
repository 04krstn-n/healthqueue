import 'package:flutter/material.dart';
import '../models/schedule_model.dart';
import '../services/api_service.dart';

class ScheduleProvider extends ChangeNotifier {
  List<ScheduleModel> _schedule = [];
  bool    _loading  = false;
  String? _error;
  String? _clinicId;

  List<ScheduleModel> get schedule  => _schedule;
  bool                get isLoading => _loading;
  String?             get error     => _error;

  void setClinicId(String id) {
    if (_clinicId != id) { _clinicId = id; loadSchedule(); }
  }

  Future<void> loadSchedule() async {
    if (_clinicId == null) return;
    _loading = true; _error = null; notifyListeners();
    try {
      // GET /api/appointments/today — scoped to clinic by auth role
      final data = await StaffApiService.getTodayAppointments(_clinicId!);
      _schedule = data
          .map((e) => ScheduleModel.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.time.compareTo(b.time));
    } on StaffApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = 'Failed to load schedule.';
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<void> updateAppointmentStatus(String id, String status) async {
    try {
      await StaffApiService.updateAppointmentStatus(id, status);
      final idx = _schedule.indexWhere((s) => s.id == id);
      if (idx >= 0) {
        final old = _schedule[idx];
        _schedule[idx] = ScheduleModel(
          id: old.id, time: old.time, timeRaw: old.timeRaw,
          service: old.service, patientName: old.patientName,
          patientPhone: old.patientPhone,
          status: status, type: old.type, clinicName: old.clinicName,
        );
        notifyListeners();
      }
    } on StaffApiException catch (e) {
      _error = e.message; notifyListeners();
    }
  }
}
