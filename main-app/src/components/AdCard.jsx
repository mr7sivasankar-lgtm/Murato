import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, Package, Wrench, ChevronRight, Navigation } from 'lucide-react';
import { PRICE_TYPE_LABELS } from '../data/categories';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const CAT_ICONS = {
  'Cement': '🧱', 'Steel': '🔩', 'Bricks & Blocks': '🏗️',
  'Sand & Aggregates': '🏖️', 'Tiles & Flooring': '🪟', 'Electrical': '⚡',
  'Plumbing': '🔧', 'Paint & Chemicals': '🎨', 'Wood & Plywood': '🪵',
  'Tools & Equipment': '🛠️', 'Doors & Windows': '🚪', 'Crushed Stones': '🪨',
  'Mason (Mestri)': '👷', 'Contractor': '🏗️', 'Carpenter': '🪵',
  'Electrician': '⚡', 'Plumber': '🔧', 'Painter': '🎨',
  'Tile Worker': '🏠', 'Welder': '🔩', 'Labor / Helpers': '👷',
  'Interior Designer': '🛋️', 'Architect': '📐', 'Fabricator': '⚙️',
};

// Haversine distance in km between two [lng, lat] coordinate pairs
function distKm(c1, c2) {
  if (!c1 || !c2 || (c1[0] === 0 && c1[1] === 0) || (c2[0] === 0 && c2[1] === 0)) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const [lng1, lat1] = c1, [lng2, lat2] = c2;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const StarRow = ({ avg = 0, count = 0, size = 11 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size} fill={s <= Math.round(avg) ? '#f5c518' : 'none'} color={s <= Math.round(avg) ? '#f5c518' : '#d1d5db'} />
    ))}
    {count > 0 && <span style={{ fontSize: size - 1, color: '#6b7280', marginLeft: 2 }}>({count})</span>}
  </div>
);

export default function AdCard({ ad, onFavToggle, compact = false }) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [faved, setFaved] = useState(ad.isFavorited || false);

  const seller     = ad.userId || {};
  const priceLabel = PRICE_TYPE_LABELS[ad.priceType] || '';
  const catIcon    = CAT_ICONS[ad.category] || '🏠';
  const isService  = ad.type === 'service';

  // All categories: prefer ad.categories (comma-separated), fallback to ad.category
  const allCategories = ad.categories
    ? ad.categories.split(',').map(c => c.trim()).filter(Boolean)
    : (ad.category ? [ad.category] : []);

  // Distance from user to seller (product ads only, not workers)
  const userCoords = user?.location?.coordinates;
  const adCoords   = ad.location?.coordinates;
  const km = !isService ? distKm(userCoords, adCoords) : null;

  const handleFav = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/ads/${ad._id}/favorite`); setFaved(!faved); onFavToggle?.(ad._id); }
    catch { /* not logged in */ }
  };

  // Card → AdDetailPage
  const handleCardClick = () => navigate(`/ads/${ad._id}`);

  // Seller row → SellerProfilePage (stops card click propagating)
  const handleSellerClick = (e) => {
    e.stopPropagation();
    const sellerId = ad.userId?._id || ad.userId;
    if (sellerId) navigate(`/seller/${sellerId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'white', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer',
        transition: 'transform 0.18s, box-shadow 0.18s', position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
    >
      {/* ── Image ─────────────────────────────────────── */}
      {ad.images?.[0] ? (
        <img
          src={ad.images[0]}
          alt={ad.title}
          style={{
            width: '100%',
            aspectRatio: '4/3',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            background: '#f8f9fb',
          }}
        />
      ) : (
        <div style={{ width: '100%', aspectRatio: '4/3', background: 'linear-gradient(135deg,#e8edf5,#d1d9ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
          {catIcon}
        </div>
      )}

      {/* ── Featured badge (top-left) — only FEATURED stays on image ── */}
      {ad.isFeatured && (
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ background: '#f5c518', color: '#1a2b5f', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Star size={8} fill="#1a2b5f" color="#1a2b5f" /> FEATURED
          </span>
        </div>
      )}

      {/* ── Fav button (top-right) ── */}
      <button
        onClick={handleFav}
        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        <Heart size={14} fill={faved ? '#ef4444' : 'none'} color={faved ? '#ef4444' : '#9ca3af'} />
      </button>

      {/* ── Body ──────────────────────────────────────── */}
      <div style={{ padding: '10px 10px 8px' }}>

        {/* FIX 5: Service/Product tag + NEGO moved HERE (below image, inside body) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            background: isService ? '#7c3aed' : '#1a2b5f',
            color: 'white', fontSize: 9, fontWeight: 700,
            padding: '3px 7px', borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            {isService ? <Wrench size={8} /> : <Package size={8} />}
            {isService ? 'SERVICE' : 'MATERIAL'}
          </span>
          {ad.negotiable && (
            <span style={{ background: '#10b981', color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 6 }}>NEGO</span>
          )}
        </div>

        {/* FIX 2: All categories in bold chips — wrap if multiple */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
          {allCategories.map((cat, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 800,          // ← Bold as requested
                color: '#1a2b5f',
                background: '#eef2ff',
                padding: '2px 7px',
                borderRadius: 5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {CAT_ICONS[cat] || '🏠'} {cat}
              {i === 0 && ad.subcategory ? <span style={{ fontWeight: 500, color: '#6b7280' }}> · {ad.subcategory}</span> : null}
            </span>
          ))}
        </div>

        {/* Title — clearly visible */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {ad.title}
        </p>

        {/* Brand */}
        {ad.brand && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Brand: <strong style={{ color: '#1a2b5f' }}>{ad.brand}</strong></p>}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#1a2b5f' }}>₹{Number(ad.price).toLocaleString('en-IN')}</span>
          {priceLabel && <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{priceLabel}</span>}
        </div>

        {/* Location + date + distance */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {ad.location?.city && (
              <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={10} /> {ad.location.city}{ad.location.area ? `, ${ad.location.area}` : ''}
              </span>
            )}
            {km !== null ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f3f0ff', padding: '1px 6px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Navigation size={8} /> {km < 1 ? '<1' : Math.round(km)} km
              </span>
            ) : (!isService && (
              <span style={{ fontSize: 9, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Navigation size={8} /> No GPS
              </span>
            ))}
          </div>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>
            {new Date(ad.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Seller row — tap to view seller profile */}
        <div
          onClick={handleSellerClick}
          style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#1a2b5f,#243680)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700, flexShrink: 0 }}>
              {(ad.businessName || seller.businessName || seller.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#1a2b5f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ad.businessName || seller.businessName || seller.name || 'Seller'}
              </p>
              {(seller.ratingAvg > 0) && <StarRow avg={seller.ratingAvg} count={seller.ratingCount} />}
            </div>
          </div>
          <ChevronRight size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}

export { StarRow };
