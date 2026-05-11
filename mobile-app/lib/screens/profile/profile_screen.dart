// ─── Profile Screen — Phase 5 ─────────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/bottom_nav_bar.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user   = context.watch<AuthProvider>().user ?? {};
    final name   = user['name'] as String? ?? 'User';
    final phone  = user['phone'] as String? ?? '';
    final biz    = user['businessName'] as String? ?? '';
    final avatar = user['avatar'] as String?;
    final loc    = user['location'] as Map<String, dynamic>? ?? {};
    final city   = loc['city'] as String? ?? '';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(slivers: [
        // Hero header
        SliverToBoxAdapter(
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFe87e04), Color(0xFFf5a623)],
                begin: Alignment.topLeft, end: Alignment.bottomRight),
            ),
            padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 20, 28),
            child: Row(children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: Colors.white24,
                backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                child: avatar == null ? Text(name[0].toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white)) : null,
              ),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                if (biz.isNotEmpty) Text(biz,
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
                Text(phone, style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
                if (city.isNotEmpty) Row(children: [
                  const Icon(Icons.location_on, size: 12, color: Colors.white60),
                  const SizedBox(width: 3),
                  Text(city, style: GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
                ]),
              ])),
            ]),
          ),
        ),

        // Menu items
        SliverToBoxAdapter(
          child: Column(children: [
            const SizedBox(height: 12),
            _section([
              _item(context, Icons.campaign_outlined, 'My Ads', () => context.push('/my-ads')),
              _item(context, Icons.favorite_outline, 'Saved Ads', () => context.push('/favorites')),
              _item(context, Icons.chat_bubble_outline, 'My Chats', () => context.go('/chats')),
            ]),
            const SizedBox(height: 12),
            _section([
              _item(context, Icons.settings_outlined, 'Settings', () => context.push('/settings')),
              _item(context, Icons.privacy_tip_outlined, 'Privacy Policy', () => context.push('/privacy')),
              _item(context, Icons.description_outlined, 'Terms of Service', () => context.push('/terms')),
            ]),
            const SizedBox(height: 12),
            _section([
              _item(context, Icons.logout, 'Logout', () async {
                final authProvider = context.read<AuthProvider>();
                final router = GoRouter.of(context);
                final ok = await showDialog<bool>(context: context,
                  builder: (_) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: Text('Logout?', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                    content: Text('Are you sure you want to logout?', style: GoogleFonts.inter()),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context, false),
                        child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textSecondary))),
                      ElevatedButton(onPressed: () => Navigator.pop(context, true),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, shape: const StadiumBorder()),
                        child: Text('Logout', style: GoogleFonts.inter(fontWeight: FontWeight.w700))),
                    ],
                  ));
                if (ok == true) {
                  await authProvider.logout();
                  router.go('/login');
                }
              }, color: AppColors.danger),
            ]),
            const SizedBox(height: 100),
          ]),
        ),
      ]),
      bottomNavigationBar: const BottomNavBar(currentIndex: 4),
    );
  }

  Widget _section(List<Widget> items) => Container(
    margin: const EdgeInsets.symmetric(horizontal: 16),
    decoration: BoxDecoration(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(children: items),
  );

  Widget _item(BuildContext ctx, IconData icon, String label, VoidCallback onTap, {Color? color}) {
    final isLast = label == 'Logout' || label == 'Terms of Service' || label == 'My Chats';
    return Column(children: [
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(children: [
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: color != null ? color.withValues(alpha: 0.1) : const Color(0xFFF0F3FC),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: color ?? AppColors.navy),
            ),
            const SizedBox(width: 14),
            Expanded(child: Text(label,
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500, color: color ?? AppColors.textPrimary))),
            Icon(Icons.arrow_forward_ios, size: 14, color: color ?? AppColors.textMuted),
          ]),
        ),
      ),
      if (!isLast) const Divider(height: 1, indent: 68),
    ]);
  }
}
