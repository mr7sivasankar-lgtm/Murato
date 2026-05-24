// ─── Ad Card Widget ──────────────────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../config/app_theme.dart';

class AdCard extends StatelessWidget {
  final Map<String, dynamic> ad;
  final VoidCallback? onTap;
  final VoidCallback? onFavTap;
  final bool isFavorited;

  const AdCard({
    super.key,
    required this.ad,
    this.onTap,
    this.onFavTap,
    this.isFavorited = false,
  });

  @override
  Widget build(BuildContext context) {
    final images   = ad['images'] as List<dynamic>? ?? [];
    final price    = ad['price'] as num? ?? 0;
    final title    = ad['title'] as String? ?? '';
    final category = ad['category'] as String? ?? '';
    final seller   = ad['userId'] as Map<String, dynamic>?;
    final biz      = seller?['businessName'] as String? ?? seller?['name'] as String? ?? '';
    final isService  = ad['type'] == 'service';
    final priceType  = ad['priceType'] as String? ?? '';

    // Distance — returned by backend when queried with lat/lng
    final distance = ad['distance'] as num?;

    final priceStr = price == 0
        ? 'Contact'
        : '₹${NumberFormat('#,##,###').format(price)}'
          '${priceType == 'per_day' ? '/day' : priceType == 'per_sqft' ? '/sqft' : priceType == 'per_load' ? '/Load' : ''}';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.8),
          boxShadow: const [BoxShadow(color: Color(0x0A1a2b5f), blurRadius: 12, offset: Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image ──────────────────────────────────────────────────────
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: images.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: images[0] as String,
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => _shimmer(),
                          errorWidget: (_, __, ___) => _placeholder(isService),
                        )
                      : _placeholder(isService),
                ),
                // Type badge
                Positioned(
                  top: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isService ? AppColors.navy : AppColors.yellow,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isService ? '🔧 Service' : '📦 Material',
                      style: GoogleFonts.inter(
                        fontSize: 10, fontWeight: FontWeight.w700,
                        color: isService ? AppColors.white : AppColors.navyDark,
                      ),
                    ),
                  ),
                ),
                // Distance badge (top-right if no fav button, else below)
                if (distance != null)
                  Positioned(
                    bottom: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.near_me, size: 10, color: Colors.white),
                          const SizedBox(width: 3),
                          Text(
                            '${distance.toStringAsFixed(1)} km',
                            style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Fav button
                if (onFavTap != null)
                  Positioned(
                    top: 8, right: 8,
                    child: GestureDetector(
                      onTap: onFavTap,
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isFavorited ? Icons.favorite : Icons.favorite_border,
                          size: 16,
                          color: isFavorited ? AppColors.danger : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // ── Info ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 13, fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary, height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Category
                  if (category.isNotEmpty)
                    Text(category,
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
                  const SizedBox(height: 6),
                  // Price
                  Text(
                    priceStr,
                    style: GoogleFonts.inter(
                      fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.navy),
                  ),
                  // Business / seller name — highlighted in pineapple
                  if (biz.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.store_rounded, size: 11, color: AppColors.pineapple),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            biz,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.pineapple,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _shimmer() => Container(height: 140, color: const Color(0xFFE8EDF5));

  Widget _placeholder(bool isService) => Container(
    height: 140,
    color: const Color(0xFFE8EDF5),
    child: Center(child: Text(isService ? '🔧' : '📦', style: const TextStyle(fontSize: 40))),
  );
}
