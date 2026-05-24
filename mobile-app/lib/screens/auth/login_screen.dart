// ─── Login Screen ─────────────────────────────────────────────────────────────
// Steps: phone → pin (returning) | phone → name → set-pin → location-search
//        → location-confirm (new users)
// Fixes: #3 PIN error inline, #7 location confirm map, #8 fuzzy Places search

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/places_service.dart';
import '../../widgets/auth_wrapper.dart';
import '../../widgets/pin_input_widget.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Steps: phone | pin | name | set-pin | forgot | location-search | location-confirm
  String _step = 'phone';

  final _phoneCtrl   = TextEditingController();
  final _nameCtrl    = TextEditingController();
  final _forgotCtrl  = TextEditingController();
  final _searchCtrl  = TextEditingController(); // location search


  String _pin          = '';
  String _recoveredPin = '';
  bool   _showPin      = false;
  bool   _loading      = false;
  String? _pinError;
  String  _phone       = '';

  // Location search state (item 8: fuzzy search)
  List<PlaceSuggestion> _suggestions = [];
  bool _searchingPlaces = false;

  // Confirmed place details (item 7: confirmation screen)
  PlaceDetails? _confirmedPlace;

  @override
  void initState() {
    super.initState();
    _loadStoredPhone();
    _nameCtrl.addListener(() => setState(() {}));
    _searchCtrl.addListener(_onSearchChanged);
  }

  // ── Fuzzy location search listener ────────────────────────────────────────
  void _onSearchChanged() {
    final q = _searchCtrl.text.trim();
    if (q.isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debouncedSearch(q);
  }

  DateTime _lastSearch = DateTime(2000);
  void _debouncedSearch(String q) {
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

  Future<void> _loadStoredPhone() async {
    final stored = await AuthService.getPhone();
    if (stored != null && stored.isNotEmpty) {
      final digits = stored.replaceAll(RegExp(r'\D'), '');
      final last10 = digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
      setState(() => _phoneCtrl.text = last10);
    }
  }

  void _setLoading(bool v) { if (mounted) setState(() => _loading = v); }
  void _setStep(String s) {
    setState(() { _step = s; _pin = ''; _pinError = null; });
    if (s == 'location-search') {
      _searchCtrl.clear();
      _suggestions = [];
    }
  }

  // ── STEP: phone ───────────────────────────────────────────────────────────
  Future<void> _handlePhoneNext() async {
    final digits = _phoneCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) { _showSnack('Enter a valid 10-digit number'); return; }
    _setLoading(true);
    try {
      final full = '+91$digits';
      final res  = await AuthService.checkPhone(full);
      if (!mounted) return;
      _phone = full;
      _setStep(res['exists'] == true ? 'pin' : 'name');
    } on AuthException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Something went wrong. Try again.');
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: PIN login (FIX #3: error shown inline, no redirect) ─────────────
  Future<void> _handlePinLogin() async {
    if (_pin.length != 4) return;
    _setLoading(true);
    if (mounted) setState(() => _pinError = null);
    try {
      final res  = await AuthService.loginWithPin(phone: _phone, pin: _pin);
      final user = res['user'] as Map<String, dynamic>;
      if (!mounted) return;
      context.read<AuthProvider>().setUser(user);
      _showSnack('Welcome back, ${user['name']}! 👋');
      context.go('/');
    } on AuthException catch (e) {
      // Stay on PIN step — show inline error (do NOT navigate)
      if (mounted) setState(() { _pinError = e.message; _pin = ''; });
    } catch (_) {
      // Network / unexpected errors — also stay on PIN step
      if (mounted) setState(() { _pinError = 'Connection error. Try again.'; _pin = ''; });
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: register ────────────────────────────────────────────────────────
  Future<void> _handleRegister(String finalPin) async {
    _setLoading(true);
    final authProvider = context.read<AuthProvider>();
    try {
      final res = await AuthService.register(
        phone: _phone, name: _nameCtrl.text.trim(), pin: finalPin);
      authProvider.setUser(res['user'] as Map<String, dynamic>);
      _setStep('location-search');
    } on AuthException catch (e) {
      _showSnack(e.message);
      if (mounted) setState(() => _pin = '');
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: forgot PIN ──────────────────────────────────────────────────────
  Future<void> _handleForgotPin() async {
    final digits = _forgotCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) { _showSnack('Enter a valid 10-digit number'); return; }
    _setLoading(true);
    try {
      final res = await AuthService.forgotPin('+91$digits');
      _phone = '+91$digits';
      if (mounted) setState(() => _recoveredPin = res['pin'] as String);
    } on AuthException catch (e) {
      _showSnack(e.message);
    } finally {
      _setLoading(false);
    }
  }

  // ── GPS auto-detect → fill place + go to confirm (item 7) ─────────────────
  Future<void> _handleUseCurrentLocation() async {
    _setLoading(true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) { _showSnack('Please enable location services'); return; }

      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) { _showSnack('Location permission denied'); return; }
      }
      if (perm == LocationPermission.deniedForever) { _showSnack('Location permission permanently denied'); return; }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;

      // Try Google Geocoding API first for richer data
      PlaceDetails? details = await PlacesService.reverseGeocode(pos.latitude, pos.longitude);

      // Fallback: use geocoding package if Places API key not set
      if (details == null) {
        final placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          details = PlaceDetails(
            lat: pos.latitude,
            lng: pos.longitude,
            fullAddress: [p.subThoroughfare, p.thoroughfare, p.subLocality,
                          p.locality, p.administrativeArea, p.postalCode]
                .where((s) => s != null && s.isNotEmpty).join(', '),
            city:    p.locality               ?? p.subAdministrativeArea ?? '',
            area:    p.subLocality            ?? '',
            street:  p.thoroughfare           ?? '',
            state:   p.administrativeArea     ?? '',
            pincode: p.postalCode             ?? '',
          );
        }
      }

      if (details != null && mounted) {
        setState(() => _confirmedPlace = details);
        _setStep('location-confirm');
      } else {
        _showSnack('Could not detect location. Try searching manually.');
      }
    } catch (e) {
      _showSnack('Location error. Try searching manually.');
    } finally {
      _setLoading(false);
    }
  }

  // ── User tapped a Places suggestion ───────────────────────────────────────
  Future<void> _handleSelectSuggestion(PlaceSuggestion suggestion) async {
    _setLoading(true);
    FocusScope.of(context).unfocus();
    try {
      final details = await PlacesService.getPlaceDetails(suggestion.placeId);
      if (!mounted) return;
      if (details != null) {
        setState(() => _confirmedPlace = details);
        _setStep('location-confirm');
      } else {
        _showSnack('Could not load place details');
      }
    } catch (_) {
      _showSnack('Could not load place details');
    } finally {
      _setLoading(false);
    }
  }

  // ── Confirm & save location ────────────────────────────────────────────────
  Future<void> _handleLocationConfirm() async {
    final place = _confirmedPlace;
    if (place == null) { _setStep('location-search'); return; }
    _setLoading(true);
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
    } catch (_) {/* non-critical */} finally {
      _setLoading(false);
    }
    if (!mounted) return;
    _showSnack('Location set! Welcome to Myillo 🏗️');
    context.go('/');
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: GoogleFonts.inter()), behavior: SnackBarBehavior.floating),
    );
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return switch (_step) {
      'phone'            => _buildPhone(),
      'pin'              => _buildPin(),
      'name'             => _buildName(),
      'set-pin'          => _buildSetPin(),
      'forgot'           => _buildForgot(),
      'location-search'  => _buildLocationSearch(),
      'location-confirm' => _buildLocationConfirm(),
      _                  => _buildPhone(),
    };
  }

  // ── Phone step ────────────────────────────────────────────────────────────
  Widget _buildPhone() => AuthWrapper(
    title: 'Welcome',
    subtitle: 'Your construction marketplace',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Mobile Number', style: _labelStyle()),
        const SizedBox(height: 8),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F3FC),
              border: Border.all(color: AppColors.border, width: 1.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('🇮🇳 +91',
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _phoneCtrl,
              autofocus: true,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
              onSubmitted: (_) => _handlePhoneNext(),
              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 2, color: AppColors.navy),
              decoration: InputDecoration(
                hintText: '10-digit number',
                hintStyle: GoogleFonts.inter(color: AppColors.textMuted, letterSpacing: 0),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _loading ? null : _handlePhoneNext,
          child: _loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('Continue →', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text.rich(
            TextSpan(
              text: 'By continuing, you agree to our ',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
              children: [
                WidgetSpan(child: GestureDetector(
                  onTap: () => context.push('/terms'),
                  child: Text('Terms', style: GoogleFonts.inter(fontSize: 12, color: AppColors.navy, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                )),
                TextSpan(text: ' & ', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted)),
                WidgetSpan(child: GestureDetector(
                  onTap: () => context.push('/privacy'),
                  child: Text('Privacy Policy', style: GoogleFonts.inter(fontSize: 12, color: AppColors.navy, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                )),
              ],
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    ),
  );

  // ── PIN login step (item #3: error inline, no redirect) ───────────────────
  Widget _buildPin() => AuthWrapper(
    title: 'Enter Your PIN',
    subtitle: 'Welcome back! Enter your 4-digit PIN',
    child: Column(
      children: [
        const SizedBox(height: 8),
        Text('Your 4-digit PIN', style: _labelStyle(), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        PinInputWidget(
          value: _pin,
          onChange: (v) => setState(() { _pin = v; _pinError = null; }),
          onComplete: (_) => _handlePinLogin(),
          error: _pinError,
        ),
        if (_loading) ...[
          const SizedBox(height: 16),
          Text('Verifying…', style: GoogleFonts.inter(color: AppColors.navy, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 24),
        TextButton(
          onPressed: () => _setStep('forgot'),
          child: Text('Forgot PIN?', style: GoogleFonts.inter(fontSize: 14, color: AppColors.navy, fontWeight: FontWeight.w600)),
        ),
        TextButton(
          onPressed: () async {
            await AuthService.clearAll();
            _phoneCtrl.clear();
            _setStep('phone');
          },
          child: Text('Use a different number',
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted, decoration: TextDecoration.underline)),
        ),
      ],
    ),
  );

  // ── Name step ─────────────────────────────────────────────────────────────
  Widget _buildName() => AuthWrapper(
    title: "What's your name?",
    subtitle: 'So sellers know who they\'re talking to',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _backButton('Change number', () => _setStep('phone')),
        const SizedBox(height: 16),
        Text('Full Name', style: _labelStyle()),
        const SizedBox(height: 8),
        TextField(
          controller: _nameCtrl,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          onSubmitted: (_) { if (_nameCtrl.text.trim().length >= 2) _setStep('set-pin'); },
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
          decoration: const InputDecoration(hintText: 'e.g. Ravi Kumar'),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _nameCtrl.text.trim().length >= 2 ? () => _setStep('set-pin') : null,
          child: Text('Continue →', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
        ),
      ],
    ),
  );

  // ── Set PIN step ──────────────────────────────────────────────────────────
  Widget _buildSetPin() => AuthWrapper(
    title: 'Create Your PIN',
    subtitle: 'Remember this 4-digit PIN to log in next time',
    child: Column(
      children: [
        _backButton('Back', () => _setStep('name')),
        const SizedBox(height: 16),
        Text('Enter a 4-digit PIN', style: _labelStyle(), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        PinInputWidget(
          value: _pin,
          onChange: (v) => setState(() => _pin = v),
          onComplete: _handleRegister,
        ),
        if (_loading) ...[
          const SizedBox(height: 16),
          Text('Creating account…', style: GoogleFonts.inter(color: AppColors.navy, fontWeight: FontWeight.w600)),
        ],
      ],
    ),
  );

  // ── Forgot PIN step ───────────────────────────────────────────────────────
  Widget _buildForgot() => AuthWrapper(
    title: 'Recover PIN',
    subtitle: 'Enter your registered mobile number',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _backButton('Back to PIN', () => _setStep('pin')),
        const SizedBox(height: 16),
        if (_recoveredPin.isEmpty) ...[
          Text('Mobile Number', style: _labelStyle()),
          const SizedBox(height: 8),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F3FC),
                border: Border.all(color: AppColors.border, width: 1.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('🇮🇳 +91',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.navy)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _forgotCtrl,
                autofocus: true,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 2, color: AppColors.navy),
                decoration: const InputDecoration(hintText: 'Registered number'),
              ),
            ),
          ]),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: (_loading || _forgotCtrl.text.length != 10) ? null : _handleForgotPin,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Find My PIN →', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
        ] else ...[
          Center(
            child: Column(children: [
              Text('Your PIN for this account is:',
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: _recoveredPin.split('').map((d) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  width: 64, height: 68,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F3FC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.navy, width: 2.5),
                  ),
                  child: Center(child: Text(
                    _showPin ? d : '•',
                    style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.navy),
                  )),
                )).toList(),
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: () => setState(() => _showPin = !_showPin),
                icon: Icon(_showPin ? Icons.visibility_off : Icons.visibility, size: 15, color: AppColors.textSecondary),
                label: Text(_showPin ? 'Hide PIN' : 'Show PIN',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () { setState(() { _pin = ''; _recoveredPin = ''; }); _setStep('pin'); },
                child: Text('Login with this PIN →', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ]),
          ),
        ],
      ],
    ),
  );

  // ── Location Search step (item #8: fuzzy Google Places) ───────────────────
  Widget _buildLocationSearch() => Scaffold(
    backgroundColor: AppColors.bg,
    body: SafeArea(
      child: Column(
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  GestureDetector(
                    onTap: () => context.go('/'),
                    child: Text('Skip for now',
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted, decoration: TextDecoration.underline)),
                  ),
                  const Spacer(),
                ]),
                const SizedBox(height: 16),
                Text('Where are you?',
                  style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('Set your location to discover nearby materials & services',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                // ── Search field ─────────────────────────────────────────
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border, width: 1.5),
                  ),
                  child: Row(children: [
                    const SizedBox(width: 14),
                    const Icon(Icons.search, size: 20, color: AppColors.textMuted),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        autofocus: true,
                        style: GoogleFonts.inter(fontSize: 15, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'Search an area or address…',
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
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                        ),
                      ),
                    const SizedBox(width: 4),
                  ]),
                ),
                const SizedBox(height: 14),
              ],
            ),
          ),

          // ── Body ─────────────────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Use Current Location ────────────────────────────────
                _locationOptionTile(
                  icon: Icons.my_location_rounded,
                  iconBg: const Color(0xFFEEF2FF),
                  iconColor: AppColors.navy,
                  title: 'Use my current location',
                  subtitle: 'Auto-detect via GPS',
                  onTap: _loading ? null : _handleUseCurrentLocation,
                ),
                const SizedBox(height: 10),

                if (_loading) ...[
                  const SizedBox(height: 20),
                  const Center(child: CircularProgressIndicator(color: AppColors.navy)),
                ],

                // ── Suggestions ─────────────────────────────────────────
                if (_searchCtrl.text.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  if (_searchingPlaces)
                    const Center(child: SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.navy)))
                  else if (_suggestions.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Text('No suggestions found. Try a different spelling.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                    )
                  else ...[
                    Text('SEARCH RESULTS',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textMuted, letterSpacing: 1.1)),
                    const SizedBox(height: 8),
                    ..._suggestions.map((s) => _suggestionTile(s)),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _locationOptionTile({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
          child: Icon(icon, size: 20, color: iconColor),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
        ])),
        const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
      ]),
    ),
  );

  Widget _suggestionTile(PlaceSuggestion s) => GestureDetector(
    onTap: () => _handleSelectSuggestion(s),
    child: Container(
      margin: const EdgeInsets.only(bottom: 2),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
      ),
      child: Row(children: [
        const Icon(Icons.location_on_outlined, size: 20, color: AppColors.textMuted),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.mainText,
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          if (s.secondaryText.isNotEmpty)
            Text(s.secondaryText,
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
              overflow: TextOverflow.ellipsis),
        ])),
      ]),
    ),
  );

  // ── Location Confirm step (item #7: map + address + confirm) ─────────────
  Widget _buildLocationConfirm() {
    final place = _confirmedPlace;
    if (place == null) { _setStep('location-search'); return const SizedBox(); }

    final hasCoords = place.lat != 0 || place.lng != 0;
    final mapUrl = hasCoords
        ? PlacesService.staticMapUrl(lat: place.lat, lng: place.lng, zoom: 16, width: 640, height: 400)
        : null;

    // Build a clean display address (like the screenshot)
    final displayAddr = place.fullAddress.isNotEmpty
        ? place.fullAddress
        : place.formattedAddress;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          // ── Map section ─────────────────────────────────────────────────
          Expanded(
            child: Stack(
              children: [
                // Static Google Map image
                if (mapUrl != null)
                  Positioned.fill(
                    child: CachedNetworkImage(
                      imageUrl: mapUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: const Color(0xFFE8EDF5),
                        child: const Center(child: CircularProgressIndicator(color: AppColors.navy)),
                      ),
                      errorWidget: (_, __, ___) => _mapPlaceholder(),
                    ),
                  )
                else
                  Positioned.fill(child: _mapPlaceholder()),

                // Center pin overlay
                const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.location_pin, size: 52, color: AppColors.navy),
                      SizedBox(height: 28), // offset for pin bottom
                    ],
                  ),
                ),

                // Back button
                Positioned(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 16,
                  child: GestureDetector(
                    onTap: () => _setStep('location-search'),
                    child: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle,
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 8)]),
                      child: const Icon(Icons.arrow_back, size: 20, color: AppColors.textPrimary),
                    ),
                  ),
                ),

                // "Re-detect" floating button
                Positioned(
                  bottom: 16,
                  left: 0, right: 0,
                  child: Center(
                    child: GestureDetector(
                      onTap: _loading ? null : _handleUseCurrentLocation,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 12)],
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.my_location_rounded, size: 16, color: AppColors.navy),
                          const SizedBox(width: 6),
                          Text('Current Location',
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy)),
                        ]),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Bottom confirmation card ─────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              boxShadow: [BoxShadow(color: Color(0x1A1a2b5f), blurRadius: 20, offset: Offset(0, -4))],
            ),
            padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 36, height: 4,
                    decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),

                // "Order will be delivered here" label
                Text('Location will be set here',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary, letterSpacing: 0.5)),
                const SizedBox(height: 10),

                // Address display
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.location_on_rounded, size: 22, color: AppColors.navy),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Short bold header (area, city)
                      Text(
                        place.shortDisplay,
                        style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 3),
                      // Full address
                      Text(
                        displayAddr,
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary, height: 1.5),
                      ),
                      // Individual fields row
                      if (place.pincode.isNotEmpty || place.state.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Wrap(spacing: 8, runSpacing: 4, children: [
                          if (place.area.isNotEmpty)    _addrChip('📍 ${place.area}'),
                          if (place.city.isNotEmpty)    _addrChip('🏙️ ${place.city}'),
                          if (place.state.isNotEmpty)   _addrChip('🗺️ ${place.state}'),
                          if (place.pincode.isNotEmpty) _addrChip('📮 ${place.pincode}'),
                        ]),
                      ],
                    ]),
                  ),
                ]),

                const SizedBox(height: 20),

                // Confirm button
                ElevatedButton(
                  onPressed: _loading ? null : _handleLocationConfirm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('Confirm & proceed',
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                ),

                const SizedBox(height: 10),
                // Search again link
                Center(
                  child: TextButton(
                    onPressed: () => _setStep('location-search'),
                    child: Text('Choose a different location',
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _addrChip(String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: const Color(0xFFF0F3FC),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.navy)),
  );

  Widget _mapPlaceholder() => Container(
    color: const Color(0xFFD6E4F0),
    child: Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.map_outlined, size: 64, color: Color(0xFF90AFCC)),
        const SizedBox(height: 8),
        Text('Map preview',
          style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF90AFCC))),
      ]),
    ),
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  TextStyle _labelStyle() => GoogleFonts.inter(
    fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary,
  );

  Widget _backButton(String label, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.arrow_back, size: 16, color: AppColors.textSecondary),
      const SizedBox(width: 4),
      Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
    ]),
  );

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    _forgotCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }
}
