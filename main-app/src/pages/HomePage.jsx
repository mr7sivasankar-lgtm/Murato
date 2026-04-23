import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Loader } from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_CATEGORIES } from '../data/categories';
import LocationPicker from '../components/LocationPicker';
import api from '../api/axios';
import AdCard from '../components/AdCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState('');
  const [ads,       setAds]       = useState([]);
  const [featured,  setFeatured]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocPicker, setShowLocPicker] = useState(false);

  // Location: prefer GPS-detected, fallback to user profile
  const [displayCity, setDisplayCity] = useState(user?.location?.city || '');
  const [locLoading, setLocLoading] = useState(false);

  // Auto-detect GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setDisplayCity(user?.location?.city || 'Set Location');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
          );
          const d = await res.json();
          const a = d.address || {};
          const city = a.city || a.town || a.village || a.county || user?.location?.city || '';
          setDisplayCity(city);
        } catch {
          setDisplayCity(user?.location?.city || 'Set Location');
        } finally { setLocLoading(false); }
      },
      () => {
        setDisplayCity(user?.location?.city || 'Set Location');
        setLocLoading(false);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => { fetchAds(); }, [activeCategory, displayCity]);
  useEffect(() => { fetchFeatured(); }, []);

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
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                {locLoading
                  ? <><Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Detecting...</>
                  : <>{displayCity || 'Set Location'} <ChevronRight size={10} /></>
                }
              </div>
            </div>
          </button>

          {/* Center: Brand */}
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy)', letterSpacing: '-0.5px' }}>Murato</span>

          {/* Right: spacer */}
          <div style={{ width: 60 }} />
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input
              placeholder='Search "cement near me"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Hero */}
      <div className="container" style={{ paddingTop: 16 }}>
        <div className="hero-banner">
          <div className="hero-text">
            <p className="hero-title">Build Your<br />Dream Project</p>
            <p className="hero-sub">Cement · Steel · Sand · Machines<br />near you</p>
            <button className="hero-btn" onClick={() => navigate('/sell')}>Post Ad</button>
          </div>
          <div className="hero-lottie">
            <Player autoplay loop src="https://assets5.lottiefiles.com/packages/lf20_p8bfn5za.json" style={{ height: 155, width: 155 }} />
          </div>
        </div>
      </div>

      {/* Categories — full page width */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ padding: '0 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            Browse Categories <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>{PRODUCT_CATEGORIES.length}+</span>
          </p>
          <button className="see-more">See all</button>
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
              {activeCategory ? activeCategory : displayCity ? `Near ${displayCity}` : 'All Listings'}{' '}
              <span>{ads.length}+</span>
            </p>
            <button className="see-more" onClick={() => navigate('/search')}>See all</button>
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
              <p className="empty-title">No listings yet</p>
              <p className="empty-subtitle">Be the first to post{activeCategory ? ` a ${activeCategory}` : ''}!</p>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => navigate('/sell')}>Post Ad</button>
            </div>
          ) : (
            <div className="ads-grid">
              {ads.map((ad) => <AdCard key={ad._id} ad={ad} />)}
            </div>
          )}
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
