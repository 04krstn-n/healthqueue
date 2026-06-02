import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/constants/app_colors.dart';
import '../services/clinic_service.dart';
import '../services/api_service.dart';
import '../models/queue_models.dart';

class JoinQueueScreen extends StatefulWidget {
  const JoinQueueScreen({super.key});

  @override
  State<JoinQueueScreen> createState() => _JoinQueueScreenState();
}

class _JoinQueueScreenState extends State<JoinQueueScreen> {
  int step = 1;
  bool _isLoading = false;

  List<Clinic> clinics = [];
  Clinic? selectedClinic;
  String? selectedService;

  final fullNameCtrl = TextEditingController();
  final contactCtrl = TextEditingController();
  PatientType patientType = PatientType.regular;

  bool _didLoadArgs = false;

  @override
  void initState() {
    super.initState();
    _loadClinics();
  }

  Future<void> _loadClinics() async {
    setState(() => _isLoading = true);
    try {
      final fetched = await ClinicService.getDirectory();
      setState(() {
        clinics = fetched;
      });
    } catch (e) {
      debugPrint('Error loading clinics: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didLoadArgs) return;
    _didLoadArgs = true;

    final appState = context.read<AppState>();
    final user = appState.currentUser;

    if (user != null) {
      if (fullNameCtrl.text.trim().isEmpty) fullNameCtrl.text = user.fullName;
      if (contactCtrl.text.trim().isEmpty) contactCtrl.text = user.phone;
    }
  }

  @override
  void dispose() {
    fullNameCtrl.dispose();
    contactCtrl.dispose();
    super.dispose();
  }

  void _goBack() {
    if (step == 1) {
      Navigator.pop(context);
    } else {
      setState(() => step -= 1);
    }
  }

  void _continue() {
    if (step == 1) {
      if (selectedClinic == null) return;
      setState(() => step = 2);
      return;
    }

    if (step == 2) {
      if (selectedService == null) return;
      setState(() => step = 3);
      return;
    }
  }

  Future<void> _confirmAndJoin() async {
    if (selectedClinic == null || selectedService == null) return;

    if (fullNameCtrl.text.trim().isEmpty || contactCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please complete your information.")),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await ApiService.joinQueue(
        clinicId: selectedClinic!.id,
        serviceName: selectedService!,
      );

      final entry = res['entry'] ?? {};
      final qNum = entry['queueNumber'] ?? 'N/A';
      
      final user = context.read<AppState>().currentUser;
      final patientName = user?.fullName ?? fullNameCtrl.text.trim();
      final patientEmail = user?.email;
      final patientPhone = user?.phone ?? contactCtrl.text.trim();

      final result = QueueJoinResult(
        id: res['entry']?['_id'],

        patientName: patientName,
        patientEmail: patientEmail,
        patientPhone: patientPhone,
        departmentId: selectedClinic!.id,
        departmentName: selectedClinic!.name,
        serviceId: selectedService!.toLowerCase().replaceAll(' ', '-'),
        serviceName: selectedService!,
        doctorId: null,
        doctorName: null,
        queueType: patientType == PatientType.priority ? QueueType.priority : QueueType.regular,
        queueNumber: qNum,
        position: res['position'] ?? 5,
        totalAhead: (res['position'] ?? 5) - 1,
        estimatedWaitTimeMinutes: res['estimatedWaitTime'] ?? 30,
        joinedAt: DateTime.now(),
      );

      if (mounted) {
        Navigator.pop(context, result);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && clinics.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final subtitle = step == 1
        ? "Choose a clinic for your visit"
        : step == 2
            ? "Choose a specific service"
            : "Enter your details";

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: _isLoading ? null : _goBack,
        ),
        title: const Text("Queue", style: TextStyle(fontWeight: FontWeight.w900)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Column(
            children: [
              const Divider(height: 1, color: AppColors.border),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        subtitle,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    _StepPill(step: step, total: 3),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: step == 1
            ? _StepSelectClinic(
                clinics: clinics,
                selectedClinicId: selectedClinic?.id,
                onSelect: (c) => setState(() {
                  selectedClinic = c;
                  selectedService = null;
                }),
              )
            : step == 2
                ? _StepSelectService(
                    clinic: selectedClinic!,
                    selectedService: selectedService,
                    onSelect: (s) => setState(() => selectedService = s),
                  )
                : _StepDetailsForm(
                    clinic: selectedClinic!,
                    serviceLabel: "${selectedClinic!.name} — $selectedService",
                    fullNameCtrl: fullNameCtrl,
                    contactCtrl: contactCtrl,
                    patientType: patientType,
                    onPatientTypeChanged: (p) => setState(() => patientType = p),
                    isLoading: _isLoading,
                    onConfirm: _confirmAndJoin,
                  ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: step == 3
          ? null
          : Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: (step == 1 && selectedClinic == null) ||
                          (step == 2 && selectedService == null) || _isLoading
                      ? null
                      : _continue,
                  child: const Text("Continue", style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ),
            ),
    );
  }
}

class _StepPill extends StatelessWidget {
  final int step;
  final int total;
  const _StepPill({required this.step, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        "Step $step of $total",
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _StepSelectClinic extends StatelessWidget {
  final List<Clinic> clinics;
  final String? selectedClinicId;
  final void Function(Clinic) onSelect;

  const _StepSelectClinic({
    required this.clinics,
    required this.selectedClinicId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    if (clinics.isEmpty) {
      return const Center(child: Text("No clinics found from server.", style: TextStyle(color: AppColors.textMuted)));
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Select Clinic",
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            "Choose a clinic for your visit",
            style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.only(bottom: 90),
              itemCount: clinics.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.05,
              ),
              itemBuilder: (context, i) {
                final d = clinics[i];
                final selected = selectedClinicId == d.id;

                final borderColor = selected ? AppColors.primary : AppColors.border;
                final borderWidth = selected ? 1.6 : 1.0;
                
                IconData iconData = Icons.local_hospital;
                if (d.name.toLowerCase().contains("dental")) iconData = Icons.health_and_safety;
                if (d.name.toLowerCase().contains("cardio")) iconData = Icons.monitor_heart;

                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => onSelect(d),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: borderColor, width: borderWidth),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.10),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(iconData, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          d.name,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: AppColors.textDark,
                            fontSize: 13,
                            height: 1.15,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _StepSelectService extends StatelessWidget {
  final Clinic clinic;
  final String? selectedService;
  final void Function(String) onSelect;

  const _StepSelectService({
    required this.clinic,
    required this.selectedService,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final list = clinic.services;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Select Service",
            style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textDark),
          ),
          const SizedBox(height: 6),
          const Text(
            "Choose a specific service",
            style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: list.isEmpty
                ? const Center(
                    child: Text(
                      "No services available for this clinic yet.",
                      style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700),
                    ),
                  )
                : ListView.separated(
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final s = list[i];
                      final isSelected = selectedService == s;

                      return InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => onSelect(s),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.border,
                              width: isSelected ? 1.4 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.03),
                                blurRadius: 10,
                                offset: const Offset(0, 6),
                              )
                            ],
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  s,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.textDark,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _StepDetailsForm extends StatelessWidget {
  final Clinic clinic;
  final String serviceLabel;

  final TextEditingController fullNameCtrl;
  final TextEditingController contactCtrl;

  final PatientType patientType;
  final void Function(PatientType) onPatientTypeChanged;

  final bool isLoading;
  final VoidCallback onConfirm;

  const _StepDetailsForm({
    required this.clinic,
    required this.serviceLabel,
    required this.fullNameCtrl,
    required this.contactCtrl,
    required this.patientType,
    required this.onPatientTypeChanged,
    required this.isLoading,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Selected",
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  serviceLabel,
                  style: const TextStyle(color: AppColors.textDark, fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Text("Personal Information", style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          TextField(
            controller: fullNameCtrl,
            readOnly: context.watch<AppState>().currentUser != null || isLoading,
            decoration: const InputDecoration(hintText: "Juan Dela Cruz"),
          ),
          const SizedBox(height: 12),
          const Text("Contact Number", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
          const SizedBox(height: 6),
          TextField(
            controller: contactCtrl,
            keyboardType: TextInputType.phone,
            readOnly: isLoading,
            decoration: const InputDecoration(hintText: "+63 917 123 4567"),
          ),
          const SizedBox(height: 12),
          const Text("Patient Type", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: _PatientTypeChip(
                  title: "Regular",
                  subtitle: "Standard",
                  selected: patientType == PatientType.regular,
                  accent: const Color.fromARGB(255, 93, 155, 226),
                  onTap: () => isLoading ? null : onPatientTypeChanged(PatientType.regular),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _PatientTypeChip(
                  title: "Priority",
                  subtitle: "PWD / Senior",
                  selected: patientType == PatientType.priority,
                  accent: const Color.fromARGB(255, 226, 126, 93),
                  onTap: () => isLoading ? null : onPatientTypeChanged(PatientType.priority),
                ),
              ),
            ],
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: isLoading ? null : onConfirm,
                child: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Text(
                        "Join Queue",
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PatientTypeChip extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool selected;
  final Color accent;
  final VoidCallback onTap;

  const _PatientTypeChip({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.accent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? accent : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
          color: selected ? accent.withOpacity(0.06) : Colors.white,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                  color: selected ? accent : AppColors.textMuted,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: selected ? accent : AppColors.textDark,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
