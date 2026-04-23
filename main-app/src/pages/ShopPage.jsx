import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AdCard from '../components/AdCard';
import toast from 'react-hot-toast';

export default function ShopPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shopId = id || user?.shopId;
    if (!shopId) { setLoading(false); return; }
    api.get(`/shops/${shopId}`)
      .then(r => { setShop(r.data.shop); setAds(r.data.ads); })
      .catch(() => toast.error('Shop not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="page page-enter">
      {/* Shop Header */}
      <div className="shop-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'rgba(255,255,255,0.8)' }}><ArrowLeft size={22} /></button>
        </div>
        <div className="shop-hero">
          <div className="shop-logo">
            {shop?.logo ? <img src={shop.logo} style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover' }} /> : '🏪'}
          </div>
          <div style={{ flex: 1 }}>
            <p className="shop-name">{shop?.name}</p>
            <p className="shop-desc">{shop?.description}</p>
            <span className="shop-badge">{shop?.status === 'approved' ? '✅ Verified' : '⏳ Pending'}</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 16 }}>
        <div className="section-header">
          <p className="section-title">Products <span>{ads.length}</span></p>
          {user?.shopId === shop?._id && (
            <button className="btn btn-primary btn-sm" style={{ width: 'auto', borderRadius: 20 }} onClick={() => navigate('/sell')}>
              <Plus size={14} /> Add Product
            </button>
          )}
        </div>

        {ads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p className="empty-title">No products yet</p>
            <p className="empty-subtitle">Add your first product to this shop</p>
          </div>
        ) : (
          <div className="ads-grid">
            {ads.map(ad => <AdCard key={ad._id} ad={ad} />)}
          </div>
        )}
      </div>
    </div>
  );
}
