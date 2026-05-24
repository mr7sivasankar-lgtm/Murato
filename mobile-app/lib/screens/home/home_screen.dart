// ─── Home Screen — Phase 2 ────────────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/ads_service.dart';
import '../../services/auth_service.dart';
import '../../services/places_service.dart';
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

  // ── Location picker bottom sheet ──────────────────────────────────────────
  void _showLocationPicker(BuildContext context, Map<String, dynamic>? user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LocationPickerSheet(
        currentCity: _extractCity(user),
        onLocationSaved: (PlaceDetails place) async {
          final auth = context.read<AuthProvider>();
          try {
            await AuthService.saveLocation(
              city:        place.city,
              area:        place.area,
              street:      place.street,
              state:       place.state,
              pincode:     place.pincode,
              fullAddress: place.fullAddress,
              lat:         place.lat,
              lng:         place.lng,
            );
            if (!mounted) return;
            // Reload ads with new coordinates
            setState(() { _loading = true; });
            final data = await AdsService.fetchAds(
              lat: place.lat != 0 ? place.lat : null,
              lng: place.lng != 0 ? place.lng : null,
            );
            if (!mounted) return;
            setState(() {
              _ads = data['ads'] as List<dynamic>? ?? [];
              _loading = false;
            });
            // Update auth provider user location display
            if (mounted) {
              auth.updateLocation({
                'city':        place.city,
                'area':        place.area,
                'street':      place.street,
                'state':       place.state,
                'pincode':     place.pincode,
                'fullAddress': place.fullAddress,
                'coordinates': [place.lng, place.lat],
              });
            }
          } catch (_) {
            if (mounted) setState(() => _loading = false);
          }
        },
      ),
    );
  }

  String _extractCity(Map<String, dynamic>? user) {
    final loc  = user?['location'] as Map<String, dynamic>?;
    final area = loc?['area'] as String? ?? '';
    final city = loc?['city'] as String? ?? '';
    if (area.isNotEmpty) return area;
    if (city.isNotEmpty) return city;
    return 'Set location';
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final city = _extractCity(user);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _load,
          color: AppColors.navy,
          child: CustomScrollView(
            slivers: [
              // ── Sticky header ─────────────────────────────────────────────
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.white,
                elevation: 0,
                expandedHeight: 0,
                titleSpacing: 0,
                title: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // ── Left: greeting + location ─────────────────────────
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Greeting with pineapple name
                            RichText(
                              text: TextSpan(children: [
                                TextSpan(
                                  text: 'Hi, ',
                                  style: GoogleFonts.inter(fontSize: 15, color: AppColors.textSecondary),
                                ),
                                TextSpan(
                                  text: (user?['name'] as String? ?? '').isNotEmpty
                                      ? user!['name'] as String
                                      : 'there',
                                  style: GoogleFonts.inter(
                                    fontSize: 15, fontWeight: FontWeight.w800,
                                    color: AppColors.pineapple,
                                  ),
                                ),
                                TextSpan(
                                  text: ' 👋',
                                  style: GoogleFonts.inter(fontSize: 15, color: AppColors.textSecondary),
                                ),
                              ]),
                            ),
                            const SizedBox(height: 2),
                            // Location indicator — tappable
                            GestureDetector(
                              onTap: () => _showLocationPicker(context, user),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.location_on_rounded, size: 13, color: AppColors.navy),
                                  const SizedBox(width: 2),
                                  Text(
                                    city,
                                    style: GoogleFonts.inter(
                                      fontSize: 12, fontWeight: FontWeight.w700,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  const SizedBox(width: 2),
                                  const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: AppColors.navy),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // ── Right: search pill ────────────────────────────────
                      GestureDetector(
                        onTap: () => context.push('/search'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            color: AppColors.bg,
                            borderRadius: BorderRadius.circular(50),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(children: [
                            const Icon(Icons.search, size: 16, color: AppColors.textMuted),
                            const SizedBox(width: 6),
                            Text('Search...', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted)),
                          ]),
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
                    // ── Banner carousel ──────────────────────────────────────
                    if (_banners.isNotEmpty) _buildBanners(),
                    const SizedBox(height: 16),

                    // ── Categories ───────────────────────────────────────────
                    if (_categories.isNotEmpty) _buildCategories(),
                    const SizedBox(height: 16),

                    // ── Section header ───────────────────────────────────────
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

              // ── Ads grid ─────────────────────────────────────────────────
              _loading
                  ? SliverToBoxAdapter(child: _buildSkeletons())
                  : _ads.isEmpty
                      ? SliverToBoxAdapter(child: _buildEmpty())
                      : SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                          sliver: SliverGrid(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) {
                                final ad   = _ads[i] as Map<String, dynamic>;
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
    return Column(children: [
      SizedBox(
        height: 160,
        child: PageView.builder(
          controller: _bannerCtrl,
          itemCount: _banners.length,
          onPageChanged: (i) => setState(() => _bannerPage = i),
          itemBuilder: (_, i) {
            final b   = _banners[i] as Map<String, dynamic>;
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
                        child: Center(child: Text(b['title'] as String? ?? 'Myillo',
                          style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white))),
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
          width: i == _bannerPage ? 20 : 6, height: 6,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          decoration: BoxDecoration(
            color: i == _bannerPage ? AppColors.navy : AppColors.border,
            borderRadius: BorderRadius.circular(3),
          ),
        )),
      ),
    ]);
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 88,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (_, i) {
          final cat      = _categories[i] as Map<String, dynamic>;
          final name     = cat['name'] as String? ?? '';
          final icon     = cat['icon'] as String? ?? '🏗️';
          final isActive = _selectedCategory == name;
          return GestureDetector(
            onTap: () => _loadByCategory(isActive ? null : name),
            child: Container(
              width: 72,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFF8FAFF) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isActive ? AppColors.navy : const Color(0xFFE5E7EB),
                  width: isActive ? 1.5 : 1),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(icon, style: const TextStyle(fontSize: 22)),
                const SizedBox(height: 4),
                Text(name,
                  textAlign: TextAlign.center, maxLines: 2,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary, height: 1.2)),
              ]),
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
        childAspectRatio: 0.68, shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        children: List.generate(6, (_) => Container(
          decoration: BoxDecoration(color: const Color(0xFFE8EDF5), borderRadius: BorderRadius.circular(16)),
        )),
      ),
    );
  }

  Widget _buildEmpty() => Padding(
    padding: const EdgeInsets.all(40),
    child: Column(children: [
      const Text('🏗️', style: TextStyle(fontSize: 56)),
      const SizedBox(height: 16),
      Text('No ads found', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
      const SizedBox(height: 8),
      Text('Try a different category or check back later',
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
    ]),
  );

  @override
  void dispose() {
    _bannerCtrl.dispose();
    super.dispose();
  }
}

// ─── Location Picker Bottom Sheet ─────────────────────────────────────────────
class _LocationPickerSheet extends StatefulWidget {
  final String currentCity;
  final Function(PlaceDetails) onLocationSaved;

  const _LocationPickerSheet({
    required this.currentCity,
    required this.onLocationSaved,
  });

  @override
  State<_LocationPickerSheet> createState() => _LocationPickerSheetState();
}

class _LocationPickerSheetState extends State<_LocationPickerSheet> {
  final _searchCtrl           = TextEditingController();
  List<PlaceSuggestion> _suggestions = [];
  bool _searchingPlaces       = false;
  bool _detectingLocation     = false;

  // Confirmation state
  PlaceDetails? _pendingPlace;
  bool _confirming            = false;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_onSearchChanged);
  }

  // Debounced fuzzy search
  DateTime _lastSearch = DateTime(2000);
  void _onSearchChanged() {
    final q = _searchCtrl.text.trim();
    if (q.isEmpty) { setState(() => _suggestions = []); return; }
    _lastSearch = DateTime.now();
    final captured = _lastSearch;
    Future.delayed(const Duration(milliseconds: 400), () async {
      if (captured != _lastSearch || !mounted) return;
      setState(() => _searchingPlaces = true);
      final results = await PlacesService.autocomplete(q);
      if (!mounted) return;
      setState(() { _suggestions = results; _searchingPlaces = false; });
    });
  }

  Future<void> _handleCurrentLocation() async {
    setState(() => _detectingLocation = true);
    try {
      bool svcEnabled = await Geolocator.isLocationServiceEnabled();
      if (!svcEnabled) { _snack('Enable location services'); return; }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) { _snack('Location permission denied'); return; }
      }
      if (perm == LocationPermission.deniedForever) { _snack('Location permission permanently denied'); return; }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      PlaceDetails? details = await PlacesService.reverseGeocode(pos.latitude, pos.longitude);

      // Fallback to geocoding package
      if (details == null) {
        final placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          details = PlaceDetails(
            lat: pos.latitude, lng: pos.longitude,
            fullAddress: [p.subThoroughfare, p.thoroughfare, p.subLocality,
                          p.locality, p.administrativeArea, p.postalCode]
                .where((s) => s != null && s.isNotEmpty).join(', '),
            city:    p.locality            ?? p.subAdministrativeArea ?? '',
            area:    p.subLocality         ?? '',
            street:  p.thoroughfare        ?? '',
            state:   p.administrativeArea  ?? '',
            pincode: p.postalCode          ?? '',
          );
        }
      }

      if (details != null && mounted) {
        setState(() => _pendingPlace = details);
      } else {
        _snack('Could not detect location');
      }
    } catch (_) {
      _snack('Location error. Try searching.');
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
  }

  Future<void> _handleSelectSuggestion(PlaceSuggestion s) async {
    FocusScope.of(context).unfocus();
    setState(() => _searchingPlaces = true);
    try {
      final details = await PlacesService.getPlaceDetails(s.placeId);
      if (details != null && mounted) {
        setState(() => _pendingPlace = details);
      } else {
        _snack('Could not load place details');
      }
    } catch (_) {
      _snack('Could not load place details');
    } finally {
      if (mounted) setState(() => _searchingPlaces = false);
    }
  }

  Future<void> _confirmAndSave() async {
    final place = _pendingPlace;
    if (place == null) return;
    setState(() => _confirming = true);
    try {
      await widget.onLocationSaved(place);
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      _snack('Failed to save location');
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // ── Handle ────────────────────────────────────────────────────
            const SizedBox(height: 12),
            Center(child: Container(
              width: 36, height: 4,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
            )),
            const SizedBox(height: 16),

            // ── Header ────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Change Location',
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                    if (widget.currentCity.isNotEmpty && widget.currentCity != 'Set location')
                      Text('Current: ${widget.currentCity}',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                  ]),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: const Icon(Icons.close, color: AppColors.textMuted, size: 22),
                ),
              ]),
            ),
            const SizedBox(height: 16),

            // ── Search field ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Row(children: [
                  const SizedBox(width: 12),
                  const Icon(Icons.search, size: 20, color: AppColors.textMuted),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      style: GoogleFonts.inter(fontSize: 15, color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Search area, locality, city…',
                        hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textMuted),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        filled: false,
                      ),
                    ),
                  ),
                  if (_searchCtrl.text.isNotEmpty)
                    GestureDetector(
                      onTap: () { _searchCtrl.clear(); setState(() => _suggestions = []); },
                      child: const Padding(padding: EdgeInsets.all(10), child: Icon(Icons.close, size: 16, color: AppColors.textMuted)),
                    ),
                  const SizedBox(width: 4),
                ]),
              ),
            ),
            const SizedBox(height: 12),

            // ── Body: confirm card OR suggestions ─────────────────────────
            Expanded(
              child: _pendingPlace != null
                  ? _buildConfirmCard()
                  : ListView(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        // Use current location
                        _locationOptionTile(
                          icon: Icons.my_location_rounded,
                          label: 'Use my current location',
                          sublabel: 'Auto-detect via GPS',
                          loading: _detectingLocation,
                          onTap: _detectingLocation ? null : _handleCurrentLocation,
                        ),
                        const SizedBox(height: 16),

                        if (_searchCtrl.text.isEmpty) ...[
                          const Divider(),
                          const SizedBox(height: 8),
                          Text('POPULAR CITIES',
                            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800,
                              color: AppColors.textMuted, letterSpacing: 1.1)),
                          const SizedBox(height: 10),
                          Wrap(spacing: 8, runSpacing: 8, children: [
                            'Tirupati', 'Hyderabad', 'Chennai', 'Bengaluru',
                            'Vijayawada', 'Visakhapatnam', 'Guntur', 'Nellore',
                          ].map((city) => GestureDetector(
                            onTap: () => _searchCtrl.text = city,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0F3FC),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFD6E0FF)),
                              ),
                              child: Text(city,
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.navy)),
                            ),
                          )).toList()),
                        ] else if (_searchingPlaces)
                          const Padding(
                            padding: EdgeInsets.only(top: 30),
                            child: Center(child: CircularProgressIndicator(color: AppColors.navy, strokeWidth: 2)),
                          )
                        else if (_suggestions.isEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 30),
                            child: Text('No suggestions found',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                          )
                        else ...[
                          Text('SUGGESTIONS',
                            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800,
                              color: AppColors.textMuted, letterSpacing: 1.1)),
                          const SizedBox(height: 8),
                          ..._suggestions.map((s) => GestureDetector(
                            onTap: () => _handleSelectSuggestion(s),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 4),
                              decoration: BoxDecoration(
                                border: Border(bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
                              ),
                              child: Row(children: [
                                Container(
                                  width: 34, height: 34,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFF0F3FC), shape: BoxShape.circle),
                                  child: const Icon(Icons.location_on_outlined, size: 16, color: AppColors.navy),
                                ),
                                const SizedBox(width: 12),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(s.mainText,
                                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                  if (s.secondaryText.isNotEmpty)
                                    Text(s.secondaryText,
                                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                                      overflow: TextOverflow.ellipsis),
                                ])),
                                const Icon(Icons.north_west, size: 14, color: AppColors.textMuted),
                              ]),
                            ),
                          )),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Confirmation card (after selecting or detecting location) ─────────────
  Widget _buildConfirmCard() {
    final place       = _pendingPlace!;
    final displayAddr = place.fullAddress.isNotEmpty ? place.fullAddress : place.formattedAddress;
    final mapUrl      = (place.lat != 0 || place.lng != 0)
        ? PlacesService.staticMapUrl(lat: place.lat, lng: place.lng, width: 640, height: 280)
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mini map preview
          if (mapUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(children: [
                CachedNetworkImage(
                  imageUrl: mapUrl,
                  height: 180, width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(height: 180, color: const Color(0xFFE8EDF5),
                    child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.navy))),
                  errorWidget: (_, __, ___) => Container(height: 180, color: const Color(0xFFE8EDF5),
                    child: const Icon(Icons.map_outlined, size: 48, color: Color(0xFF90AFCC))),
                ),
                const Positioned.fill(child: Center(
                  child: Icon(Icons.location_pin, size: 40, color: AppColors.navy),
                )),
              ]),
            ),
          const SizedBox(height: 16),

          // Address details
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.location_on_rounded, size: 18, color: AppColors.navy),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(place.shortDisplay,
                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ),
              ]),
              if (displayAddr.isNotEmpty) ...[
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.only(left: 26),
                  child: Text(displayAddr,
                    style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary, height: 1.5)),
                ),
              ],
              // Field chips
              if (place.city.isNotEmpty || place.state.isNotEmpty) ...[
                const SizedBox(height: 10),
                Padding(
                  padding: const EdgeInsets.only(left: 26),
                  child: Wrap(spacing: 6, runSpacing: 4, children: [
                    if (place.area.isNotEmpty)    _chip('📍 ${place.area}'),
                    if (place.city.isNotEmpty)    _chip('🏙️ ${place.city}'),
                    if (place.state.isNotEmpty)   _chip('🗺️ ${place.state}'),
                    if (place.pincode.isNotEmpty) _chip('📮 ${place.pincode}'),
                  ]),
                ),
              ],
            ]),
          ),

          const SizedBox(height: 16),

          // Confirm button
          ElevatedButton(
            onPressed: _confirming ? null : _confirmAndSave,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _confirming
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Confirm this location',
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
          ),

          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () => setState(() => _pendingPlace = null),
              child: Text('Choose a different location',
                style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _locationOptionTile({
    required IconData icon,
    required String label,
    required String sublabel,
    bool loading = false,
    VoidCallback? onTap,
  }) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3FC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD6E0FF)),
      ),
      child: Row(children: [
        Container(
          width: 38, height: 38,
          decoration: const BoxDecoration(color: AppColors.navy, shape: BoxShape.circle),
          child: loading
              ? const Padding(padding: EdgeInsets.all(9),
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Icon(icon, size: 18, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.navy)),
          Text(sublabel, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
        ])),
        const Icon(Icons.chevron_right, size: 18, color: AppColors.navy),
      ]),
    ),
  );

  Widget _chip(String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AppColors.border)),
    child: Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.navy)),
  );
}
