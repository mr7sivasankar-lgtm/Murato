// ─── Auth Wrapper Widget ───────────────────────────────────────────────────────
// Shared screen shell used by all auth steps.
// White-to-warm-gradient bg, Myillo logo SVG, rounded bottom card.

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';

class AuthWrapper extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;

  const AuthWrapper({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: Column(
        children: [
          // ── Hero section ────────────────────────────────────────────────
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.white,
                    Color(0xFFFFF8F0),
                    Color(0xFFFDE8C8),
                  ],
                  stops: [0.0, 0.55, 1.0],
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Myillo M+House SVG logo
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: CustomPaint(painter: _MyilloLogoPainter()),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          title,
                          style: GoogleFonts.inter(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy,
                            letterSpacing: -0.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          subtitle,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  // Decorative wave at the bottom of hero
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: CustomPaint(
                      painter: _WavePainter(),
                      size: const Size(double.infinity, 40),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Input card ──────────────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              boxShadow: [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 40,
                  offset: Offset(0, -8),
                ),
              ],
            ),
            padding: EdgeInsets.fromLTRB(
              24,
              28,
              24,
              // viewInsets.bottom = keyboard height
              // viewPadding.bottom = nav bar height (always present even when keyboard is up)
              MediaQuery.of(context).viewInsets.bottom +
              MediaQuery.of(context).viewPadding.bottom +
              24,
            ),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Custom painter for the Myillo M+House SVG logo
class _MyilloLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 140; // scale factor

    // Orange M shape
    final orangePaint = Paint()
      ..color = AppColors.orange
      ..style = PaintingStyle.stroke
      ..strokeWidth = 22 * s
      ..strokeCap = StrokeCap.square
      ..strokeJoin = StrokeJoin.miter;

    final mPath = Path()
      ..moveTo(10 * s, 110 * s)
      ..lineTo(10 * s, 30 * s)
      ..lineTo(70 * s, 75 * s)
      ..lineTo(130 * s, 30 * s)
      ..lineTo(130 * s, 110 * s);
    canvas.drawPath(mPath, orangePaint);

    // Navy roof triangle
    final navyFill = Paint()
      ..color = AppColors.navy
      ..style = PaintingStyle.fill;

    final roofPath = Path()
      ..moveTo(70 * s, 60 * s)
      ..lineTo(105 * s, 88 * s)
      ..lineTo(35 * s, 88 * s)
      ..close();
    canvas.drawPath(roofPath, navyFill);

    // Navy building body
    final bodyRect = RRect.fromLTRBR(
      44 * s, 88 * s, 96 * s, 124 * s,
      const Radius.circular(2),
    );
    canvas.drawRRect(bodyRect, navyFill);

    // Yellow windows
    final yellowPaint = Paint()
      ..color = AppColors.yellow
      ..style = PaintingStyle.fill;

    for (final pos in [
      [59.0, 96.0], [73.0, 96.0],
      [59.0, 108.0], [73.0, 108.0],
    ]) {
      canvas.drawRRect(
        RRect.fromLTRBR(
          pos[0] * s, pos[1] * s,
          (pos[0] + 8) * s, (pos[1] + 8) * s,
          const Radius.circular(1),
        ),
        yellowPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_MyilloLogoPainter old) => false;
}

/// Decorative wave at the bottom of the hero section
class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.orange.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(0, size.height * 0.5)
      ..quadraticBezierTo(
        size.width * 0.25, 0,
        size.width * 0.5, size.height * 0.4,
      )
      ..quadraticBezierTo(
        size.width * 0.75, size.height * 0.8,
        size.width, size.height * 0.3,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_WavePainter old) => false;
}
