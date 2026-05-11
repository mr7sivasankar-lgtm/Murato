// ─── Ad Detail Screen — Phase 3 ──────────────────────────────────────────────
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/ads_service.dart';
import '../../services/chat_service.dart';

class AdDetailScreen extends StatefulWidget {
  final String adId;
  const AdDetailScreen({super.key, required this.adId});
  @override
  State<AdDetailScreen> createState() => _AdDetailScreenState();
}

class _AdDetailScreenState extends State<AdDetailScreen> {
  Map<String, dynamic>? _ad;
  bool _loading = true;
  bool _favorited = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final ad = await AdsService.fetchAd(widget.adId);
      if (!mounted) { return; }
      setState(() { _ad = ad; _loading = false; });
    } catch (_) {
      if (mounted) { setState(() => _loading = false); }
    }
  }

  Future<void> _toggleFav() async {
    final fav = await AdsService.toggleFavorite(widget.adId);
    if (mounted) setState(() => _favorited = fav);
  }

  Future<void> _startChat() async {
    final ad = _ad!;
    final seller = ad['userId'] as Map<String, dynamic>? ?? {};
    final me = context.read<AuthProvider>().user;
    if (me == null) return;
    if (seller['_id']?.toString() == me['_id']?.toString()) {
      _snack('This is your own ad'); return;
    }
    try {
      final chat = await ChatService.startChat(
        sellerId: seller['_id']?.toString() ?? '', adId: widget.adId);
      if (!mounted) return;
      context.push('/chat/${chat['_id']}');
    } catch (_) { _snack('Could not start chat'); }
  }

  void _call(String? p) async {
    if (p == null) return;
    final uri = Uri(scheme: 'tel', path: p);
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  void _whatsapp(String? p) async {
    if (p == null) return;
    final c = p.replaceAll(RegExp(r'\D'), '');
    final uri = Uri.parse('https://wa.me/91$c');
    if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(backgroundColor: AppColors.bg,
          body: Center(child: CircularProgressIndicator(color: AppColors.navy)));
    }
    if (_ad == null) {
      return Scaffold(appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
          body: const Center(child: Text('Ad not found')));
    }

    final ad      = _ad!;
    final images  = ad['images'] as List<dynamic>? ?? [];
    final seller  = ad['userId'] as Map<String, dynamic>? ?? {};
    final loc     = ad['location'] as Map<String, dynamic>? ?? {};
    final price   = ad['price'] as num? ?? 0;
    final isService = ad['type'] == 'service';
    final priceStr  = price == 0 ? 'Contact for price'
        : '₹${NumberFormat('#,##,###').format(price)}';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(children: [
        CustomScrollView(slivers: [
          SliverAppBar(
            expandedHeight: 280, pinned: true, backgroundColor: AppColors.white,
            leading: Padding(padding: const EdgeInsets.all(8),
              child: CircleAvatar(backgroundColor: Colors.white,
                child: IconButton(icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary, size: 18),
                  onPressed: () => context.pop()))),
            actions: [Padding(padding: const EdgeInsets.all(8),
              child: CircleAvatar(backgroundColor: Colors.white,
                child: IconButton(
                  icon: Icon(_favorited ? Icons.favorite : Icons.favorite_border,
                    color: _favorited ? AppColors.danger : AppColors.textPrimary, size: 18),
                  onPressed: _toggleFav)))],
            flexibleSpace: FlexibleSpaceBar(
              background: images.isEmpty
                  ? Container(color: const Color(0xFFE8EDF5),
                      child: Center(child: Text(isService ? '🔧' : '📦',
                        style: const TextStyle(fontSize: 60))))
                  : PageView.builder(
                      itemCount: images.length,
                      onPageChanged: (_) {}, // index used for dots only in hero — kept simple
                      itemBuilder: (_, i) => CachedNetworkImage(
                        imageUrl: images[i] as String, fit: BoxFit.cover)),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  _chip(isService ? '🔧 Service' : '📦 Product',
                    isService ? AppColors.navy : AppColors.yellow,
                    isService ? AppColors.white : AppColors.navyDark),
                  const SizedBox(width: 8),
                  if (ad['category'] != null)
                    _chip(ad['category'] as String, const Color(0xFFE8EDF5), AppColors.textPrimary),
                ]),
                const SizedBox(height: 12),
                Text(ad['title'] as String? ?? '',
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(priceStr,
                  style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.navy)),
                if (ad['negotiable'] == true) ...[
                  const SizedBox(height: 4),
                  Text('Negotiable', style: GoogleFonts.inter(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600)),
                ],
                const SizedBox(height: 16),
                if ((ad['description'] as String? ?? '').isNotEmpty) ...[
                  Text('Description', style: _secTitle()),
                  const SizedBox(height: 8),
                  Text(ad['description'] as String,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary, height: 1.5)),
                  const SizedBox(height: 16),
                ],
                _detailsCard(ad, loc),
                const SizedBox(height: 16),
                _sellerCard(seller),
              ]),
            ),
          ),
        ]),

        // Fixed CTA bar
        Positioned(bottom: 0, left: 0, right: 0,
          child: Container(
            padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
            decoration: const BoxDecoration(color: AppColors.white,
              border: Border(top: BorderSide(color: AppColors.border)),
              boxShadow: [BoxShadow(color: Color(0x141a2b5f), blurRadius: 16, offset: Offset(0, -4))]),
            child: Row(children: [
              Expanded(child: OutlinedButton.icon(
                onPressed: () => _call(seller['phone'] as String?),
                icon: const Icon(Icons.call, size: 18),
                label: Text('Call', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.navy,
                  side: const BorderSide(color: AppColors.navy),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: const StadiumBorder()),
              )),
              const SizedBox(width: 10),
              Expanded(flex: 2, child: ElevatedButton.icon(
                onPressed: _startChat,
                icon: const Icon(Icons.chat_bubble_outline, size: 18),
                label: Text('Chat Seller', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: const StadiumBorder()),
              )),
              if (seller['whatsappAvailable'] == true) ...[
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: () => _whatsapp(seller['phone'] as String?),
                  child: Container(
                    width: 48, height: 48,
                    decoration: const BoxDecoration(color: Color(0xFF25D366), shape: BoxShape.circle),
                    child: const Icon(Icons.chat, color: Colors.white, size: 22),
                  ),
                ),
              ],
            ]),
          )),
      ]),
    );
  }

  Widget _detailsCard(Map<String, dynamic> ad, Map<String, dynamic> loc) {
    final rows = <MapEntry<String, String>>[];
    void add(String k, dynamic v) { if (v != null && v.toString().isNotEmpty) rows.add(MapEntry(k, v.toString())); }
    add('Brand', ad['brand']); add('Condition', ad['condition']);
    add('Experience', ad['experienceYears'] != null ? '${ad['experienceYears']} yrs' : null);
    final city = loc['city'] as String? ?? '';
    final area = loc['area'] as String? ?? '';
    add('Location', [city, area].where((s) => s.isNotEmpty).join(', '));
    if (ad['deliveryAvailable'] == true) rows.add(const MapEntry('Delivery', 'Available'));
    if (rows.isEmpty) return const SizedBox();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Details', style: _secTitle()), const SizedBox(height: 8),
      Container(
        decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border)),
        child: Column(children: rows.asMap().entries.map((e) => Column(children: [
          Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              Text(e.value.key, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
              const Spacer(),
              Text(e.value.value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
            ])),
          if (e.key < rows.length - 1) const Divider(height: 1),
        ])).toList()),
      ),
    ]);
  }

  Widget _sellerCard(Map<String, dynamic> seller) {
    final name   = seller['businessName'] as String? ?? seller['name'] as String? ?? 'Seller';
    final avatar = seller['avatar'] as String?;
    final rating = seller['ratingAvg'] as num? ?? 0;
    final count  = seller['ratingCount'] as num? ?? 0;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Seller', style: _secTitle()), const SizedBox(height: 8),
      GestureDetector(
        onTap: () { if (seller['_id'] != null) context.push('/seller/${seller['_id']}'); },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border)),
          child: Row(children: [
            CircleAvatar(radius: 24, backgroundColor: AppColors.navy,
              backgroundImage: avatar != null ? CachedNetworkImageProvider(avatar) : null,
              child: avatar == null ? Text(name[0].toUpperCase(),
                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18)) : null),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
              if (count > 0) Row(children: [
                const Icon(Icons.star, size: 13, color: AppColors.yellow),
                const SizedBox(width: 3),
                Text('${rating.toStringAsFixed(1)} ($count)',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
              ]),
            ])),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
          ]),
        ),
      ),
    ]);
  }

  Widget _chip(String l, Color bg, Color fg) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: Text(l, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: fg)));

  TextStyle _secTitle() => GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
}
