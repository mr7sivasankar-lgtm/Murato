import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, ChevronRight, Navigation } from 'lucide-react';
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
  'Machines & Equipment': '⚙️', 'Software': '💻',
};

// Haversine distance
function distKm(c1, c2) {
  if (!c1 || !c2 || (c1[0] === 0 && c1[1] === 0) || (c2[0] === 0 && c2[1] === 0)) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const [lng1, lat1] = c1, [lng2, lat2] = c2;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const StarRow = ({ avg = 0, count = 0, size = 11 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={size} fill={s <= Math.round(avg) ? '#f5c518' : 'none'} color={s <= Math.round(avg) ? '#f5c518' : '#e5e7eb'} />
    ))}
    {count > 0 && <span style={{ fontSize: size - 1, color: '#9ca3af', marginLeft: 3 }}>({count})</span>}
  </div>
);

export default function AdCard({ ad, onFavToggle, compact = false }) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [faved, setFaved] = useState(ad.isFavorited || false);

  const seller     = ad.userId || {};
  const priceLabel = PRICE_TYPE_LABELS[ad.priceType] || '';
  const isService  = ad.type === 'service';

  // All categories: prefer ad.categories (comma-sep), fallback to ad.category
  const allCategories = ad.categories
    ? ad.categories.split(',').map(c => c.trim()).filter(Boolean)
    : (ad.category ? [ad.category] : []);

  const userCoords = user?.location?.coordinates;
  const adCoords   = ad.location?.coordinates;
  const km = !isService ? distKm(userCoords, adCoords) : null;

  const handleFav = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/ads/${ad._id}/favorite`); setFaved(!faved); onFavToggle?.(ad._id); }
    catch {}
  };
  const handleCardClick = () => navigate(`/ads/${ad._id}`);
  const handleSellerClick = (e) => {
    e.stopPropagation();
    const id = ad.userId?._id || ad.userId;
    if (id) navigate(`/seller/${id}`);
  };

  const imgH = compact ? 80 : 110;
  const sellerName = ad.businessName || seller.businessName || seller.name || 'Seller';

  return (
    <div
      onClick={handleCardClick}
      style={{
        background: 'white',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(124,58,237,0.08)',
        cursor: 'pointer',
        transition: 'transform 0.18s, box-shadow 0.18s',
        position: 'relative',
        border: '1px solid rgba(124,58,237,0.07)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(124,58,237,0.08)'; }}
    >
      {/* ── Image ── */}
      {ad.images?.[0] ? (
        <img
          src={ad.images[0]}
          alt={ad.title}
          style={{ width: '100%', height: imgH, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: imgH,
          background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>
          {CAT_ICONS[ad.category] || (isService ? '🔧' : '📦')}
        </div>
      )}

      {/* FEATURED badge on image */}
      {ad.isFeatured && (
        <span style={{
          position: 'absolute', top: 7, left: 7,
          background: '#f5c518', color: '#1a2b5f',
          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
        }}>⭐ FEATURED</span>
      )}

      {/* Fav button */}
      <button
        onClick={handleFav}
        style={{
          position: 'absolute', top: 7, right: 7,
          background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%',
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        <Heart size={13} fill={faved ? '#ef4444' : 'none'} color={faved ? '#ef4444' : '#9ca3af'} />
      </button>

      {/* ── Card Body ── */}
      <div style={{ padding: compact ? '8px 9px 9px' : '10px 11px 11px' }}>

        {/* Seller name + verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <p style={{
            fontSize: compact ? 12 : 13, fontWeight: 700, color: '#1a1a2e',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {sellerName}
          </p>
          <span style={{ fontSize: 11, color: '#3b82f6', flexShrink: 0 }}>✅</span>
        </div>

        {/* Stars + Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
          {seller.ratingAvg > 0
            ? <StarRow avg={seller.ratingAvg} count={seller.ratingCount} />
            : <StarRow avg={4} count={0} />
          }
          {ad.location?.city && (
            <span style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 2 }}>
              <MapPin size={9} /> {ad.location.city}
            </span>
          )}
          {km !== null && (
            <span style={{ fontSize: 9, color: '#7c3aed', background: '#f3f0ff', padding: '1px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Navigation size={7} /> {km < 1 ? '<1' : Math.round(km)} km
            </span>
          )}
        </div>

        {/* Category chips — ALL categories in bold */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
          {allCategories.map((cat, i) => (
            <span
              key={i}
              style={{
                fontSize: 10, fontWeight: 700, color: '#5b21b6',
                background: '#ede9fe', padding: '2px 7px', borderRadius: 20,
                display: 'inline-flex', alignItems: 'center', gap: 2,
                whiteSpace: 'nowrap',
              }}
            >
              {CAT_ICONS[cat] || '🏠'} {cat}
            </span>
          ))}
          {/* Title shown after categories */}
          <p style={{
            width: '100%', fontSize: 11, fontWeight: 500, color: '#6b7280',
            lineHeight: 1.3, marginTop: 2,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          }}>
            {ad.title}
          </p>
        </div>

        {/* Price + View Profile button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div>
            <span style={{ fontSize: compact ? 14 : 15, fontWeight: 900, color: '#1a2b5f' }}>
              ₹{Number(ad.price).toLocaleString('en-IN')}
            </span>
            {priceLabel && <span style={{ fontSize: 9, color: '#9ca3af', marginLeft: 3 }}>{priceLabel}</span>}
          </div>
          <button
            onClick={handleSellerClick}
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              color: 'white', border: 'none', borderRadius: 20,
              padding: compact ? '4px 8px' : '5px 10px',
              fontSize: compact ? 9 : 10, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            View Profile <ChevronRight size={10} />
          </button>
        </div>

        {/* NEGO + Type badges inline at bottom */}
        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: isService ? '#7c3aed' : '#1a2b5f',
            background: isService ? '#ede9fe' : '#eef2ff',
            padding: '2px 6px', borderRadius: 4,
          }}>
            {isService ? '🔧 SERVICE' : '📦 MATERIAL'}
          </span>
          {ad.negotiable && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: 4 }}>NEGO</span>
          )}
          <span style={{ fontSize: 9, color: '#9ca3af', marginLeft: 'auto' }}>
            {new Date(ad.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </div>
  );
}
