import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, MapPin, Phone,
  Eye, Calendar, Share2, Star, Package, Wrench,
  Truck, CheckCircle, ChevronRight,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { PRICE_TYPE_LABELS, UNIT_LABELS } from '../data/categories';
import toast from 'react-hot-toast';

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--navy)', display: 'flex', flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{value}</span>
    </div>
  );
}

export default function AdDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad,          setAd]          = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [imgIdx,      setImgIdx]      = useState(0);
  const [faved,       setFaved]       = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { fetchAd(); }, [id]);

  const fetchAd = async () => {
    try {
      const { data } = await api.get(`/ads/${id}`);
      setAd(data);
    } catch { toast.error('Ad not found'); navigate(-1); }
    finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!user) return navigate('/login');
    if (ad.userId?._id === user._id) return toast('This is your own ad!');
    setChatLoading(true);
    try {
      const { data } = await api.post('/chat/start', { sellerId: ad.userId._id, adId: ad._id });
      navigate(`/chat/${data._id}`);
    } catch { toast.error('Could not start chat'); }
    finally { setChatLoading(false); }
  };

  const handleFav = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/ads/${id}/favorite`);
      setFaved(!faved);
      toast.success(faved ? 'Removed' : '❤️ Saved');
    } catch {}
  };

  if (loading) return <div className="spinner" />;
  if (!ad) return null;

  const seller      = ad.userId || {};
  const isOwner     = user && (seller._id === user._id || seller._id === user.id);
  const canCall     = ad.contactMode === 'direct' || seller.contactMode === 'direct';
  const canWhatsApp = ad.whatsappAvailable || seller.whatsappAvailable;
  const priceLabel  = PRICE_TYPE_LABELS[ad.priceType] || '';
  const unitLabel   = UNIT_LABELS[ad.unit] || ad.unit || '';
  const isService   = ad.type === 'service';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* Floating header */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 100, padding: '48px 20px 12px', display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)', pointerEvents: 'none' }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', pointerEvents: 'all' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleFav} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
            <Heart size={18} fill={faved ? '#ef4444' : 'none'} color={faved ? '#ef4444' : '#6b7280'} />
          </button>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', pointerEvents: 'all' }}>
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Images */}
      <div style={{ position: 'relative' }}>
        {ad.images?.length > 0 ? (
          <img src={ad.images[imgIdx]} alt={ad.title} style={{ width: '100%', height: 300, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: 300, background: 'linear-gradient(135deg, #e8edf5, #d1d9ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>
            {isService ? '🔧' : '📦'}
          </div>
        )}
        {ad.images?.length > 1 && (
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {ad.images.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 20 : 8, height: 8, borderRadius: 4, background: i === imgIdx ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', transition: 'width 0.2s' }} />
            ))}
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 56, left: 12, display: 'flex', gap: 6 }}>
          {ad.isFeatured && <span className="badge badge-featured">⭐ Featured</span>}
          <span className="badge" style={{ background: isService ? '#7c3aed' : '#1a2b5f', color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
            {isService ? <Wrench size={10} /> : <Package size={10} />} {isService ? 'SERVICE' : 'PRODUCT'}
          </span>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 20 }}>

        {/* Price + Title */}
        <div className="card" style={{ padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy)' }}>
                ₹{Number(ad.price).toLocaleString('en-IN')}
              </span>
              {priceLabel && <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginLeft: 4 }}>{priceLabel}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {ad.negotiable && <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>💬 Negotiable</span>}
              {ad.bulkDiscount && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>📦 Bulk Disc.</span>}
            </div>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{ad.title}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Show ALL selected categories */}
            {(ad.categories
              ? ad.categories.split(',').map(c => c.trim()).filter(Boolean)
              : [ad.category]
            ).map((cat, i) => (
              <span key={i} className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 800, fontSize: 12 }}>
                {cat}
              </span>
            ))}
            {ad.subcategory && <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{ad.subcategory}</span>}
            {!isService && ad.condition && <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{ad.condition === 'used' ? '🔄 Used' : '✨ New'}</span>}
          </div>
        </div>

        {/* Quick info row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {ad.location?.city && (
            <div style={{ background: 'white', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, boxShadow: 'var(--shadow-sm)', fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
              <MapPin size={12} /> {ad.location.city}{ad.location.area ? `, ${ad.location.area}` : ''}
            </div>
          )}
          <div style={{ background: 'white', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, boxShadow: 'var(--shadow-sm)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Eye size={12} /> {ad.views} views
          </div>
          <div style={{ background: 'white', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, boxShadow: 'var(--shadow-sm)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Calendar size={12} /> {new Date(ad.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>

        {/* Product Details */}
        {!isService && (
          <div className="card" style={{ padding: 18, marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Product Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon={<Package size={14} />} label="Brand" value={ad.brand} />
              <InfoRow icon={<Package size={14} />} label="Material" value={ad.materialType} />
              <InfoRow icon={<Package size={14} />} label="Available" value={ad.quantity ? `${ad.quantity} ${unitLabel}` : null} />
              <InfoRow icon={<Package size={14} />} label="Min Order" value={ad.moq > 1 ? `${ad.moq} ${unitLabel}` : null} />
            </div>
            {/* Delivery */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {ad.deliveryAvailable && (
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={13} /> Delivery{ad.deliveryCharges === 0 ? ' Free' : ` ₹${ad.deliveryCharges}`}
                  {ad.deliveryTime ? ` · ${ad.deliveryTime}` : ''}
                </span>
              )}
              {ad.pickupAvailable && (
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={13} /> Pickup Available
                </span>
              )}
            </div>
          </div>
        )}

        {/* Service Details */}
        {isService && (
          <div className="card" style={{ padding: 18, marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Service Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon={<Wrench size={14} />} label="Experience" value={ad.experienceYears ? `${ad.experienceYears} years` : null} />
              <InfoRow icon={<Wrench size={14} />} label="Team Size" value={ad.teamSize > 1 ? `${ad.teamSize} workers` : null} />
              <InfoRow icon={<Wrench size={14} />} label="Projects Done" value={ad.projectsDone ? `${ad.projectsDone}+` : null} />
              <InfoRow icon={<Wrench size={14} />} label="Service Radius" value={ad.serviceRadius ? `${ad.serviceRadius} km` : null} />
            </div>
            {ad.skills?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ad.skills.map(s => (
                  <span key={s} style={{ fontSize: 11, background: '#f0f3fc', color: 'var(--navy)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
            {ad.languages?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>🗣️ Languages Spoken</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ad.languages.map(lang => (
                    <span key={lang} style={{ fontSize: 12, fontWeight: 600, color: '#6d28d9', background: '#ede9fe', padding: '4px 12px', borderRadius: 20 }}>{lang}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {ad.travelAvailable && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✈️ Travel Ready</span>}
              {ad.materialIncluded && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>📦 Material Included</span>}
              {ad.urgentWork && <span style={{ fontSize: 12, color: '#f5c518', fontWeight: 600 }}>⚡ Urgent OK</span>}
            </div>
          </div>
        )}

        {/* Description */}
        {ad.description && (
          <div className="card" style={{ padding: 18, marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>About this {isService ? 'Service' : 'Product'}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{ad.description}</p>
          </div>
        )}

        {/* Seller card → links to SellerProfilePage */}
        <div
          className="card"
          style={{ padding: 18, marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          onClick={() => navigate(`/seller/${seller._id}`)}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #1a2b5f, #243680)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', flexShrink: 0 }}>
            {(ad.businessName || seller.businessName || seller.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{ad.businessName || seller.businessName || seller.name}</p>
            {seller.ratingAvg > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s <= Math.round(seller.ratingAvg) ? '#f5c518' : 'none'} color={s <= Math.round(seller.ratingAvg) ? '#f5c518' : '#d1d5db'} />)}
                <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 2 }}>{seller.ratingAvg.toFixed(1)} ({seller.ratingCount})</span>
              </div>
            )}
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>View profile & all listings →</p>
          </div>
          <ChevronRight size={16} color="#9ca3af" />
        </div>
      </div>

      {/* ── Bottom CTAs ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'white',
        borderTop: '1px solid var(--border)', padding: '14px 20px',
        display: 'flex', gap: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        zIndex: 200,
      }}>
        {isOwner ? (
          /* Owner: Edit or View own profile */
          <>
            <button
              onClick={() => navigate('/my-ads')}
              className="btn"
              style={{ flex: 1, borderRadius: 50, background: '#f3f4f6', color: 'var(--text-secondary)', fontWeight: 700 }}
            >
              My Ads
            </button>
            <button
              onClick={() => navigate('/sell', { state: { ad } })}
              className="btn btn-primary"
              style={{ flex: 2, borderRadius: 50 }}
            >
              ✏️ Edit Ad
            </button>
          </>
        ) : (
          /* Non-owner: Chat always + Call/WhatsApp if allowed */
          <>
            {/* Chat — always visible */}
            <button
              className="btn btn-primary"
              style={{ flex: canCall || canWhatsApp ? 2 : 3, borderRadius: 50 }}
              onClick={handleChat}
              disabled={chatLoading}
            >
              <MessageCircle size={16} />
              {chatLoading ? 'Opening...' : 'Chat Now'}
            </button>

            {/* Call — only if seller allows direct calls */}
            {canCall && (
              <a
                href={`tel:${seller.phone}`}
                className="btn btn-outline"
                style={{ flex: 1, borderRadius: 50 }}
              >
                <Phone size={16} /> Call
              </a>
            )}

            {/* WhatsApp — only if seller enabled it */}
            {canWhatsApp && (
              <a
                href={`https://wa.me/${seller.phone?.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                style={{
                  flex: 1, padding: '13px', borderRadius: 50,
                  background: '#25d366', color: 'white', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, fontSize: 14, textDecoration: 'none',
                }}
              >
                💬 WA
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
