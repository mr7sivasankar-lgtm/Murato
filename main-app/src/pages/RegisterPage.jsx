import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    const result = await register(form.name, form.phone, form.password, form.email);
    if (result.success) {
      toast.success('Account created! Welcome to Murato 🏗️');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero" style={{ flex: '0 0 auto', paddingTop: 60, paddingBottom: 30 }}>
        <div className="auth-logo">🏗️</div>
        <h1 className="auth-brand">Murato</h1>
        <p className="auth-tagline">Join the construction marketplace</p>
      </div>

      <div className="auth-card" style={{ flex: 1 }}>
        <h2 className="auth-title">Create Account ✨</h2>
        <p className="auth-subtitle">Start buying & selling construction materials</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your full name" value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" type="tel" placeholder="Phone number" value={form.phone} onChange={update('phone')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email (optional)</label>
            <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={update('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Create password" value={form.password} onChange={update('password')} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={update('confirm')} required />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginBottom: 16 }}>
            {loading ? 'Creating...' : '🚀 Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--navy)', fontWeight: 700 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
