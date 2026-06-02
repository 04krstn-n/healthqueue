import 'package:flutter/material.dart';
import '../../models/inquiry_model.dart';

class InquiryCard extends StatelessWidget {
  final InquiryModel model;

  const InquiryCard({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        title: Text(model.subject,
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${model.patientName} · ${model.source.toUpperCase()}'),
        trailing: Text(model.createdAt,
            style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ),
    );
  }
}
