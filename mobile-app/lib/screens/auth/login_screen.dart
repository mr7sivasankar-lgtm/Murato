// ─── Login Screen ─────────────────────────────────────────────────────────────
// Step-based auth flow: phone → pin (returning) OR phone → name → set-pin → location (new)
// Matches the Capacitor app LoginPage.jsx flow exactly.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';
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
  // Steps: 'phone' | 'pin' | 'name' | 'set-pin' | 'forgot' | 'location'
  String _step = 'phone';

  final _phoneCtrl   = TextEditingController();
  final _nameCtrl    = TextEditingController();
  final _cityCtrl    = TextEditingController();
  final _areaCtrl    = TextEditingController();
  final _pincodeCtrl = TextEditingController();
  final _forgotCtrl  = TextEditingController();

  double? _lat;
  double? _lng;

  String _pin          = '';
  String _recoveredPin = '';
  bool   _showPin      = false;
  bool   _loading      = false;
  String? _pinError;
  String  _phone       = '';  // normalised full phone (+91XXXXXXXXXX)

  @override
  void initState() {
    super.initState();
    _loadStoredPhone();
    // Rebuild whenever name text changes so the Continue button reacts
    _nameCtrl.addListener(() => setState(() {}));
    // Rebuild whenever city text changes so the location Continue button reacts
    _cityCtrl.addListener(() => setState(() {}));
  }

  Future<void> _loadStoredPhone() async {
    final stored = await AuthService.getPhone();
    if (stored != null && stored.isNotEmpty) {
      final digits = stored.replaceAll(RegExp(r'\D'), '');
      final last10 = digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
      setState(() => _phoneCtrl.text = last10);
    }
  }

  void _setLoading(bool v) => setState(() => _loading = v);
  void _setStep(String s) {
    setState(() { _step = s; _pin = ''; _pinError = null; });
    if (s == 'location') _autoDetectLocation();
  }

  Future<void> _autoDetectLocation() async {
    _setLoading(true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw Exception('Location disabled');

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw Exception('Permission denied');
      }
      if (permission == LocationPermission.deniedForever) throw Exception('Permission denied forever');

      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
      if (!mounted) return;
      _lat = pos.latitude;
      _lng = pos.longitude;

      final placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        if (place.locality != null && place.locality!.isNotEmpty) _cityCtrl.text = place.locality!;
        else if (place.subAdministrativeArea != null && place.subAdministrativeArea!.isNotEmpty) _cityCtrl.text = place.subAdministrativeArea!;
        
        if (place.subLocality != null && place.subLocality!.isNotEmpty) _areaCtrl.text = place.subLocality!;
        if (place.postalCode != null && place.postalCode!.isNotEmpty) _pincodeCtrl.text = place.postalCode!;
      }
      _showSnack('Location detected! 📍');
    } catch (e) {
      // Silently fail to manual entry if they deny permission
    } finally {
      if (mounted) _setLoading(false);
    }
  }

  // ── STEP: phone ───────────────────────────────────────────────────────────

  Future<void> _handlePhoneNext() async {
    final digits = _phoneCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) {
      _showSnack('Enter a valid 10-digit number');
      return;
    }
    _setLoading(true);
    try {
      final full = '+91$digits';
      final res = await AuthService.checkPhone(full);
      if (!mounted) return;
      _phone = full;
      if (res['exists'] == true) {
        _setStep('pin');
      } else {
        _setStep('name');
      }
    } on AuthException catch (e) {
      _showSnack(e.message);
    } catch (_) {
      _showSnack('Something went wrong. Try again.');
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: register ────────────────────────────────────────────────────────

  Future<void> _handleRegister(String finalPin) async {
    _setLoading(true);
    final authProvider = context.read<AuthProvider>(); // cache before async
    try {
      final res = await AuthService.register(
        phone: _phone,
        name: _nameCtrl.text.trim(),
        pin: finalPin,
      );
      authProvider.setUser(res['user'] as Map<String, dynamic>);
      _setStep('location');
    } on AuthException catch (e) {
      _showSnack(e.message);
      setState(() => _pin = '');
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: PIN login ────────────────────────────────────────────────────────

  Future<void> _handlePinLogin() async {
    if (_pin.length != 4) return;
    _setLoading(true);
    setState(() => _pinError = null);
    try {
      final res = await AuthService.loginWithPin(phone: _phone, pin: _pin);
      final user = res['user'] as Map<String, dynamic>;
      if (!mounted) return;
      context.read<AuthProvider>().setUser(user);
      _showSnack('Welcome back, ${user['name']}! 👋');
      context.go('/');
    } on AuthException catch (e) {
      setState(() { _pinError = e.message; _pin = ''; });
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: forgot PIN ──────────────────────────────────────────────────────

  Future<void> _handleForgotPin() async {
    final digits = _forgotCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) {
      _showSnack('Enter a valid 10-digit number');
      return;
    }
    _setLoading(true);
    try {
      final res = await AuthService.forgotPin('+91$digits');
      _phone = '+91$digits';
      setState(() => _recoveredPin = res['pin'] as String);
    } on AuthException catch (e) {
      _showSnack(e.message);
    } finally {
      _setLoading(false);
    }
  }

  // ── STEP: location ────────────────────────────────────────────────────────

  Future<void> _handleLocationSave() async {
    if (_cityCtrl.text.trim().isEmpty) {
      _showSnack('Enter your city');
      return;
    }
    _setLoading(true);
    try {
      await AuthService.saveLocation(
        city: _cityCtrl.text.trim(),
        area: _areaCtrl.text.trim(),
        pincode: _pincodeCtrl.text.trim(),
        lat: _lat,
        lng: _lng,
      );
    } catch (_) {/* non-critical */}
    finally {
      _setLoading(false);
    }
    if (!mounted) return;
    _showSnack('Welcome to Myillo! 🏗️');
    context.go('/');
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg, style: GoogleFonts.inter()), behavior: SnackBarBehavior.floating),
    );
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return switch (_step) {
      'phone'   => _buildPhone(),
      'pin'     => _buildPin(),
      'name'    => _buildName(),
      'set-pin' => _buildSetPin(),
      'forgot'  => _buildForgot(),
      'location'=> _buildLocation(),
      _         => _buildPhone(),
    };
  }

  // ── Phone step ────────────────────────────────────────────────────────────

  Widget _buildPhone() => AuthWrapper(
    title: 'Welcome to Myillo',
    subtitle: 'Your construction marketplace',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Mobile Number', style: _labelStyle()),
        const SizedBox(height: 8),
        Row(
          children: [
            // Country code box
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
          ],
        ),
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
                WidgetSpan(
                  child: GestureDetector(
                    onTap: () => context.push('/terms'),
                    child: Text('Terms', style: GoogleFonts.inter(fontSize: 12, color: AppColors.navy, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                  ),
                ),
                TextSpan(text: ' & ', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted)),
                WidgetSpan(
                  child: GestureDetector(
                    onTap: () => context.push('/privacy'),
                    child: Text('Privacy Policy', style: GoogleFonts.inter(fontSize: 12, color: AppColors.navy, fontWeight: FontWeight.w600, decoration: TextDecoration.underline)),
                  ),
                ),
              ],
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    ),
  );

  // ── PIN login step ────────────────────────────────────────────────────────

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
          Text('Verifying...', style: GoogleFonts.inter(color: AppColors.navy, fontWeight: FontWeight.w600)),
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
          child: Text('Use a different number', style: GoogleFonts.inter(fontSize: 14, color: AppColors.orange, fontWeight: FontWeight.w700, decoration: TextDecoration.underline)),
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
          Text('Creating account...', style: GoogleFonts.inter(color: AppColors.navy, fontWeight: FontWeight.w600)),
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
          Row(
            children: [
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
            ],
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: (_loading || _forgotCtrl.text.length != 10) ? null : _handleForgotPin,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Find My PIN →', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
          ),
        ] else ...[
          Center(
            child: Column(
              children: [
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
                    child: Center(
                      child: Text(
                        _showPin ? d : '•',
                        style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.navy),
                      ),
                    ),
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
              ],
            ),
          ),
        ],
      ],
    ),
  );

  // ── Location step ─────────────────────────────────────────────────────────

  Widget _buildLocation() => AuthWrapper(
    title: 'Where are you?',
    subtitle: 'Help buyers find you nearby',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('City / Town *', style: _labelStyle()),
        const SizedBox(height: 8),
        TextField(
          controller: _cityCtrl,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: 'e.g. Hyderabad'),
        ),
        const SizedBox(height: 14),
        Text('Area / Locality', style: _labelStyle()),
        const SizedBox(height: 8),
        TextField(
          controller: _areaCtrl,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: 'e.g. Kukatpally'),
        ),
        const SizedBox(height: 14),
        Text('Pincode', style: _labelStyle()),
        const SizedBox(height: 8),
        TextField(
          controller: _pincodeCtrl,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          decoration: const InputDecoration(hintText: 'e.g. 500072'),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton.icon(
            onPressed: _loading ? null : _autoDetectLocation,
            icon: const Icon(Icons.my_location, size: 18, color: AppColors.orange),
            label: Text('Auto-detect Location', style: GoogleFonts.inter(color: AppColors.orange, fontWeight: FontWeight.w700)),
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: (_loading || _cityCtrl.text.trim().isEmpty) ? null : _handleLocationSave,
          child: _loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text('✅ Done, Let\'s Go!', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => context.go('/'),
            child: Text('Skip for now', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted)),
          ),
        ),
      ],
    ),
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  TextStyle _labelStyle() => GoogleFonts.inter(
    fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary,
  );

  Widget _backButton(String label, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.arrow_back, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
      ],
    ),
  );

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    _areaCtrl.dispose();
    _forgotCtrl.dispose();
    super.dispose();
  }
}
