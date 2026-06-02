import 'package:flutter/material.dart';
import '../../models/queue_model.dart';

class QueueCard extends StatelessWidget {
  final QueueModel model;
  final VoidCallback? onEdit;

  const QueueCard({super.key, required this.model, this.onEdit});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        title: Text(model.patientName,
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${model.serviceName} · ${model.status}'),
        leading:
            CircleAvatar(child: Text(model.queueNumber.replaceAll('Q-', ''))),
        trailing: IconButton(icon: const Icon(Icons.edit), onPressed: onEdit),
      ),
    );
  }
}
