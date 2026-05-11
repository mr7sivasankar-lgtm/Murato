// ─── Auth Service ─────────────────────────────────────────────────────────────
// Handles all API calls for authentication + secure JWT storage

import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class AuthService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── Token helpers ────────────────────────────────────────────────────────

  static Future<String?> getToken() => _storage.read(key: ApiConfig.tokenKey);

  static Future<void> saveToken(String token) =>
      _storage.write(key: ApiConfig.tokenKey, value: token);

  static Future<void> savePhone(String phone) =>
      _storage.write(key: ApiConfig.phoneKey, value: phone);

  static Future<String?> getPhone() => _storage.read(key: ApiConfig.phoneKey);

  static Future<void> clearAll() async {
    await _storage.delete(key: ApiConfig.tokenKey);
    await _storage.delete(key: ApiConfig.phoneKey);
    await _storage.delete(key: ApiConfig.userKey);
  }

  // ── Shared headers ────────────────────────────────────────────────────────

  static Map<String, String> _headers({String? token}) => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  // ── Check if phone is already registered ─────────────────────────────────

  static Future<Map<String, dynamic>> checkPhone(String phone) async {
    final normalised = _normalise(phone);
    final res = await http.post(
      Uri.parse(ApiConfig.authCheck),
      headers: _headers(),
      body: jsonEncode({'phone': normalised}),
    );
    _throwIfError(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
    // Returns: { exists: bool, hasPin: bool }
  }

  // ── Register new user ─────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> register({
    required String phone,
    required String name,
    required String pin,
  }) async {
    final normalised = _normalise(phone);
    final res = await http.post(
      Uri.parse(ApiConfig.authRegister),
      headers: _headers(),
      body: jsonEncode({'phone': normalised, 'name': name, 'pin': pin}),
    );
    _throwIfError(res);
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    // Persist token + phone
    await saveToken(data['token'] as String);
    await savePhone(normalised);
    return data;
    // Returns: { isNew: true, token: String, user: {...} }
  }

  // ── Login with PIN ────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> loginWithPin({
    required String phone,
    required String pin,
  }) async {
    final normalised = _normalise(phone);
    final res = await http.post(
      Uri.parse(ApiConfig.authLoginPin),
      headers: _headers(),
      body: jsonEncode({'phone': normalised, 'pin': pin}),
    );
    _throwIfError(res);
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    await saveToken(data['token'] as String);
    await savePhone(normalised);
    return data;
    // Returns: { isNew: false, token: String, user: {...} }
  }

  // ── Forgot PIN — returns existing PIN ─────────────────────────────────────

  static Future<Map<String, dynamic>> forgotPin(String phone) async {
    final normalised = _normalise(phone);
    final res = await http.post(
      Uri.parse(ApiConfig.authForgotPin),
      headers: _headers(),
      body: jsonEncode({'phone': normalised}),
    );
    _throwIfError(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
    // Returns: { pin: String, name: String }
  }

  // ── Save location after register ─────────────────────────────────────────

  static Future<void> saveLocation({
    required String city,
    String? area,
    double? lat,
    double? lng,
  }) async {
    final token = await getToken();
    final body = <String, dynamic>{'city': city};
    if (area != null && area.isNotEmpty) body['area'] = area;
    if (lat != null && lng != null) {
      body['lat'] = lat;
      body['lng'] = lng;
    }
    final res = await http.put(
      Uri.parse(ApiConfig.authProfile),
      headers: _headers(token: token),
      body: jsonEncode(body),
    );
    _throwIfError(res);
  }

  // ── Verify stored token on app startup ────────────────────────────────────

  static Future<Map<String, dynamic>?> verifySession() async {
    final token = await getToken();
    if (token == null) return null;
    try {
      final res = await http.get(
        Uri.parse(ApiConfig.authMe),
        headers: _headers(token: token),
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      // Token rejected — clear session
      await clearAll();
      return null;
    } catch (_) {
      return null;
    }
  }

  // ── Save FCM token for push notifications ─────────────────────────────────

  static Future<void> saveFcmToken(String fcmToken) async {
    final token = await getToken();
    if (token == null) return;
    await http.put(
      Uri.parse(ApiConfig.authFcmToken),
      headers: _headers(token: token),
      body: jsonEncode({'fcmToken': fcmToken}),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Normalise any phone input to +91XXXXXXXXXX
  static String _normalise(String phone) {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    final last10 = digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
    return '+91$last10';
  }

  static void _throwIfError(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      Map<String, dynamic> body = {};
      try { body = jsonDecode(res.body) as Map<String, dynamic>; } catch (_) {}
      throw AuthException(
        body['message'] as String? ?? 'Server error (${res.statusCode})',
        statusCode: res.statusCode,
      );
    }
  }
}

class AuthException implements Exception {
  final String message;
  final int statusCode;
  AuthException(this.message, {this.statusCode = 0});
  @override
  String toString() => message;
}
