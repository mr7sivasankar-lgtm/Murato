import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CITIES = ['Hyderabad','Mumbai','Delhi','Bangalore','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];

export default function CreateShopPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', description: '', city: '', area: '', phone: user?.phone || '', category: '' });
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.city) return toast.error('Name and city are required');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logo) fd.append('logo', logo);
      const { data } = await api.post('/shops', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ shopId: data._id });
      toast.success('🏪 Shop created! Pending approval.');
      navigate(`/shop/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'var(--navy)' }}><ArrowLeft size={22} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>🏪 Create Shop</h1>
        </div>
      </div>
      <div className="container" style={{ paddingTop: 16 }}>
        <form onSubmit={handleSubmit}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <label htmlFor="logo" style={{ cursor: 'pointer', display: 'inline-block' }}>
              <div style={{ width: 90, height: 90, borderRadius: 20, background: 'var(--bg)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto 8px' }}>
                {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={28} color="var(--text-muted)" />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>Upload Logo</p>
            </label>
            <input id="logo" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
          </div>

          <div className="form-group">
            <label className="form-label">Shop Name *</label>
            <input className="form-input" placeholder="e.g. Ahmed Construction Store" value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="What do you sell? Quality, speciality..." value={form.description} onChange={update('description')} style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">City *</label>
              <select className="form-select" value={form.city} onChange={update('city')} required>
                <option value="">Select city</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Area</label>
              <input className="form-input" placeholder="Locality" value={form.area} onChange={update('area')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" placeholder="Contact number" value={form.phone} onChange={update('phone')} />
          </div>

          <div style={{ background: '#fef3c7', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', gap: 10 }}>
            <span>⏳</span>
            <p style={{ fontSize: 13, color: '#92400e' }}>Your shop will be reviewed and approved by admin within 24 hours.</p>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : '🏪 Create Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
