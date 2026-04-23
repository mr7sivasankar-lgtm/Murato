import { useState, useEffect } from 'react';
import { Image, Trash2, Plus, Power, Link, MapPin, User } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

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

            {/* Target City */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> Target City / Location
              </label>
              <input
                className="form-input"
                placeholder="e.g. Hyderabad (leave empty = show to ALL users)"
                value={targetCity}
                onChange={e => setTargetCity(e.target.value)}
              />
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
