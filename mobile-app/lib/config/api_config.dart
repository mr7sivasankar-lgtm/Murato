// ─── Myillo API Configuration ─────────────────────────────────────────────────
// Backend: https://murato.onrender.com/api (from main-app/.env)

class ApiConfig {
  // ── Base ──────────────────────────────────────────────────────────────────
  static const String baseUrl = 'https://murato.onrender.com/api';

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String authCheck       = '$baseUrl/auth/check';
  static const String authRegister    = '$baseUrl/auth/register';
  static const String authLoginPin    = '$baseUrl/auth/login-pin';
  static const String authForgotPin   = '$baseUrl/auth/forgot-pin';
  static const String authProfile     = '$baseUrl/auth/profile';
  static const String authMe          = '$baseUrl/auth/me';
  static const String authChangePin   = '$baseUrl/auth/change-pin';
  static const String authFcmToken    = '$baseUrl/auth/fcm-token';

  // ── Ads ───────────────────────────────────────────────────────────────────
  static const String ads             = '$baseUrl/ads';

  // ── Categories ────────────────────────────────────────────────────────────
  static const String categories      = '$baseUrl/categories';

  // ── Banners ───────────────────────────────────────────────────────────────
  static const String banners         = '$baseUrl/banners';

  // ── Chat ──────────────────────────────────────────────────────────────────
  static const String chat            = '$baseUrl/chat';

  // ── Ratings ───────────────────────────────────────────────────────────────
  static const String ratings         = '$baseUrl/ratings';

  // ── Shops ─────────────────────────────────────────────────────────────────
  static const String shops           = '$baseUrl/shops';

  // ── Users ─────────────────────────────────────────────────────────────────
  static const String users           = '$baseUrl/users';

  // ── Socket.io ─────────────────────────────────────────────────────────────
  // Strip /api for the socket server root
  static const String socketUrl       = 'https://murato.onrender.com';

  // ── Storage Keys ──────────────────────────────────────────────────────────
  static const String tokenKey        = 'myillo_token';
  static const String userKey         = 'myillo_user';
  static const String phoneKey        = 'myillo_phone';
}
