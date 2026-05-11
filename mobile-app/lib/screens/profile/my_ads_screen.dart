// ─── My Ads Screen — Phase 5 ──────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/ads_service.dart';
import '../../widgets/ad_card.dart';

class MyAdsScreen extends StatefulWidget {
  const MyAdsScreen({super.key});
  @override
  State<MyAdsScreen> createState() => _MyAdsScreenState();
}

class _MyAdsScreenState extends State<MyAdsScreen> {
  List<dynamic> _ads = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final me = context.read<AuthProvider>().user;
    if (me == null) { setState(() => _loading = false); return; }
    try {
      final ads = await AdsService.fetchUserAds(me['_id']?.toString() ?? '');
      if (mounted) setState(() { _ads = ads; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _delete(String adId) async {
    final messenger = ScaffoldMessenger.of(context); // capture before async
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Ad?', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('This cannot be undone.', style: GoogleFonts.inter()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textSecondary))),
          ElevatedButton(onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, shape: const StadiumBorder()),
            child: Text('Delete', style: GoogleFonts.inter(fontWeight: FontWeight.w700))),
        ],
      ));
    if (ok == true) {
      await AdsService.deleteAd(adId);
      setState(() => _ads.removeWhere((a) => (a['_id']?.toString()) == adId));
      messenger.showSnackBar(
        const SnackBar(content: Text('Ad deleted'), behavior: SnackBarBehavior.floating));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white, elevation: 0,
        leading: BackButton(color: AppColors.textPrimary, onPressed: () => context.pop()),
        title: Text('My Ads', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.navy),
            onPressed: () => context.push('/sell'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
          : _ads.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('📋', style: TextStyle(fontSize: 56)),
                  const SizedBox(height: 16),
                  Text('No ads yet', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text('Post your first ad!', style: GoogleFonts.inter(color: AppColors.textSecondary)),
                  const SizedBox(height: 20),
                  ElevatedButton(onPressed: () => context.push('/sell'),
                    child: Text('Post Ad', style: GoogleFonts.inter(fontWeight: FontWeight.w800))),
                ]))
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.62),
                  itemCount: _ads.length,
                  itemBuilder: (_, i) {
                    final ad = _ads[i] as Map<String, dynamic>;
                    final adId = ad['_id']?.toString() ?? '';
                    return Stack(children: [
                      AdCard(ad: ad, onTap: () => context.push('/ads/$adId')),
                      Positioned(top: 8, right: 8,
                        child: GestureDetector(
                          onTap: () => _delete(adId),
                          child: Container(
                            width: 28, height: 28,
                            decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                            child: const Icon(Icons.close, size: 14, color: Colors.white)),
                        )),
                    ]);
                  }),
    );
  }
}
