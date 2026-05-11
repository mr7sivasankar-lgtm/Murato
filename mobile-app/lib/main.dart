// ─── Myillo App — Full Router + Entry Point ───────────────────────────────────
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'config/app_theme.dart';
import 'providers/auth_provider.dart';

// Auth
import 'screens/auth/login_screen.dart';

// Phase 2
import 'screens/home/home_screen.dart';

// Phase 3
import 'screens/ads/ad_detail_screen.dart';
import 'screens/search/search_screen.dart';

// Phase 4
import 'screens/ads/post_ad_screen.dart';

// Phase 5
import 'screens/profile/profile_screen.dart';
import 'screens/profile/settings_screen.dart';
import 'screens/profile/my_ads_screen.dart';

// Phase 6
import 'screens/chat/chats_screen.dart';
import 'screens/chat/chat_room_screen.dart';

// Phase 7
import 'screens/favorites/favorites_screen.dart';
import 'screens/seller/seller_profile_screen.dart';

// ── Simple static screens ─────────────────────────────────────────────────────
class _StaticScreen extends StatelessWidget {
  final String title;
  const _StaticScreen({required this.title});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bg,
    appBar: AppBar(
      backgroundColor: AppColors.white, elevation: 0,
      leading: BackButton(color: AppColors.textPrimary, onPressed: () => context.pop()),
      title: Text(title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 17, fontWeight: FontWeight.w700)),
    ),
    body: Center(child: Text(title, style: const TextStyle(color: AppColors.textSecondary))),
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
GoRouter _buildRouter(AuthProvider auth) => GoRouter(
  initialLocation: '/login',
  refreshListenable: auth,
  redirect: (_, state) {
    if (!auth.initialized) return null;
    final loggedIn  = auth.isLoggedIn;
    final onLogin   = state.matchedLocation == '/login';
    if (loggedIn && onLogin)  return '/';
    if (!loggedIn && !onLogin) return '/login';
    return null;
  },
  routes: [
    // Auth
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

    // Home
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),

    // Search
    GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),

    // Ad detail
    GoRoute(path: '/ads/:id',
      builder: (_, state) => AdDetailScreen(adId: state.pathParameters['id']!)),

    // Post Ad (Sell)
    GoRoute(path: '/sell', builder: (_, __) => const PostAdScreen()),

    // Profile
    GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    GoRoute(path: '/my-ads', builder: (_, __) => const MyAdsScreen()),

    // Chats
    GoRoute(path: '/chats', builder: (_, __) => const ChatsScreen()),
    GoRoute(path: '/chat/:chatId',
      builder: (_, state) => ChatRoomScreen(chatId: state.pathParameters['chatId']!)),

    // Favorites
    GoRoute(path: '/favorites', builder: (_, __) => const FavoritesScreen()),

    // Seller
    GoRoute(path: '/seller/:id',
      builder: (_, state) => SellerProfileScreen(sellerId: state.pathParameters['id']!)),

    // Static
    GoRoute(path: '/terms',   builder: (_, __) => const _StaticScreen(title: 'Terms of Service')),
    GoRoute(path: '/privacy', builder: (_, __) => const _StaticScreen(title: 'Privacy Policy')),
  ],
  errorBuilder: (_, state) => Scaffold(
    body: Center(child: Text('Page not found: ${state.uri}',
      style: const TextStyle(color: AppColors.textSecondary))),
  ),
);

// ── App ───────────────────────────────────────────────────────────────────────
// Background FCM handler — must be top-level
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  runApp(const MyilloApp());
}

class MyilloApp extends StatefulWidget {
  const MyilloApp({super.key});
  @override
  State<MyilloApp> createState() => _MyilloAppState();
}

class _MyilloAppState extends State<MyilloApp> {
  late final AuthProvider _auth;
  late final GoRouter     _router;

  @override
  void initState() {
    super.initState();
    _auth   = AuthProvider();
    _router = _buildRouter(_auth);
    _auth.initialize();
  }

  @override
  Widget build(BuildContext context) => ChangeNotifierProvider.value(
    value: _auth,
    child: MaterialApp.router(
      title: 'Myillo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router,
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(
          textScaler: TextScaler.linear(
            MediaQuery.of(ctx).textScaler.scale(1.0).clamp(0.8, 1.2))),
        child: child!,
      ),
    ),
  );
}
