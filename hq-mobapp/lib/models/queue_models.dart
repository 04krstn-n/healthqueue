/// Queue & shared data models
/// Server queue statuses: waiting | serving | done | completed | cancelled | noShow | skipped

import 'package:flutter/material.dart';

// ─────────────────────────────────────────────────────────────────
//  Shared lookup models (used by hospital_data + booking screens)
// ─────────────────────────────────────────────────────────────────

class Department {
  final String id;
  final String name;
  final String description;
  final IconData icon;

  const Department({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
  });
}

class Doctor {
  final String id;
  final String departmentId;
  final String name;
  final String specialization;

  const Doctor({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.specialization,
  });
}

class ServiceItem {
  final String id;
  final String departmentId;
  final String name;
  final String description;

  const ServiceItem({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.description,
  });
}

enum PatientType { regular, priority }

// ─────────────────────────────────────────────────────────────────
//  Queue status / type enums
// ─────────────────────────────────────────────────────────────────

enum QueueStatus {
  waiting,
  serving,
  completed,
  cancelled,
  noShow,
  skipped,
  pending,
}

enum QueueType { regular, priority }

// ─────────────────────────────────────────────────────────────────
//  QueueEntry — covers server response + queue_monitoring_screen
// ─────────────────────────────────────────────────────────────────

class QueueEntry {
  final String      id;
  final String      queueNumber;
  final String      clinicName;
  final String      serviceName;
  final String      patientName;
  final String?     patientEmail;
  final String?     patientPhone;
  final QueueStatus status;
  final int         position;
  final DateTime    joinedAt;

  // wait time — two names used across screens
  final int estimatedWait;
  final int estimatedWaitTimeMinutes;

  // extended fields used by queue_monitoring_screen
  final QueueType queueType;
  final String    departmentId;
  final String    departmentName;
  final String    serviceId;
  final String?   doctorId;
  final String?   doctorName;
  final int       totalAhead;

  QueueEntry({
    required this.id,
    String?       queueNumber,
    String?       clinicName,
    String?       serviceName,
    String?       patientName,
    this.patientEmail,
    this.patientPhone,
    QueueStatus?  status,
    int?          position,
    required this.joinedAt,
    int?          estimatedWait,
    int?          estimatedWaitTimeMinutes,
    QueueType?    queueType,
    String?       departmentId,
    String?       departmentName,
    String?       serviceId,
    this.doctorId,
    this.doctorName,
    int?          totalAhead,
  })  : queueNumber              = queueNumber   ?? '',
        clinicName               = clinicName    ?? '',
        serviceName              = serviceName   ?? '',
        patientName              = patientName   ?? '',
        status                   = status        ?? QueueStatus.pending,
        position                 = position      ?? 0,
        estimatedWait            = estimatedWait ?? estimatedWaitTimeMinutes ?? 0,
        estimatedWaitTimeMinutes = estimatedWaitTimeMinutes ?? estimatedWait ?? 0,
        queueType                = queueType     ?? QueueType.regular,
        departmentId             = departmentId  ?? '',
        departmentName           = departmentName?? '',
        serviceId                = serviceId     ?? '',
        totalAhead               = totalAhead    ?? position ?? 0;

  static QueueStatus parseStatus(String? s) {
    switch (s) {
      case 'waiting':   return QueueStatus.waiting;
      case 'serving':   return QueueStatus.serving;
      case 'done':
      case 'completed': return QueueStatus.completed;
      case 'cancelled': return QueueStatus.cancelled;
      case 'noShow':    return QueueStatus.noShow;
      case 'skipped':   return QueueStatus.skipped;
      default:          return QueueStatus.pending;
    }
  }

  bool get isActive =>
      status == QueueStatus.waiting ||
      status == QueueStatus.serving ||
      status == QueueStatus.pending;
}

// ─────────────────────────────────────────────────────────────────
//  QueueJoinResult — returned after joining, covers all screens
// ─────────────────────────────────────────────────────────────────

class QueueJoinResult {
  final String    id;
  final String    entryId;
  final String    queueNumber;
  final String    clinicName;
  final String    serviceName;
  final String    patientName;
  final String?   patientEmail;
  final String?   patientPhone;
  final String?   doctorId;
  final String?   doctorName;
  final String    departmentId;
  final String    departmentName;
  final String    serviceId;
  final QueueType queueType;
  final int       position;
  final int       totalAhead;
  final int       estimatedWait;
  final int       estimatedWaitTimeMinutes;
  final DateTime  joinedAt;

  QueueJoinResult({
    String?       id,
    String?       entryId,
    String?       queueNumber,
    String?       clinicName,
    String?       serviceName,
    required this.patientName,
    this.patientEmail,
    this.patientPhone,
    this.doctorId,
    this.doctorName,
    String?       departmentId,
    String?       departmentName,
    String?       serviceId,
    QueueType?    queueType,
    int?          position,
    int?          totalAhead,
    int?          estimatedWait,
    int?          estimatedWaitTimeMinutes,
    required this.joinedAt,
  })  : id                       = id          ?? entryId ?? '',
        entryId                  = entryId     ?? id      ?? '',
        queueNumber              = queueNumber ?? '',
        clinicName               = clinicName  ?? '',
        serviceName              = serviceName ?? '',
        departmentId             = departmentId  ?? '',
        departmentName           = departmentName ?? '',
        serviceId                = serviceId      ?? '',
        queueType                = queueType      ?? QueueType.regular,
        position                 = position       ?? 0,
        totalAhead               = totalAhead     ?? position ?? 0,
        estimatedWait            = estimatedWait  ?? estimatedWaitTimeMinutes ?? 0,
        estimatedWaitTimeMinutes = estimatedWaitTimeMinutes ?? estimatedWait ?? 0;
}
