import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, FileText, Store, Tag, LifeBuoy, LogOut, Image } from 'lucide-react';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import AdsPage from './pages/AdsPage';
import CategoriesPage from './pages/CategoriesPage';
import SupportPage from './pages/SupportPage';
import BannersPage from './pages/BannersPage';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'users', label: 'Users', icon: <Users size={18} /> },
  { key: 'ads', label: 'Ads', icon: <FileText size={18} /> },
  { key: 'categories', label: 'Categories', icon: <Tag size={18} /> },
  { key: 'banners', label: 'Banners', icon: <Image size={18} /> },
  { key: 'support',    label: 'Support',    icon: <LifeBuoy size={18} /> },
];

const PAGES = {
  dashboard: <Dashboard />,
  users: <UsersPage />,
  ads: <AdsPage />,
  categories: <CategoriesPage />,
  banners: <BannersPage />,
  support:    <SupportPage />,
};

export default function App() {
  const [admin, setAdmin] = useState(() => {
    const token = localStorage.getItem('murato_admin_token');
    return token ? { token } : null;
  });
  const [page, setPage] = useState('dashboard');

  const logout = () => {
    localStorage.removeItem('murato_admin_token');
    setAdmin(null);
  };

  if (!admin) return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Inter', fontSize: 14 } }} />
      <LoginPage onLogin={setAdmin} />
    </>
  );

  return (
    <div className="admin-layout">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter', fontSize: 14 } }} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🏗️ <span>Murato</span></h1>
          <p>Admin Panel</p>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button key={item.key} className={`sidebar-item ${page === item.key ? 'active' : ''}`} onClick={() => setPage(item.key)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="sidebar-item" onClick={logout} style={{ marginTop: 'auto', color: '#ef4444' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="main-content">
        {PAGES[page]}
      </main>
    </div>
  );
}
