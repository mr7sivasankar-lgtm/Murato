import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Plus, ClipboardList, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const hide = ['/login', '/register', '/chat/'].some(p => location.pathname.startsWith(p));
  const isChatRoom = location.pathname.match(/^\/chat\/.+/);
  if (hide && isChatRoom) return null;

  // Fetch total unread count immediately + every 15 seconds
  useEffect(() => {
    if (!user?._id) return;

    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/chat/mine');
        const userId = user._id.toString();
        const total = data.reduce((sum, chat) => {
          // Handle both plain object and Map serialization
          const count = (chat.unreadCount?.[userId]) || 0;
          return sum + Number(count);
        }, 0);
        setUnreadCount(total);
      } catch { /* silent */ }
    };

    fetchUnread(); // immediate on mount
    intervalRef.current = setInterval(fetchUnread, 15000);
    return () => clearInterval(intervalRef.current);
  }, [user?._id]);

  // Reset badge when entering the chats page
  useEffect(() => {
    if (location.pathname === '/chats') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={22} />
        <span>{t('home')}</span>
      </NavLink>

      <NavLink to="/chats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <MessageCircle size={22} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -8,
              background: '#ef4444', color: 'white',
              fontSize: 9, fontWeight: 800,
              minWidth: 15, height: 15, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', border: '1.5px solid white', lineHeight: 1,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span>{t('chats')}</span>
      </NavLink>

      <NavLink to="/sell" className="nav-sell">
        <div className="fab-sell"><Plus size={26} /></div>
      </NavLink>

      <NavLink to="/my-ads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ClipboardList size={22} />
        <span>{t('myAds')}</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={22} />
        <span>{t('profile')}</span>
      </NavLink>
    </nav>
  );
}
