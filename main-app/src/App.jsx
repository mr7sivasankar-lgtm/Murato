import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { initPush, clearPushListeners } from './services/PushNotificationService';

/* ── Android hardware back-button handler ── */
function AndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackRef = useRef(0);

  useEffect(() => {
    let removeListener = null;

    const setup = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', () => {
          // If not on home, just go back in history
          if (location.pathname !== '/') {
            navigate(-1);
            return;
          }
          // On home — double-press to exit
          const now = Date.now();
          if (now - lastBackRef.current < 2000) {
            App.exitApp();
          } else {
            lastBackRef.current = now;
            toast('Press back again to exit', { icon: '👋', duration: 2000 });
          }
        });
        removeListener = () => listener.remove();
      } catch {
        // Not running inside Capacitor (web browser) — ignore
      }
    };

    setup();
    return () => { removeListener?.(); };
  }, [location.pathname, navigate]);

  return null;
}

/* ── Init push notifications when user logs in ── */
function PushNotificationInitialiser() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      initPush();
    } else {
      clearPushListeners();
    }
    return () => {};
  }, [!!user]);
  return null;
}

/* ── Request location permission once on first launch ── */
function LocationPermissionInitialiser() {
  useEffect(() => {
    // Only ask once — skip if we already asked before
    if (localStorage.getItem('myillo_loc_perm_asked')) return;

    const requestLocPerm = async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        // This triggers the native Android permission dialog immediately
        await Geolocation.requestPermissions();
      } catch {
        // Not on Capacitor (web browser) — ignore
      } finally {
        // Mark as asked so we never show the dialog again on subsequent launches
        localStorage.setItem('myillo_loc_perm_asked', '1');
      }
    };

    // Small delay so the push notification dialog (if shown) settles first
    const timer = setTimeout(requestLocPerm, 1500);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

// Pages
import HomePage           from './pages/HomePage';
import LoginPage          from './pages/LoginPage';
import SearchPage         from './pages/SearchPage';
import AdDetailPage       from './pages/AdDetailPage';
import SellPage           from './pages/SellPage';
import ChatsPage          from './pages/ChatsPage';
import ChatRoomPage       from './pages/ChatRoomPage';
import MyAdsPage          from './pages/MyAdsPage';
import FavoritesPage      from './pages/FavoritesPage';
import ProfilePage        from './pages/ProfilePage';
import SettingsPage       from './pages/SettingsPage';
import SellerProfilePage  from './pages/SellerProfilePage';
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage';
import TermsPage          from './pages/TermsPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  const { pathname: path } = useLocation();
  const isNavHidden =
    path === '/login' ||
    path === '/register' ||
    path === '/privacy-policy' ||
    path === '/terms' ||
    path.startsWith('/ads/')   ||   // AdDetailPage has its own fixed CTA bar
    path.startsWith('/seller/') ||  // SellerProfilePage is full-screen
    (path.startsWith('/chat/') && path.length > 6);

  return (
    <>
      <AndroidBackHandler />
      <PushNotificationInitialiser />
      <LocationPermissionInitialiser />
      <Routes>
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/ads/:id" element={<ProtectedRoute><AdDetailPage /></ProtectedRoute>} />
        <Route path="/seller/:id" element={<ProtectedRoute><SellerProfilePage /></ProtectedRoute>} />
        <Route path="/sell" element={<ProtectedRoute><SellPage /></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
        <Route path="/chat/:chatId" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
        <Route path="/my-ads" element={<ProtectedRoute><MyAdsPage /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!isNavHidden && <BottomNav />}
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: 'Inter', fontSize: 14, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            duration: 3000,
          }}
        />
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
