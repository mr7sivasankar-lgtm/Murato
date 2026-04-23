import { useState, useEffect } from 'react';
import { Image, Trash2, Plus, Power, Link } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [targetUser, setTargetUser] = useState('');
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
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2MB');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!imageFile) return toast.error('Select an image');
    if (!targetUser.trim()) return toast.error('Enter a target User Phone number');

    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('targetUser', targetUser.trim());

    try {
      const { data } = await api.post('/admin/banners', formData);
      setBanners([data, ...banners]);
      toast.success('Banner created');
      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setTargetUser('');
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
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners(prev => prev.filter(b => b._id !== id));
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="topbar">
        <h2>🖼️ Banners & Promotions</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {banners.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No banners found. Create one to show on the main app!</p>
          ) : banners.map(banner => (
            <div key={banner._id} style={{ background: 'white', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ height: 160, position: 'relative', background: '#f3f4f6' }}>
                <img src={banner.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!banner.isActive && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ background: 'var(--text-primary)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>PAUSED</span>
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link size={12} /> LINKS TO
                </p>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                  {banner.targetUserId?.businessName || banner.targetUserId?.name || 'Unknown User'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {banner.targetUserId?.phone}
                </p>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Banner</h3>
            
            <div className="form-group">
              <label className="form-label">Target User Phone Number</label>
              <input 
                className="form-input" 
                placeholder="e.g. 9876543210" 
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>When users tap the banner, they will go to this seller's profile.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Banner Image (16:9 ratio recommended)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="banner-img"
              />
              <label htmlFor="banner-img" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, border: '2px dashed var(--border)', borderRadius: 12, cursor: 'pointer', background: '#f9fafb', overflow: 'hidden' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Image size={24} color="var(--text-secondary)" style={{ marginBottom: 8 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Click to select image</span>
                  </>
                )}
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={uploading} style={{ flex: 1, justifyContent: 'center' }}>
                {uploading ? 'Uploading...' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
