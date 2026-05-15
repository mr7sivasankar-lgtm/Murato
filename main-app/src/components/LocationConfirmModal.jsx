/**
 * LocationConfirmModal
 * ─────────────────────────────────────────────
 * • Fires once after push-notification permission settles (3 s delay)
 * • Detects GPS SILENTLY in background before showing the modal
 * • Modal opens with location ALREADY pre-filled — user just taps confirm
 * • After confirm: saves to backend AND updates localStorage cache
 *   so the home page header updates instantly without needing re-detect
 * • No "detecting..." spinner visible to the user
 */
import { useEffect, useState, useRef } from 'react';
import { MapPin } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Key to stop showing once confirmed
const CONFIRMED_KEY = 'myillo_loc_confirmed';

// Same cache key the HomePage uses — so header updates immediately
const CACHE_KEY = 'myillo_location';

async function detectGPS() {
  const { Geolocation } = await import('@capacitor/geolocation');
  await Geolocation.requestPermissions();
  const pos = await Geolocation.getCurrentPosition({ timeout: 12000, enableHighAccuracy: false });
  const { latitude: lat, longitude: lng } = pos.coords;

  const res  = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
  );
  const data = await res.json();
  const a    = data.address || {};

  return {
    lat, lng,
    city:    a.city || a.town || a.county || a.state_district || a.village || '',
    area:    a.suburb || a.neighbourhood || a.quarter || a.residential || '',
    pincode: a.postcode || '',
  };
}

export default function LocationConfirmModal() {
  const { user, loginDirect } = useAuth();

  const [visible,  setVisible]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Location fields (pre-filled by GPS or typed manually)
  const [city,    setCity]    = useState('');
  const [area,    setArea]    = useState('');
  const [pincode, setPincode] = useState('');
  const [lat,     setLat]     = useState(null);
  const [lng,     setLng]     = useState(null);
  const [gpsOk,   setGpsOk]  = useState(false);  // true = GPS succeeded

  const runOnce = useRef(false);

  useEffect(() => {
    if (!user)               return;  // not logged in
    if (user.location?.city) return;  // already has city — skip
    if (localStorage.getItem(CONFIRMED_KEY)) return; // already confirmed before
    if (runOnce.current)     return;
    runOnce.current = true;

    // 3 s delay — lets push notification dialog settle first
    const timer = setTimeout(async () => {
      try {
        const loc = await detectGPS();
        setCity(loc.city);
        setArea(loc.area);
        setPincode(loc.pincode);
        setLat(loc.lat);
        setLng(loc.lng);
        setGpsOk(!!loc.city);
      } catch {
        // GPS failed — show empty manual form
        setGpsOk(false);
        setEditMode(true);
      }
      // Show modal ONLY after detection result is ready
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleConfirm = async () => {
    if (!city.trim()) return;
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        city:    city.trim(),
        area:    area.trim(),
        pincode: pincode.trim(),
        lat,
        lng,
      });

      // Update the home page location cache so the header refreshes immediately
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        city:   city.trim(),
        coords: lat && lng ? [lng, lat] : null,
        ts:     Date.now(),
      }));

      // Update auth context so user.location.city is set everywhere
      loginDirect({
        ...user,
        location: { city: city.trim(), area: area.trim(), pincode: pincode.trim() },
      });

      // Mark as confirmed so modal never shows again
      localStorage.setItem(CONFIRMED_KEY, '1');
      setVisible(false);

      // Force a soft page reload so HomePage re-reads the new cache
      window.dispatchEvent(new Event('myillo:location-updated'));
    } catch {
      // Still mark and close
      localStorage.setItem(CONFIRMED_KEY, '1');
      setVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const reDetect = async () => {
    setEditMode(false);
    setGpsOk(false);
    setCity(''); setArea(''); setPincode('');
    try {
      const loc = await detectGPS();
      setCity(loc.city); setArea(loc.area); setPincode(loc.pincode);
      setLat(loc.lat);   setLng(loc.lng);
      setGpsOk(!!loc.city);
    } catch {
      setEditMode(true);
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom, 16px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 28px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a2b5f', margin: '0 0 4px' }}>
            📍 Confirm Your Address
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Help nearby buyers &amp; sellers find you
          </p>
        </div>

        {/* ── CONFIRM CARD (GPS detected) ── */}
        {gpsOk && !editMode && (
          <>
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              border: '2px solid #86efac',
              borderRadius: 16,
              padding: '14px 16px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 16 }}>✅</span>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: '#15803d', margin: 0 }}>Location Detected</p>
                  <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>Is this your address?</p>
                </div>
              </div>

              {[
                { icon: '🏙️', label: 'CITY / TOWN', value: city },
                { icon: '📌', label: 'AREA',         value: area    || '—' },
                { icon: '🔢', label: 'PINCODE',       value: pincode || '—' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 10, padding: '9px 12px', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', letterSpacing: 0.6 }}>{row.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2b5f' }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                width: '100%', padding: '15px', borderRadius: 50, border: 'none',
                background: saving ? '#9ca3af' : 'linear-gradient(135deg,#15803d,#16a34a)',
                color: 'white', fontWeight: 800, fontSize: 16,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(21,128,61,0.35)', marginBottom: 12,
              }}
            >
              {saving ? 'Saving…' : '✅ Yes, This Is My Address'}
            </button>

            <button
              onClick={() => setEditMode(true)}
              style={{
                width: '100%', textAlign: 'center', padding: '10px',
                fontSize: 14, color: '#e87e04', fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              ✏️ Change Address
            </button>
          </>
        )}

        {/* ── MANUAL ENTRY (GPS failed OR user tapped "Change") ── */}
        {(!gpsOk || editMode) && (
          <>
            {[
              { label: 'City / Town *', placeholder: 'e.g. Tirupati',  value: city,    setter: setCity },
              { label: 'Area / Locality', placeholder: 'e.g. Alipiri', value: area,    setter: setArea },
              { label: 'Pincode',         placeholder: 'e.g. 517501',  value: pincode, setter: setPincode, numeric: true },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 5px' }}>{f.label}</p>
                <input
                  className="form-input"
                  placeholder={f.placeholder}
                  value={f.value}
                  type={f.numeric ? 'tel' : 'text'}
                  maxLength={f.numeric ? 6 : undefined}
                  onChange={e => f.setter(f.numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <button
              onClick={reDetect}
              style={{
                width: '100%', padding: '11px', borderRadius: 50,
                border: '2px solid #e87e04', background: 'none',
                color: '#e87e04', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <MapPin size={15} /> Use My Current Location
            </button>

            <button
              onClick={handleConfirm}
              disabled={saving || !city.trim()}
              style={{
                width: '100%', padding: '15px', borderRadius: 50, border: 'none',
                background: (!city.trim() || saving) ? '#d1d5db' : 'linear-gradient(135deg,#1a2b5f,#2a4a9f)',
                color: 'white', fontWeight: 800, fontSize: 16,
                cursor: (!city.trim() || saving) ? 'not-allowed' : 'pointer',
                boxShadow: city.trim() ? '0 4px 16px rgba(26,43,95,0.3)' : 'none',
              }}
            >
              {saving ? 'Saving…' : '✅ Confirm Address'}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
