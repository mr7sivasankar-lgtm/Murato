// ─── Auth Provider ────────────────────────────────────────────────────────────
// ChangeNotifier-based state for user session

import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _initialized = false;

  Map<String, dynamic>? get user      => _user;
  bool get isLoggedIn                  => _user != null;
  bool get initialized                 => _initialized;

  // ── Called at app startup ─────────────────────────────────────────────────

  Future<void> initialize() async {
    final userData = await AuthService.verifySession();
    _user = userData;
    _initialized = true;
    notifyListeners();
  }

  // ── After successful login / register ─────────────────────────────────────

  void setUser(Map<String, dynamic> userData) {
    // Strip token from the user object we keep in memory
    final copy = Map<String, dynamic>.from(userData);
    copy.remove('token');
    _user = copy;
    notifyListeners();
  }

  // ── Update user fields (profile edit) ────────────────────────────────────

  void updateUser(Map<String, dynamic> updates) {
    if (_user == null) return;
    _user = {..._user!, ...updates};
    notifyListeners();
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  Future<void> logout() async {
    await AuthService.clearAll();
    _user = null;
    notifyListeners();
  }
}
