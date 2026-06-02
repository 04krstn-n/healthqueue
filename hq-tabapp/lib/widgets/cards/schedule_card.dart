import 'package:flutter/material.dart';
import '../../models/schedule_model.dart';

class ScheduleCard extends StatelessWidget {
  final ScheduleModel model;

  const ScheduleCard({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        title: Text('${model.patientName} - ${model.service}',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${model.time} · ${model.status.toUpperCase()}'),
        trailing: Text(model.clinicName, style: const TextStyle(fontSize: 12)),
      ),
    );
  }
}
