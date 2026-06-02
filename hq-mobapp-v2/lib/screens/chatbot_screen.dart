import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';
import '../models/chat_models.dart';

/// HealthQueue+ Chatbot Screen
/// Sends messages to POST /api/chatbot/message on the server.
/// Falls back to quick-reply FAQ flow when offline.
class ChatbotScreen extends StatefulWidget {
  final VoidCallback onBookAppointment;
  final VoidCallback onViewQueue;

  const ChatbotScreen({
    super.key,
    required this.onBookAppointment,
    required this.onViewQueue,
  });

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _inputCtrl  = TextEditingController();
  final ScrollController       _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<AppState>().seedChatIfEmpty();
      _scrollToBottom();
    });
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send(String text) async {
    final msg = text.trim();
    if (msg.isEmpty) return;
    _inputCtrl.clear();

    // Handle local quick-replies first
    final lower = msg.toLowerCase();
    if (lower == 'book appointment') {
      context.read<AppState>().addUserText(msg);
      context.read<AppState>().addBotText(
        "I'll take you to the booking screen now.",
        quickReplies: [],
      );
      _scrollToBottom();
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) widget.onBookAppointment();
      return;
    }
    if (lower == 'queue status' || lower == 'view queue') {
      context.read<AppState>().addUserText(msg);
      context.read<AppState>().addBotText(
        "Opening your queue status now.",
        quickReplies: [],
      );
      _scrollToBottom();
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) widget.onViewQueue();
      return;
    }
    if (lower == 'my appointments') {
      context.read<AppState>().addUserText(msg);
      context.read<AppState>().addBotText(
        "Taking you to your appointments.",
        quickReplies: [],
      );
      _scrollToBottom();
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) Navigator.pushNamed(context, AppRoutes.appointments);
      return;
    }
    if (lower == 'join queue') {
      context.read<AppState>().addUserText(msg);
      context.read<AppState>().addBotText(
        "Taking you to the queue screen.",
        quickReplies: [],
      );
      _scrollToBottom();
      await Future.delayed(const Duration(milliseconds: 400));
      if (mounted) Navigator.pushNamed(context, AppRoutes.joinQueue);
      return;
    }

    // Send to server
    await context.read<AppState>().sendMessage(msg);
    _scrollToBottom();
  }

  void _onQuickReply(String reply) => _send(reply);

  @override
  Widget build(BuildContext context) {
    final state    = context.watch<AppState>();
    final messages = state.messages;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        titleSpacing: 16,
        title: Row(children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.smart_toy_outlined, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('HQ Assistant',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              Text('AI-powered health assistant',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted,
                      fontWeight: FontWeight.w500)),
            ],
          ),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Clear chat',
            onPressed: () {
              context.read<AppState>().clearChat();
              context.read<AppState>().seedChatIfEmpty();
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: Column(children: [
        // Message list
        Expanded(
          child: messages.isEmpty
              ? const _EmptyChat()
              : ListView.builder(
                  controller:  _scrollCtrl,
                  padding:     const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  itemCount:   messages.length,
                  itemBuilder: (ctx, i) {
                    final m = messages[i];
                    return _MessageBubble(
                      message:       m,
                      onQuickReply:  _onQuickReply,
                    );
                  },
                ),
        ),

        // Typing indicator
        if (state.chatLoading)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Row(children: [
              _TypingDots(),
              SizedBox(width: 8),
              Text('HQ Assistant is typing…',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ]),
          ),

        // Input bar
        _InputBar(
          controller: _inputCtrl,
          onSend: _send,
          loading: state.chatLoading,
        ),
      ]),
    );
  }
}

// ── Message bubble ────────────────────────────────────────────────────────────
class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final void Function(String) onQuickReply;

  const _MessageBubble({required this.message, required this.onQuickReply});

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!isUser) ...[
                Container(
                  width: 30, height: 30,
                  margin: const EdgeInsets.only(right: 8, bottom: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.smart_toy_outlined, color: Colors.white, size: 16),
                ),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color:        isUser ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft:     const Radius.circular(16),
                      topRight:    const Radius.circular(16),
                      bottomLeft:  Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    boxShadow: [BoxShadow(
                        color: Colors.black.withOpacity(0.06), blurRadius: 4)],
                  ),
                  child: Text(
                    message.text,
                    style: TextStyle(
                      fontSize: 14,
                      color: isUser ? Colors.white : AppColors.textDark,
                      height: 1.4,
                    ),
                  ),
                ),
              ),
              if (isUser)
                Container(
                  width: 30, height: 30,
                  margin: const EdgeInsets.only(left: 8, bottom: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.person_outline_rounded,
                      color: AppColors.primary, size: 16),
                ),
            ],
          ),
          // Quick replies
          if (!isUser && message.quickReplies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 38, top: 8),
              child: Wrap(
                spacing: 8, runSpacing: 8,
                children: message.quickReplies.map((r) => GestureDetector(
                  onTap: () => onQuickReply(r),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                    ),
                    child: Text(r,
                        style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600,
                          color: AppColors.primary)),
                  ),
                )).toList(),
              ),
            ),
          // Timestamp
          Padding(
            padding: EdgeInsets.only(
              top: 4, left: isUser ? 0 : 38, right: isUser ? 38 : 0),
            child: Text(
              _fmt(message.timestamp),
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(DateTime t) {
    final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final m = t.minute.toString().padLeft(2, '0');
    final ap = t.hour < 12 ? 'AM' : 'PM';
    return '$h:$m $ap';
  }
}

// ── Input bar ─────────────────────────────────────────────────────────────────
class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final Future<void> Function(String) onSend;
  final bool loading;

  const _InputBar({required this.controller, required this.onSend, required this.loading});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      child: Row(children: [
        Expanded(
          child: TextField(
            controller: controller,
            onSubmitted: loading ? null : onSend,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: 'Type a message…',
              hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
              filled: true,
              fillColor: const Color(0xFFF5F5F5),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(24),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: loading ? null : () => onSend(controller.text),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 46, height: 46,
            decoration: BoxDecoration(
              color: loading ? Colors.grey.shade300 : AppColors.primary,
              shape: BoxShape.circle,
            ),
            child: loading
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
          ),
        ),
      ]),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────
class _EmptyChat extends StatelessWidget {
  const _EmptyChat();
  @override
  Widget build(BuildContext context) => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.chat_bubble_outline_rounded, size: 52, color: AppColors.textMuted),
      SizedBox(height: 12),
      Text('Say hi to HQ Assistant!',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      SizedBox(height: 6),
      Text('Ask about clinics, queue status,\nor book an appointment.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.5)),
    ]),
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
class _TypingDots extends StatefulWidget {
  const _TypingDots();
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return Row(children: List.generate(3, (i) {
          final phase = ((_ctrl.value * 3) - i).clamp(0.0, 1.0);
          return Container(
            width: 6, height: 6,
            margin: const EdgeInsets.only(right: 3),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.3 + phase * 0.7),
              shape: BoxShape.circle,
            ),
          );
        }));
      },
    );
  }
}
