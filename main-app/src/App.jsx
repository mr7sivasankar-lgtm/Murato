import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

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
    path.startsWith('/ads/')   ||   // AdDetailPage has its own fixed CTA bar
    path.startsWith('/seller/') ||  // SellerProfilePage is full-screen
    (path.startsWith('/chat/') && path.length > 6);

  return (
    <>
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!isNavHidden && <BottomNav />}
    </>
  );
}

export default function App() {
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
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
