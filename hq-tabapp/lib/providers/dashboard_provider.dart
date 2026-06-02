import 'package:flutter/material.dart';
import '../models/dashboard_model.dart';
import '../services/api_service.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardModel? _stats;
  bool   _loading  = false;
  String? _error;
  String? _clinicId;

  DashboardModel? get stats    => _stats;
  bool            get isLoading => _loading;
  String?         get error     => _error;

  void setClinicId(String id) {
    if (_clinicId != id) { _clinicId = id; loadStats(); }
  }

  Future<void> loadStats() async {
    if (_clinicId == null) return;
    _loading = true; _error = null; notifyListeners();
    try {
      final json = await StaffApiService.getFacilityStats(_clinicId!);
      _stats = DashboardModel.fromJson(json);
    } on StaffApiException catch (e) {
      _error = e.message;
    } catch (e) {
      _error = 'Failed to load dashboard.';
    } finally {
      _loading = false; notifyListeners();
    }
  }
}
