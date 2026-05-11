// ─── Bottom Navigation Bar ───────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  const BottomNavBar({super.key, required this.currentIndex});

  static const _routes = ['/', '/search', '/sell', '/chats', '/profile'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.border, width: 0.8)),
        boxShadow: [BoxShadow(color: Color(0x141a2b5f), blurRadius: 24, offset: Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _navItem(context, 0, Icons.home_outlined, Icons.home, 'Home'),
              _navItem(context, 1, Icons.search_outlined, Icons.search, 'Search'),
              _sellButton(context),
              _navItem(context, 3, Icons.chat_bubble_outline, Icons.chat_bubble, 'Chats'),
              _navItem(context, 4, Icons.person_outline, Icons.person, 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(BuildContext ctx, int idx, IconData icon, IconData activeIcon, String label) {
    final active = currentIndex == idx;
    return Expanded(
      child: GestureDetector(
        onTap: () => ctx.go(_routes[idx]),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(active ? activeIcon : icon, size: 22,
                color: active ? AppColors.navy : AppColors.textMuted),
            const SizedBox(height: 3),
            Text(label,
              style: GoogleFonts.inter(
                fontSize: 10, fontWeight: FontWeight.w600,
                color: active ? AppColors.navy : AppColors.textMuted,
                letterSpacing: 0.2,
              )),
          ],
        ),
      ),
    );
  }

  Widget _sellButton(BuildContext ctx) {
    return Expanded(
      child: GestureDetector(
        onTap: () => ctx.go('/sell'),
        child: Column(
          children: [
            Transform.translate(
              offset: const Offset(0, -16),
              child: Container(
                width: 54, height: 54,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFe87e04), Color(0xFFf5a623)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3.5),
                  boxShadow: const [BoxShadow(color: Color(0x72e87e04), blurRadius: 16, offset: Offset(0, 6))],
                ),
                child: const Icon(Icons.add, color: Colors.white, size: 26),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -14),
              child: Text('Sell',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.orange)),
            ),
          ],
        ),
      ),
    );
  }
}
