import 'package:flutter/material.dart';

class ReportsAnalyticsScreen extends StatelessWidget {
  const ReportsAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports & Analytics')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Analytics Overview',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                children: const [
                  _ReportCard(
                      title: 'Queue volume',
                      subtitle: 'Compare queue size trends by hour.'),
                  _ReportCard(
                      title: 'Appointment fulfillment',
                      subtitle: 'Track appointment completion and no-shows.'),
                  _ReportCard(
                      title: 'Waiting time estimate',
                      subtitle: 'Review average waiting time per service.'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const _ReportCard({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 14),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.bar_chart),
      ),
    );
  }
}
