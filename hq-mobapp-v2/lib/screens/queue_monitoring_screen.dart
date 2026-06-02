import 'dart:math';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../models/queue_models.dart';
import '../services/api_service.dart';
import '../state/app_state.dart';

class QueueMonitoringScreen extends StatefulWidget {
  const QueueMonitoringScreen({super.key});
  @override
  State<QueueMonitoringScreen> createState() => _QueueMonitoringScreenState();
}

class _QueueMonitoringScreenState extends State<QueueMonitoringScreen> {
  Timer? _timer;
  // Raw server response: {} = no queue, {entry,position,peopleAhead,estimatedWaitTime} = active
  Map<String, dynamic>? _queueStatus;
  bool _isLoading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _fetchStatus();
    // Poll every 10 seconds for real-time updates
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _fetchStatus());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchStatus() async {
    try {
      // Returns {} if not in queue, or {entry, position, peopleAhead, estimatedWaitTime}
      final res = await ApiService.getMyQueueStatus();
      if (mounted) {
        setState(() {
          _queueStatus = res;
          _isLoading   = false;
          _error       = '';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error    = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _addQueue() async {
    // Navigate to join queue screen — it returns a QueueJoinResult on success
    final result = await Navigator.pushNamed(context, AppRoutes.joinQueue);
    if (!mounted) return;

    // Sync AppState if a result was returned
    if (result is QueueJoinResult) {
      context.read<AppState>().addQueueFromJoinResult(result);
    }

    // Always re-fetch fresh status from server after joining
    setState(() { _isLoading = true; _error = ''; });
    await _fetchStatus();
  }

  Future<void> _leaveSelectedQueue(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Leave Queue', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('Are you sure you want to cancel your queue position?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('No')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Yes, Leave'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ApiService.cancelQueue(id);
      if (mounted) {
        context.read<AppState>().cancelQueue(id);
        setState(() { _isLoading = true; _error = ''; });
        await _fetchStatus();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error leaving queue: $e')));
      }
    }
  }

  // ── Determine if currently in queue ───────────────────────────────────────
  // Server returns {} when no active queue, {entry: {...}} when active
  bool get _hasActiveQueue =>
      _queueStatus != null &&
      _queueStatus!.isNotEmpty &&
      _queueStatus!['entry'] != null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        titleSpacing: 16,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Queue Status',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
            Text('Real-time updates on your position',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted,
                    fontWeight: FontWeight.w500)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchStatus();
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    // Still loading first fetch
    if (_isLoading && _queueStatus == null) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
    }

    // Error with no data
    if (_error.isNotEmpty && !_hasActiveQueue) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text('Could not load queue status.\n$_error',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 16),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white),
              onPressed: () {
                setState(() { _isLoading = true; _error = ''; });
                _fetchStatus();
              },
              child: const Text('Retry'),
            ),
          ]),
        ),
      );
    }

    // No active queue — show empty state
    if (!_hasActiveQueue) {
      return _EmptyQueues(addQueue: _addQueue);
    }

    // ── Active queue — parse server response ───────────────────────────────
    final raw     = _queueStatus!['entry'] as Map<String, dynamic>;
    final clinic  = raw['clinic'];  // populated object or null

    // Server field: queueNumber (NOT ticketNumber)
    final queueNum    = raw['queueNumber']?.toString() ?? 'N/A';
    final serviceName = raw['serviceName']?.toString() ?? '';
    final statusStr   = raw['status']?.toString() ?? 'waiting';
    final joinedAtRaw = DateTime.tryParse(raw['joinedAt']?.toString() ?? '');
    final joinedAt    = (joinedAtRaw != null ? joinedAtRaw.toLocal() : DateTime.now());

    final clinicName  = clinic is Map
        ? clinic['name']?.toString() ?? ''
        : raw['clinicName']?.toString() ?? '';

    final peopleAhead    = (_queueStatus!['peopleAhead']    ?? 0) as int;
    final estimatedWait  = (_queueStatus!['estimatedWaitTime'] ??
        raw['estimatedWaitMinutes'] ?? 0) as int;
    final position       = (_queueStatus!['position'] ?? peopleAhead + 1) as int;

    final q = QueueEntry(
      id:           raw['_id']?.toString() ?? '',
      queueNumber:  queueNum,
      clinicName:   clinicName,
      serviceName:  serviceName,
      departmentName: clinicName,
      status:       QueueEntry.parseStatus(statusStr),
      position:     position,
      totalAhead:   peopleAhead,
      estimatedWait: estimatedWait,
      estimatedWaitTimeMinutes: estimatedWait,
      joinedAt:     joinedAt,
    );

    return RefreshIndicator(
      onRefresh: _fetchStatus,
      child: _QueueStatusView(
        q:            q,
        onLeaveQueue: () => _leaveSelectedQueue(q.id),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────
class _EmptyQueues extends StatelessWidget {
  final VoidCallback addQueue;
  const _EmptyQueues({required this.addQueue});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(children: [
        const SizedBox(height: 40),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 14, offset: const Offset(0, 8))],
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.confirmation_number_outlined,
                  size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            const Text('No Active Queue',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900,
                    color: AppColors.textDark)),
            const SizedBox(height: 8),
            const Text(
              'You are not in any queue right now.\nJoin a queue to see real-time updates.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, height: 1.5),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: addQueue,
                icon: const Icon(Icons.add),
                label: const Text('Join Queue',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

// ── Active queue view ─────────────────────────────────────────────────────────
class _QueueStatusView extends StatelessWidget {
  final QueueEntry   q;
  final VoidCallback onLeaveQueue;
  const _QueueStatusView({required this.q, required this.onLeaveQueue});

  Color get _statusColor {
    switch (q.status) {
      case QueueStatus.serving:   return Colors.green;
      case QueueStatus.waiting:   return Colors.orange;
      default:                    return AppColors.primary;
    }
  }

  String get _statusLabel {
    switch (q.status) {
      case QueueStatus.serving:   return 'Being Served Now';
      case QueueStatus.waiting:   return 'Waiting';
      case QueueStatus.completed: return 'Completed';
      case QueueStatus.cancelled: return 'Cancelled';
      default:                    return 'In Queue';
    }
  }

  @override
  Widget build(BuildContext context) {
    final waitMin = max(1, q.estimatedWaitTimeMinutes - 2);
    final waitMax = q.estimatedWaitTimeMinutes + 5;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(children: [

        // ── Queue number hero card ─────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(
                color: AppColors.primary.withOpacity(0.35),
                blurRadius: 20, offset: const Offset(0, 10))],
          ),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.bolt_rounded, color: Colors.white70, size: 16),
              const SizedBox(width: 6),
              Text('Your Queue Number',
                  style: TextStyle(color: Colors.white.withOpacity(0.85),
                      fontWeight: FontWeight.w600, fontSize: 13)),
            ]),
            const SizedBox(height: 8),
            Text(q.queueNumber,
                style: const TextStyle(color: Colors.white, fontSize: 72,
                    fontWeight: FontWeight.w900, letterSpacing: 4)),
            const SizedBox(height: 8),
            // Clinic name
            if (q.clinicName.isNotEmpty)
              Text(q.clinicName,
                  style: TextStyle(color: Colors.white.withOpacity(0.9),
                      fontWeight: FontWeight.w700, fontSize: 14)),
            // Service name
            if (q.serviceName.isNotEmpty) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(q.serviceName.toUpperCase(),
                    style: const TextStyle(color: Colors.white,
                        fontWeight: FontWeight.w800, fontSize: 11,
                        letterSpacing: 1)),
              ),
            ],
            const SizedBox(height: 12),
            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: _statusColor.withOpacity(0.25),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: _statusColor.withOpacity(0.5)),
              ),
              child: Text(_statusLabel,
                  style: TextStyle(color: _statusColor == Colors.orange
                      ? Colors.orange.shade100 : Colors.white,
                      fontWeight: FontWeight.w800, fontSize: 12)),
            ),
          ]),
        ),

        const SizedBox(height: 16),

        // ── Stats row ──────────────────────────────────────
        Row(children: [
          Expanded(child: _InfoBox(
            label: 'People Ahead',
            value: '${q.totalAhead}',
            icon: Icons.people_alt_outlined,
            valueColor: q.totalAhead == 0 ? Colors.green : Colors.red,
          )),
          const SizedBox(width: 12),
          Expanded(child: _InfoBox(
            label: 'Est. Wait',
            value: q.totalAhead == 0
                ? 'Your turn!'
                : '$waitMin–$waitMax min',
            icon: Icons.access_time_rounded,
            valueColor: q.totalAhead == 0 ? Colors.green : AppColors.textDark,
          )),
        ]),

        const SizedBox(height: 12),

        // ── Joined at ─────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(children: [
            const Icon(Icons.access_time_outlined,
                color: AppColors.textMuted, size: 18),
            const SizedBox(width: 10),
            Text('Joined at: ',
                style: const TextStyle(color: AppColors.textMuted,
                    fontWeight: FontWeight.w600, fontSize: 13)),
            Text(_fmtTime(q.joinedAt),
                style: const TextStyle(fontWeight: FontWeight.w800,
                    fontSize: 13, color: AppColors.textDark)),
          ]),
        ),

        const SizedBox(height: 20),

        // ── Leave queue button ─────────────────────────────
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: onLeaveQueue,
            icon: const Icon(Icons.exit_to_app_rounded),
            label: const Text('Leave Queue',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          ),
        ),
      ]),
    );
  }

  String _fmtTime(DateTime t) {
    final h  = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final m  = t.minute.toString().padLeft(2, '0');
    final ap = t.hour < 12 ? 'AM' : 'PM';
    return '$h:$m $ap';
  }
}

class _InfoBox extends StatelessWidget {
  final String    label, value;
  final IconData  icon;
  final Color?    valueColor;
  const _InfoBox({required this.label, required this.value,
      required this.icon, this.valueColor});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
      boxShadow: [BoxShadow(
          color: Colors.black.withOpacity(0.04), blurRadius: 6)],
    ),
    child: Column(children: [
      Icon(icon, color: AppColors.primary, size: 22),
      const SizedBox(height: 8),
      Text(value,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900,
              color: valueColor ?? AppColors.textDark)),
      const SizedBox(height: 4),
      Text(label,
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted,
              fontWeight: FontWeight.w600)),
    ]),
  );
}

class _BottomNavMock extends StatelessWidget {
  final int selectedIndex;
  const _BottomNavMock({required this.selectedIndex});

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: selectedIndex,
      type: BottomNavigationBarType.fixed,
      selectedItemColor:   AppColors.primary,
      unselectedItemColor: const Color(0xFF64748B),
      onTap: (i) {
        switch (i) {
          case 0: Navigator.pushNamedAndRemoveUntil(
              context, AppRoutes.dashboard, (_) => false); break;
          case 1: Navigator.pushNamed(context, AppRoutes.appointments); break;
          case 2: Navigator.pushNamed(context, AppRoutes.chatBot);      break;
          case 3: break; // already here
          case 4: Navigator.pushNamed(context, AppRoutes.profile);      break;
        }
      },
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home), label: 'Home'),
        BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined),
            activeIcon: Icon(Icons.calendar_today), label: 'Appointments'),
        BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble), label: 'Chat'),
        BottomNavigationBarItem(icon: Icon(Icons.queue_outlined),
            activeIcon: Icon(Icons.queue), label: 'Queue'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person), label: 'Profile'),
      ],
    );
  }
}
