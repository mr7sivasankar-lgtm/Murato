import { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Both email and password are required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put('/admin/credentials', { email, password });
      toast.success('Admin credentials updated successfully! ✅');
      setEmail('');
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2><Settings size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} /> Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your admin account credentials</p>
        </div>
      </div>

      <div style={{ maxWidth: 500, background: 'white', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)', marginTop: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Change Admin Login</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>New Admin Email</label>
            <input 
              className="form-input" 
              type="email" 
              placeholder="e.g. admin@murato.com" 
              value={email}
              onChange={e => setEmail(e.target.value)} 
              required
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8 }}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>New Password</label>
            <input 
              className="form-input" 
              type="text" 
              placeholder="Enter new secure password" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8 }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Update Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}
