import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/sidebar/staff_sidebar.dart';

class WaitingTimeUpdateScreen extends StatefulWidget {
  const WaitingTimeUpdateScreen({super.key});
  @override
  State<WaitingTimeUpdateScreen> createState() => _WaitingTimeUpdateScreenState();
}

class _WaitingTimeUpdateScreenState extends State<WaitingTimeUpdateScreen> {
  bool    _loading    = false;
  bool    _saving     = false;
  bool    _aiLoading  = false;
  String? _error;
  String? _successMsg;
  Map<String, dynamic>? _clinicData;
  Map<String, dynamic>? _metrics;
  final Map<String, int> _serviceDurations = {};
  String? _selectedServiceId;
  String? _aiSuggestion;
  int?    _aiSuggestedMinutes;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final clinicId = context.read<AuthProvider>().staff?.clinicId;
    if (clinicId == null) {
      setState(() => _error = 'No clinic assigned to this account.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        StaffApiService.getClinic(clinicId),
        StaffApiService.getQueueMetrics(clinicId),
      ]);
      final clinic  = results[0] as Map<String, dynamic>;
      final metrics = results[1] as Map<String, dynamic>;
      final services = (clinic['services'] as List? ?? []).cast<Map<String, dynamic>>();
      for (final s in services) {
        final id  = s['_id']?.toString() ?? '';
        final dur = (s['durationMinutes'] ?? 30) as int;
        _serviceDurations[id] = dur;
      }
      setState(() {
        _clinicData = clinic;
        _metrics    = metrics;
        if (services.isNotEmpty && _selectedServiceId == null) {
          _selectedServiceId = services.first['_id']?.toString();
        }
      });
    } on StaffApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to load clinic info.');
    } finally {
      setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _services =>
      (_clinicData?['services'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .where((s) => s['isAvailable'] == true)
          .toList();

  Map<String, dynamic>? get _selectedService => _selectedServiceId == null
      ? null
      : _services.where((s) => s['_id']?.toString() == _selectedServiceId).firstOrNull;

  int get _currentDuration => _serviceDurations[_selectedServiceId ?? ''] ?? 30;

  Future<void> _getAiSuggestion() async {
    if (_selectedService == null) return;
    setState(() { _aiLoading = true; _aiSuggestion = null; _aiSuggestedMinutes = null; });
    try {
      final svcName  = _selectedService!['name']?.toString() ?? '';
      final waiting  = (_metrics?['waitingCount']  ?? _metrics?['activeQueue'] ?? 0) as int;
      final avgToday = (_metrics?['avgWaitTime']   ?? 0) as int;
      final current  = _currentDuration;

      int suggested;
      String reason;

      if (waiting > 10) {
        suggested = (current * 0.85).round().clamp(5, 120);
        reason = 'High queue load ($waiting waiting). Reducing to $suggested min per patient helps clear the backlog and reduces overall wait time.';
      } else if (waiting < 3) {
        suggested = (current * 1.1).round().clamp(5, 120);
        reason = 'Low queue load ($waiting waiting). Slightly longer duration ($suggested min) allows more thorough care per patient.';
      } else if (avgToday > 0 && avgToday > current * 2) {
        suggested = (avgToday * 0.7).round().clamp(5, 120);
        reason = 'Average wait today ($avgToday min) is much higher than current duration. Adjusting to $suggested min better reflects actual turnaround.';
      } else {
        suggested = current;
        reason = 'Current duration ($current min) is well-balanced for today\'s queue load of $waiting patients.';
      }

      setState(() {
        _aiSuggestedMinutes = suggested;
        _aiSuggestion = 'Service: $svcName\n$reason';
      });
    } catch (e) {
      setState(() => _aiSuggestion = 'Unable to compute suggestion. Please try again.');
    } finally {
      setState(() => _aiLoading = false);
    }
  }

  Future<void> _save() async {
    final clinicId = context.read<AuthProvider>().staff?.clinicId;
    if (clinicId == null || _selectedServiceId == null) return;
    setState(() { _saving = true; _error = null; _successMsg = null; });
    try {
      await StaffApiService.updateServiceDuration(
          clinicId, _selectedServiceId!, _currentDuration);
      setState(() => _successMsg =
          'Duration for "${_selectedService?['name']}" updated to $_currentDuration min.');
    } on StaffApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to update. Please try again.');
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth      = context.watch<AuthProvider>();
    final clinicName = _clinicData?['name']?.toString() ?? 'Your Clinic';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Row(children: [
        StaffSidebar(staffName: auth.staff?.fullName ?? 'Staff',
            staffRole: auth.staff?.role ?? 'STAFF'),
        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(width: 42, height: 42,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                            colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                        borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.timer_outlined, color: Colors.white, size: 22)),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      const Text('Waiting Time Update',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800,
                            color: Color(0xFF111827))),
                      Text(clinicName,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                    ])),
                    IconButton(onPressed: _load,
                        icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280))),
                  ]),
                  const SizedBox(height: 18),

                  if (_error != null)     _banner(_error!, isError: true),
                  if (_successMsg != null) _banner(_successMsg!, isError: false),

                  if (_services.isEmpty)
                    _infoBox('No services found for this clinic.',
                        Icons.warning_amber_outlined, const Color(0xFFF97316))
                  else ...[
                    _secLabel('Select Service'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8, runSpacing: 8,
                      children: _services.map((s) {
                        final id     = s['_id']?.toString() ?? '';
                        final name   = s['name']?.toString() ?? '';
                        final active = _selectedServiceId == id;
                        return GestureDetector(
                          onTap: () => setState(() {
                            _selectedServiceId   = id;
                            _aiSuggestion        = null;
                            _aiSuggestedMinutes  = null;
                          }),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: active ? const Color(0xFF2563EB) : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: active
                                    ? const Color(0xFF2563EB)
                                    : const Color(0xFFE5E7EB)),
                              boxShadow: [BoxShadow(
                                  color: Colors.black.withOpacity(0.04), blurRadius: 4)]),
                            child: Text(name,
                              style: TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w700,
                                color: active ? Colors.white : const Color(0xFF374151))),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 22),

                    if (_selectedService != null) ...[
                      _secLabel('Duration for "${_selectedService!['name']}"'),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [BoxShadow(
                              color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
                        child: Column(children: [
                          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            _stepBtn(Icons.remove, () {
                              if (_currentDuration > 1)
                                setState(() => _serviceDurations[_selectedServiceId!] =
                                    _currentDuration - 1);
                            }),
                            Container(
                              width: 110, height: 76,
                              margin: const EdgeInsets.symmetric(horizontal: 20),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: const Color(0xFFBFDBFE), width: 1.5)),
                              child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                Text('$_currentDuration',
                                  style: const TextStyle(fontSize: 38,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF2563EB))),
                                const Text('minutes',
                                  style: TextStyle(fontSize: 11,
                                      color: Color(0xFF6B7280))),
                              ])),
                            _stepBtn(Icons.add, () => setState(() =>
                                _serviceDurations[_selectedServiceId!] =
                                    _currentDuration + 1)),
                          ]),
                          const SizedBox(height: 14),
                          Slider(
                            value: _currentDuration.toDouble(),
                            min: 1, max: 120, divisions: 119,
                            label: '$_currentDuration min',
                            activeColor: const Color(0xFF2563EB),
                            onChanged: (v) => setState(() =>
                                _serviceDurations[_selectedServiceId!] = v.round())),
                          Wrap(
                            spacing: 8,
                            children: [5, 10, 15, 20, 30, 45, 60].map((m) =>
                              ActionChip(
                                label: Text('$m min'),
                                backgroundColor: _currentDuration == m
                                    ? const Color(0xFF2563EB)
                                    : const Color(0xFFF3F4F6),
                                labelStyle: TextStyle(
                                  color: _currentDuration == m
                                      ? Colors.white : const Color(0xFF374151),
                                  fontWeight: FontWeight.w600, fontSize: 12),
                                onPressed: () => setState(() =>
                                    _serviceDurations[_selectedServiceId!] = m),
                              )).toList()),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity, height: 48,
                            child: ElevatedButton.icon(
                              onPressed: _saving ? null : _save,
                              icon: _saving
                                  ? const SizedBox(width: 16, height: 16,
                                      child: CircularProgressIndicator(
                                          color: Colors.white, strokeWidth: 2))
                                  : const Icon(Icons.save_outlined, size: 18),
                              label: Text(_saving ? 'Saving...' : 'Update Duration'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12))))),
                        ]),
                      ),
                      const SizedBox(height: 20),

                      // AI suggestion card
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE0E7FF)),
                          boxShadow: [BoxShadow(
                              color: Colors.black.withOpacity(0.04), blurRadius: 6)]),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Row(children: [
                            Container(width: 32, height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(9)),
                              child: const Icon(Icons.auto_awesome_rounded,
                                  color: Color(0xFF6366F1), size: 18)),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text('AI Duration Suggestion',
                                  style: TextStyle(fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF111827))),
                                Text('Based on queue load, avg wait & clinic hours',
                                  style: TextStyle(fontSize: 11,
                                      color: Color(0xFF6B7280))),
                              ])),
                            ElevatedButton.icon(
                              onPressed: _aiLoading ? null : _getAiSuggestion,
                              icon: _aiLoading
                                  ? const SizedBox(width: 13, height: 13,
                                      child: CircularProgressIndicator(
                                          color: Colors.white, strokeWidth: 2))
                                  : const Icon(Icons.bolt_rounded, size: 14),
                              label: Text(_aiLoading ? 'Analyzing...' : 'Get Suggestion'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 13, vertical: 8),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(9)))),
                          ]),
                          if (_aiSuggestion != null) ...[
                            const SizedBox(height: 14),
                            const Divider(color: Color(0xFFF3F4F6)),
                            const SizedBox(height: 10),
                            Row(crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              const Icon(Icons.lightbulb_outline_rounded,
                                  color: Color(0xFF6366F1), size: 15),
                              const SizedBox(width: 8),
                              Expanded(child: Text(_aiSuggestion!,
                                style: const TextStyle(fontSize: 13,
                                    color: Color(0xFF374151), height: 1.5))),
                            ]),
                            if (_aiSuggestedMinutes != null &&
                                _aiSuggestedMinutes != _currentDuration) ...[
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity, height: 40,
                                child: OutlinedButton.icon(
                                  onPressed: () => setState(() =>
                                    _serviceDurations[_selectedServiceId!] =
                                        _aiSuggestedMinutes!),
                                  icon: const Icon(Icons.check_circle_outline,
                                      size: 15),
                                  label: Text(
                                      'Apply suggestion ($_aiSuggestedMinutes min)'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF6366F1),
                                    side: const BorderSide(
                                        color: Color(0xFF6366F1)),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(9))))),
                            ],
                          ] else ...[
                            const SizedBox(height: 12),
                            const Text(
                              'Tap "Get Suggestion" to compute optimal duration '
                              'based on waiting patients, average turnaround time, '
                              'and clinic operating hours.',
                              style: TextStyle(fontSize: 12,
                                  color: Color(0xFF9CA3AF), height: 1.5)),
                          ],
                        ]),
                      ),
                    ],
                  ],
                ]),
              ),
        ),
      ]),
    );
  }

  Widget _stepBtn(IconData icon, VoidCallback fn) => InkWell(
    onTap: fn,
    borderRadius: BorderRadius.circular(10),
    child: Container(
      width: 46, height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB))),
      child: Icon(icon, color: const Color(0xFF374151), size: 21)));

  Widget _banner(String msg, {required bool isError}) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
    decoration: BoxDecoration(
      color: isError ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(
          color: isError
              ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0))),
    child: Row(children: [
      Icon(isError ? Icons.error_outline : Icons.check_circle_outline,
          color: isError ? Colors.red : const Color(0xFF16A34A), size: 15),
      const SizedBox(width: 8),
      Expanded(child: Text(msg,
        style: TextStyle(fontSize: 12,
            color: isError ? Colors.red : const Color(0xFF15803D)))),
    ]));

  Widget _infoBox(String msg, IconData icon, Color c) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: c.withOpacity(0.05),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: c.withOpacity(0.25))),
    child: Row(children: [
      Icon(icon, color: c, size: 16),
      const SizedBox(width: 8),
      Expanded(child: Text(msg,
          style: TextStyle(fontSize: 12, color: c))),
    ]));

  Widget _secLabel(String t) => Text(t,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
        color: Color(0xFF111827)));
}
