import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Loader } from 'lucide-react';
import MapPinPicker from './MapPinPicker';
import { useLanguage } from '../context/LanguageContext';

export default function LocationPicker({ isOpen, onClose, onSelect, currentCity }) {
  const { t } = useLanguage();
  const [search,      setSearch]      = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [detecting,   setDetecting]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showMap,     setShowMap]     = useState(false);
  const [mapCoords,   setMapCoords]   = useState(null); // { lat, lng }
  
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Debounced Fuzzy Nominatim search (with fallback spelling correction) ───────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const parseResults = (data) => data.map(r => {
          const a = r.address || {};
          const primary = a.road || a.suburb || a.neighbourhood || a.village || a.town || a.city || r.display_name.split(',')[0];
          const secondary = r.display_name.split(',').slice(1).join(',').trim();
          return {
            primary,
            secondary,
            display: r.display_name,
            city: a.city || a.town || a.village || a.county || '',
            area: a.suburb || a.neighbourhood || a.county || '',
            road: a.road || '',
            state: a.state || '',
            pincode: a.postcode || '',
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          };
        });

        const nominatim = async (q) => {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1&accept-language=en&countrycodes=in`,
            { headers: { 'Accept-Language': 'en' } }
          );
          return res.json();
        };

        // 1️⃣ Try the query exactly as typed
        let data = await nominatim(search.trim());

        // 2️⃣ If empty, try dropping the last character (handles "nellure" → "nellur" → Nellore family)
        if (!data.length && search.trim().length > 3) {
          data = await nominatim(search.trim().slice(0, -1));
        }

        // 3️⃣ If still empty, drop last 2 chars (handles "nellure" → "nellu" area)
        if (!data.length && search.trim().length > 4) {
          data = await nominatim(search.trim().slice(0, -2));
        }

        // 4️⃣ Last resort: try the first 4 characters as a broad prefix search
        if (!data.length && search.trim().length >= 4) {
          data = await nominatim(search.trim().slice(0, 4));
        }

        setSuggestions(parseResults(data));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [search]);

  // ── GPS detect → Center Map Confirmation instead of saving directly ─────────
  const detectGPS = async () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setDetecting(false);
        setMapCoords({ lat, lng });
        setShowMap(true);
      },
      () => setDetecting(false),
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectSuggestion = (s) => {
    setMapCoords({ lat: s.lat, lng: s.lng });
    setShowMap(true);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '24px 24px 0 0',
        maxHeight: '85dvh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>Select your location</h3>
            {currentCity && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('currentLocation')}: {currentCity}</p>}
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 32px', overflowY: 'auto', flex: 1 }}>
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 12, padding: '0 14px', gap: 10, marginBottom: 16, border: '1.5px solid transparent', transition: 'border-color 0.2s' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--navy)'}
            onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
          >
            <Search size={16} color="#9ca3af" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search city, town, village or street…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '13px 0', fontSize: 15 }}
            />
            {loading && <Loader size={14} color="#9ca3af" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
            {search && !loading && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#9ca3af' }}><X size={14} /></button>}
          </div>

          {/* GPS detect */}
          <button onClick={detectGPS} disabled={detecting}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: detecting ? '#f0f3fc' : 'white', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10, transition: 'background 0.2s' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {detecting ? <Loader size={18} color="var(--navy)" style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={18} color="var(--navy)" />}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{detecting ? t('detecting') : t('useCurrentLocation')}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('autoGPS')}</p>
            </div>
          </button>

          {/* Pin on Map */}
          <button onClick={() => { setMapCoords(null); setShowMap(true); }}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={18} color="#10b981" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>{t('pinOnMap')}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('dragMarker')}</p>
            </div>
          </button>

          {/* Suggestions - Matching fourth screenshot exactly */}
          {suggestions.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>Search Results</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{ width: '100%', padding: '14px 0', display: 'flex', alignItems: 'flex-start', gap: 12, background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', textAlign: 'left' }}
                >
                  <div style={{ background: '#f3f4f6', padding: 8, borderRadius: '50%', color: '#9ca3af', display: 'flex', flexShrink: 0, marginTop: 2 }}>
                    <MapPin size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1a2b5f', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.primary}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.secondary}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && suggestions.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 14 }}>No results for "{search}"</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Try a different spelling or nearby address</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Pin Picker Modal centered on coordinates */}
      <MapPinPicker
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        initialLat={mapCoords?.lat}
        initialLng={mapCoords?.lng}
        onConfirm={(loc) => { onSelect(loc); setShowMap(false); onClose(); }}
      />
    </div>
  );
}
