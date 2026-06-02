import 'package:flutter/material.dart';
import '../core/routes/app_routes.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../models/appointment_models.dart' as apt;
import '../models/queue_models.dart';
import '../services/api_service.dart';
import '../services/clinic_service.dart';
import '../state/app_state.dart';

/// Route argument: pass a [Clinic] object when navigating here.
/// Navigator.pushNamed(context, AppRoutes.bookAppointment, arguments: clinic)
class BookAppointmentScreen extends StatefulWidget {
  const BookAppointmentScreen({super.key});
  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  int _step = 1; // 1 = service, 2 = schedule, 3 = confirm

  Clinic? _clinic;

  // ADDED: For manual selection if no clinic passed
  List<Clinic> _allClinics = [];
  bool _fetchingClinics = false;

  // Step 1
  String? _selectedServiceName;

  // Step 2
  DateTime? _selectedDate;
  String?   _selectedTime;
  List<String> _availableSlots = [];
  bool _slotsLoading = false;

  // Step 3
  PatientType _patientType = PatientType.regular;
  final _notesCtrl = TextEditingController();

  bool _booking = false;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Clinic && _clinic == null) {
      setState(() => _clinic = args);
    } else if (_clinic == null && !_fetchingClinics) {
      _loadAllClinics(); // Fetch them if none provided
    }
  }

  Future<void> _loadAllClinics() async {
    setState(() => _fetchingClinics = true);
    try {
      final list = await ClinicService.getDirectory();
      if (mounted) setState(() => _allClinics = list);
    } finally {
      if (mounted) setState(() => _fetchingClinics = false);
    }
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  List<String> get _services {
    return _clinic?.services
        .where((s) => s.isNotEmpty)
        .toList() ?? [];
  }

  Future<void> _loadSlots() async {
    if (_clinic == null || _selectedDate == null) return;
    setState(() { _slotsLoading = true; _availableSlots = []; _selectedTime = null; });
    try {
      final dateStr =
          '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2,'0')}-${_selectedDate!.day.toString().padLeft(2,'0')}';
      final raw = await ApiService.getAvailableSlots(
        clinicId: _clinic!.id,
        date: dateStr,
      );
      // slots can be List<String> or List<Map>
      final slots = raw.map((s) {
        if (s is String) return s;
        if (s is Map)    return s['time']?.toString() ?? s['label']?.toString() ?? '';
        return '';
      }).where((s) => s.isNotEmpty).toList();

      setState(() => _availableSlots = slots.isEmpty
          ? ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM']
          : List<String>.from(slots));
    } catch (_) {
      // Fallback slots if server doesn't have the endpoint configured
      setState(() => _availableSlots = [
        '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
        '1:00 PM','2:00 PM','3:00 PM','4:00 PM',
      ]);
    } finally {
      setState(() => _slotsLoading = false);
    }
  }

  bool get _canProceedStep1 => _selectedServiceName != null;
  bool get _canProceedStep2 => _selectedDate != null && _selectedTime != null;
  bool get _canConfirm      => _canProceedStep1 && _canProceedStep2;

  void _back() {
    if (_step == 1) { Navigator.pop(context); return; }
    setState(() => _step--);
  }

  void _next() {
    if (_step == 1 && _canProceedStep1) { setState(() => _step = 2); return; }
    if (_step == 2 && _canProceedStep2) { setState(() => _step = 3); return; }
  }

  Future<void> _confirm() async {
    if (!_canConfirm || _booking) return;
    setState(() { _booking = true; _error = null; });
    try {
      final dateStr =
          '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2,'0')}-${_selectedDate!.day.toString().padLeft(2,'0')}';

      final res = await ApiService.bookAppointment({
        'clinicId':       _clinic!.id,
        'serviceName':    _selectedServiceName,
        'appointmentDate': dateStr,
        'timeSlot':       _selectedTime,
        'patientType':    _patientType == PatientType.priority ? 'Priority' : 'Regular',
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
      });

      // Build local Appointment object from server response
      final m = res is Map<String, dynamic> ? res : <String, dynamic>{};
      final appt = apt.Appointment(
        id:          m['_id'] ?? m['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        clinicName:  _clinic!.name,
        serviceName: _selectedServiceName ?? '',
        date:        _selectedDate!,
        timeLabel:   _selectedTime ?? '',
        status:      apt.AppointmentStatus.pending,
        notes:       _notesCtrl.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Appointment booked successfully!'),
            backgroundColor: Colors.green.shade600,
          ),
        );
        Navigator.pop(context, appt);
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stepLabels = ['Select Service', 'Choose Schedule', 'Confirm'];
    final subtitle   = stepLabels[_step - 1];

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: _back,
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Book Appointment',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            if (_clinic != null)
              Text(_clinic!.name,
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted,
                      fontWeight: FontWeight.w500)),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Column(children: [
            const Divider(height: 1, color: AppColors.border),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(children: [
                Expanded(child: Text(subtitle,
                    style: const TextStyle(color: AppColors.textMuted,
                        fontSize: 12.5, fontWeight: FontWeight.w600))),
                _StepPill(current: _step, total: 3),
              ]),
            ),
          ]),
        ),
      ),
      body: SafeArea(
        child: _fetchingClinics
            ? const Center(child: CircularProgressIndicator())
            : (_clinic == null
                ? _ClinicSelectionList(
                    clinics: _allClinics,
                    onSelect: (c) => setState(() => _clinic = c),
                  )
                : (_step == 1
                    ? _StepService(
                        services: _services,
                        selected: _selectedServiceName,
                        onSelect: (s) => setState(() => _selectedServiceName = s),
                      )
                    : _step == 2
                        ? _StepSchedule(
                            selectedDate: _selectedDate,
                            selectedTime: _selectedTime,
                            availableSlots: _availableSlots,
                            slotsLoading: _slotsLoading,
                            onPickDate: (d) async {
                              setState(() { _selectedDate = d; _selectedTime = null; });
                              await _loadSlots();
                            },
                            onSelectTime: (t) => setState(() => _selectedTime = t),
                          )
                        : _StepConfirm(
                            clinic: _clinic!,
                            serviceName: _selectedServiceName!,
                            date: _selectedDate!,
                            time: _selectedTime!,
                            patientType: _patientType,
                            onPatientType: (p) => setState(() => _patientType = p),
                            notesCtrl: _notesCtrl,
                            error: _error,
                            booking: _booking,
                            onConfirm: _confirm,
                          ))),
      ),
      bottomNavigationBar: _step < 3
          ? Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: (_step == 1 && !_canProceedStep1) ||
                             (_step == 2 && !_canProceedStep2)
                      ? null
                      : _next,
                  child: Text(_step == 2 ? 'Review Booking' : 'Continue',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ),
            )
          : null,
    );
  }
}

// ── Step 1: Service Selection ─────────────────────────────────────────────────
class _StepService extends StatelessWidget {
  final List<String> services;
  final String?      selected;
  final void Function(String) onSelect;

  const _StepService({required this.services, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (services.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('No services available for this clinic.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: services.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) {
        final svc    = services[i];
        final isSelected = svc == selected;
        return GestureDetector(
          onTap: () => onSelect(svc),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              color:        isSelected ? AppColors.primary.withOpacity(0.08) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border:       Border.all(
                color: isSelected ? AppColors.primary : AppColors.border,
                width: isSelected ? 2 : 1,
              ),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
            ),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : const Color(0xFFF0F4FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.medical_services_outlined,
                    size: 20,
                    color: isSelected ? Colors.white : AppColors.primary),
              ),
              const SizedBox(width: 14),
              Expanded(child: Text(svc,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: isSelected ? AppColors.primary : AppColors.textDark,
                  ))),
              if (isSelected)
                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 22),
            ]),
          ),
        );
      },
    );
  }
}

// ── Step 2: Date & Time ───────────────────────────────────────────────────────
class _StepSchedule extends StatelessWidget {
  final DateTime?      selectedDate;
  final String?        selectedTime;
  final List<String>   availableSlots;
  final bool           slotsLoading;
  final void Function(DateTime) onPickDate;
  final void Function(String)   onSelectTime;

  const _StepSchedule({
    required this.selectedDate, required this.selectedTime,
    required this.availableSlots, required this.slotsLoading,
    required this.onPickDate,    required this.onSelectTime,
  });

  Future<void> _pick(BuildContext ctx) async {
    final now    = DateTime.now();
    final picked = await showDatePicker(
      context: ctx,
      initialDate: now.add(const Duration(days: 1)),
      firstDate:   now,
      lastDate:    now.add(const Duration(days: 60)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.primary)),
        child: child!,
      ),
    );
    if (picked != null) onPickDate(picked);
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Date picker card
        GestureDetector(
          onTap: () => _pick(context),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6)],
            ),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.calendar_today_outlined,
                    color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Appointment Date',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                Text(
                  selectedDate == null ? 'Tap to select date' : _fmtDate(selectedDate!),
                  style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 15,
                    color: selectedDate == null ? AppColors.textMuted : AppColors.textDark,
                  ),
                ),
              ])),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
            ]),
          ),
        ),

        const SizedBox(height: 20),
        const Text('Available Time Slots',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14,
                color: AppColors.textDark)),
        const SizedBox(height: 12),

        if (selectedDate == null)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('Select a date first to see available slots.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
          )
        else if (slotsLoading)
          const Center(child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ))
        else
          Wrap(spacing: 10, runSpacing: 10,
            children: availableSlots.map((slot) {
              final picked = slot == selectedTime;
              return GestureDetector(
                onTap: () => onSelectTime(slot),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color:  picked ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: picked ? AppColors.primary : AppColors.border,
                      width: picked ? 2 : 1,
                    ),
                  ),
                  child: Text(slot,
                      style: TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 13,
                        color: picked ? Colors.white : AppColors.textDark,
                      )),
                ),
              );
            }).toList(),
          ),
      ]),
    );
  }
}

// ── Step 3: Confirm ───────────────────────────────────────────────────────────
class _StepConfirm extends StatelessWidget {
  final Clinic      clinic;
  final String      serviceName;
  final DateTime    date;
  final String      time;
  final PatientType patientType;
  final void Function(PatientType) onPatientType;
  final TextEditingController notesCtrl;
  final String?     error;
  final bool        booking;
  final VoidCallback onConfirm;

  const _StepConfirm({
    required this.clinic, required this.serviceName, required this.date,
    required this.time,   required this.patientType, required this.onPatientType,
    required this.notesCtrl, required this.error, required this.booking,
    required this.onConfirm,
  });

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Summary card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Booking Summary',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 16),
            _Row(icon: Icons.local_hospital_outlined, label: 'Clinic',   value: clinic.name),
            _Row(icon: Icons.medical_services_outlined, label: 'Service', value: serviceName),
            _Row(icon: Icons.calendar_today_outlined,  label: 'Date',    value: _fmtDate(date)),
            _Row(icon: Icons.access_time_outlined,     label: 'Time',    value: time),
            _Row(icon: Icons.location_on_outlined,     label: 'Address', value: clinic.address),
          ]),
        ),

        const SizedBox(height: 16),

        // Patient type
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Patient Type',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 12),
            Row(children: [
              _TypeChip(
                label: 'Regular', selected: patientType == PatientType.regular,
                onTap: () => onPatientType(PatientType.regular),
              ),
              const SizedBox(width: 10),
              _TypeChip(
                label: 'Priority', selected: patientType == PatientType.priority,
                color: Colors.orange.shade600,
                onTap: () => onPatientType(PatientType.priority),
              ),
            ]),
          ]),
        ),

        const SizedBox(height: 16),

        // Notes
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Notes (optional)',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 10),
            TextField(
              controller: notesCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Any special notes or symptoms...',
                hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ]),
        ),

        if (error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50, borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13))),
            ]),
          ),
        ],

        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity, height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: booking ? null : onConfirm,
            child: booking
                ? const SizedBox(width: 22, height: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : const Text('Confirm Appointment',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon; final String label, value;
  const _Row({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 16, color: AppColors.textMuted),
      const SizedBox(width: 10),
      SizedBox(width: 70,
        child: Text(label, style: const TextStyle(
            color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600))),
      Expanded(child: Text(value,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
              color: AppColors.textDark))),
    ]),
  );
}

class _TypeChip extends StatelessWidget {
  final String label; final bool selected; final VoidCallback onTap;
  final Color? color;
  const _TypeChip({required this.label, required this.selected,
      required this.onTap, this.color});
  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.primary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? c.withOpacity(0.12) : const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? c : Colors.transparent, width: 2),
        ),
        child: Text(label, style: TextStyle(
          fontWeight: FontWeight.w700, fontSize: 13,
          color: selected ? c : AppColors.textMuted,
        )),
      ),
    );
  }
}

class _StepPill extends StatelessWidget {
  final int current, total;
  const _StepPill({required this.current, required this.total});
  @override
  Widget build(BuildContext context) => Row(
    children: List.generate(total, (i) => Container(
      width: i == current - 1 ? 24 : 8, height: 8,
      margin: const EdgeInsets.only(left: 4),
      decoration: BoxDecoration(
        color: i < current ? AppColors.primary : AppColors.border,
        borderRadius: BorderRadius.circular(99),
      ),
    )),
  );
}

class _NoClinicsSelected extends StatelessWidget {
  final VoidCallback onBack;
  const _NoClinicsSelected({required this.onBack});
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.local_hospital_outlined, size: 56, color: AppColors.textMuted),
        const SizedBox(height: 16),
        const Text('No clinic selected',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 8),
        const Text('Please select a clinic from the dashboard first.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: onBack,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary,
              foregroundColor: Colors.white),
          child: const Text('Go Back'),
        ),
      ]),
    ),
  );
}

class _ClinicSelectionList extends StatelessWidget {
  final List<Clinic> clinics;
  final void Function(Clinic) onSelect;
  const _ClinicSelectionList({required this.clinics, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: clinics.length,
      itemBuilder: (ctx, i) {
        final c = clinics[i];
        return Card(
          child: ListTile(
            title: Text(c.name),
            subtitle: Text(c.address),
            onTap: () => onSelect(c),
          ),
        );
      },
    );
  }
}
