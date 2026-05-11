// ─── Seller Profile Screen — Phase 7 ─────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../widgets/ad_card.dart';

class SellerProfileScreen extends StatefulWidget {
  final String sellerId;
  const SellerProfileScreen({super.key, required this.sellerId});
  @override
  State<SellerProfileScreen> createState() => _SellerProfileScreenState();
}

class _SellerProfileScreenState extends State<SellerProfileScreen> {
  Map<String, dynamic>? _seller;
  List<dynamic>  _ads     = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        http.get(Uri.parse('${ApiConfig.users}/${widget.sellerId}')),
        http.get(Uri.parse('${ApiConfig.ads}/user/${widget.sellerId}')),
      ]);
      if (!mounted) { return; }
      if (results[0].statusCode == 200) {
        _seller = jsonDecode(results[0].body) as Map<String, dynamic>;
      }
      if (results[1].statusCode == 200) {
        _ads = jsonDecode(results[1].body) as List<dynamic>;
      }
      setState(() => _loading = false);
    } catch (_) { if (mounted) { setState(() => _loading = false); } }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(backgroundColor: AppColors.bg,
        body: Center(child: CircularProgressIndicator(color: AppColors.navy)));
    }

    final seller = _seller ?? {};
    final name   = seller['businessName'] as String? ?? seller['name'] as String? ?? 'Seller';
    final avatar = seller['avatar'] as String?;
    final rating = seller['ratingAvg'] as num? ?? 0;
    final count  = seller['ratingCount'] as num? ?? 0;
    final loc    = seller['location'] as Map<String, dynamic>? ?? {};
    final city   = loc['city'] as String? ?? '';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(slivers: [
        // Hero header
        SliverAppBar(
          expandedHeight: 200, pinned: true, backgroundColor: AppColors.orange,
          leading: Padding(padding: const EdgeInsets.all(8),
            child: CircleAvatar(backgroundColor: Colors.white24,
              child: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white, size: 18),
                onPressed: () => context.pop()))),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFFe87e04), Color(0xFFf5a623)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const SizedBox(height: 40),
                CircleAvatar(
                  radius: 40, backgroundColor: Colors.white30,
                  backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
                  child: avatar == null ? Text(name[0].toUpperCase(),
                    style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)) : null,
                ),
                const SizedBox(height: 12),
                Text(name, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                if (city.isNotEmpty) Text(city, style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
                if (count > 0) Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.star, size: 14, color: AppColors.yellow),
                  const SizedBox(width: 4),
                  Text('${rating.toStringAsFixed(1)} ($count reviews)',
                    style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
                ]),
              ]),
            ),
          ),
        ),

        // Ads
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text('Listings (${_ads.length})',
              style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          ),
        ),
        _ads.isEmpty
            ? SliverToBoxAdapter(child: Center(
                child: Padding(padding: const EdgeInsets.all(40),
                  child: Text('No active listings', style: GoogleFonts.inter(color: AppColors.textSecondary)))))
            : SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) {
                      final ad   = _ads[i] as Map<String, dynamic>;
                      final adId = ad['_id']?.toString() ?? '';
                      return AdCard(ad: ad, onTap: () => context.push('/ads/$adId'));
                    },
                    childCount: _ads.length,
                  ),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.68),
                ),
              ),
      ]),
    );
  }
}
