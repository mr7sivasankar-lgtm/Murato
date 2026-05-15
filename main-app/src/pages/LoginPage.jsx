import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Lock, MapPin, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/* ── 4-digit PIN input ── Mobile-compatible via single hidden input ── */
function PinInput({ value, onChange, onComplete, error }) {
  const hiddenRef = useRef();
  const [focused, setFocused] = useState(false);
  const digits = (value + '    ').slice(0, 4).split('');
  const activeIndex = value.length < 4 ? value.length : 3;

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    onChange(raw);
    if (raw.length === 4) setTimeout(() => onComplete?.(raw), 80);
  };

  return (
    <div style={{ position: 'relative' }} onClick={() => hiddenRef.current?.focus()}>
      {/* Hidden real input — font-size 16px prevents Android auto-zoom */}
      <input
        ref={hiddenRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        style={{
          position: 'absolute',
          opacity: 0,
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 2,
          cursor: 'pointer',
          fontSize: 16,          /* must be >=16px to prevent Android zoom */
          caretColor: 'transparent',
        }}
      />
      {/* Visual digit boxes */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        {[0, 1, 2, 3].map(i => {
          const isFilled  = digits[i].trim() !== '';
          const isActive  = focused && i === activeIndex;
          const borderColor = error
            ? '#ef4444'
            : isActive
            ? '#e87e04'
            : isFilled
            ? '#1a2b5f'
            : '#e5e7eb';
          const bgColor = error
            ? '#fef2f2'
            : isActive
            ? '#fff8f0'
            : isFilled
            ? '#f0f3fc'
            : 'white';

          return (
            <div
              key={i}
              style={{
                width: 64,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 800,
                border: `2.5px solid ${borderColor}`,
                borderRadius: 16,
                background: bgColor,
                color: '#1a2b5f',
                transition: 'all 0.15s',
                animation: error ? 'pin-shake 0.4s ease' : 'none',
                boxShadow: isActive ? '0 0 0 3px rgba(232,126,4,0.18)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isFilled ? '•' : isActive ? (
                /* blinking cursor line */
                <span style={{
                  display: 'inline-block',
                  width: 2,
                  height: 28,
                  background: '#e87e04',
                  borderRadius: 2,
                  animation: 'pin-cursor 1s step-end infinite',
                }} />
              ) : null}
            </div>
          );
        })}
      </div>
      {/* Inline error message */}
      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700, fontSize: 14, marginTop: 12 }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loginDirect } = useAuth();
  useEffect(() => { if (user) navigate('/'); }, [user]);

  // Pre-fill phone if previously used (for convenience) but always start at phone step
  // so we validate with the server — handles deleted accounts / cleared test data
  const storedPhone = localStorage.getItem('murato_phone') || '';

  const [step, setStep]       = useState('phone');  // always start at phone
  const [phone, setPhone]     = useState(storedPhone.replace('+91', '')); // pre-fill digits only
  const [name, setName]       = useState('');
  const [pin, setPin]         = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [recoveredPin, setRecoveredPin] = useState('');
  const [city, setCity]       = useState('');
  const [area, setArea]       = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat]         = useState(null);
  const [lng, setLng]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  /* ── Step: phone check (new user) ── */
  const handlePhoneNext = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      const full = `+91${cleaned}`;
      const { data } = await api.post('/auth/check', { phone: full });
      if (data.exists) {
        // Returning user found — store phone and go to PIN
        localStorage.setItem('murato_phone', full);
        setPhone(full);
        setStep('pin');
      } else {
        setPhone(full);
        setStep('name');
      }
    } catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  /* ── Step: register new user ── */
  const handleRegister = async (finalPin) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { phone, name: name.trim(), pin: finalPin });
      localStorage.setItem('murato_token', data.token);
      localStorage.setItem('murato_phone', phone);
      loginDirect({ ...data.user, token: data.token });
      setStep('location');
      autoDetectLocation();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
      setPin('');
    } finally { setLoading(false); }
  };

  /* ── Step: PIN login (returning user) ── */
  const handlePinLogin = async (finalPin) => {
    setLoading(true);
    setPinError('');
    try {
      const { data } = await api.post('/auth/login-pin', { phone, pin: finalPin });
      localStorage.setItem('murato_token', data.token);
      loginDirect({ ...data.user, token: data.token });
      toast.success(`Welcome back, ${data.user.name}! 👋`);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Incorrect PIN';
      setPinError(msg);
      setPin('');
    } finally { setLoading(false); }
  };

  /* ── Step: forgot PIN ── */
  const handleForgotPin = async () => {
    const cleaned = forgotPhone.replace(/\D/g, '');
    if (cleaned.length !== 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-pin', { phone: `+91${cleaned}` });
      setRecoveredPin(data.pin);
      // Update stored phone for PIN login
      localStorage.setItem('murato_phone', `+91${cleaned}`);
      setPhone(`+91${cleaned}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Number not found');
    } finally { setLoading(false); }
  };

  /* ── Step: Auto-detect Location ── */
  const autoDetectLocation = async () => {
    setLoading(true);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ timeout: 10000 });
      const currentLat = pos.coords.latitude;
      const currentLng = pos.coords.longitude;
      setLat(currentLat);
      setLng(currentLng);

      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLng}&format=json&accept-language=en`);
      const data = await res.json();
      const a = data.address || {};
      
      const c = a.city || a.town || a.county || a.state_district || a.village || '';
      if (c) setCity(c);
      
      const ar = a.suburb || a.neighbourhood || a.residential || '';
      if (ar) setArea(ar);
      
      const pin = a.postcode || '';
      if (pin) setPincode(pin);

      toast.success('Location detected! 📍');
    } catch (e) {
      // Ignore, user can enter manually
    } finally {
      setLoading(false);
    }
  };

  /* ── Step: save location ── */
  const handleLocationSave = async () => {
    if (!city.trim()) { toast.error('Enter your city'); return; }
    setLoading(true);
    try {
      await api.put('/auth/profile', { city: city.trim(), area: area.trim(), pincode: pincode.trim(), lat, lng });
    } catch { /* non-critical */ }
    finally { setLoading(false); }
    toast.success('Welcome to Myillo! 🏗️');
    navigate('/');
  };

  /* ── Shared hero wrapper ── */
  const Wrapper = ({ icon, title, subtitle, children }) => (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #ffffff 0%, #fff8f0 55%, #fde8c8 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        {/* Myillo M+House Logo */}
        <div style={{ width: 100, height: 100, marginBottom: 18 }}>
          <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lgw" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffb347" />
                <stop offset="100%" stopColor="#e87e04" />
              </linearGradient>
            </defs>
            <path d="M10 110 L10 30 L70 75 L130 30 L130 110" stroke="url(#lgw)" strokeWidth="22" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
            <polygon points="70,60 105,88 35,88" fill="#1a2b5f" />
            <rect x="44" y="88" width="52" height="36" fill="#1a2b5f" rx="2" />
            <rect x="59" y="96" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="73" y="96" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="59" y="108" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="73" y="108" width="8" height="8" fill="#f5c518" rx="1" />
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a2b5f', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>{subtitle}</p>
        {/* Decorative wave bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <svg viewBox="0 0 430 40" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 40 }}>
            <path d="M0,20 Q107,0 215,16 Q323,32 430,12 L430,40 L0,40 Z" fill="rgba(232,126,4,0.08)" />
          </svg>
        </div>
      </div>
      {/* Input card */}
      <div style={{ background: 'white', borderRadius: '28px 28px 0 0', padding: '28px 24px 48px', boxShadow: '0 -8px 40px rgba(0,0,0,0.08)' }}>
        {children}
      </div>
    </div>
  );

  /* ── STEP: phone ── */
  if (step === 'phone') return (
    <Wrapper icon="🏗️" title="Welcome to Myillo" subtitle="Your construction marketplace">
      <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Mobile Number</p>
      <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ background: '#f0f3fc', padding: '14px', borderRight: '1.5px solid #e5e7eb', fontSize: 15, fontWeight: 700, color: '#1a2b5f' }}>🇮🇳 +91</div>
        <input type="tel" inputMode="numeric" maxLength={10} placeholder="Enter 10-digit number"
          value={phone.replace('+91', '')} autoFocus
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onKeyDown={e => e.key === 'Enter' && handlePhoneNext()}
          style={{ flex: 1, border: 'none', outline: 'none', padding: '14px', fontSize: 18, fontWeight: 600, letterSpacing: 2, color: '#1a2b5f', background: 'transparent' }} />
      </div>
      <button onClick={handlePhoneNext} className="btn btn-primary" disabled={loading} style={{ borderRadius: 50, fontWeight: 800, fontSize: 16 }}>
        {loading ? 'Checking...' : 'Continue →'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 }}>By continuing, you agree to our <span onClick={() => navigate('/terms')} style={{ color: '#1a2b5f', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Terms</span> & <span onClick={() => navigate('/privacy-policy')} style={{ color: '#1a2b5f', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span></p>
    </Wrapper>
  );

  /* ── STEP: name ── */
  if (step === 'name') return (
    <Wrapper icon={<User size={36} color="white" strokeWidth={1.5} />} title="What's your name?" subtitle="So sellers know who they're talking to">
      <button onClick={() => setStep('phone')} style={{ color: '#6b7280', background: 'none', border: 'none', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Change number
      </button>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Full Name</p>
      <input className="form-input" placeholder="e.g. Ravi Kumar" value={name} autoFocus
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim().length >= 2 && setStep('set-pin')}
        style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, padding: '14px 16px', borderRadius: 14, borderWidth: 2 }} />
      <button onClick={() => setStep('set-pin')} className="btn btn-primary" disabled={name.trim().length < 2}
        style={{ borderRadius: 50, fontWeight: 800, fontSize: 16, opacity: name.trim().length < 2 ? 0.5 : 1 }}>
        Continue →
      </button>
    </Wrapper>
  );

  /* ── STEP: set-pin (new user) ── */
  if (step === 'set-pin') return (
    <Wrapper icon={<Lock size={36} color="white" strokeWidth={1.5} />} title="Create Your PIN" subtitle="Remember this 4-digit PIN to log in next time">
      <button onClick={() => setStep('name')} style={{ color: '#6b7280', background: 'none', border: 'none', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back
      </button>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 20, textAlign: 'center' }}>Enter a 4-digit PIN</p>
      <PinInput value={pin} onChange={setPin} onComplete={handleRegister} />
      {loading && <p style={{ textAlign: 'center', color: '#1a2b5f', fontWeight: 600, marginTop: 16 }}>Creating account...</p>}
    </Wrapper>
  );

  /* ── STEP: pin (returning user) ── */
  if (step === 'pin') return (
    <Wrapper icon={<Lock size={36} color="white" strokeWidth={1.5} />} title="Enter Your PIN" subtitle="Welcome back! Enter your 4-digit PIN">
      <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 20, textAlign: 'center' }}>Your 4-digit PIN</p>
      <PinInput value={pin} onChange={(v) => { setPin(v); setPinError(''); }} onComplete={handlePinLogin} error={pinError} />
      {loading && <p style={{ textAlign: 'center', color: '#1a2b5f', fontWeight: 600, marginTop: 16 }}>Verifying...</p>}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <button onClick={() => { setStep('forgot'); setRecoveredPin(''); setForgotPhone(''); setPinError(''); }}
          style={{ fontSize: 14, color: '#1a2b5f', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          Forgot PIN?
        </button>
        <button onClick={() => { localStorage.removeItem('murato_phone'); setPhone(''); setStep('phone'); setPinError(''); }}
          style={{ fontSize: 14, color: '#e87e04', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>
          Use a different number
        </button>
      </div>
    </Wrapper>
  );

  /* ── STEP: forgot ── */
  if (step === 'forgot') return (
    <Wrapper icon="🔑" title="Recover PIN" subtitle="Enter your registered mobile number">
      <button onClick={() => setStep('pin')} style={{ color: '#6b7280', background: 'none', border: 'none', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back to PIN
      </button>

      {!recoveredPin ? (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Mobile Number</p>
          <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ background: '#f0f3fc', padding: '14px', borderRight: '1.5px solid #e5e7eb', fontSize: 15, fontWeight: 700, color: '#1a2b5f' }}>🇮🇳 +91</div>
            <input type="tel" inputMode="numeric" maxLength={10} placeholder="Your registered number"
              value={forgotPhone} autoFocus onChange={e => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onKeyDown={e => e.key === 'Enter' && handleForgotPin()}
              style={{ flex: 1, border: 'none', outline: 'none', padding: '14px', fontSize: 18, fontWeight: 600, letterSpacing: 2, color: '#1a2b5f', background: 'transparent' }} />
          </div>
          <button onClick={handleForgotPin} className="btn btn-primary" disabled={loading || forgotPhone.length !== 10}
            style={{ borderRadius: 50, fontWeight: 800, fontSize: 16, opacity: forgotPhone.length !== 10 ? 0.5 : 1 }}>
            {loading ? 'Searching...' : 'Find My PIN →'}
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Your PIN for this account is:</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
            {recoveredPin.split('').map((d, i) => (
              <div key={i} style={{ width: 64, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, border: '2.5px solid #1a2b5f', borderRadius: 16, background: '#f0f3fc', color: '#1a2b5f' }}>
                {showPin ? d : '•'}
              </div>
            ))}
          </div>
          <button onClick={() => setShowPin(v => !v)} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto 20px' }}>
            {showPin ? <EyeOff size={15}/> : <Eye size={15}/>} {showPin ? 'Hide PIN' : 'Show PIN'}
          </button>
          <button onClick={() => { setPin(''); setStep('pin'); }} className="btn btn-primary" style={{ borderRadius: 50, fontWeight: 800, fontSize: 16 }}>
            Login with this PIN →
          </button>
        </div>
      )}
    </Wrapper>
  );

  /* ── STEP: location ── */
  if (step === 'location') return (
    <Wrapper icon={<MapPin size={36} color="white" strokeWidth={1.5} />} title="Confirm Your Location" subtitle="Help buyers & sellers find you nearby">

      {/* Auto-detect banner */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#1a2b5f' }}>Detecting your location…</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Please wait a moment</p>
        </div>
      ) : city ? (
        /* ── Confirm Address Card ── */
        <div>
          <div style={{
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border: '2px solid #86efac',
            borderRadius: 18,
            padding: '18px 20px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 28 }}>📍</span>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: '#15803d' }}>Location Detected</p>
                <p style={{ fontSize: 12, color: '#166534' }}>Please confirm your address below</p>
              </div>
            </div>
            {[
              { label: 'City / Town', value: city,    icon: '🏙️' },
              { label: 'Area',        value: area,    icon: '📌' },
              { label: 'Pincode',     value: pincode, icon: '🔢' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', background: 'rgba(255,255,255,0.7)',
                borderRadius: 10, marginBottom: 8,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{row.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2b5f' }}>{row.value || '—'}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleLocationSave} disabled={loading || !city.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 50, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#15803d,#16a34a)', color: 'white',
              fontWeight: 800, fontSize: 16, marginBottom: 12,
              boxShadow: '0 4px 16px rgba(21,128,61,0.3)',
            }}>
            ✅ Yes, Confirm This Address
          </button>
          <button onClick={() => { setCity(''); setArea(''); setPincode(''); }}
            style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#e87e04', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>
            ✏️ Edit Address Manually
          </button>
        </div>
      ) : (
        /* ── Manual Entry ── */
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>City / Town *</p>
          <input className="form-input" placeholder="e.g. Tirupati" value={city} autoFocus
            onChange={e => setCity(e.target.value)} style={{ marginBottom: 14, borderRadius: 12 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Area / Locality</p>
          <input className="form-input" placeholder="e.g. Alipiri" value={area}
            onChange={e => setArea(e.target.value)} style={{ marginBottom: 14, borderRadius: 12 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Pincode</p>
          <input className="form-input" placeholder="e.g. 517501" value={pincode}
            type="tel" maxLength={6}
            onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} style={{ marginBottom: 16, borderRadius: 12 }} />

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <button onClick={autoDetectLocation} disabled={loading}
              style={{ background: 'none', border: '2px solid #e87e04', color: '#e87e04', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 20px', borderRadius: 50 }}>
              <MapPin size={16} /> 📡 Auto-detect My Location
            </button>
          </div>

          <button onClick={handleLocationSave} className="btn btn-primary" disabled={loading || !city.trim()}
            style={{ borderRadius: 50, fontWeight: 800, fontSize: 16, opacity: !city.trim() ? 0.5 : 1 }}>
            {loading ? 'Saving...' : '✅ Confirm & Continue'}
          </button>
        </div>
      )}

    </Wrapper>
  );

  return null;
}
