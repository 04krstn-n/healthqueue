import 'package:flutter/material.dart';
import '../../core/routes/app_routes.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/pill_toggle.dart';
import '../../widgets/social_button.dart';
import 'package:provider/provider.dart';
import '../../state/app_state.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool isEmail = true;
  bool showPassword = false;
  bool rememberMe = false;
  bool _isLoading = false;

  final emailCtrl    = TextEditingController();
  final phoneCtrl    = TextEditingController();
  final passwordCtrl = TextEditingController();

  @override
  void dispose() {
    emailCtrl.dispose();
    phoneCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> onSignIn() async {
    final identifier = isEmail ? emailCtrl.text.trim() : phoneCtrl.text.trim();
    final pass = passwordCtrl.text;

    if (identifier.isEmpty || pass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please complete all fields.")),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await context.read<AppState>().login(identifier: identifier, password: pass);
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, AppRoutes.shell);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst("Exception: ", ""))),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final cardWidth = w < 420 ? w : 420.0;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.bgTop, AppColors.bgBottom],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: cardWidth),
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      width: 72, height: 72,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: Icon(Icons.show_chart_rounded, color: AppColors.primary, size: 34),
                    ),
                    const SizedBox(height: 14),
                    const Text("HealthQueue+",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 30, letterSpacing: 0.2)),
                    const SizedBox(height: 6),
                    Text("AI-Driven Queue Management System",
                      style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14)),
                    const SizedBox(height: 18),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 24, offset: const Offset(0, 10))],
                      ),
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 6),
                          const Text("Welcome Back",
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                          const SizedBox(height: 6),
                          const Text("Sign in to access your account",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted)),
                          const SizedBox(height: 16),
                          PillToggle(
                            isEmail: isEmail,
                            onEmail: () => setState(() => isEmail = true),
                            onPhone: () => setState(() => isEmail = false),
                          ),
                          const SizedBox(height: 16),
                          Text(isEmail ? "Email Address" : "Phone Number",
                            style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          if (isEmail)
                            TextField(
                              controller: emailCtrl,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.person_outline),
                                hintText: "juan.delacruz@email.com"),
                            )
                          else
                            TextField(
                              controller: phoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.phone_outlined),
                                hintText: "+63 917 123 4567"),
                            ),
                          const SizedBox(height: 14),
                          const Text("Password", style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: passwordCtrl,
                            obscureText: !showPassword,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.lock_outline),
                              hintText: "Enter your password",
                              suffixIcon: IconButton(
                                icon: Icon(showPassword ? Icons.visibility_off : Icons.visibility),
                                onPressed: () => setState(() => showPassword = !showPassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Checkbox(
                                value: rememberMe,
                                onChanged: (v) => setState(() => rememberMe = v ?? false),
                                activeColor: AppColors.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                              const Text("Remember me", style: TextStyle(color: AppColors.textMuted)),
                              const Spacer(),
                              TextButton(onPressed: () {}, child: const Text("Forgot Password?")),
                            ],
                          ),
                          const SizedBox(height: 4),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isLoading ? null : onSignIn,
                            child: _isLoading
                                ? const SizedBox(height: 20, width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text("Sign In", style: TextStyle(fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(height: 14),
                          Row(children: [
                            Expanded(child: Divider(color: AppColors.border)),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 10),
                              child: Text("Or continue with", style: TextStyle(color: AppColors.textMuted))),
                            Expanded(child: Divider(color: AppColors.border)),
                          ]),
                          const SizedBox(height: 12),
                          Row(children: [
                            Expanded(child: SocialButton(
                              label: "Google",
                              leading: const Icon(FontAwesomeIcons.google, size: 22),
                              onTap: () {},
                            )),
                            const SizedBox(width: 12),
                            Expanded(child: SocialButton(
                              label: "Facebook",
                              leading: const Icon(Icons.facebook, size: 18),
                              onTap: () {},
                            )),
                          ]),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text("Don\'t have an account? ",
                                style: TextStyle(color: AppColors.textMuted)),
                              GestureDetector(
                                onTap: () => Navigator.pushNamed(context, '/register'),
                                child: const Text("Sign Up",
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w700,
                                  )),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
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
    );
  }
}
