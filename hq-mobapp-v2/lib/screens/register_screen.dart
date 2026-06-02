import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../widgets/pill_toggle.dart';
import '../widgets/social_button.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  bool isEmail = true;

  bool showPassword = false;
  bool showConfirmPassword = false;

  bool agreed = false;

  final fullNameCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final dobCtrl = TextEditingController();

  final passCtrl = TextEditingController();
  final confirmCtrl = TextEditingController();

  final RegExp _strongPass =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$');

  bool _isStrongPassword(String pass) => _strongPass.hasMatch(pass);

  @override
  void dispose() {
    fullNameCtrl.dispose();
    emailCtrl.dispose();
    phoneCtrl.dispose();
    dobCtrl.dispose();
    passCtrl.dispose();
    confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> pickDob() async {
    final now = DateTime.now();
    final initial = DateTime(now.year - 20, 1, 1);

    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(1900, 1, 1),
      lastDate: now,
      initialDate: initial,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppColors.primary,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        dobCtrl.text = "${picked.year.toString().padLeft(4, '0')}-"
            "${picked.month.toString().padLeft(2, '0')}-"
            "${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  // ✅ Splash-like validation overlay (auto-closes)
  Future<void> _showValidationSplash({
    required String title,
    required String message,
    IconData icon = Icons.error_rounded,
  }) async {
    if (!mounted) return;

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: "validation",
      barrierColor: Colors.black.withOpacity(0.55),
      transitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (context, anim1, anim2) {
        return SafeArea(
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 22),
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      blurRadius: 30,
                      color: Colors.black.withOpacity(0.18),
                      offset: const Offset(0, 14),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 46, color: AppColors.primary),
                    const SizedBox(height: 10),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),
        );
      },
      transitionBuilder: (context, anim, _, child) {
        final curved = CurvedAnimation(parent: anim, curve: Curves.easeOut);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.92, end: 1.0).animate(curved),
            child: child,
          ),
        );
      },
    );

    // auto-close after 1.6s (like a splash)
    await Future.delayed(const Duration(milliseconds: 1600));
    if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  void onCreateAccount() async {
    final fullName = fullNameCtrl.text.trim();
    final identifier = isEmail ? emailCtrl.text.trim() : phoneCtrl.text.trim();
    final dobStr = dobCtrl.text.trim();
    final pass = passCtrl.text;
    final confirm = confirmCtrl.text;

    if (fullName.isEmpty ||
        identifier.isEmpty ||
        dobStr.isEmpty ||
        pass.isEmpty ||
        confirm.isEmpty) {
      await _showValidationSplash(
        title: "Incomplete Details",
        message: "Please complete all required fields.",
      );
      return;
    }

    // ✅ Password strength validation
    if (!_isStrongPassword(pass)) {
      await _showValidationSplash(
        title: "Weak Password",
        message: "Your password must be at least 8 characters and include:\n"
            "• 1 uppercase letter\n"
            "• 1 lowercase letter\n"
            "• 1 number\n"
            "• 1 special character (e.g. !@#%)",
      );
      return;
    }

    // ✅ Password match validation
    if (pass != confirm) {
      await _showValidationSplash(
        title: "Password Mismatch",
        message: "Your password and confirm password do not match.",
      );
      return;
    }

    if (!agreed) {
      await _showValidationSplash(
        title: "Agreement Required",
        message: "Please agree to the Terms and Privacy Policy.",
        icon: Icons.privacy_tip_rounded,
      );
      return;
    }

    DateTime dob;
    try {
      dob = DateTime.parse(dobStr); // YYYY-MM-DD
    } catch (_) {
      await _showValidationSplash(
        title: "Invalid Date",
        message: "Please select a valid Date of Birth.",
        icon: Icons.calendar_month_rounded,
      );
      return;
    }

    final email = isEmail ? identifier : "";
    final phone = isEmail ? "" : identifier;

    try {
      context.read<AppState>().registerUser(
            fullName: fullName,
            email: email,
            phone: phone,
            dob: dob,
            password: pass,
          );

      Navigator.pushNamedAndRemoveUntil(context, '/login', (r) => false);
    } catch (e) {
      await _showValidationSplash(
        title: "Registration Failed",
        message: e.toString().replaceFirst("Exception: ", ""),
      );
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

                    // logo
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.show_chart_rounded,
                          color: AppColors.primary, size: 34),
                    ),
                    const SizedBox(height: 14),

                    const Text(
                      "HealthQueue+",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 30,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Create Your Account",
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.85), fontSize: 14),
                    ),

                    const SizedBox(height: 18),

                    // main Card
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          )
                        ],
                      ),
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 6),
                          const Text(
                            "Sign Up",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Join HealthQueue+ today",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 16),
                          PillToggle(
                            isEmail: isEmail,
                            onEmail: () => setState(() => isEmail = true),
                            onPhone: () => setState(() => isEmail = false),
                          ),
                          const SizedBox(height: 16),
                          const Text("Full Name",
                              style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: fullNameCtrl,
                            textCapitalization: TextCapitalization.words,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.person_outline),
                              hintText: "Juan Dela Cruz",
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            isEmail ? "Email Address" : "Phone Number",
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          if (isEmail)
                            TextField(
                              controller: emailCtrl,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.mail_outline),
                                hintText: "juan.delacruz@email.com",
                              ),
                            )
                          else
                            TextField(
                              controller: phoneCtrl,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.phone_outlined),
                                hintText: "+63 917 123 4567",
                              ),
                            ),
                          const SizedBox(height: 14),
                          const Text("Date of Birth",
                              style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: dobCtrl,
                            readOnly: true,
                            onTap: pickDob,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.calendar_month_outlined),
                              hintText: "YYYY-MM-DD",
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text("Password",
                              style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: passCtrl,
                            obscureText: !showPassword,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.lock_outline),
                              hintText: "Create a strong password",
                              suffixIcon: IconButton(
                                icon: Icon(showPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility),
                                onPressed: () => setState(
                                    () => showPassword = !showPassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Must include uppercase, lowercase, number, special character, and be 8+ chars.",
                            style: TextStyle(
                                fontSize: 12, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 14),
                          const Text("Confirm Password",
                              style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: confirmCtrl,
                            obscureText: !showConfirmPassword,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.lock_outline),
                              hintText: "Re-enter your password",
                              suffixIcon: IconButton(
                                icon: Icon(showConfirmPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility),
                                onPressed: () => setState(() =>
                                    showConfirmPassword = !showConfirmPassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Checkbox(
                                value: agreed,
                                onChanged: (v) =>
                                    setState(() => agreed = v ?? false),
                                activeColor: AppColors.primary,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(4)),
                              ),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 10),
                                  child: Wrap(
                                    children: [
                                      const Text(
                                        "I agree to the ",
                                        style: TextStyle(
                                            color: AppColors.textMuted),
                                      ),
                                      GestureDetector(
                                        onTap: () {},
                                        child: const Text(
                                          "Terms and Conditions",
                                          style: TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const Text(
                                        " and ",
                                        style: TextStyle(
                                            color: AppColors.textMuted),
                                      ),
                                      GestureDetector(
                                        onTap: () {},
                                        child: const Text(
                                          "Privacy Policy",
                                          style: TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: onCreateAccount,
                            child: const Text(
                              "Create Account",
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(child: Divider(color: AppColors.border)),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 10),
                                child: Text("Or sign up with",
                                    style:
                                        TextStyle(color: AppColors.textMuted)),
                              ),
                              Expanded(child: Divider(color: AppColors.border)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: SocialButton(
                                  label: "Google",
                                  leading: const Icon(FontAwesomeIcons.google,
                                      size: 22),
                                  onTap: () {},
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: SocialButton(
                                  label: "Facebook",
                                  leading: const Icon(Icons.facebook, size: 18),
                                  onTap: () {},
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text("Already have an account? ",
                                  style: TextStyle(color: AppColors.textMuted)),
                              GestureDetector(
                                onTap: () => Navigator.pop(context),
                                child: const Text(
                                  "Sign In",
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    Text(
                      "© 2026 HealthQueue+. All rights reserved.",
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.75), fontSize: 12),
                      textAlign: TextAlign.center,
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
