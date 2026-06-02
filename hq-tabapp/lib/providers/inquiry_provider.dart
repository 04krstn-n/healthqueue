import 'package:flutter/material.dart';
import '../models/inquiry_model.dart';
import '../services/api_service.dart';

class InquiryProvider extends ChangeNotifier {
  List<InquiryModel> _inquiries = [];
  bool    _loading = false;
  String? _error;
  String  _query   = '';

  List<InquiryModel> get inquiries {
    if (_query.isEmpty) return _inquiries;
    final q = _query.toLowerCase();
    return _inquiries.where((i) =>
      i.message.toLowerCase().contains(q) ||
      i.patientName.toLowerCase().contains(q)
    ).toList();
  }

  bool    get isLoading => _loading;
  String? get error     => _error;

  Future<void> loadInquiries({String? clinicId}) async {
    _loading = true; _error = null; notifyListeners();
    try {
      // Fetch all logs — escalated ones come with isEscalated=true
      final data = await StaffApiService.getChatLogs();
      _inquiries = data
          .map((e) => InquiryModel.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } on StaffApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = 'Failed to load patient inquiries.';
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<void> resolveEscalation(String id, {String note = ''}) async {
    try {
      await StaffApiService.resolveEscalation(id, note: note);
      // Update locally
      final idx = _inquiries.indexWhere((i) => i.id == id);
      if (idx >= 0) {
        final old = _inquiries[idx];
        _inquiries[idx] = InquiryModel(
          id: old.id, message: old.message, reply: old.reply,
          patientName: old.patientName, createdAt: old.createdAt,
          isFallback: old.isFallback, source: old.source,
          isEscalated: old.isEscalated, escalationNote: old.escalationNote,
          resolvedByStaff: true, resolvedNote: note,
        );
        notifyListeners();
      }
    } on StaffApiException catch (e) {
      _error = e.message; notifyListeners();
    }
  }

  void search(String q) { _query = q; notifyListeners(); }
}
