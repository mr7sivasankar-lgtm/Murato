import { useState, useEffect, useRef } from 'react';
import { Image, Trash2, Plus, Power, MapPin, User, Search } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

/* ── Nominatim location autocomplete ── */
function LocationInput({ value, onChange }) {
  const [query, setQuery]         = useState(value || '');
  const [suggestions, setSugs]   = useState([]);
  const [open, setOpen]          = useState(false);
  const timerRef                 = useRef(null);

  const search = async (q) => {
    if (q.length < 3) { setSugs([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&addressdetails=1&limit=7&accept-language=en`
      );
      const data = await res.json();
      // Deduplicate by city name
      const seen = new Set();
      const filtered = data.filter(r => {
        const a = r.address;
        const city = a.city || a.town || a.village || a.county || '';
        if (!city || seen.has(city.toLowerCase())) return false;
        seen.add(city.toLowerCase());
        return true;
      });
      setSugs(filtered);
      setOpen(true);
    } catch { setSugs([]); }
  };

  const handleChange = (v) => {
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 400);
  };

  const select = (r) => {
    const a = r.address;
    const city = a.city || a.town || a.village || a.county || '';
    setQuery(city);
    onChange(city);
    setSugs([]);
    setOpen(false);
  };

  const formatSug = (r) => {
    const a = r.address;
    const city    = a.city || a.town || a.village || a.county || '';
    const district= a.state_district || a.county || '';
    const state   = a.state || '';
    const pin     = a.postcode || '';
    const parts   = [city, district !== city ? district : '', state].filter(Boolean);
    return { label: parts.join(', '), pin };
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 34 }}
          placeholder="Type city, area or pincode… (leave blank = all users)"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
          {suggestions.map((r, i) => {
            const { label, pin } = formatSug(r);
            return (
              <div key={i} onMouseDown={() => select(r)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f3fc'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                {pin && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{pin}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [targetCity, setTargetCity] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/admin/banners');
      setBanners(data);
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error('Image must be under 3MB');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetModal = () => {
    setShowModal(false);
    setImageFile(null);
    setImagePreview(null);
    setTargetUser('');
    setTargetCity('');
  };

  const handleCreate = async () => {
    if (!imageFile) return toast.error('Select a banner image');

    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    if (targetUser.trim()) formData.append('targetUser', targetUser.trim());
    if (targetCity.trim()) formData.append('targetCity', targetCity.trim());

    try {
      const { data } = await api.post('/admin/banners', formData);
      setBanners([data, ...banners]);
      toast.success('Banner created!');
      resetModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create banner');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      const { data } = await api.put(`/admin/banners/${id}/toggle`);
      setBanners(prev => prev.map(b => b._id === id ? data : b));
      toast.success(data.isActive ? 'Banner activated' : 'Banner paused');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner permanently?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners(prev => prev.filter(b => b._id !== id));
      toast.success('Banner deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>🖼️ Banners & Promotions</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Create promotional banners shown on the main app home screen
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {banners.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🖼️</p>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No banners yet</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Create one to start promoting sellers on the main app!</p>
            </div>
          ) : banners.map(banner => (
            <div key={banner._id} style={{ background: 'white', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', border: `2px solid ${banner.isActive ? 'transparent' : '#e5e7eb'}` }}>
              <div style={{ height: 160, position: 'relative', background: '#f3f4f6' }}>
                <img src={banner.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!banner.isActive && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ background: '#374151', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>PAUSED</span>
                  </div>
                )}
              </div>

              <div style={{ padding: 16 }}>
                {/* Target User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <User size={14} color="var(--text-secondary)" />
                  {banner.targetUserId ? (
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                        {banner.targetUserId.businessName || banner.targetUserId.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{banner.targetUserId.phone}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>General promotion (no profile link)</p>
                  )}
                </div>

                {/* Location tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="var(--text-secondary)" />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {banner.targetCity
                      ? <span style={{ color: '#f59e0b' }}>📍 {banner.targetCity} only</span>
                      : <span style={{ color: '#10b981' }}>🌍 All locations</span>
                    }
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className={`btn btn-sm ${banner.isActive ? 'btn-warning' : 'btn-success'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => toggleActive(banner._id)}>
                    <Power size={14} /> {banner.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button className="btn btn-sm btn-danger" style={{ padding: '0 12px' }} onClick={() => handleDelete(banner._id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Banner</h3>

            {/* Image */}
            <div className="form-group">
              <label className="form-label">Banner Image * (16:9 ratio recommended)</label>
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} id="banner-img" />
              <label htmlFor="banner-img" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer', background: '#f9fafb', overflow: 'hidden' }}>
                {imagePreview
                  ? <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><Image size={28} color="var(--text-secondary)" style={{ marginBottom: 8 }} /><span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Click to select image</span></>
                }
              </label>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> Target City / Location
              </label>
              <LocationInput value={targetCity} onChange={setTargetCity} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                If filled, this banner will ONLY appear for users in this city. Leave blank for all users.
              </p>
            </div>

            {/* Target User (optional) */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} /> Link to Seller Profile (Optional)
              </label>
              <input
                className="form-input"
                placeholder="Seller phone number e.g. 9876543210"
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                When users tap this banner, they'll go to this seller's profile. Leave blank for a general ad with no link.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={resetModal} disabled={uploading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={uploading || !imageFile} style={{ flex: 1, justifyContent: 'center', opacity: !imageFile ? 0.5 : 1 }}>
                {uploading ? 'Uploading...' : '🚀 Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
