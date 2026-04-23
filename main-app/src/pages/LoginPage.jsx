import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ArrowLeft, Phone, User, CheckCircle, Search, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// Fix Leaflet marker icon for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_POS = { lat: 17.385, lng: 78.4867 }; // Hyderabad

/* ── Map helpers ────────────────────────────────────── */
function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([position.lat, position.lng], 15, { animate: true, duration: 0.8 });
  }, [position.lat, position.lng]);
  return null;
}

function DraggableMarker({ position, onMove }) {
  const markerRef = useRef(null);
  useMapEvents({ click(e) { onMove(e.latlng); } });
  return (
    <Marker
      draggable
      position={[position.lat, position.lng]}
      ref={markerRef}
      eventHandlers={{ dragend() { const m = markerRef.current; if (m) onMove(m.getLatLng()); } }}
    />
  );
}

/* ── Main component ─────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loginDirect } = useAuth();
  useEffect(() => { if (user) navigate('/'); }, [user]);

  /* step: 0 = phone+name form, 1 = location picker */
  const [step, setStep]         = useState(0);
  const [phone, setPhone]       = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);

  /* location state */
  const [position,        setPosition]        = useState(DEFAULT_POS);
  const [address,         setAddress]         = useState({ city: '', area: '', full: '' });
  const [detecting,       setDetecting]       = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  /* ── Reverse geocode ──────────────────────────────── */
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      const d = await r.json();
      const a = d.address || {};
      setAddress({
        city: a.city || a.town || a.village || a.county || '',
        area: a.suburb || a.neighbourhood || a.road || '',
        full: d.display_name || '',
      });
    } catch { /* silent */ }
  }, []);

  /* ── Map pin move ─────────────────────────────────── */
  const handleMove = useCallback((latlng) => {
    setPosition({ lat: latlng.lat, lng: latlng.lng });
    reverseGeocode(latlng.lat, latlng.lng);
    setShowSuggestions(false);
  }, [reverseGeocode]);

  /* ── Location search (Nominatim) ──────────────────── */
  const handleLocationSearch = (q) => {
    setSearchQuery(q);
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`
        );
        const d = await r.json();
        setSuggestions(d);
      } catch { setSuggestions([]); }
    }, 450);
  };

  const selectSuggestion = (s) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setPosition({ lat, lng });
    const a = s.address || {};
    setAddress({
      city: a.city || a.town || a.village || a.county || s.display_name.split(',')[0],
      area: a.suburb || a.neighbourhood || a.road || '',
      full: s.display_name,
    });
    setSearchQuery(s.display_name.split(',')[0]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  /* ── GPS detect ───────────────────────────────────── */
  const detectLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error('Geolocation not supported');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setPosition({ lat, lng });
        await reverseGeocode(lat, lng);
        setDetecting(false);
        if (!silent) toast.success('Location detected! 📍');
      },
      () => {
        setDetecting(false);
        if (!silent) toast.error('Could not detect — pin it manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  /* ── STEP 0: Submit phone + name ──────────────────── */
  const handleSubmit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { toast.error('Enter a valid 10-digit number'); return; }
    if (name.trim().length < 2) { toast.error('Enter your full name'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        phone: `+91${cleaned}`,
        name:  name.trim(),
      });

      localStorage.setItem('murato_token', data.token);

      if (!data.isNew) {
        // Returning user — go straight home
        loginDirect({ ...data.user, token: data.token });
        toast.success(`Welcome back, ${data.user.name}! 👋`);
        navigate('/');
      } else {
        // New user — collect location
        setStep(1);
        setTimeout(() => detectLocation(true), 600);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 1: Save location & finish ──────────────── */
  const handleFinish = async () => {
    if (!address.city && !address.area) {
      toast.error('Please set your location on the map');
      return;
    }
    try {
      const { data } = await api.put('/auth/profile', {
        name:  name.trim(),
        city:  address.city || 'Unknown',
        area:  address.area,
        lat:   position.lat,
        lng:   position.lng,
      });
      loginDirect({ ...data, token: localStorage.getItem('murato_token') });
      toast.success(`Welcome to Murato, ${name.trim()}! 🏗️`);
      navigate('/');
    } catch {
      // Fallback: save locally if backend offline
      const userData = {
        phone: `+91${phone.replace(/\D/g, '')}`,
        name:  name.trim(),
        location: { lat: position.lat, lng: position.lng, city: address.city || 'Unknown', area: address.area },
      };
      loginDirect(userData);
      toast.success(`Welcome to Murato, ${name.trim()}! 🏗️`);
      navigate('/');
    }
  };

  /* ════════════════════════════════════════════════════
     STEP 1 — Full-screen location picker
  ════════════════════════════════════════════════════ */
  if (step === 1) {
    return (
      <div style={{ position: 'relative', height: '100dvh', width: '100%', overflow: 'hidden' }}>

        {/* Map */}
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          onClick={() => setShowSuggestions(false)}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <MapController position={position} />
          <DraggableMarker position={position} onMove={handleMove} />
        </MapContainer>

        {/* ── Top search overlay ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001,
          background: 'linear-gradient(to bottom,rgba(26,43,95,0.97) 0%,rgba(26,43,95,0.75) 85%,transparent 100%)',
          padding: '52px 16px 28px',
        }}>
          {/* Back + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setStep(0)}
              style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 17, lineHeight: 1.1 }}>Set Your Location</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>
                Search · Drag pin · Tap map · or Auto-detect
              </p>
            </div>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'white', borderRadius: 14,
              padding: '0 14px', gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}>
              <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                placeholder="Search city, area, landmark..."
                value={searchQuery}
                onChange={e => handleLocationSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  padding: '13px 0', fontSize: 14,
                  color: '#1a2b5f', background: 'transparent',
                }}
              />
              {searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  onClick={() => detectLocation(false)}
                  disabled={detecting}
                  title="Auto-detect location"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: detecting ? '#9ca3af' : '#1a2b5f', display: 'flex', padding: 4 }}
                >
                  <Navigation size={17} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)',
                left: 0, right: 0, zIndex: 200,
                background: 'white', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                overflow: 'hidden', maxHeight: 260, overflowY: 'auto',
              }}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => selectSuggestion(s)}
                    style={{
                      padding: '11px 14px', cursor: 'pointer',
                      borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f3fc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <MapPin size={14} color="#1a2b5f" style={{ marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a2b5f', marginBottom: 1 }}>
                        {s.display_name.split(',')[0]}
                      </p>
                      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>
                        {s.display_name.split(',').slice(1, 4).join(',')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── GPS float button ── */}
        {!searchQuery && (
          <button
            onClick={() => detectLocation(false)}
            disabled={detecting}
            style={{
              position: 'absolute', right: 16, bottom: 260, zIndex: 1000,
              background: 'white', border: 'none', borderRadius: '50%',
              width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)', cursor: 'pointer',
              color: detecting ? '#9ca3af' : '#1a2b5f',
            }}
          >
            <Navigation size={22} strokeWidth={2.5} />
          </button>
        )}

        {/* ── Bottom location confirmation card ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'white', borderRadius: '24px 24px 0 0',
          padding: '18px 20px 36px',
          boxShadow: '0 -6px 36px rgba(0,0,0,0.14)',
        }}>
          <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '0 auto 14px' }} />

          {/* Detected address pill */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#f0f3fc', borderRadius: 12,
            padding: '11px 13px', marginBottom: 12,
          }}>
            <MapPin size={17} color="#1a2b5f" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2b5f', marginBottom: 1 }}>
                {address.city || (detecting ? 'Detecting...' : 'Move pin or search above')}
                {address.area ? `, ${address.area}` : ''}
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {address.full ? address.full : 'Drag the map pin to update'}
              </p>
            </div>
          </div>

          {/* Manual inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <input
              className="form-input"
              placeholder="City / Town"
              value={address.city}
              onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
              style={{ padding: '10px 12px', fontSize: 13, borderRadius: 10 }}
            />
            <input
              className="form-input"
              placeholder="Area / Locality"
              value={address.area}
              onChange={e => setAddress(a => ({ ...a, area: e.target.value }))}
              style={{ padding: '10px 12px', fontSize: 13, borderRadius: 10 }}
            />
          </div>

          <button
            onClick={handleFinish}
            className="btn btn-primary"
            style={{ borderRadius: 50, fontWeight: 800, fontSize: 15 }}
          >
            <CheckCircle size={17} />
            Confirm Location
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     STEP 0 — Phone + Name form
  ════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #0f1d45 0%, #1a2b5f 55%, #243680 100%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px 24px',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          border: '1.5px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ fontSize: 40 }}>🏗️</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', textAlign: 'center', letterSpacing: '-0.5px', marginBottom: 8 }}>
          Welcome to Murato
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5 }}>
          Your construction marketplace
        </p>
      </div>

      {/* Bottom card */}
      <div style={{
        background: 'white', borderRadius: '28px 28px 0 0',
        padding: '28px 24px 48px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>

        {/* Phone field */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
          <Phone size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          Mobile Number
        </p>
        <div style={{
          display: 'flex', alignItems: 'center',
          border: '2px solid #e5e7eb', borderRadius: 14,
          overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{
            background: '#f0f3fc', padding: '14px',
            borderRight: '1.5px solid #e5e7eb',
            fontSize: 15, fontWeight: 700, color: '#1a2b5f', flexShrink: 0,
          }}>🇮🇳 +91</div>
          <input
            id="login-phone"
            type="tel" inputMode="numeric" maxLength={10}
            placeholder="Enter 10-digit number"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('login-name')?.focus()}
            autoFocus
            style={{
              flex: 1, border: 'none', outline: 'none',
              padding: '14px', fontSize: 18,
              fontWeight: 600, letterSpacing: 2, color: '#1a2b5f', background: 'transparent',
            }}
          />
        </div>

        {/* Name field */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
          <User size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          Your Name
        </p>
        <input
          id="login-name"
          className="form-input"
          placeholder="e.g. Ravi Kumar"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ marginBottom: 24, fontSize: 16, fontWeight: 600, padding: '14px 16px', borderRadius: 14, borderWidth: 2 }}
        />

        <button
          id="login-submit"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={loading || phone.replace(/\D/g, '').length !== 10 || name.trim().length < 2}
          style={{
            borderRadius: 50, fontWeight: 800, fontSize: 16,
            opacity: (loading || phone.replace(/\D/g, '').length !== 10 || name.trim().length < 2) ? 0.5 : 1,
          }}
        >
          {loading ? 'Please wait...' : 'Continue →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
