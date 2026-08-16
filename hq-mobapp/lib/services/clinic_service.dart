import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Clinic model — matches hq-server Clinic schema exactly.
/// Server returns: { _id, name, address, city, latitude, longitude,
///                   services:[{name,description,durationMinutes,isAvailable}],
///                   queueLength, currentWaitingTime, status, ... }
class Clinic {
  final String       id;
  final String       name;
  final String       address;
  final String       city;
  final double?      latitude;   // flat field on server — NOT location.coordinates
  final double?      longitude;
  final List<String> services;
  final int          queueCount;
  final int          waitMinutes;
  final String       status;

  Clinic({
    required this.id,
    required this.name,
    required this.address,
    this.city      = '',
    this.latitude,
    this.longitude,
    required this.services,
    this.queueCount  = 0,
    this.waitMinutes = 0,
    this.status      = 'open',
  });

  bool get hasLocation => latitude != null && longitude != null
      && latitude != 0.0 && longitude != 0.0;

  factory Clinic.fromJson(Map<String, dynamic> j) {
    // ── Services ──────────────────────────────────────────────────────────
    // Server stores services as [{name, description, durationMinutes, isAvailable}]
    final svcs = <String>[];
    if (j['services'] is List) {
      for (final s in j['services'] as List) {
        if (s is String && s.isNotEmpty) {
          svcs.add(s);
        } else if (s is Map) {
          final n = s['name']?.toString() ?? '';
          if (n.isNotEmpty) svcs.add(n);
        }
      }
    }

    // ── Location ──────────────────────────────────────────────────────────
    // Server uses flat fields: latitude, longitude (NOT location.coordinates)
    double? lat = _toDouble(j['latitude']);
    double? lng = _toDouble(j['longitude']);

    // Fallback: check GeoJSON location.coordinates [lng, lat] just in case
    if ((lat == null || lat == 0.0) && j['location'] is Map) {
      final coords = (j['location'] as Map)['coordinates'];
      if (coords is List && coords.length == 2) {
        lng = _toDouble(coords[0]);
        lat = _toDouble(coords[1]);
      }
    }

    // Treat 0,0 as no location
    if (lat == 0.0 && lng == 0.0) { lat = null; lng = null; }

    return Clinic(
      id:          j['_id']?.toString() ?? j['id']?.toString() ?? '',
      name:        j['name']?.toString()    ?? '',
      address:     j['address']?.toString() ?? '',
      city:        j['city']?.toString()    ?? '',
      latitude:    lat,
      longitude:   lng,
      services:    svcs,
      queueCount:  _toInt(j['queueLength']  ?? j['queueCount']  ?? j['currentQueue'] ?? 0),
      waitMinutes: _toInt(j['currentWaitingTime'] ?? j['estimatedWait'] ?? j['waitMinutes'] ?? 0),
      status:      j['status']?.toString() ?? 'open',
    );
  }

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int)    return v.toDouble();
    return double.tryParse(v.toString());
  }

  static int _toInt(dynamic v) {
    if (v == null) return 0;
    if (v is int)    return v;
    if (v is double) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }
}

class ClinicService {
  static Future<List<Clinic>> getDirectory() async {
    try {
      final list = await ApiService.getClinicDirectory();
      return list
          .map((j) => Clinic.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('ClinicService.getDirectory error: $e');
      rethrow;
    }
  }

  static Future<List<Clinic>> getRecommended() async {
    try {
      final list = await ApiService.getRecommendedClinics();
      return list
          .map((j) => Clinic.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('ClinicService.getRecommended error: $e');
      rethrow;
    }
  }
}
