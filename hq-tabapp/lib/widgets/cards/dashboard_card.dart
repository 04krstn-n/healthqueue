import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class DashboardCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const DashboardCard(
      {super.key,
      required this.title,
      required this.value,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 14)),
            const SizedBox(height: 12),
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 28, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
