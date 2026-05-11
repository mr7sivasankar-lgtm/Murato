// ─── Favorites Screen — Phase 7 ───────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';
import '../../services/ads_service.dart';
import '../../widgets/ad_card.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});
  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<dynamic> _ads = [];
  Set<String>   _favIds = {};
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final favs = await AdsService.fetchMyFavorites();
      if (!mounted) return;
      setState(() {
        _ads    = favs;
        _favIds = favs.map((a) => (a['_id'] ?? '').toString()).toSet();
        _loading= false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _toggleFav(String adId) async {
    await AdsService.toggleFavorite(adId);
    setState(() {
      _favIds.remove(adId);
      _ads.removeWhere((a) => (a['_id']?.toString()) == adId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white, elevation: 0,
        leading: BackButton(color: AppColors.textPrimary, onPressed: () => context.pop()),
        title: Text('Saved Ads', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
          : _ads.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('❤️', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 16),
                  Text('No saved ads', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Tap ♡ on any ad to save it', style: GoogleFonts.inter(color: AppColors.textSecondary)),
                  const SizedBox(height: 20),
                  ElevatedButton(onPressed: () => context.go('/'),
                    child: Text('Browse Ads', style: GoogleFonts.inter(fontWeight: FontWeight.w800))),
                ]))
              : RefreshIndicator(
                  onRefresh: _load, color: AppColors.navy,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.68),
                    itemCount: _ads.length,
                    itemBuilder: (_, i) {
                      final ad   = _ads[i] as Map<String, dynamic>;
                      final adId = ad['_id']?.toString() ?? '';
                      return AdCard(
                        ad: ad,
                        isFavorited: _favIds.contains(adId),
                        onTap: () => context.push('/ads/$adId'),
                        onFavTap: () => _toggleFav(adId),
                      );
                    },
                  )),
    );
  }
}
