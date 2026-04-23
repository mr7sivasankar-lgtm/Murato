import { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (!data.isAdmin) return toast.error('Admin access only');
      localStorage.setItem('murato_admin_token', data.token);
      onLogin(data);
      toast.success('Welcome, Admin! 🏗️');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏗️</div>
          <h1>Murato Admin</h1>
          <p>Sign in to manage the marketplace</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input className="form-input" type="email" placeholder="admin@murato.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, borderRadius: 10 }}>
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
