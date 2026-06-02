import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTextStyles {
  static const heading = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 24,
    fontWeight: FontWeight.w700,
  );

  static const subtitle = TextStyle(
    color: AppColors.textSecondary,
    fontSize: 14,
    height: 1.5,
  );

  static const cardTitle = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: FontWeight.w700,
  );

  static const label = TextStyle(
    color: AppColors.textMuted,
    fontSize: 12,
  );
}
