import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { initPush } from '../services/PushNotificationService';

const CONFIRMED_KEY = 'myillo_loc_confirmed';
const CACHE_KEY     = 'myillo_location';

// Load Leaflet from CDN once
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => resolve(window.L);
    document.head.appendChild(js);
  });
}

async function reverseGeocode(lat, lng) {
  const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
  const data = await res.json();
  const a    = data.address || {};
  return {
    city:    a.city || a.town || a.county || a.state_district || a.village || '',
    area:    a.suburb || a.neighbourhood || a.quarter || a.residential || '',
    pincode: a.postcode || '',
  };
}

async function searchPlaces(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&accept-language=en&countrycodes=in`;
  const res  = await fetch(url);
  return res.json();
}

export default function LocationConfirmModal() {
  const { user, loginDirect } = useAuth();

  // 'idle' | 'map' | 'search'
  const [phase,  setPhase]  = useState('idle');
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState('Detecting…');
  const [city,    setCity]    = useState('');
  const [area,    setArea]    = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // Search state
  const [searchQ,       setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);

  const mapDivRef  = useRef(null);
  const leafletRef = useRef(null);
  const runOnce    = useRef(false);

  // ── Init on user login ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return; // not logged in

    const hasConfirmedLoc = user.location?.city || localStorage.getItem(CONFIRMED_KEY);

    if (hasConfirmedLoc) {
      // User already confirmed location — just initialise push (if not already done)
      if (!runOnce.current) {
        runOnce.current = true;
        initPush().catch(() => {});
      }
      return;
    }

    // New user or needs to confirm location
    if (runOnce.current) return;
    runOnce.current = true;

    (async () => {
      // 1. Location permission + GPS
      let clat = null, clng = null;
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.requestPermissions();
        // Try high accuracy first
        let pos;
        try {
          pos = await Geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: true });
        } catch {
          // Fallback to low accuracy if high accuracy times out
          pos = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: false });
        }
        clat = pos.coords.latitude;
        clng = pos.coords.longitude;
      } catch {
        // Fallback to browser geolocation if Capacitor fails entirely
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
            });
            clat = pos.coords.latitude;
            clng = pos.coords.longitude;
          } catch {}
        }
      }

      if (clat && clng) {
        setLat(clat); setLng(clng);
        try {
          const geo = await reverseGeocode(clat, clng);
          applyGeo(geo);
        } catch {
          setAddress('Location detected, loading address...');
        }
      } else {
        setAddress('Could not detect location');
      }

      // 2. Push notification permission (after location permission is handled)
      try { await initPush(); } catch {}

      // 3. Show map modal
      setPhase('map');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  function applyGeo(geo) {
    setCity(geo.city);
    setArea(geo.area);
    setPincode(geo.pincode);
    setAddress([geo.city, geo.area, geo.pincode].filter(Boolean).join(', ') || 'Location not found');
  }

  // ── Init Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'map' || !mapDivRef.current) return;
    if (leafletRef.current) return; // already initialised

    (async () => {
      const L = await loadLeaflet();
      const map = L.map(mapDivRef.current, {
        center: [lat || 13.6288, lng || 79.4192], // Fallback to Tirupati if GPS fails
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // Reverse-geocode on every move end (pin stays fixed at center)
      map.on('moveend', async () => {
        const c = map.getCenter();
        setLat(c.lat); setLng(c.lng);
        setAddress('Detecting…');
        try {
          const geo = await reverseGeocode(c.lat, c.lng);
          applyGeo(geo);
        } catch { setAddress('Unknown location'); }
      });

      leafletRef.current = map;
      // Fix tile loading after modal render
      setTimeout(() => map.invalidateSize(), 300);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Re-centre map when lat/lng initialise ──────────────────────────────
  useEffect(() => {
    if (lat && lng && leafletRef.current) {
      leafletRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng]);

  // ── Fuzzy search (Nominatim) ────────────────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchPlaces(searchQ)); }
      catch {}
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const pickResult = async (r) => {
    const rlat = parseFloat(r.lat), rlng = parseFloat(r.lon);
    setLat(rlat); setLng(rlng);
    if (leafletRef.current) leafletRef.current.setView([rlat, rlng], 15);
    try { applyGeo(await reverseGeocode(rlat, rlng)); } catch {}
    setSearchQ(''); setSearchResults([]);
    setPhase('map');
  };

  const reDetect = async () => {
    setAddress('Detecting…');
    try {
      let clat = null, clng = null;
      const { Geolocation } = await import('@capacitor/geolocation');
      let pos;
      try {
        pos = await Geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: true });
      } catch {
        pos = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: false });
      }
      clat = pos.coords.latitude;
      clng = pos.coords.longitude;

      if (clat && clng) {
        setLat(clat); setLng(clng);
        if (leafletRef.current) leafletRef.current.setView([clat, clng], 15);
        applyGeo(await reverseGeocode(clat, clng));
      }
    } catch {
      setAddress('Could not detect location');
    }
    setPhase('map');
  };

  const handleConfirm = async () => {
    if (!city.trim()) return;
    setSaving(true);
    try {
      await api.put('/auth/profile', { city: city.trim(), area: area.trim(), pincode: pincode.trim(), lat, lng });
      localStorage.setItem(CACHE_KEY, JSON.stringify({ city: city.trim(), coords: lat && lng ? [lng, lat] : null, ts: Date.now() }));
      loginDirect({ ...user, location: { city: city.trim(), area: area.trim(), pincode: pincode.trim() } });
      localStorage.setItem(CONFIRMED_KEY, '1');
      setPhase('idle');
      window.dispatchEvent(new Event('myillo:location-updated'));
    } catch {
      localStorage.setItem(CONFIRMED_KEY, '1');
      setPhase('idle');
    } finally { setSaving(false); }
  };

  if (phase === 'idle') return null;

  // ══ SEARCH PHASE ═══════════════════════════════════════════════════════
  if (phase === 'search') return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => { setPhase('map'); setSearchQ(''); setSearchResults([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>←</button>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Change Location</span>
          {city && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>Current: {city}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            autoFocus
            placeholder="Search city, town, village…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 15, flex: 1, color: '#111' }}
          />
          {searchQ && <button onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>}
        </div>
      </div>

      {/* Use current location */}
      <button onClick={reDetect} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📡</div>
        <div>
          <p style={{ fontWeight: 700, color: '#1a2b5f', margin: 0, fontSize: 14 }}>Use my current location</p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Auto-detect via GPS</p>
        </div>
      </button>

      {/* Search results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {searching && <p style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Searching…</p>}
        {!searching && searchQ.length >= 2 && searchResults.length === 0 && (
          <p style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No results found</p>
        )}
        {searchResults.map((r, i) => (
          <button key={i} onClick={() => pickResult(r)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <span style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }}>📍</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#111', margin: '0 0 2px' }}>{r.display_name.split(',')[0]}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{r.display_name.split(',').slice(1, 4).join(',')}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ══ MAP PHASE ══════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#e5e7eb' }}>

      {/* MAP fills top portion */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

        {/* Fixed center pin (Swiggy style) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -100%)',
          zIndex: 1000, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50% 50% 50% 0', background: '#1a2b5f', transform: 'rotate(-45deg)', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', marginTop: 2 }} />
        </div>
      </div>

      {/* BOTTOM SHEET */}
      <div style={{
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '20px 20px 32px',
        boxShadow: '0 -6px 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 18px' }} />

        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>Select your location</h3>

        {/* Address row */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', margin: '0 0 6px' }}>YOUR LOCATION</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#15803d', flexShrink: 0 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: 0, flex: 1, lineHeight: 1.4 }}>{address}</p>
            <button onClick={() => setPhase('search')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e87e04', fontWeight: 700, fontSize: 14, flexShrink: 0, padding: '0 0 0 8px' }}>
              Change
            </button>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving || !city}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: (!city || saving) ? '#d1d5db' : '#15803d',
            color: '#fff', fontWeight: 800, fontSize: 16,
            cursor: (!city || saving) ? 'not-allowed' : 'pointer',
            boxShadow: city ? '0 4px 16px rgba(21,128,61,0.3)' : 'none',
          }}
        >
          {saving ? 'Saving…' : '✅ Confirm Location & Proceed'}
        </button>
      </div>
    </div>
  );
}
