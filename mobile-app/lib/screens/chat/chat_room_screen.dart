// ─── Chat Room Screen — Phase 6 ───────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';

class ChatRoomScreen extends StatefulWidget {
  final String chatId;
  const ChatRoomScreen({super.key, required this.chatId});
  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  List<dynamic> _messages = [];
  bool _loading = true;
  bool _typing  = false;
  final _ctrl   = TextEditingController();
  final _scroll = ScrollController();
  String? _myId;
  String _otherName = 'Chat';
  String? _otherAvatar;

  @override
  void initState() {
    super.initState();
    _myId = context.read<AuthProvider>().user?['_id']?.toString();
    _initSocket();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    try {
      final msgs = await ChatService.fetchMessages(widget.chatId);
      if (!mounted) return;
      setState(() { _messages = msgs; _loading = false; });
      _scrollBottom();
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  void _initSocket() async {
    await ChatService.connectSocket();
    ChatService.joinRoom(widget.chatId);
    ChatService.onReceiveMessage((data) {
      if (!mounted) return;
      final msg = data as Map<String, dynamic>;
      // Avoid duplicate if sent via REST fallback
      final existing = _messages.any((m) => m['_id']?.toString() == msg['_id']?.toString());
      if (!existing) {
        setState(() => _messages.add(msg));
        _scrollBottom();
      }
    });
    ChatService.onTyping((data) {
      if (!mounted) return;
      final d = data as Map<String, dynamic>;
      if (d['senderId']?.toString() != _myId) {
        setState(() => _typing = true);
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) setState(() => _typing = false);
        });
      }
    });
  }

  void _scrollBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) { return; }
    _ctrl.clear();
    // Optimistic UI
    final optimistic = {
      '_id': 'tmp_${DateTime.now().millisecondsSinceEpoch}',
      'senderId': {'_id': _myId, 'name': 'Me'},
      'text': text,
      'createdAt': DateTime.now().toIso8601String(),
    };
    setState(() => _messages.add(optimistic));
    _scrollBottom();
    try {
      final sent = await ChatService.sendMessage(chatId: widget.chatId, text: text);
      // Replace optimistic with real
      if (mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m['_id'] == optimistic['_id']);
          if (idx != -1) { _messages[idx] = sent; }
        });
        // Also emit via socket for real-time
        ChatService.sendSocketMessage({...sent, 'chatId': widget.chatId});
      }
    } catch (_) {}
  }

  void _emitTyping() {
    ChatService.emitTyping({'chatId': widget.chatId, 'senderId': _myId});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white, elevation: 0,
        leading: BackButton(color: AppColors.textPrimary, onPressed: () => context.pop()),
        title: Row(children: [
          CircleAvatar(
            radius: 18, backgroundColor: AppColors.navy,
            backgroundImage: _otherAvatar != null ? CachedNetworkImageProvider(_otherAvatar!) : null,
            child: _otherAvatar == null ? Text(_otherName[0].toUpperCase(),
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)) : null,
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_otherName, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            if (_typing) Text('typing...', style: GoogleFonts.inter(fontSize: 11, color: AppColors.success)),
          ])),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) {
                    final msg    = _messages[i] as Map<String, dynamic>;
                    final sender = msg['senderId'];
                    final sendId = sender is Map
                        ? sender['_id']?.toString() ?? ''
                        : sender?.toString() ?? '';
                    final isMe   = sendId == _myId;
                    final text   = msg['text'] as String? ?? '';
                    final timeStr= msg['createdAt'] != null
                        ? DateFormat('h:mm a').format(DateTime.parse(msg['createdAt'] as String).toLocal())
                        : '';

                    // Set other user info from first non-me message
                    if (!isMe && _otherName == 'Chat' && sender is Map) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) {
                          setState(() {
                            _otherName   = sender['name'] as String? ?? 'User';
                            _otherAvatar = sender['avatar'] as String?;
                          });
                        }
                      });
                    }

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Column(
                        crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          Container(
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
                            margin: const EdgeInsets.only(bottom: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: isMe ? AppColors.navy : AppColors.white,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(18),
                                topRight: const Radius.circular(18),
                                bottomLeft: Radius.circular(isMe ? 18 : 4),
                                bottomRight: Radius.circular(isMe ? 4 : 18),
                              ),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
                            ),
                            child: Text(text,
                              style: GoogleFonts.inter(fontSize: 14, color: isMe ? Colors.white : AppColors.textPrimary, height: 1.4)),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8, left: 4, right: 4),
                            child: Text(timeStr,
                              style: GoogleFonts.inter(fontSize: 10, color: AppColors.textMuted)),
                          ),
                        ],
                      ),
                    );
                  }),
        ),

        // Input bar
        Container(
          padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).padding.bottom + 8),
          decoration: const BoxDecoration(color: AppColors.white,
            border: Border(top: BorderSide(color: AppColors.border))),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                onChanged: (_) => _emitTyping(),
                style: GoogleFonts.inter(fontSize: 14),
                maxLines: null,
                textInputAction: TextInputAction.newline,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: GoogleFonts.inter(color: AppColors.textMuted),
                  filled: true,
                  fillColor: AppColors.bg,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(50), borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _send,
              child: Container(
                width: 44, height: 44,
                decoration: const BoxDecoration(color: AppColors.navy, shape: BoxShape.circle),
                child: const Icon(Icons.send, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  @override
  void dispose() {
    ChatService.offReceiveMessage();
    ChatService.offTyping();
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }
}
