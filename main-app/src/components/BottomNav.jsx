import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Plus, ClipboardList, User } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const hide = ['/login', '/register', '/chat/'].some(p => location.pathname.startsWith(p));
  const isChatRoom = location.pathname.match(/^\/chat\/.+/);
  if (hide && isChatRoom) return null;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={22} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/chats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <MessageCircle size={22} />
        <span>Chats</span>
      </NavLink>
      <NavLink to="/sell" className="nav-sell">
        <div className="fab-sell"><Plus size={26} /></div>
        <span className="fab-label">SELL</span>
      </NavLink>
      <NavLink to="/my-ads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <ClipboardList size={22} />
        <span>My Ads</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={22} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
