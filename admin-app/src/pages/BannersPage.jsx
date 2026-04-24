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
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl || '');
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImgPrev]  = useState(initial?.imageUrl || null);

  const addCity = (city) => {
    if (!cities.includes(city)) setCities(p => [...p, city]);
  };
  const removeCity = (i) => setCities(p => p.filter((_, idx) => idx !== i));

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setImageFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const handleSubmit = () => {
    if (!isEdit && !imageFile) { toast.error('Select a banner image'); return; }
    // Validate external URL if provided
    if (externalUrl.trim() && !/^https?:\/\//i.test(externalUrl.trim())) {
      toast.error('URL must start with https:// or http://');
      return;
    }
    const fd = new FormData();
    if (imageFile) fd.append('image', imageFile);
    fd.append('targetUser', targetUser.trim());
    fd.append('targetCities', JSON.stringify(cities));
    fd.append('externalUrl', externalUrl.trim());
    onSave(fd);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{isEdit ? '✏️ Edit Banner' : '🖼️ Create New Banner'}</h3>

        {/* Image */}
        <div className="form-group">
          <label className="form-label">Banner Image {!isEdit && '*'}</label>
          {/* Spec hint box */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#0369a1', lineHeight: 1.7 }}>
            📐 <strong>Recommended size:</strong> 1200 × 375 px &nbsp;|&nbsp; Ratio: <strong>16:5</strong><br />
            📁 <strong>Max file size:</strong> 5 MB &nbsp;|&nbsp; Format: JPG, PNG, WebP<br />
            💡 <em>Tip: Use Canva → Custom size → 1200 × 375 px for a perfect fit with no cropping.</em>
          </div>
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

        {/* External URL */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🔗 External Link URL <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>(Optional)</span>
          </label>
          <input
            className="form-input"
            placeholder="https://sbi.co.in/home-loan"
            value={externalUrl}
            onChange={e => setExternalUrl(e.target.value)}
          />
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>When users tap this banner, they will be taken to this website. Must start with https://</p>
        </div>

        {/* Target user (Seller profile link) */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} /> Link to Seller Profile <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>(Optional)</span>
          </label>
          <input className="form-input" placeholder="Seller phone e.g. 9876543210" value={targetUser} onChange={e => setTargetUser(e.target.value)} />
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Tapping the banner opens this seller's profile. If External URL is set above, that takes priority.</p>
        </div>

        {/* ── Live Mobile Preview ── */}
        {imagePreview && (
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              📱 Live Preview <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>— how it looks on the user's home screen</span>
            </label>

            {/* Phone frame */}
            <div style={{
              margin: '0 auto',
              width: 240,
              background: '#0f1d45',
              borderRadius: 32,
              padding: '12px 8px 16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              border: '3px solid #1a2b5f',
            }}>
              {/* Notch */}
              <div style={{ width: 60, height: 6, background: '#1a2b5f', borderRadius: 3, margin: '0 auto 10px' }} />

              {/* Fake header */}
              <div style={{ background: 'linear-gradient(135deg, rgba(224,231,255,0.95) 0%, rgba(250,232,255,0.9) 100%)', borderRadius: '12px 12px 0 0', padding: '8px 10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 9, color: '#1a2b5f', fontWeight: 700 }}>📍 Tirupati</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#1a2b5f' }}>Murato</div>
                <div style={{ width: 24 }} />
              </div>
              {/* Fake search bar */}
              <div style={{ background: 'linear-gradient(135deg, rgba(224,231,255,0.95) 0%, rgba(250,232,255,0.9) 100%)', padding: '4px 10px 8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 50, padding: '5px 10px', fontSize: 9, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
                  🔍 Search "cement near me"
                </div>
              </div>

              {/* Banner preview */}
              <div style={{ padding: '6px 8px 4px', background: '#f0f2f9' }}>
                <div style={{ borderRadius: 10, overflow: 'hidden', height: 76, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <img
                    src={imagePreview}
                    alt="Banner preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                {/* Dot indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 5, marginBottom: 2 }}>
                  <div style={{ width: 14, height: 4, borderRadius: 2, background: '#1a2b5f' }} />
                  <div style={{ width: 5, height: 4, borderRadius: 2, background: '#d1d5db' }} />
                </div>
                {/* Fake categories label */}
                <div style={{ fontSize: 9, fontWeight: 700, color: '#1a1a2e', padding: '4px 0 2px' }}>Browse Categories 12+</div>
              </div>

              {/* Home indicator */}
              <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '10px auto 0' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
              ⬆️ This is exactly how your banner appears in the app carousel
            </p>
          </div>
        )}

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
                {/* Seller link / External URL */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <User size={14} color="var(--text-secondary)" style={{ marginTop: 2 }} />
                  {banner.targetUserId
                    ? <div><p style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{banner.targetUserId.businessName || banner.targetUserId.name}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{banner.targetUserId.phone}</p></div>
                    : <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>General promotion</p>}
                </div>
                {banner.externalUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>🔗</span>
                    <a href={banner.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}>
                      {banner.externalUrl}
                    </a>
                  </div>
                )}

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
                  <button
                    className="btn btn-sm btn-warning"
                    style={{ flex: 1, justifyContent: 'center', opacity: banner.isActive ? 1 : 0.5 }}
                    onClick={() => toggleActive(banner._id)}
                    title={banner.isActive ? 'Pause this banner' : 'Click to re-activate'}
                  >
                    <Power size={14} /> Pause
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
