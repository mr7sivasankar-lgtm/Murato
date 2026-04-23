import { useState, useEffect, useRef } from 'react';
import { Image, Trash2, Plus, Power, MapPin, User, Search, X, Edit2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

/* ── Nominatim city autocomplete ── */
function LocationInput({ onAdd }) {
  const [query, setQuery] = useState('');
  const [sugs, setSugs]   = useState([]);
  const [open, setOpen]   = useState(false);
  const timer             = useRef(null);

  const search = async (q) => {
    if (q.length < 3) { setSugs([]); return; }
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&addressdetails=1&limit=8&accept-language=en`);
      const data = await res.json();
      const seen = new Set();
      setSugs(data.filter(r => {
        const a = r.address;
        const city = a.city || a.town || a.village || a.county || '';
        if (!city || seen.has(city.toLowerCase())) return false;
        seen.add(city.toLowerCase()); return true;
      }));
      setOpen(true);
    } catch { setSugs([]); }
  };

  const handleChange = (v) => {
    setQuery(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 400);
  };

  const select = (r) => {
    const a = r.address;
    const city = a.city || a.town || a.village || a.county || '';
    const pin  = a.postcode || '';
    onAdd(city, pin);
    setQuery(''); setSugs([]); setOpen(false);
  };

  const fmt = (r) => {
    const a = r.address;
    const city  = a.city || a.town || a.village || a.county || '';
    const dist  = a.state_district || a.county || '';
    const state = a.state || '';
    const pin   = a.postcode || '';
    return { label: [city, dist !== city ? dist : '', state].filter(Boolean).join(', '), pin };
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input className="form-input" style={{ paddingLeft: 34 }}
          placeholder="Search city, area or pincode to add…"
          value={query} onChange={e => handleChange(e.target.value)}
          onFocus={() => sugs.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
      </div>
      {open && sugs.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 999, top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
          {sugs.map((r, i) => {
            const { label, pin } = fmt(r);
            return (
              <div key={i} onMouseDown={() => select(r)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f3fc'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                {pin && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', background: '#eef2ff', padding: '2px 8px', borderRadius: 20 }}>{pin}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── City tags display ── */
function CityTags({ cities, onRemove }) {
  if (!cities.length) return <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 6 }}>No cities added — banner will show to ALL users</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {cities.map((c, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eef2ff', color: 'var(--navy)', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          📍 {c}
          {onRemove && <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--navy)' }}><X size={12} /></button>}
        </span>
      ))}
    </div>
  );
}

/* ── Shared Banner Modal ── */
function BannerModal({ initial, onSave, onClose, uploading }) {
  const isEdit = !!initial;
  const [targetUser, setTargetUser] = useState(initial?.targetUserId?.phone || '');
  const [cities, setCities]         = useState(initial?.targetCities || []);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImgPrev]  = useState(initial?.imageUrl || null);

  const addCity = (city) => {
    if (!cities.includes(city)) setCities(p => [...p, city]);
  };
  const removeCity = (i) => setCities(p => p.filter((_, idx) => idx !== i));

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error('Image must be under 3MB'); return; }
    setImageFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const handleSubmit = () => {
    if (!isEdit && !imageFile) { toast.error('Select a banner image'); return; }
    const fd = new FormData();
    if (imageFile) fd.append('image', imageFile);
    fd.append('targetUser', targetUser.trim());
    fd.append('targetCities', JSON.stringify(cities));
    onSave(fd);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isEdit ? '✏️ Edit Banner' : '🖼️ Create New Banner'}</h3>

        {/* Image */}
        <div className="form-group">
          <label className="form-label">Banner Image {!isEdit && '*'} (16:9 ratio recommended)</label>
          <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} id="banner-img" />
          <label htmlFor="banner-img" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer', background: '#f9fafb', overflow: 'hidden' }}>
            {imagePreview
              ? <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <><Image size={28} color="var(--text-secondary)" style={{ marginBottom: 8 }} /><span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Click to select image</span></>
            }
          </label>
          {isEdit && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Leave empty to keep the existing image.</p>}
        </div>

        {/* Target cities */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} /> Target Locations (add multiple)
          </label>
          <LocationInput onAdd={addCity} />
          <CityTags cities={cities} onRemove={removeCity} />
        </div>

        {/* Target user */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} /> Link to Seller Profile (Optional)
          </label>
          <input className="form-input" placeholder="Seller phone e.g. 9876543210" value={targetUser} onChange={e => setTargetUser(e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Tapping the banner opens this seller's profile. Leave blank for a general ad.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading} style={{ flex: 1, justifyContent: 'center' }}>
            {uploading ? 'Saving...' : isEdit ? '💾 Save Changes' : '🚀 Create Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [uploading, setUploading]   = useState(false);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/admin/banners');
      setBanners(data);
    } catch { toast.error('Failed to load banners'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (fd) => {
    setUploading(true);
    try {
      const { data } = await api.post('/admin/banners', fd);
      setBanners(p => [data, ...p]);
      toast.success('Banner created!');
      setShowCreate(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setUploading(false); }
  };

  const handleEdit = async (fd) => {
    setUploading(true);
    try {
      const { data } = await api.put(`/admin/banners/${editBanner._id}`, fd);
      setBanners(p => p.map(b => b._id === editBanner._id ? data : b));
      toast.success('Banner updated!');
      setEditBanner(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setUploading(false); }
  };

  const toggleActive = async (id) => {
    try {
      const { data } = await api.put(`/admin/banners/${id}/toggle`);
      setBanners(p => p.map(b => b._id === id ? data : b));
      toast.success(data.isActive ? 'Activated' : 'Paused');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners(p => p.filter(b => b._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>🖼️ Banners & Promotions</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Promotional banners shown on the main app home screen</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {banners.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🖼️</p>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No banners yet</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Create one to promote sellers on the main app!</p>
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
                {/* Seller link */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <User size={14} color="var(--text-secondary)" style={{ marginTop: 2 }} />
                  {banner.targetUserId
                    ? <div><p style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{banner.targetUserId.businessName || banner.targetUserId.name}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{banner.targetUserId.phone}</p></div>
                    : <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>General promotion</p>}
                </div>

                {/* Locations */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 14 }}>
                  <MapPin size={13} color="var(--text-secondary)" style={{ marginTop: 2 }} />
                  {banner.targetCities?.length
                    ? <CityTags cities={banner.targetCities} />
                    : <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>🌍 All locations</span>}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', border: '1.5px solid var(--border)' }} onClick={() => setEditBanner(banner)}>
                    <Edit2 size={14} /> Edit
                  </button>
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

      {showCreate && <BannerModal onSave={handleCreate} onClose={() => setShowCreate(false)} uploading={uploading} />}
      {editBanner  && <BannerModal initial={editBanner} onSave={handleEdit} onClose={() => setEditBanner(null)} uploading={uploading} />}
    </div>
  );
}
