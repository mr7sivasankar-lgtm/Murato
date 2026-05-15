/**
 * LocationConfirmModal
 * ─────────────────────────────────────────────────────────────
 * Shows automatically (once per session) for any logged-in user
 * who does NOT have a confirmed city in their profile.
 *
 * Trigger order (matches what the user sees on Android):
 *   1. App opens
 *   2. Push notification permission dialog (system)
 *   3. [2 s delay] → This modal appears & auto-detects GPS
 *   4. User sees "Confirm Your Address" card → taps confirm
 *   5. Saved to backend, modal closes
 */
import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'myillo_loc_modal_shown';

export default function LocationConfirmModal() {
  const { user, loginDirect } = useAuth();

  const [visible, setVisible]   = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving]      = useState(false);
  const [city, setCity]          = useState('');
  const [area, setArea]          = useState('');
  const [pincode, setPincode]    = useState('');
  const [lat, setLat]            = useState(null);
  const [lng, setLng]            = useState(null);
  const [editMode, setEditMode]  = useState(false);

  useEffect(() => {
    // Only show when:
    //  • User is logged in
    //  • User has no city set yet
    //  • We haven't already shown the modal this session
    if (!user) return;
    if (user.location?.city) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Delay 2.5 s to let the push notification dialog settle first
    const timer = setTimeout(() => {
      setVisible(true);
      detectLocation();
    }, 2500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const detectLocation = async () => {
    setDetecting(true);
    setEditMode(false);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      // Request permission (may already be granted)
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ timeout: 12000 });
      const { latitude: clat, longitude: clng } = pos.coords;
      setLat(clat);
      setLng(clng);

      // Reverse-geocode with Nominatim (free, no key needed)
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${clat}&lon=${clng}&format=json&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const a    = data.address || {};

      const detectedCity    = a.city || a.town || a.county || a.state_district || a.village || '';
      const detectedArea    = a.suburb || a.neighbourhood || a.residential || a.quarter || '';
      const detectedPincode = a.postcode || '';

      setCity(detectedCity);
      setArea(detectedArea);
      setPincode(detectedPincode);
    } catch {
      // Detection failed → show manual entry
      setEditMode(true);
    } finally {
      setDetecting(false);
    }
  };

  const handleConfirm = async () => {
    if (!city.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        city:    city.trim(),
        area:    area.trim(),
        pincode: pincode.trim(),
        lat,
        lng,
      });
      // Merge fresh location into auth context so user.location.city is set
      const fresh = { ...user, location: data.user?.location || { city: city.trim(), area: area.trim(), pincode: pincode.trim() } };
      loginDirect(fresh);
      sessionStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
    } catch {
      // Still close if non-critical
      sessionStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 24px',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '24px 22px 20px',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a2b5f', margin: 0 }}>📍 Confirm Your Address</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>So nearby buyers & sellers can find you</p>
          </div>
          <button onClick={handleSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#9ca3af" />
          </button>
        </div>

        {/* Detecting spinner */}
        {detecting && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
            <p style={{ fontWeight: 700, color: '#1a2b5f', fontSize: 15 }}>Detecting your location…</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Please allow location access if prompted</p>
          </div>
        )}

        {/* Confirm card — shown when city is detected */}
        {!detecting && city && !editMode && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              border: '2px solid #86efac',
              borderRadius: 16,
              padding: '16px 18px',
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>✅</span>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: '#15803d', margin: 0 }}>Location Detected</p>
                  <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>Is this your address?</p>
                </div>
              </div>

              {[
                { icon: '🏙️', label: 'City / Town', value: city },
                { icon: '📌', label: 'Area',        value: area    || '—' },
                { icon: '🔢', label: 'Pincode',     value: pincode || '—' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.75)',
                  borderRadius: 10, padding: '8px 12px', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 18 }}>{row.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{row.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2b5f' }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                width: '100%', padding: '14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#15803d,#16a34a)', color: 'white',
                fontWeight: 800, fontSize: 16, marginBottom: 10,
                boxShadow: '0 4px 14px rgba(21,128,61,0.3)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : '✅ Yes, This Is My Address'}
            </button>

            <button
              onClick={() => { setEditMode(true); }}
              style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#e87e04', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}
            >
              ✏️ Edit Address Manually
            </button>
          </div>
        )}

        {/* Manual entry — shown when detection fails OR user clicks "Edit" */}
        {!detecting && (editMode || !city) && (
          <div>
            {!city && !editMode && (
              <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Could not detect location. Enter manually:</p>
              </div>
            )}

            {[
              { label: 'City / Town *', placeholder: 'e.g. Tirupati',  value: city,    setter: setCity },
              { label: 'Area / Locality', placeholder: 'e.g. Alipiri', value: area,    setter: setArea },
              { label: 'Pincode',        placeholder: 'e.g. 517501',   value: pincode, setter: setPincode, numeric: true },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>{f.label}</p>
                <input
                  className="form-input"
                  placeholder={f.placeholder}
                  value={f.value}
                  type={f.numeric ? 'tel' : 'text'}
                  maxLength={f.numeric ? 6 : undefined}
                  onChange={e => f.setter(f.numeric ? e.target.value.replace(/\D/g,'') : e.target.value)}
                  style={{ borderRadius: 12, marginBottom: 0 }}
                />
              </div>
            ))}

            <button
              onClick={detectLocation}
              style={{
                width: '100%', padding: '10px', borderRadius: 50, border: '2px solid #e87e04',
                background: 'none', color: '#e87e04', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <MapPin size={15} /> Re-detect My Location
            </button>

            <button
              onClick={handleConfirm}
              disabled={saving || !city.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 50, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#1a2b5f,#2a4a9f)', color: 'white',
                fontWeight: 800, fontSize: 16, marginBottom: 10,
                opacity: (!city.trim() || saving) ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving…' : '✅ Confirm & Save'}
            </button>
          </div>
        )}

        <button onClick={handleSkip} style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(60px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>
    </div>
  );
}
