import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/routes/app_routes.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure       = true;
  String? _localError;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _localError = null);

    if (_emailCtrl.text.trim().isEmpty) {
      setState(() => _localError = 'Please enter your email.');
      return;
    }
    if (_passwordCtrl.text.trim().isEmpty) {
      setState(() => _localError = 'Please enter your password.');
      return;
    }

    final auth = context.read<AuthProvider>();
    await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text.trim());

    if (!mounted) return;
    if (auth.isAuthenticated) {
      Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Row(
          children: [
            // ── Left branding panel ──────────────────────────────────────
            Expanded(
              flex: 6,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0B63FF), Color(0xFF0537B8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Stack(
                  children: [
                    _bubble(70,  top: 100,  left: 30),
                    _bubble(50,  top: 160,  right: 40),
                    _bubble(28,  bottom: 130, left: 50),
                    _bubble(120, bottom: 160, right: 70),
                    _bubble(25,  top: 280,  right: 50),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'HealthQueue+',
                              style: TextStyle(
                                color: Colors.white, fontSize: 38,
                                fontWeight: FontWeight.w900, letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Staff Tablet Portal',
                              style: TextStyle(
                                color: Colors.white70, fontSize: 18,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 32),
                            const Text(
                              'Manage queues, assist patients,\nand keep care moving — all in one place.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white, fontSize: 15,
                                height: 1.6, fontWeight: FontWeight.w400,
                              ),
                            ),
                            const SizedBox(height: 40),
                            _statsRow(),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── Right login form ─────────────────────────────────────────
            Expanded(
              flex: 5,
              child: Container(
                color: Colors.white,
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 44, vertical: 24),
                    child: SizedBox(
                      width: 360,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Logo
                          Container(
                            width: 56, height: 56,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF2563EB), Color(0xFF004BFF)],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.3),
                                  blurRadius: 16, offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: const Icon(Icons.monitor_heart_rounded,
                                color: Colors.white, size: 30),
                          ),
                          const SizedBox(height: 20),
                          const Text('Staff Login',
                            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900,
                                color: Color(0xFF111827))),
                          const SizedBox(height: 6),
                          const Text('Sign in to access the staff portal',
                            style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                          const SizedBox(height: 32),

                          // Email
                          _label('Email Address'),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            decoration: _inputDecoration(
                              hint: 'staff@hqplus.com',
                              icon: Icons.email_outlined,
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Password
                          _label('Password'),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _passwordCtrl,
                            obscureText: _obscure,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _submit(),
                            decoration: _inputDecoration(
                              hint: '••••••••',
                              icon: Icons.lock_outline_rounded,
                            ).copyWith(
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: const Color(0xFF9CA3AF), size: 20,
                                ),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                          ),

                          // Error
                          if (_localError != null || auth.error != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.07),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.red.withOpacity(0.2)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: Colors.red, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _localError ?? auth.error!,
                                      style: const TextStyle(color: Colors.red, fontSize: 13),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 26),

                          // Login button
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              onPressed: auth.isLoading ? null : _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: auth.isLoading
                                ? const SizedBox(
                                    width: 22, height: 22,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 2.5),
                                  )
                                : const Text('Sign In',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            ),
                          ),

                          const SizedBox(height: 24),
                          const Divider(color: Color(0xFFE5E7EB)),
                          const SizedBox(height: 16),

                          // Role hint
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0F9FF),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFBAE6FD)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline_rounded,
                                    color: Color(0xFF0284C7), size: 16),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Use your facility admin or staff account credentials.',
                                    style: TextStyle(
                                        fontSize: 12, color: Color(0xFF0369A1)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bubble(double size, {double? top, double? left, double? right, double? bottom}) {
    return Positioned(
      top: top, left: left, right: right, bottom: bottom,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.08),
        ),
      ),
    );
  }

  Widget _statsRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _statChip('Queue', Icons.people_outline),
        const SizedBox(width: 16),
        _statChip('Appointments', Icons.calendar_today_outlined),
        const SizedBox(width: 16),
        _statChip('Analytics', Icons.bar_chart_outlined),
      ],
    );
  }

  Widget _statChip(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 16),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(
              color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _label(String text) {
    return Text(text,
      style: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF374151)));
  }

  InputDecoration _inputDecoration({required String hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: const Color(0xFF9CA3AF), size: 20),
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
      ),
    );
  }
}
