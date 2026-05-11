// ─── Chats Screen — Phase 6 ───────────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/chat_service.dart';
import '../../widgets/bottom_nav_bar.dart';

class ChatsScreen extends StatefulWidget {
  const ChatsScreen({super.key});
  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  List<dynamic> _chats = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final chats = await ChatService.fetchMyChats();
      if (mounted) setState(() { _chats = chats; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final myId = context.read<AuthProvider>().user?['_id']?.toString() ?? '';
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white, elevation: 0, automaticallyImplyLeading: false,
        title: Text('Chats', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
          : _chats.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('💬', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 16),
                  Text('No chats yet', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Start chatting with sellers', style: GoogleFonts.inter(color: AppColors.textSecondary)),
                ]))
              : RefreshIndicator(
                  onRefresh: _load, color: AppColors.navy,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: _chats.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                    itemBuilder: (_, i) {
                      final chat   = _chats[i] as Map<String, dynamic>;
                      final parts  = chat['participants'] as List<dynamic>? ?? [];
                      final other  = parts.firstWhere(
                        (p) => (p['_id']?.toString() ?? p.toString()) != myId,
                        orElse: () => parts.isNotEmpty ? parts.first : <String, dynamic>{});
                      final name   = (other is Map) ? (other['name'] as String? ?? 'User') : 'User';
                      final avatar = (other is Map) ? other['avatar'] as String? : null;
                      final last   = chat['lastMessage'] as String? ?? '';
                      final adMap  = chat['adId'] as Map<String, dynamic>? ?? {};
                      final adTitle= adMap['title'] as String? ?? '';
                      final lastAt = chat['lastMessageAt'] as String?;
                      final timeStr = lastAt != null
                          ? DateFormat('h:mm a').format(DateTime.parse(lastAt).toLocal())
                          : '';

                      return InkWell(
                        onTap: () => context.push('/chat/${chat['_id']}'),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(children: [
                            CircleAvatar(
                              radius: 24, backgroundColor: AppColors.navy,
                              backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                              child: avatar == null ? Text(name[0].toUpperCase(),
                                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700)) : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                              if (adTitle.isNotEmpty) Text(adTitle,
                                style: GoogleFonts.inter(fontSize: 12, color: AppColors.navy, fontWeight: FontWeight.w500),
                                overflow: TextOverflow.ellipsis),
                              if (last.isNotEmpty) Text(last,
                                style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                                overflow: TextOverflow.ellipsis),
                            ])),
                            if (timeStr.isNotEmpty)
                              Text(timeStr, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
      bottomNavigationBar: const BottomNavBar(currentIndex: 3),
    );
  }
}
