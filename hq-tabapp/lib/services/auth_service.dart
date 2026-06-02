import '../models/staff_model.dart';
import 'api_service.dart';

class AuthService {
  Future<StaffModel> login(String email, String password) async {
    try {
      final response = await StaffApiService.login(email, password);
      final token    = response['token'];
      final userJson = response['user'] as Map<String, dynamic>? ?? {};

      if (token != null) {
        await StaffApiService.saveToken(token as String);
      }

      return StaffModel.fromJson(userJson);
    } catch (e) {
      if (e is StaffApiException) rethrow;
      throw Exception('Login failed. Please check your credentials.');
    }
  }
}
