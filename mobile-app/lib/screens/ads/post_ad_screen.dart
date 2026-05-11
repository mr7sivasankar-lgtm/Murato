// ─── Post Ad Screen — Phase 4 ─────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../services/ads_service.dart';

class PostAdScreen extends StatefulWidget {
  const PostAdScreen({super.key});
  @override
  State<PostAdScreen> createState() => _PostAdScreenState();
}

class _PostAdScreenState extends State<PostAdScreen> {
  int _step = 0; // 0=type, 1=details, 2=pricing, 3=location
  String _type = 'product';
  final _title   = TextEditingController();
  final _desc    = TextEditingController();
  final _price   = TextEditingController();
  final _city    = TextEditingController();
  final _area    = TextEditingController();
  final _brand   = TextEditingController();
  String? _category;
  bool _negotiable = false;
  bool _loading    = false;
  List<String> _imagePaths = [];
  final _picker = ImagePicker();

  final List<String> _categories = [
    'Cement & Concrete','Steel & Iron','Bricks & Blocks','Tiles & Flooring',
    'Timber & Wood','Plumbing','Electrical','Painting','Labour & Contractors',
    'Equipment & Machinery','Glass & Windows','Roofing','Interior','Other',
  ];

  Future<void> _pickImages() async {
    final files = await _picker.pickMultiImage(imageQuality: 80, limit: 5);
    if (files.isNotEmpty) setState(() => _imagePaths = files.map((f) => f.path).toList());
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) { _snack('Enter a title'); return; }
    if (_city.text.trim().isEmpty)  { _snack('Enter your city'); return; }
    setState(() => _loading = true);
    try {
      await AdsService.postAd({
        'type': _type,
        'title': _title.text.trim(),
        'description': _desc.text.trim(),
        'category': _category ?? '',
        'price': _price.text.trim(),
        'negotiable': _negotiable,
        'brand': _brand.text.trim(),
        'city': _city.text.trim(),
        'area': _area.text.trim(),
        'imageFiles': _imagePaths,
      });
      if (!mounted) return;
      _snack('✅ Ad posted successfully!');
      context.go('/');
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        leading: BackButton(onPressed: () => _step > 0 ? setState(() => _step--) : context.pop(),
          color: AppColors.textPrimary),
        title: Text(['Select Type', 'Ad Details', 'Pricing', 'Location'][_step],
          style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_step + 1) / 4,
            backgroundColor: AppColors.border,
            color: AppColors.navy,
            minHeight: 4,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: [_buildStep0(), _buildStep1(), _buildStep2(), _buildStep3()][_step],
      ),
      bottomNavigationBar: _buildBottom(),
    );
  }

  // Step 0 — Type
  Widget _buildStep0() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('What are you posting?', style: _header()),
    const SizedBox(height: 20),
    _typeCard('product', '📦', 'Product', 'Sell materials, equipment, tools'),
    const SizedBox(height: 12),
    _typeCard('service', '🔧', 'Service', 'Offer contractor or labour services'),
  ]);

  Widget _typeCard(String val, String icon, String title, String sub) => GestureDetector(
    onTap: () => setState(() => _type = val),
    child: Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _type == val ? AppColors.navy : AppColors.border, width: _type == val ? 2 : 1),
      ),
      child: Row(children: [
        Text(icon, style: const TextStyle(fontSize: 36)),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
          Text(sub, style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
        ])),
        if (_type == val) const Icon(Icons.check_circle, color: AppColors.navy),
      ]),
    ),
  );

  // Step 1 — Details
  Widget _buildStep1() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('Ad Details', style: _header()),
    const SizedBox(height: 20),
    // Images
    GestureDetector(
      onTap: _pickImages,
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border, style: BorderStyle.solid),
        ),
        child: _imagePaths.isEmpty
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.add_photo_alternate_outlined, size: 36, color: AppColors.textMuted),
                const SizedBox(height: 8),
                Text('Add Photos (up to 5)', style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13)),
              ])
            : ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(8),
                itemCount: _imagePaths.length,
                itemBuilder: (_, i) => Container(
                  margin: const EdgeInsets.only(right: 8),
                  width: 100, height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: const Color(0xFFE8EDF5),
                  ),
                  child: const Center(child: Icon(Icons.image, color: AppColors.textMuted)),
                ),
              ),
      ),
    ),
    const SizedBox(height: 16),
    _label('Title *'),
    _field(_title, 'e.g. OPC 53 Grade Cement — 50 bags'),
    const SizedBox(height: 14),
    _label('Description'),
    TextField(controller: _desc,
      maxLines: 3,
      style: GoogleFonts.inter(fontSize: 14),
      decoration: InputDecoration(hintText: 'Describe your ${_type == 'product' ? 'product' : 'service'}...'),
    ),
    const SizedBox(height: 14),
    _label('Category'),
    DropdownButtonFormField<String>(
      value: _category,
      hint: Text('Select category', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textMuted)),
      items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: GoogleFonts.inter(fontSize: 14)))).toList(),
      onChanged: (v) => setState(() => _category = v),
      decoration: const InputDecoration(),
    ),
    if (_type == 'product') ...[
      const SizedBox(height: 14),
      _label('Brand (optional)'),
      _field(_brand, 'e.g. Ultratech, JSW'),
    ],
  ]);

  // Step 2 — Pricing
  Widget _buildStep2() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('Pricing', style: _header()),
    const SizedBox(height: 20),
    _label('Price (₹)'),
    TextField(
      controller: _price,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.navy),
      decoration: InputDecoration(
        prefixText: '₹ ',
        prefixStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.navy),
        hintText: '0',
      ),
    ),
    const SizedBox(height: 8),
    Text('Leave 0 to show "Contact for price"',
      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted)),
    const SizedBox(height: 20),
    SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('Negotiable', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
      subtitle: Text('Buyers can negotiate the price', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
      value: _negotiable,
      onChanged: (v) => setState(() => _negotiable = v),
      activeColor: AppColors.navy,
    ),
  ]);

  // Step 3 — Location
  Widget _buildStep3() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('Your Location', style: _header()),
    const SizedBox(height: 20),
    _label('City / Town *'),
    _field(_city, 'e.g. Hyderabad'),
    const SizedBox(height: 14),
    _label('Area / Locality'),
    _field(_area, 'e.g. Kukatpally'),
  ]);

  Widget _buildBottom() => Container(
    padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
    decoration: const BoxDecoration(color: AppColors.white,
      border: Border(top: BorderSide(color: AppColors.border))),
    child: ElevatedButton(
      onPressed: _loading ? null : () {
        if (_step < 3) {
          setState(() => _step++);
        } else {
          _submit();
        }
      },
      child: _loading
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(_step < 3 ? 'Continue →' : '🚀 Post Ad',
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
    ),
  );

  Widget _label(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(t, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary)));

  Widget _field(TextEditingController c, String hint) => TextField(
    controller: c,
    style: GoogleFonts.inter(fontSize: 14),
    decoration: InputDecoration(hintText: hint));

  TextStyle _header() => GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary);

  @override
  void dispose() {
    _title.dispose(); _desc.dispose(); _price.dispose();
    _city.dispose(); _area.dispose(); _brand.dispose();
    super.dispose();
  }
}
