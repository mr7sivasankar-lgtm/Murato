// ─── Settings Screen — Phase 5 ────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameCtrl = TextEditingController();
  final _bizCtrl  = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  bool _loading = false;
  bool _saved   = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user ?? {};
    _nameCtrl.text = user['name'] as String? ?? '';
    _bizCtrl.text  = user['businessName'] as String? ?? '';
    final loc = user['location'] as Map<String, dynamic>? ?? {};
    _cityCtrl.text = loc['city'] as String? ?? '';
    _areaCtrl.text = loc['area'] as String? ?? '';
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    final authProvider = context.read<AuthProvider>(); // cache before async
    try {
      final token = await AuthService.getToken();
      final res = await http.put(
        Uri.parse(ApiConfig.authProfile),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({
          'name': _nameCtrl.text.trim(),
          'businessName': _bizCtrl.text.trim(),
          'city': _cityCtrl.text.trim(),
          'area': _areaCtrl.text.trim(),
        }),
      );
      if (!mounted) { return; }
      if (res.statusCode == 200) {
        final updated = jsonDecode(res.body) as Map<String, dynamic>;
        authProvider.updateUser(updated);
        setState(() => _saved = true);
        _snack('✅ Profile saved!');
      } else {
        _snack('Failed to save');
      }
    } catch (_) { _snack('Something went wrong'); }
    finally { if (mounted) { setState(() => _loading = false); } }
  }

  Future<void> _changePin() async {
    final oldPin = TextEditingController();
    final newPin = TextEditingController();
    final messenger = ScaffoldMessenger.of(context); // cache before async
    await showDialog(context: context, builder: (_) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text('Change PIN', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: oldPin, obscureText: true, keyboardType: TextInputType.number,
          maxLength: 4, decoration: InputDecoration(labelText: 'Current PIN', labelStyle: GoogleFonts.inter())),
        const SizedBox(height: 8),
        TextField(controller: newPin, obscureText: true, keyboardType: TextInputType.number,
          maxLength: 4, decoration: InputDecoration(labelText: 'New PIN', labelStyle: GoogleFonts.inter())),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context),
          child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textSecondary))),
        ElevatedButton(
          onPressed: () async {
            if (newPin.text.length != 4) { return; }
            final nav = Navigator.of(context); // cache before async
            final token = await AuthService.getToken();
            await http.put(Uri.parse(ApiConfig.authChangePin),
              headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
              body: jsonEncode({'currentPin': oldPin.text, 'newPin': newPin.text}));
            nav.pop();
            messenger.showSnackBar(
              const SnackBar(content: Text('PIN changed!'), behavior: SnackBarBehavior.floating));
          },
          style: ElevatedButton.styleFrom(shape: const StadiumBorder()),
          child: Text('Save', style: GoogleFonts.inter(fontWeight: FontWeight.w700))),
      ],
    ));
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white, elevation: 0,
        leading: BackButton(color: AppColors.textPrimary, onPressed: () => context.pop()),
        title: Text('Settings', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        actions: [
          TextButton(
            onPressed: _loading ? null : _save,
            child: _loading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.navy))
                : Text('Save', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: _saved ? AppColors.success : AppColors.navy)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _sectionLabel('Personal Info'),
          _card([
            _fieldRow('Full Name', _nameCtrl, 'Your name'),
            const Divider(height: 1),
            _fieldRow('Business Name', _bizCtrl, 'Optional'),
          ]),
          const SizedBox(height: 20),
          _sectionLabel('Location'),
          _card([
            _fieldRow('City', _cityCtrl, 'e.g. Hyderabad'),
            const Divider(height: 1),
            _fieldRow('Area', _areaCtrl, 'e.g. Kukatpally'),
          ]),
          const SizedBox(height: 20),
          _sectionLabel('Security'),
          _card([
            InkWell(
              onTap: _changePin,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Row(children: [
                  const Icon(Icons.lock_outline, size: 18, color: AppColors.navy),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Change PIN',
                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500))),
                  const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
                ]),
              ),
            ),
          ]),
          const SizedBox(height: 80),
        ]),
      ),
    );
  }

  Widget _sectionLabel(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(t, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700,
      color: AppColors.textMuted, letterSpacing: 0.5)));

  Widget _card(List<Widget> children) => Container(
    decoration: BoxDecoration(color: AppColors.white,
      borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
    child: Column(children: children));

  Widget _fieldRow(String label, TextEditingController ctrl, String hint) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    child: Row(children: [
      SizedBox(width: 120, child: Text(label,
        style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary))),
      Expanded(child: TextField(
        controller: ctrl,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
        decoration: InputDecoration(hintText: hint,
          border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none,
          filled: false, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
      )),
    ]),
  );

  @override
  void dispose() {
    _nameCtrl.dispose(); _bizCtrl.dispose();
    _cityCtrl.dispose(); _areaCtrl.dispose();
    super.dispose();
  }
}
