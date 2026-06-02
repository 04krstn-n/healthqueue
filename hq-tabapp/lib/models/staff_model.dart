class StaffModel {
  final String id;
  final String fullName;
  final String email;
  final String role;
  final String? clinicId;   // nullable — super_admin may have no clinic

  StaffModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    this.clinicId,
  });

  factory StaffModel.fromJson(Map<String, dynamic> j) => StaffModel(
    id:       j['_id']?.toString() ?? j['id']?.toString() ?? '',
    fullName: j['fullName'] ?? 'Staff Member',
    email:    j['email'] ?? '',
    role:     j['role'] ?? 'staff',
    clinicId: j['clinicId']?.toString(),
  );
}
