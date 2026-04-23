import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, ChevronRight, Loader } from 'lucide-react';
import MapPinPicker from './MapPinPicker';
import { useLanguage } from '../context/LanguageContext';

// Fuzzy match helper
function fuzzyMatch(str, query) {
  str   = str.toLowerCase();
  query = query.toLowerCase();
  if (str.includes(query)) return true;
  // simple character-skip fuzzy
  let si = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const idx = str.indexOf(query[qi], si);
    if (idx === -1) return false;
    si = idx + 1;
  }
  return true;
}

export default function LocationPicker({ isOpen, onClose, onSelect, currentCity }) {
  const { t } = useLanguage();
  const [search,      setSearch]      = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [detecting,   setDetecting]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showMap,     setShowMap]     = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Debounced Nominatim search ──────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=8&addressdetails=1&accept-language=en`
        );
        const data = await res.json();

        const results = data
          .map(r => {
            const a = r.address || {};
            const city = a.city || a.town || a.village || a.county || a.state_district || '';
            const state = a.state || '';
            const area  = a.suburb || a.neighbourhood || a.county || '';
            return { display: `${city}${state ? ', ' + state : ''}`, city, area, lat: r.lat, lng: r.lon };
          })
          .filter(r => r.city) // only results with a city
          .filter((r, i, arr) => arr.findIndex(x => x.city === r.city) === i) // dedupe by city
          .filter(r => fuzzyMatch(r.display, search));

        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [search]);

  // ── GPS detect ──────────────────────────────────────────────────────────
  const detectGPS = async () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
          );
          const d  = await res.json();
          const a  = d.address || {};
          const city = a.city || a.town || a.village || a.county || '';
          const area = a.suburb || a.neighbourhood || '';
          onSelect({ city, area, lat, lng });
          onClose();
        } catch { /* ignore */ }
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 8000, enableHighAccuracy: true }
    );
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
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>{t('changeLocation')}</h3>
            {currentCity && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('currentLocation')}: {currentCity}</p>}
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
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
              placeholder={t('searchCity')}
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
          <button onClick={() => setShowMap(true)}
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

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Suggestions</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(s); onClose(); }}
                  style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <MapPin size={16} color="var(--navy)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.city}</p>
                    {s.display !== s.city && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.display}</p>}
                  </div>
                  <ChevronRight size={14} color="#d1d5db" />
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && suggestions.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 14 }}>No results for "{search}"</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Try a different spelling or nearby city</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Pin Picker */}
      <MapPinPicker
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={(loc) => { onSelect(loc); setShowMap(false); onClose(); }}
      />
    </div>
  );
}
