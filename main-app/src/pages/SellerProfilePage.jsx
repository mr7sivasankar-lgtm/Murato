import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Phone, MessageCircle, MapPin, Package, Wrench, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRICE_TYPE_LABELS } from '../data/categories';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ── Star Rating Component ─────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <Star size={32} fill={(hovered || value) >= s ? '#f5c518' : 'none'} color={(hovered || value) >= s ? '#f5c518' : '#d1d5db'} />
        </button>
      ))}
    </div>
  );
}

// ── Static Star Row ────────────────────────────────────────────────────────
function StarRow({ avg = 0, count = 0, size = 12 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} fill={s <= Math.round(avg) ? '#f5c518' : 'none'} color={s <= Math.round(avg) ? '#f5c518' : '#d1d5db'} />
      ))}
      <span style={{ fontSize: size - 1, color: '#6b7280', marginLeft: 2, fontWeight: 600 }}>
        {avg > 0 ? `${avg.toFixed(1)} (${count})` : 'No ratings yet'}
      </span>
    </div>
  );
}

// ── Mini AdCard (used inside SellerProfilePage) ────────────────────────────
function MiniAdCard({ ad, onAdClick }) {
  const priceLabel = PRICE_TYPE_LABELS[ad.priceType] || '';
  const isService  = ad.type === 'service';
  return (
    <div
      onClick={() => onAdClick(ad)}
      style={{
        background: 'white', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {ad.images?.[0]
        ? <img src={ad.images[0]} alt={ad.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
        : <div style={{ height: 110, background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{isService ? '🔧' : '📦'}</div>
      }
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</p>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#1a2b5f' }}>₹{Number(ad.price).toLocaleString('en-IN')}<span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280' }}>{priceLabel}</span></p>
        {ad.category && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{ad.category}</p>}
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  const navigate = useNavigate();
  const { id: sellerId } = useParams();
  const { user: currentUser } = useAuth();

  const [seller,    setSeller]    = useState(null);
  const [ads,       setAds]       = useState([]);
  const [ratings,   setRatings]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('ads'); // 'ads' | 'reviews'
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');

  // Rating sheet
  const [showRateSheet,  setShowRateSheet]  = useState(false);
  const [rateAd,         setRateAd]         = useState(null);
  const [rateStars,      setRateStars]      = useState(0);
  const [rateComment,    setRateComment]    = useState('');
  const [ratingLoading,  setRatingLoading]  = useState(false);

  // Load seller info
  useEffect(() => {
    if (!sellerId || sellerId === 'seller') return;
    loadData();
  }, [sellerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sellerRes, adsRes, ratingsRes] = await Promise.all([
        api.get(`/users/${sellerId}`),
        api.get(`/ads/user/${sellerId}`),
        api.get(`/ratings/seller/${sellerId}`),
      ]);
      setSeller(sellerRes.data);
      setAds(adsRes.data || []);
      setRatings(ratingsRes.data || []);
    } catch {
      toast.error('Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  // Filtered ads
  const filteredAds = ads.filter(ad => {
    const q = search.toLowerCase();
    const matchQ   = !q || ad.title?.toLowerCase().includes(q) || ad.category?.toLowerCase().includes(q) || ad.brand?.toLowerCase().includes(q);
    const matchCat = !catFilter || ad.category === catFilter;
    return matchQ && matchCat;
  });
  const categories = [...new Set(ads.map(a => a.category).filter(Boolean))];

  const isSelf = currentUser?._id === sellerId || currentUser?.id === sellerId;
  const canContact = seller?.contactMode === 'direct';

  // Handle ad click → open rate sheet if user has chatted, else navigate to ad
  const handleAdClick = (ad) => {
    navigate(`/ads/${ad._id}`);
  };

  // Submit rating
  const submitRating = async () => {
    if (!rateAd || rateStars === 0) { toast.error('Please select a star rating'); return; }
    setRatingLoading(true);
    try {
      await api.post(`/ratings/${rateAd._id}`, { stars: rateStars, comment: rateComment });
      toast.success('Rating submitted! ⭐');
      setShowRateSheet(false);
      setRateStars(0); setRateComment(''); setRateAd(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  const startChat = async () => {
    if (!currentUser) { navigate('/login'); return; }
    try {
      const { data } = await api.post('/chat', { sellerId, adId: ads[0]?._id });
      navigate(`/chat/${data._id}`);
    } catch { toast.error('Could not start chat'); }
  };

  if (loading) {
    return (
      <div className="page page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
          <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="page page-enter" style={{ paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(160deg,#0f1d45,#1a2b5f 60%,#243680)',
        padding: '52px 20px 24px',
      }}>
        <button onClick={() => navigate(-1)} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex', marginBottom: 20 }}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#f5c518,#e0b200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#1a2b5f', flexShrink: 0, boxShadow: '0 4px 16px rgba(245,197,24,0.4)' }}>
            {(seller.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.1, marginBottom: 2 }}>
              {seller.businessName || seller.name}
            </p>
            {seller.businessName && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{seller.name}</p>
            )}
            <StarRow avg={seller.ratingAvg || 0} count={seller.ratingCount || 0} />
            {seller.location?.city && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {seller.location.city}{seller.location.area ? `, ${seller.location.area}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
          {[
            { label: 'Ads Posted', value: ads.length },
            { label: 'Reviews', value: ratings.length },
            { label: 'Avg Rating', value: seller.ratingAvg > 0 ? `⭐${seller.ratingAvg.toFixed(1)}` : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={startChat}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}
            >
              <MessageCircle size={16} /> Chat
            </button>
            {canContact && (
              <a
                href={`tel:${seller.phone}`}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f5c518', color: '#1a2b5f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 13, textDecoration: 'none' }}
              >
                <Phone size={16} /> Call
              </a>
            )}
            {seller.whatsappAvailable && (
              <a
                href={`https://wa.me/${seller.phone?.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#25d366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 13, textDecoration: 'none' }}
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--border)' }}>
        {['ads','reviews'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ flex: 1, padding: '14px', fontWeight: 700, fontSize: 14, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? 'var(--navy)' : 'var(--text-muted)', borderBottom: `2.5px solid ${tab === t ? 'var(--navy)' : 'transparent'}`, textTransform: 'capitalize', transition: 'color 0.2s' }}
          >
            {t === 'ads' ? `Listings (${ads.length})` : `Reviews (${ratings.length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {/* ── Ads tab ── */}
        {tab === 'ads' && (
          <>
            {/* Search + filter */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 12, border: '1.5px solid var(--border)', padding: '0 12px', gap: 8, marginBottom: 10 }}>
                <Search size={15} color="#9ca3af" />
                <input
                  placeholder="Search listings..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '11px 0', fontSize: 14, background: 'transparent' }}
                />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={14} /></button>}
              </div>
              {categories.length > 1 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                  <button onClick={() => setCatFilter('')} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${!catFilter ? 'var(--navy)' : 'var(--border)'}`, background: !catFilter ? '#f0f3fc' : 'white', fontSize: 12, fontWeight: 600, color: !catFilter ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                    All
                  </button>
                  {categories.map(c => (
                    <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${catFilter === c ? 'var(--navy)' : 'var(--border)'}`, background: catFilter === c ? '#f0f3fc' : 'white', fontSize: 12, fontWeight: 600, color: catFilter === c ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredAds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
                <p style={{ fontWeight: 700, color: 'var(--navy)' }}>No listings found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filteredAds.map(ad => <MiniAdCard key={ad._id} ad={ad} onAdClick={handleAdClick} />)}
              </div>
            )}
          </>
        )}

        {/* ── Reviews tab ── */}
        {tab === 'reviews' && (
          <>
            {/* Rate button */}
            {!isSelf && currentUser && ads.length > 0 && (
              <button
                onClick={() => { setRateAd(ads[0]); setShowRateSheet(true); }}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: '2px dashed var(--navy)', background: '#f0f3fc', color: 'var(--navy)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Star size={16} /> Rate this Seller
              </button>
            )}

            {ratings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>⭐</p>
                <p style={{ fontWeight: 700, color: 'var(--navy)' }}>No reviews yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Be the first to leave a review after chatting!</p>
              </div>
            ) : (
              ratings.map(r => (
                <div key={r._id} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
                      {(r.reviewerId?.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#1a2b5f' }}>{r.reviewerId?.name || 'User'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s <= r.stars ? '#f5c518' : 'none'} color={s <= r.stars ? '#f5c518' : '#d1d5db'} />)}
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  {r.adId?.title && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Re: {r.adId.title}</p>}
                  {r.comment && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{r.comment}</p>}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Rating Bottom Sheet ── */}
      {showRateSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRateSheet(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', textAlign: 'center', marginBottom: 6 }}>Rate {seller.businessName || seller.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>How was your experience?</p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <StarPicker value={rateStars} onChange={setRateStars} />
            </div>

            {rateStars > 0 && (
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--navy)', fontWeight: 600, marginBottom: 16 }}>
                {['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Very Good 😊', 'Excellent 🤩'][rateStars]}
              </p>
            )}

            <textarea
              className="form-input"
              rows={3}
              placeholder="Write your review (optional)..."
              value={rateComment}
              onChange={e => setRateComment(e.target.value)}
              style={{ marginBottom: 16, resize: 'none' }}
            />

            <button
              onClick={submitRating}
              disabled={ratingLoading || rateStars === 0}
              className="btn btn-primary"
              style={{ borderRadius: 50, fontWeight: 800, opacity: (ratingLoading || rateStars === 0) ? 0.5 : 1 }}
            >
              {ratingLoading ? 'Submitting...' : '⭐ Submit Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
