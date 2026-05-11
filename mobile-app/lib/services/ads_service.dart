// ─── Ads Service ──────────────────────────────────────────────────────────────
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../services/auth_service.dart';

class AdsService {
  static Map<String, String> _headers({String? token}) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  /// Fetch paginated ads with optional filters
  static Future<Map<String, dynamic>> fetchAds({
    String? q, String? category, String? type,
    String? city, double? lat, double? lng,
    int page = 1, int limit = 20,
  }) async {
    final params = <String, String>{
      'page': '$page', 'limit': '$limit',
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null) 'category': category,
      if (type != null) 'type': type,
      if (city != null && city.isNotEmpty) 'city': city,
      if (lat != null) 'lat': '$lat',
      if (lng != null) 'lng': '$lng',
    };
    final uri = Uri.parse(ApiConfig.ads).replace(queryParameters: params);
    final res = await http.get(uri);
    if (res.statusCode != 200) throw Exception('Failed to load ads');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Fetch single ad by ID
  static Future<Map<String, dynamic>> fetchAd(String id) async {
    final res = await http.get(Uri.parse('${ApiConfig.ads}/$id'));
    if (res.statusCode != 200) throw Exception('Ad not found');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Fetch ads by user
  static Future<List<dynamic>> fetchUserAds(String userId) async {
    final res = await http.get(Uri.parse('${ApiConfig.ads}/user/$userId'));
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  /// Fetch my favourites
  static Future<List<dynamic>> fetchMyFavorites() async {
    final token = await AuthService.getToken();
    final res = await http.get(
      Uri.parse('${ApiConfig.ads}/favorites/mine'),
      headers: _headers(token: token),
    );
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  /// Toggle favourite
  static Future<bool> toggleFavorite(String adId) async {
    final token = await AuthService.getToken();
    final res = await http.post(
      Uri.parse('${ApiConfig.ads}/$adId/favorite'),
      headers: _headers(token: token),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return body['favorited'] as bool? ?? false;
  }

  /// Fetch banners
  static Future<List<dynamic>> fetchBanners() async {
    final res = await http.get(Uri.parse(ApiConfig.banners));
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  /// Fetch categories
  static Future<List<dynamic>> fetchCategories() async {
    final res = await http.get(Uri.parse(ApiConfig.categories));
    if (res.statusCode != 200) return [];
    return jsonDecode(res.body) as List<dynamic>;
  }

  /// Post a new ad (multipart)
  static Future<Map<String, dynamic>> postAd(Map<String, dynamic> data) async {
    final token = await AuthService.getToken();
    final uri = Uri.parse(ApiConfig.ads);
    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token';

    data.forEach((k, v) {
      if (v != null && k != 'imageFiles') {
        request.fields[k] = v.toString();
      }
    });

    // imageFiles: List<String> — local paths
    final imagePaths = data['imageFiles'] as List<String>? ?? [];
    for (final path in imagePaths) {
      request.files.add(await http.MultipartFile.fromPath('images', path));
    }

    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode != 201) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      throw Exception(body['message'] ?? 'Failed to post ad');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Delete ad
  static Future<void> deleteAd(String adId) async {
    final token = await AuthService.getToken();
    await http.delete(
      Uri.parse('${ApiConfig.ads}/$adId'),
      headers: _headers(token: token),
    );
  }
}
