import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit3, Trash2, Plus, Package, Wrench, Star, MapPin } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PRICE_TYPE_LABELS } from '../data/categories';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  active:   { background: '#dcfce7', color: '#166534', label: '✅ Active' },
  sold:     { background: '#f3f4f6', color: '#6b7280', label: '🏷️ Sold' },
  inactive: { background: '#fee2e2', color: '#991b1b', label: '⏸️ Inactive' },
};

export default function MyAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ads,      setAds]      = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // 'all' | 'product' | 'service'
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data } = await api.get(`/ads/user/${user._id}`);
      setAds(data || []);
    } catch { setAds([]); }
    finally { setLoading(false); }
  };

  const deleteAd = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    setDeleting(id);
    try {
      await api.delete(`/ads/${id}`);
      setAds(prev => prev.filter(a => a._id !== id));
      toast.success('Ad deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const editAd = (ad) => {
    navigate('/sell', { state: { ad } });
  };

  const filteredAds = filter === 'all' ? ads : ads.filter(a => a.type === filter);

  const productCount = ads.filter(a => a.type === 'product').length;
  const serviceCount = ads.filter(a => a.type === 'service').length;

  return (
    <div className="page page-enter" style={{ paddingBottom: 90 }}>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)' }}>{t('myAds')}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ads.length} listings posted</p>
          </div>
          <button
            onClick={() => navigate('/sell')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            <Plus size={15} /> {t('postAd')}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
          {[
            { label: 'Total', value: ads.length, active: filter === 'all', onClick: () => setFilter('all'), icon: '📋' },
            { label: 'Products', value: productCount, active: filter === 'product', onClick: () => setFilter('product'), icon: '📦' },
            { label: 'Services', value: serviceCount, active: filter === 'service', onClick: () => setFilter('service'), icon: '🔧' },
          ].map(s => (
            <button
              key={s.label}
              onClick={s.onClick}
              style={{ background: s.active ? 'var(--navy)' : 'white', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: `1.5px solid ${s.active ? 'var(--navy)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.18s' }}
            >
              <p style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: s.active ? 'white' : 'var(--navy)' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: s.active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontWeight: 600 }}>{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{filter === 'service' ? '🔧' : '📦'}</div>
            <p className="empty-title">No {filter === 'all' ? '' : filter} ads yet</p>
            <p className="empty-subtitle">{t('beFirst')}</p>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => navigate('/sell')}>
              {t('postAd')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredAds.map(ad => {
              const statusStyle = STATUS_STYLES[ad.status] || STATUS_STYLES.active;
              const priceLabel  = PRICE_TYPE_LABELS[ad.priceType] || '';
              const isService   = ad.type === 'service';

              return (
                <div
                  key={ad._id}
                  style={{ background: 'white', borderRadius: 16, padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}
                >
                  {/* Thumbnail */}
                  {ad.images?.[0] ? (
                    <img src={ad.images[0]} style={{ width: 82, height: 82, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} alt={ad.title} />
                  ) : (
                    <div style={{ width: 82, height: 82, borderRadius: 12, background: 'linear-gradient(135deg,#f0f3fc,#e8ecf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                      {isService ? '🔧' : '📦'}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type + status badges */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: isService ? '#f3e8ff' : '#e8f0fe', color: isService ? '#7c3aed' : '#1a2b5f', display: 'flex', alignItems: 'center', gap: 3 }}>
                        {isService ? <Wrench size={8} /> : <Package size={8} />}
                        {isService ? 'SERVICE' : 'PRODUCT'}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, ...statusStyle }}>
                        {statusStyle.label}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {ad.title}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--navy)', marginBottom: 4 }}>
                      ₹{Number(ad.price).toLocaleString('en-IN')}
                      <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', marginLeft: 3 }}>{priceLabel}</span>
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {ad.location?.city && (
                        <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={9} /> {ad.location.city}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Eye size={9} /> {ad.views || 0} views
                      </span>
                      {ad.ratingAvg > 0 && (
                        <span style={{ fontSize: 10, color: '#f5c518', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Star size={9} fill="#f5c518" /> {ad.ratingAvg.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => editAd(ad)}
                      style={{ width: 34, height: 34, borderRadius: 9, background: '#f0f3fc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--navy)' }}
                      title="Edit"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/ads/${ad._id}`)}
                      style={{ width: 34, height: 34, borderRadius: 9, background: '#f0f3fc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--navy)' }}
                      title="View"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => deleteAd(ad._id)}
                      disabled={deleting === ad._id}
                      style={{ width: 34, height: 34, borderRadius: 9, background: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dc2626', opacity: deleting === ad._id ? 0.5 : 1 }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
