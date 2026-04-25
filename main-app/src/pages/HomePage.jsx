import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PRODUCT_CATEGORIES } from '../data/categories';
import LocationPicker from '../components/LocationPicker';
import api from '../api/axios';
import AdCard from '../components/AdCard';

/* ── Admin Banner Carousel ── */

function BannerCarousel({ banners, navigate }) {
  const [active, setActive] = useState(0);
  const timer = useRef(null);
  const touchStartX = useRef(null);

  const goTo = (i) => setActive(i);

  const next = () => setActive(prev => (prev + 1) % banners.length);
  const prev = () => setActive(prev => (prev - 1 + banners.length) % banners.length);

  // Auto-rotate every 3.5s — left to right (decreasing index = new slide from left)
  useEffect(() => {
    if (banners.length <= 1) return;
    timer.current = setInterval(prev, 3500);
    return () => clearInterval(timer.current);
  }, [banners.length]);

  // Swipe support
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  return (
    // FIX 3: outer wrapper has NO overflow:hidden so dots below are visible
    <div>
      {/* Slide track — overflow:hidden only around the images */}
      <div style={{ overflow: 'hidden', borderRadius: 20 }}>
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            display: 'flex',
            transform: `translateX(-${active * 100}%)`,
            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {banners.map(banner => (
            <div
              key={banner._id}
              onClick={() => {
                if (banner.externalUrl) {
                  window.open(banner.externalUrl, '_blank', 'noopener,noreferrer');
                } else if (banner.targetUserId) {
                  navigate(`/seller/${banner.targetUserId?._id || banner.targetUserId}`);
                }
              }}
              style={{
                flex: '0 0 100%', minWidth: '100%',
                height: 160,          // ← exact banner height (1200×375 → 16:5 ratio at mobile width)
                cursor: (banner.externalUrl || banner.targetUserId) ? 'pointer' : 'default',
                overflow: 'hidden', background: '#fff', userSelect: 'none',
              }}
            >
              <img
                src={banner.imageUrl}
                alt="Promotion"
                draggable="false"
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', pointerEvents: 'none' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* FIX 3: Dot indicators OUTSIDE the clipping container — render below the banner */}
      {banners.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {banners.map((_, i) => (
            <button
              key={i} onClick={() => goTo(i)}
              style={{
                width: active === i ? 20 : 7, height: 7,
                borderRadius: 4, border: 'none', padding: 0, cursor: 'pointer',
                background: active === i ? 'var(--navy)' : 'var(--border)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}



export default function HomePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('');
  const [ads,       setAds]       = useState([]);
  const [featured,  setFeatured]  = useState([]);
  const [banners,   setBanners]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocPicker, setShowLocPicker] = useState(false);

  // Location: prefer GPS-detected, fallback to user profile
  const [displayCity, setDisplayCity] = useState(user?.location?.city || '');
  const [locLoading, setLocLoading] = useState(false);

  // Auto-detect GPS on mount — use Capacitor Geolocation on Android for proper permission prompt
  useEffect(() => {
    const detectLocation = async () => {
      setLocLoading(true);
      try {
        let lat, lng;

        // Try Capacitor Geolocation first (proper Android permission dialog)
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: false });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback to browser geolocation (web)
          if (!navigator.geolocation) {
            setDisplayCity(user?.location?.city || 'Set Location');
            setLocLoading(false);
            return;
          }
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
        );
        const d = await res.json();
        const a = d.address || {};
        const city = a.city || a.town || a.village || a.county || user?.location?.city || '';
        setDisplayCity(city);
      } catch {
        setDisplayCity(user?.location?.city || 'Set Location');
      } finally {
        setLocLoading(false);
      }
    };
    detectLocation();
  }, []);

  useEffect(() => { fetchAds(); }, [activeCategory, displayCity]);
  useEffect(() => { fetchFeatured(); }, []);
  useEffect(() => { fetchBanners(); }, [displayCity]); // re-fetch when GPS city resolves

  const fetchBanners = async () => {
    try {
      // Pass city so backend returns city-specific + universal banners
      const params = {};
      if (displayCity && displayCity !== 'Set Location') params.city = displayCity;
      const { data } = await api.get('/banners', { params });
      setBanners(data || []);
    } catch { setBanners([]); }
  };

  const fetchAds = async () => {
    try {
      setLoading(true);
      const params = { limit: 20 };
      if (activeCategory) params.category = activeCategory;
      if (displayCity && displayCity !== 'Set Location') params.city = displayCity;
      const { data } = await api.get('/ads', { params });
      setAds(data.ads || []);
    } catch { setAds([]); }
    finally { setLoading(false); }
  };

  const fetchFeatured = async () => {
    try { const { data } = await api.get('/ads/featured'); setFeatured(data || []); }
    catch { setFeatured([]); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleLocationSelect = ({ city, area }) => {
    setDisplayCity(city);
    if (updateUser) updateUser({ location: { ...user?.location, city, area } });
  };

  return (
    <div className="page page-enter">

      {/* ===== HEADER ===== */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>

          {/* Left: Location (clickable → opens picker) */}
          <button
            onClick={() => setShowLocPicker(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <MapPin size={18} color="var(--navy)" strokeWidth={2.5} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('locationLabel')}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                {locLoading
                  ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> {t('detecting')}</>
                  : <>{displayCity || t('setLocation')} <ChevronRight size={10} /></>
                }
              </div>
            </div>
          </button>

          {/* Center: Brand */}
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)', letterSpacing: '-0.5px' }}>Murato</span>

          {/* Right: greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              background: 'var(--navy)', color: 'white',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 13, fontWeight: 700, letterSpacing: 0.2,
              whiteSpace: 'nowrap',
            }}>
              Hi, {user?.name?.split(' ')[0] || 'User'} 👋
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>


      {/* ── Admin Banners Carousel ── */}
      {banners.length > 0 && (
        <div style={{ margin: '12px 16px', borderRadius: 20, boxShadow: '0 4px 20px rgba(26,43,95,0.13)' }}>
          <BannerCarousel banners={banners} navigate={navigate} />
        </div>
      )}

      {/* Categories */}
      <div style={{ margin: '0 16px 16px', borderRadius: 20, border: '1px solid rgba(124,58,237,0.08)', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 16px rgba(124,58,237,0.08)' }}>
        <div style={{ padding: '0 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('browseCategories')} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{PRODUCT_CATEGORIES.length}+</span>
          </p>
          <button className="see-more">{t('seeAll')}</button>
        </div>
        <div className="category-scroll">
          {PRODUCT_CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className={`cat-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat.name ? '' : cat.name)}
            >
              <div className="cat-circle">
                {cat.img ? (
                  <img
                    src={cat.img}
                    alt={cat.name}
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = `<span style="font-size:26px">${cat.emoji || '📦'}</span>`;
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 26 }}>{cat.emoji || '📦'}</span>
                )}
              </div>
              <span className="cat-label">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        {/* Featured */}
        {featured.length > 0 && (
          <div className="section">
            <div className="section-header">
              <p className="section-title">Featured <span>{featured.length}+</span></p>
              <button className="see-more" onClick={() => navigate('/search?featured=true')}>See all</button>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginLeft: -2, paddingLeft: 2 }}>
              {featured.map((ad) => (
                <div key={ad._id} style={{ minWidth: 175, flexShrink: 0 }}>
                  <AdCard ad={ad} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Ads */}
        <div className="section">
          <div className="section-header">
            <p className="section-title">
              {activeCategory ? activeCategory : displayCity ? `${t('near')} ${displayCity}` : 'All Listings'}{' '}
              <span>{ads.length}+</span>
            </p>
            <button className="see-more" onClick={() => navigate('/search')}>{t('seeAll')}</button>
          </div>

          {loading ? (
            <div className="ads-grid">
              {[1,2,3,4].map(i => (
                <div key={i}>
                  <div className="skeleton" style={{ height: 160, borderRadius: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 16, width: '50%' }} />
                </div>
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏗️</div>
              <p className="empty-title">{t('noListings')}</p>
              <p className="empty-subtitle">{t('beFirst')}</p>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => navigate('/sell')}>{t('postAd')}</button>
            </div>
          ) : (
            <div className="ads-grid">
              {ads.map((ad) => <AdCard key={ad._id} ad={ad} />)}
            </div>
          )}
        </div>
      </div>

      {/* Trust bar — matches reference image */}
      <div className="container">
        <div className="trust-bar">
          {[
            { icon: '🛡️', label: '100% Verified\nProfessionals' },
            { icon: '🔒', label: 'Secure\nPayments' },
            { icon: '⏱️', label: 'On-time\nDelivery' },
            { icon: '🎧', label: '24/7\nSupport' },
          ].map(item => (
            <div key={item.label} className="trust-item">
              <div className="trust-icon">{item.icon}</div>
              <span className="trust-label" style={{ whiteSpace: 'pre-line' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location Picker */}
      <LocationPicker
        isOpen={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onSelect={handleLocationSelect}
        currentCity={displayCity}
      />
    </div>
  );
}
