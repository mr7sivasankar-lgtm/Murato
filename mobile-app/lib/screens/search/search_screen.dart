// ─── Search Screen — Phase 3 ─────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';
import '../../services/ads_service.dart';
import '../../widgets/ad_card.dart';
import '../../widgets/bottom_nav_bar.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  List<dynamic> _results = [];
  bool _loading = false;
  bool _searched = false;
  Set<String> _favorites = {};

  @override
  void initState() {
    super.initState();
    _loadFavs();
  }

  Future<void> _loadFavs() async {
    final favs = await AdsService.fetchMyFavorites();
    if (!mounted) return;
    setState(() => _favorites = favs.map((a) => (a['_id'] ?? '').toString()).toSet());
  }

  Future<void> _search(String q) async {
    if (q.trim().isEmpty) return;
    setState(() { _loading = true; _searched = true; });
    try {
      final data = await AdsService.fetchAds(q: q.trim());
      if (!mounted) return;
      setState(() => _results = data['ads'] as List<dynamic>? ?? []);
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFav(String adId) async {
    final now = Set<String>.from(_favorites);
    setState(() { now.contains(adId) ? now.remove(adId) : now.add(adId); _favorites = now; });
    await AdsService.toggleFavorite(adId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          onSubmitted: _search,
          style: GoogleFonts.inter(fontSize: 15, color: AppColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'Search products, services, brands...',
            hintStyle: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 14),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
          ),
          textInputAction: TextInputAction.search,
        ),
        actions: [
          if (_ctrl.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear, color: AppColors.textMuted, size: 20),
              onPressed: () { _ctrl.clear(); setState(() { _results = []; _searched = false; }); },
            ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton(
              onPressed: () => _search(_ctrl.text),
              child: Text('Search', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.navy)),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
          : !_searched
              ? _buildSuggestions()
              : _results.isEmpty
                  ? _buildNoResults()
                  : _buildResults(),
      bottomNavigationBar: const BottomNavBar(currentIndex: 1),
    );
  }

  Widget _buildSuggestions() => Padding(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Popular searches', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: ['Cement', 'Steel', 'Bricks', 'Tiles', 'Painter', 'Carpenter', 'Electrician', 'Plumber']
              .map((s) => GestureDetector(
                    onTap: () { _ctrl.text = s; _search(s); },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(50),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(s, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
                    ),
                  ))
              .toList(),
        ),
      ],
    ),
  );

  Widget _buildNoResults() => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('🔍', style: TextStyle(fontSize: 56)),
        const SizedBox(height: 16),
        Text('No results for "${_ctrl.text}"',
          style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Text('Try different keywords', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
      ],
    ),
  );

  Widget _buildResults() => GridView.builder(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
      crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.68,
    ),
    itemCount: _results.length,
    itemBuilder: (_, i) {
      final ad = _results[i] as Map<String, dynamic>;
      final adId = ad['_id']?.toString() ?? '';
      return AdCard(
        ad: ad,
        isFavorited: _favorites.contains(adId),
        onTap: () => context.push('/ads/$adId'),
        onFavTap: () => _toggleFav(adId),
      );
    },
  );

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
}
