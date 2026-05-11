// ─── Home Screen — Phase 2 ────────────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/ads_service.dart';
import '../../widgets/ad_card.dart';
import '../../widgets/bottom_nav_bar.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _ads         = [];
  List<dynamic> _banners     = [];
  List<dynamic> _categories  = [];
  String? _selectedCategory;
  bool _loading              = true;
  int  _bannerPage           = 0;
  final _bannerCtrl          = PageController();
  Set<String> _favorites     = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        AdsService.fetchBanners(),
        AdsService.fetchCategories(),
        AdsService.fetchAds(),
        AdsService.fetchMyFavorites(),
      ]);
      if (!mounted) return;
      setState(() {
        _banners    = results[0] as List<dynamic>;
        _categories = results[1] as List<dynamic>;
        final adsData = results[2] as Map<String, dynamic>;
        _ads        = adsData['ads'] as List<dynamic>? ?? [];
        _favorites  = (results[3] as List<dynamic>).map((a) => (a['_id'] ?? '').toString()).toSet();
      });
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadByCategory(String? cat) async {
    setState(() { _selectedCategory = cat; _loading = true; });
    try {
      final data = await AdsService.fetchAds(category: cat);
      if (!mounted) return;
      setState(() => _ads = data['ads'] as List<dynamic>? ?? []);
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
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.navy,
          child: CustomScrollView(
            slivers: [
              // ── Sticky header ──────────────────────────────────────────────
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.white,
                elevation: 0,
                expandedHeight: 0,
                titleSpacing: 0,
                title: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      // Logo + greeting
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Myillo 🏗️',
                            style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.navy)),
                          Text('Hi, ${user?['name'] ?? 'there'}!',
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                        ],
                      ),
                      const Spacer(),
                      // Search tap
                      GestureDetector(
                        onTap: () => context.push('/search'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            color: AppColors.bg,
                            borderRadius: BorderRadius.circular(50),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.search, size: 16, color: AppColors.textMuted),
                              const SizedBox(width: 6),
                              Text('Search...', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Banner carousel ─────────────────────────────────────
                    if (_banners.isNotEmpty) _buildBanners(),
                    const SizedBox(height: 16),

                    // ── Categories ──────────────────────────────────────────
                    if (_categories.isNotEmpty) _buildCategories(),
                    const SizedBox(height: 16),

                    // ── Section header ──────────────────────────────────────
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _selectedCategory ?? 'Latest Ads',
                            style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                          ),
                          if (_selectedCategory != null)
                            GestureDetector(
                              onTap: () => _loadByCategory(null),
                              child: Text('Clear', style: GoogleFonts.inter(fontSize: 13, color: AppColors.orange, fontWeight: FontWeight.w600)),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),

              // ── Ads grid ────────────────────────────────────────────────
              _loading
                  ? SliverToBoxAdapter(child: _buildSkeletons())
                  : _ads.isEmpty
                      ? SliverToBoxAdapter(child: _buildEmpty())
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                          sliver: SliverGrid(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) {
                                final ad = _ads[i] as Map<String, dynamic>;
                                final adId = ad['_id']?.toString() ?? '';
                                return AdCard(
                                  ad: ad,
                                  isFavorited: _favorites.contains(adId),
                                  onTap: () => context.push('/ads/$adId'),
                                  onFavTap: () => _toggleFav(adId),
                                );
                              },
                              childCount: _ads.length,
                            ),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 12,
                              crossAxisSpacing: 12,
                              childAspectRatio: 0.68,
                            ),
                          ),
                        ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const BottomNavBar(currentIndex: 0),
    );
  }

  Widget _buildBanners() {
    return Column(
      children: [
        SizedBox(
          height: 160,
          child: PageView.builder(
            controller: _bannerCtrl,
            itemCount: _banners.length,
            onPageChanged: (i) => setState(() => _bannerPage = i),
            itemBuilder: (_, i) {
              final b = _banners[i] as Map<String, dynamic>;
              final img = b['imageUrl'] as String? ?? '';
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: img.isNotEmpty
                      ? CachedNetworkImage(imageUrl: img, fit: BoxFit.cover, width: double.infinity)
                      : Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [AppColors.navy, AppColors.navyLight],
                              begin: Alignment.topLeft, end: Alignment.bottomRight,
                            ),
                          ),
                          child: Center(
                            child: Text(b['title'] as String? ?? 'Myillo',
                              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                          ),
                        ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_banners.length, (i) => Container(
            width: i == _bannerPage ? 20 : 6,
            height: 6,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: BoxDecoration(
              color: i == _bannerPage ? AppColors.navy : AppColors.border,
              borderRadius: BorderRadius.circular(3),
            ),
          )),
        ),
      ],
    );
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 88,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (_, i) {
          final cat = _categories[i] as Map<String, dynamic>;
          final name = cat['name'] as String? ?? '';
          final icon = cat['icon'] as String? ?? '🏗️';
          final isActive = _selectedCategory == name;
          return GestureDetector(
            onTap: () => _loadByCategory(isActive ? null : name),
            child: Container(
              width: 72,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFF8FAFF) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isActive ? AppColors.navy : const Color(0xFFE5E7EB), width: isActive ? 1.5 : 1),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(icon, style: const TextStyle(fontSize: 22)),
                  const SizedBox(height: 4),
                  Text(name,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textPrimary, height: 1.2)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSkeletons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.count(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12,
        childAspectRatio: 0.68, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        children: List.generate(6, (_) => Container(
          decoration: BoxDecoration(
            color: const Color(0xFFE8EDF5),
            borderRadius: BorderRadius.circular(16),
          ),
        )),
      ),
    );
  }

  Widget _buildEmpty() => Padding(
    padding: const EdgeInsets.all(40),
    child: Column(
      children: [
        const Text('🏗️', style: TextStyle(fontSize: 56)),
        const SizedBox(height: 16),
        Text('No ads found', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Text('Try a different category or check back later',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
      ],
    ),
  );

  @override
  void dispose() {
    _bannerCtrl.dispose();
    super.dispose();
  }
}
