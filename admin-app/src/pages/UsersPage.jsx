import { useState } from 'react';
import { Users, MapPin, Clock } from 'lucide-react';
import UsersTab from './UsersTab';
import LocationTab from './LocationTab';
import HistoryTab from './HistoryTab';

const TABS = [
  { key: 'users',    label: 'All Users',    icon: <Users size={16} />,   desc: 'Manage registered users' },
  { key: 'location', label: 'By Location',  icon: <MapPin size={16} />,  desc: 'Location-based insights' },
  { key: 'history',  label: 'History',      icon: <Clock size={16} />,   desc: 'Deleted users & ads' },
];

export default function UsersPage() {
  const [tab, setTab] = useState('users');
  const current = TABS.find(t => t.key === tab);

  return (
    <div>
      {/* Page Header */}
      <div className="topbar">
        <div>
          <h2>👥 Users</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{current.desc}</p>
        </div>
      </div>

      {/* Premium Tab Bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 28,
        background: 'white',
        borderRadius: 16,
        padding: 6,
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 11,
                border: 'none',
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
                fontSize: 13.5,
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                background: active
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%)'
                  : 'transparent',
                color: active ? 'white' : 'var(--text-secondary)',
                boxShadow: active ? '0 4px 14px rgba(30,58,95,0.28)' : 'none',
                transform: active ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.key === 'history' && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                  color: active ? 'white' : '#b91c1c',
                  fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 20,
                }}>Log</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        {tab === 'users'    && <UsersTab />}
        {tab === 'location' && <LocationTab />}
        {tab === 'history'  && <HistoryTab />}
      </div>
    </div>
  );
}
