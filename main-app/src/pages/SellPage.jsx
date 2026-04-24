import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Camera, X, MapPin, Navigation,
  Phone, MessageCircle, Package, Wrench, Search, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES, UNIT_LABELS, PRICE_TYPE_LABELS } from '../data/categories';
import LocationPicker from '../components/LocationPicker';
import MapPinPicker from '../components/MapPinPicker';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ── Toggle ──────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
    <button type="button" onClick={() => onChange(!value)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: value ? 'var(--navy)' : '#e5e7eb', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </button>
  </div>
);

// ── Checkbox multi-select grid ──────────────────────────────────────────────
const CheckboxGrid = ({ label, options, selected, onChange, allowOther }) => {
  const [other, setOther] = useState('');
  const toggle = (val) => {
    const arr = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onChange(arr);
  };
  const addOther = () => {
    const t = other.trim();
    if (!t || selected.includes(t)) return;
    onChange([...selected, t]);
    setOther('');
  };
  // Merge predefined options with any custom ones the user selected
  const displayOptions = Array.from(new Set([...options, ...selected]));

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {displayOptions.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              border: `1.5px solid ${selected.includes(opt) ? 'var(--navy)' : 'var(--border)'}`,
              background: selected.includes(opt) ? '#f0f3fc' : 'white',
              color: selected.includes(opt) ? 'var(--navy)' : 'var(--text-secondary)',
            }}
          >
            {selected.includes(opt) && <Check size={11} />}
            {opt}
          </button>
        ))}
      </div>
      {allowOther && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1, padding: '8px 12px', fontSize: 13, background: '#f9fafb', border: '1.5px solid var(--border)' }}
            placeholder="Type custom detail here..."
            value={other}
            onChange={e => setOther(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOther())}
          />
          <button type="button" onClick={addOther} style={{ padding: '8px 14px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Add</button>
        </div>
      )}
    </div>
  );
};

// ── Category dropdown ────────────────────────────────────────────────────────
const CatSelect = ({ label, value, onChange, options, placeholder }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <div style={{ position: 'relative' }}>
      <select
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', paddingRight: 36, color: value ? 'var(--text-primary)' : '#9ca3af' }}
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.name} value={typeof o === 'string' ? o : o.name}>
            {typeof o === 'string' ? o : (o.emoji ? `${o.emoji} ${o.name}` : (o.icon ? `${o.icon} ${o.name}` : o.name))}
          </option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9ca3af', pointerEvents: 'none' }}>▼</span>
    </div>
  </div>
);

// ── Section card ─────────────────────────────────────────────────────────────
const Section = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{title}</span>
    </div>
    <div style={{ padding: '16px' }}>{children}</div>
  </div>
);

export default function SellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileRef  = useRef();

  const editAd = location.state?.ad || null;

  const [adType,    setAdType]    = useState(editAd?.type || '');
  const [images,    setImages]    = useState([]);
  const [submitting,setSubmitting] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // ── Product form ──────────────────────────────────────────────────────────
  const [pForm, setPForm] = useState({
    title:            editAd?.title || '',
    category:         editAd?.category || '',
    subcategories:    editAd?.subcategory ? [editAd.subcategory] : [],  // multi
    itemTypes:        editAd?.itemType   ? [editAd.itemType]    : [],   // multi
    brand:            editAd?.brand || '',          // free text
    materialType:     editAd?.materialType || '',
    condition:        editAd?.condition || 'new',
    quantity:         editAd?.quantity || '',
    unit:             editAd?.unit || '',
    moq:              editAd?.moq || 1,
    price:            editAd?.price || '',
    priceType:        editAd?.priceType || 'fixed',
    negotiable:       editAd?.negotiable || false,
    bulkDiscount:     editAd?.bulkDiscount || false,
    deliveryAvailable:editAd?.deliveryAvailable || false,
    deliveryCharges:  editAd?.deliveryCharges || '',
    deliveryTime:     editAd?.deliveryTime || '',
    pickupAvailable:  editAd?.pickupAvailable !== undefined ? editAd.pickupAvailable : true,
    city:             editAd?.location?.city || user?.location?.city || '',
    area:             editAd?.location?.area || user?.location?.area || '',
    lat:              editAd?.location?.coordinates?.[1] || user?.location?.lat || null,
    lng:              editAd?.location?.coordinates?.[0] || user?.location?.lng || null,
    businessName:     editAd?.businessName || user?.businessName || '',
    whatsappAvailable:editAd?.whatsappAvailable !== undefined ? editAd.whatsappAvailable : (user?.whatsappAvailable || false),
    contactMode:      editAd?.contactMode || user?.contactMode || 'chat',
    description:      editAd?.description || '',
  });

  // ── Service form ──────────────────────────────────────────────────────────
  const [sForm, setSForm] = useState({
    title:            editAd?.title || '',
    category:         editAd?.category || '',
    categories:       editAd?.categories ? editAd.categories.split(',') : (editAd?.category ? [editAd.category] : []),
    subcategories:    editAd?.subcategories || (editAd?.subcategory ? [editAd.subcategory] : []),
    itemTypes:        editAd?.itemType   ? [editAd.itemType]    : [],
    experienceYears:  editAd?.experienceYears || '',
    teamSize:         editAd?.teamSize || 1,
    projectsDone:     editAd?.projectsDone || '',
    pricingType:      editAd?.pricingType || 'per_day',
    price:            editAd?.price || '',
    negotiable:       editAd?.negotiable || false,
    serviceRadius:    editAd?.serviceRadius || 20,
    availability:     editAd?.availability || 'available',
    travelAvailable:  editAd?.travelAvailable || false,
    materialIncluded: editAd?.materialIncluded || false,
    urgentWork:       editAd?.urgentWork || false,
    city:             editAd?.location?.city || user?.location?.city || '',
    area:             editAd?.location?.area || user?.location?.area || '',
    lat:              editAd?.location?.coordinates?.[1] || user?.location?.lat || null,
    lng:              editAd?.location?.coordinates?.[0] || user?.location?.lng || null,
    businessName:     editAd?.businessName || user?.businessName || '',
    whatsappAvailable:editAd?.whatsappAvailable !== undefined ? editAd.whatsappAvailable : (user?.whatsappAvailable || false),
    contactMode:      editAd?.contactMode || user?.contactMode || 'chat',
    description:      editAd?.description || '',
  });

  const pSet = (k, v) => setPForm(f => ({ ...f, [k]: v }));
  const sSet = (k, v) => setSForm(f => ({ ...f, [k]: v }));

  // ── Image handling ────────────────────────────────────────────────────────
  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) { toast.error('Max 5 images'); return; }
    setImages(prev => [...prev, ...files]);
  };
  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  // ── GPS detect location ───────────────────────────────────────────────────
  const detectGPS = async () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
          const d = await r.json();
          const a = d.address || {};
          const city = a.city || a.town || a.village || a.county || '';
          const area = a.suburb || a.neighbourhood || a.road || '';
          if (adType === 'product') { pSet('city', city); pSet('area', area); pSet('lat', lat); pSet('lng', lng); }
          else                      { sSet('city', city); sSet('area', area); sSet('lat', lat); sSet('lng', lng); }
          toast.success('📍 Location detected!');
        } catch { toast.error('Could not get address'); }
        setDetecting(false);
      },
      () => { setDetecting(false); toast.error('Location permission denied'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── LocationPicker callback ───────────────────────────────────────────────
  const onLocSelect = ({ city, area, lat, lng }) => {
    if (adType === 'product') { pSet('city', city); pSet('area', area || ''); pSet('lat', lat); pSet('lng', lng); }
    else                      { sSet('city', city); sSet('area', area || ''); sSet('lat', lat); sSet('lng', lng); }
    setShowLocPicker(false);
  };

  // ── MapPinPicker callback ─────────────────────────────────────────────────
  const onMapConfirm = ({ city, area, lat, lng }) => {
    if (adType === 'product') { pSet('city', city); pSet('area', area || ''); pSet('lat', lat); pSet('lng', lng); }
    else                      { sSet('city', city); sSet('area', area || ''); sSet('lat', lat); sSet('lng', lng); }
    setShowMapPicker(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const form = adType === 'product' ? pForm : sForm;
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (adType === 'product' && !pForm.category) { toast.error('Category is required'); return; }
    if (adType === 'service' && !sForm.categories.length) { toast.error('Select at least one service category'); return; }
    if (!form.price)        { toast.error('Price is required'); return; }
    if (!form.city.trim())  { toast.error('City is required'); return; }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('type', adType);

      // Flatten multi-select arrays → comma-joined strings for backend
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.append(k, v.join(','));
        else if (v !== null && v !== undefined) fd.append(k, v);
      });
      // Send first subcategory as 'subcategory' for backward compat
      if (adType === 'product' && pForm.subcategories.length)
        fd.set('subcategory', pForm.subcategories[0]);
      if (adType === 'service' && sForm.subcategories.length)
        fd.set('subcategory', sForm.subcategories[0]);
      // Primary category for service
      if (adType === 'service' && sForm.categories.length)
        fd.set('category', sForm.categories[0]);

      images.forEach(img => fd.append('images', img));

      if (editAd) {
        await api.put(`/ads/${editAd._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Ad updated! ✅');
      } else {
        await api.post('/ads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Ad posted! 🎉');
      }
      navigate('/my-ads');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post ad');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const selectedPCat  = PRODUCT_CATEGORIES.find(c => c.name === pForm.category);
  const selectedSCats = SERVICE_CATEGORIES.filter(c => sForm.categories.includes(c.name));
  const pSubcats = (selectedPCat?.subcategories || []).map(s => s.name);
  const sSubcats = [...new Set(selectedSCats.flatMap(c => (c.subcategories || []).map(s => s.name)))];
  // Sub-types: from all selected subcats across all selected service categories
  const pTypes = (selectedPCat?.subcategories || [])
    .filter(s => pForm.subcategories.includes(s.name))
    .flatMap(s => s.types || [])
    .filter((v, i, a) => a.indexOf(v) === i);
  const sTypes = selectedSCats
    .flatMap(c => c.subcategories || [])
    .filter(s => sForm.subcategories.includes(s.name))
    .flatMap(s => s.types || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // ── Type selection screen ─────────────────────────────────────────────────
  if (!adType) {
    return (
      <div className="page page-enter" style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#0f1d45,#1a2b5f)' }}>
        <div style={{ padding: '52px 24px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{t('postNewAd')}</h1>
        </div>
        <div style={{ padding: '0 24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 32, textAlign: 'center' }}>{t('whatPosting')}</p>
          {[
            { type: 'product', icon: '📦', title: t('productTitle'), sub: t('productSub') },
            { type: 'service', icon: '🔧', title: t('serviceTitle'), sub: t('serviceSub') },
          ].map(opt => (
            <button key={opt.type} onClick={() => setAdType(opt.type)} style={{ width: '100%', background: 'white', borderRadius: 20, padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f0f3fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{opt.icon}</div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--navy)', marginBottom: 4 }}>{opt.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isProduct = adType === 'product';
  const form = isProduct ? pForm : sForm;
  const fSet = isProduct ? pSet : sSet;

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="page page-enter" style={{ paddingBottom: 100, background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '52px 20px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => adType ? setAdType('') : navigate(-1)} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
            {editAd ? t('editAd') : isProduct ? t('postProduct') : t('postService')}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            {isProduct ? t('fillProduct') : t('fillService')}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Photos */}
        <Section title={t('photos')} icon="📷">
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                <img src={URL.createObjectURL(img)} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Camera size={20} />
                <span style={{ fontSize: 10 }}>Add Photo</span>
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Up to 5 photos · First photo is cover</p>
        </Section>

        {/* Basic Details */}
        <Section title={t('basicDetails')} icon="📝">
          <div className="form-group">
            <label className="form-label">{isProduct ? 'Product Title *' : 'Service Title *'}</label>
            <input className="form-input" placeholder={isProduct ? 'e.g., UltraTech OPC Cement — 50kg bags' : 'e.g., Experienced Mason for House Construction'} value={form.title} onChange={e => fSet('title', e.target.value)} />
          </div>

          {/* Product: single category dropdown | Service: multi-chip grid */}
          {isProduct ? (
            <>
              <CatSelect
                label={`${t('categoryLabel')} *`}
                value={pForm.category}
                onChange={v => { pSet('category', v); pSet('subcategories', []); }}
                options={PRODUCT_CATEGORIES}
                placeholder={t('selectCategory')}
              />
              {!pForm.category && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-muted)' }}>{t('typeManually')}</label>
                  <input className="form-input" placeholder={t('typeCategory')} value={pForm.manualCategory || ''} onChange={e => { pSet('manualCategory', e.target.value); pSet('category', e.target.value); }} />
                </div>
              )}
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Service Categories * (select all you offer)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SERVICE_CATEGORIES.map(cat => {
                  const sel = sForm.categories.includes(cat.name);
                  return (
                    <button key={cat.name} type="button"
                      onClick={() => {
                        const next = sel
                          ? sForm.categories.filter(c => c !== cat.name)
                          : [...sForm.categories, cat.name];
                        sSet('categories', next);
                        sSet('subcategories', []);
                      }}
                      style={{ padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, border: `1.5px solid ${sel ? 'var(--navy)' : 'var(--border)'}`, background: sel ? '#f0f3fc' : 'white', color: sel ? 'var(--navy)' : 'var(--text-secondary)' }}
                    >
                      {cat.icon || cat.emoji || ''} {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subcategories for all selected categories */}
          {(isProduct ? pSubcats : sSubcats).length > 0 && (
            <CheckboxGrid
              label={isProduct ? t('subcategoriesLabel') : t('workTypesLabel')}
              options={isProduct ? pSubcats : sSubcats}
              selected={form.subcategories}
              onChange={v => fSet('subcategories', v)}
              allowOther
            />
          )}

          {/* Item types — multi-select */}
          {(isProduct ? pTypes : sTypes).length > 0 && (
            <CheckboxGrid
              label={isProduct ? t('specificTypesLabel') : t('specificDetailsLabel')}
              options={isProduct ? pTypes : sTypes}
              selected={form.itemTypes}
              onChange={v => fSet('itemTypes', v)}
              allowOther
            />
          )}
        </Section>

        {/* ── Product sections ── */}
        {isProduct && (
          <>
            <Section title="Product Details" icon="📦">
              {/* Brand — FREE TEXT input + optional suggestions */}
              <div className="form-group">
                <label className="form-label">{t('brandLabel')}</label>
                <input
                  className="form-input"
                  placeholder="e.g., UltraTech, TATA, Bosch, or your brand"
                  value={pForm.brand}
                  onChange={e => pSet('brand', e.target.value)}
                />
                {selectedPCat?.brands?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {selectedPCat.brands.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => pSet('brand', b)}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: `1.5px solid ${pForm.brand === b ? 'var(--navy)' : 'var(--border)'}`, background: pForm.brand === b ? '#f0f3fc' : 'white', color: pForm.brand === b ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Quick select above or type your own brand name</p>
              </div>

              <div className="form-group">
                <label className="form-label">{t('materialTypeLabel')}</label>
                <input className="form-input" placeholder="e.g., OPC 43 Grade, Fe-500, 6mm thick" value={pForm.materialType} onChange={e => pSet('materialType', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('conditionLabel')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['new', 'used'].map(c => (
                    <button key={c} type="button" onClick={() => pSet('condition', c)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${pForm.condition === c ? 'var(--navy)' : 'var(--border)'}`, background: pForm.condition === c ? '#f0f3fc' : 'white', fontWeight: 600, fontSize: 13, color: pForm.condition === c ? 'var(--navy)' : 'var(--text-secondary)', cursor: 'pointer', textTransform: 'capitalize' }}>
                      {c === 'new' ? '✨ New' : '🔄 Used'}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title={t('availability')} icon="📊">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity Available</label>
                  <input className="form-input" type="number" placeholder="e.g., 500" value={pForm.quantity} onChange={e => pSet('quantity', e.target.value)} />
                </div>
                <CatSelect label="Unit" value={pForm.unit} onChange={v => pSet('unit', v)} options={(selectedPCat?.units || ['bag','ton','kg','piece']).map(u => ({ name: u, label: UNIT_LABELS[u] || u }))} placeholder="Unit" />
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Order Qty (MOQ)</label>
                <input className="form-input" type="number" placeholder="1" value={pForm.moq} onChange={e => pSet('moq', e.target.value)} />
              </div>
            </Section>

            <Section title={t('pricing')} icon="💰">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Price *</label>
                  <input className="form-input" type="number" placeholder="₹" value={pForm.price} onChange={e => pSet('price', e.target.value)} />
                </div>
                <CatSelect label="Per" value={pForm.priceType} onChange={v => pSet('priceType', v)} options={['per_bag','per_ton','per_kg','per_piece','per_sqft','per_load','per_litre','fixed'].map(p => ({ name: p, label: PRICE_TYPE_LABELS[p] || p }))} placeholder="Per" />
              </div>
              <Toggle value={pForm.negotiable} onChange={v => pSet('negotiable', v)} label="Price Negotiable" />
              <Toggle value={pForm.bulkDiscount} onChange={v => pSet('bulkDiscount', v)} label="Bulk Discount Available" />
            </Section>

            <Section title={t('deliveryOptions')} icon="🚚">
              <Toggle value={pForm.deliveryAvailable} onChange={v => pSet('deliveryAvailable', v)} label="Delivery Available" />
              {pForm.deliveryAvailable && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Delivery Charges (₹)</label>
                    <input className="form-input" type="number" placeholder="0 = Free" value={pForm.deliveryCharges} onChange={e => pSet('deliveryCharges', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Delivery Time</label>
                    <input className="form-input" placeholder="e.g., 2 days" value={pForm.deliveryTime} onChange={e => pSet('deliveryTime', e.target.value)} />
                  </div>
                </div>
              )}
              <Toggle value={pForm.pickupAvailable} onChange={v => pSet('pickupAvailable', v)} label="Pickup Available" />
            </Section>
          </>
        )}

        {/* ── Service sections ── */}
        {!isProduct && (
          <>
            <Section title={t('experience')} icon="💼">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input className="form-input" type="number" placeholder="e.g., 5" value={sForm.experienceYears} onChange={e => sSet('experienceYears', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Team Size</label>
                  <input className="form-input" type="number" placeholder="1" value={sForm.teamSize} onChange={e => sSet('teamSize', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Projects Completed</label>
                <input className="form-input" type="number" placeholder="e.g., 50" value={sForm.projectsDone} onChange={e => sSet('projectsDone', e.target.value)} />
              </div>
            </Section>

            <Section title={t('pricing')} icon="💰">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <CatSelect label="Pricing Type" value={sForm.pricingType} onChange={v => sSet('pricingType', v)} options={['per_day','per_hour','per_sqft','per_project','fixed'].map(p => ({ name: p, label: PRICE_TYPE_LABELS[p] || p }))} placeholder="Type" />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rate (₹)</label>
                  <input className="form-input" type="number" placeholder="₹" value={sForm.price} onChange={e => sSet('price', e.target.value)} />
                </div>
              </div>
              <Toggle value={sForm.negotiable} onChange={v => sSet('negotiable', v)} label="Negotiable" />
            </Section>

            <Section title={t('availability')} icon="📅">
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { value: 'available', label: '✅ Available Now', color: '#10b981' },
                  { value: 'busy', label: '🔴 Busy', color: '#ef4444' },
                  { value: 'from_date', label: '📅 Available From', color: '#f5c518' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => sSet('availability', opt.value)} style={{ padding: '8px 14px', borderRadius: 20, border: `2px solid ${sForm.availability === opt.value ? opt.color : 'var(--border)'}`, background: sForm.availability === opt.value ? opt.color + '18' : 'white', fontSize: 12, fontWeight: 600, color: sForm.availability === opt.value ? opt.color : 'var(--text-secondary)', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Service Radius (km)</label>
                <input className="form-input" type="number" placeholder="20" value={sForm.serviceRadius} onChange={e => sSet('serviceRadius', e.target.value)} />
              </div>
              <Toggle value={sForm.travelAvailable} onChange={v => sSet('travelAvailable', v)} label="Ready to Travel" />
              <Toggle value={sForm.materialIncluded} onChange={v => sSet('materialIncluded', v)} label="Material Included in Price" />
              <Toggle value={sForm.urgentWork} onChange={v => sSet('urgentWork', v)} label="Urgent Work Accepted" />
            </Section>
          </>
        )}

        {/* Location — GPS + Search + Map pin */}
        <Section title={t('location')} icon="📍">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <button type="button" onClick={detectGPS} disabled={detecting}
              style={{ flex: 1, minWidth: 90, padding: '10px 8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--navy)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Navigation size={13} /> {detecting ? 'Detecting...' : 'GPS'}
            </button>
            <button type="button" onClick={() => setShowLocPicker(true)}
              style={{ flex: 1, minWidth: 90, padding: '10px 8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: '#7c3aed', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Search size={13} /> Search
            </button>
            <button type="button" onClick={() => setShowMapPicker(true)}
              style={{ flex: 1, minWidth: 90, padding: '10px 8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: '#10b981', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <MapPin size={13} /> Pin Map
            </button>
          </div>

          {/* Current detected location */}
          {form.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f3fc', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <MapPin size={14} color="var(--navy)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
                {form.city}{form.area ? `, ${form.area}` : ''}
              </span>
            </div>
          )}

          {/* Manual text inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">City *</label>
              <input className="form-input" placeholder="City / Town" value={form.city} onChange={e => fSet('city', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Area</label>
              <input className="form-input" placeholder="Area / Locality" value={form.area} onChange={e => fSet('area', e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title={t('contact')} icon="📞">
          <div className="form-group">
            <label className="form-label">Business / Shop Name</label>
            <input className="form-input" placeholder="Your business or your name" value={form.businessName} onChange={e => fSet('businessName', e.target.value)} />
          </div>

          {/* Contact options — independent checkboxes */}
          <div className="form-group">
            <label className="form-label">How can buyers contact you?</label>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>💬 In-app Chat is always enabled</p>

            {/* Allow Call toggle */}
            <div
              onClick={() => fSet('contactMode', form.contactMode === 'direct' ? 'chat' : 'direct')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: `2px solid ${form.contactMode === 'direct' ? '#10b981' : 'var(--border)'}`, background: form.contactMode === 'direct' ? '#f0fdf4' : 'white', cursor: 'pointer', marginBottom: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color={form.contactMode === 'direct' ? '#10b981' : '#9ca3af'} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: form.contactMode === 'direct' ? '#10b981' : 'var(--text-secondary)' }}>Allow Direct Call</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your phone number will be visible to buyers</p>
                </div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${form.contactMode === 'direct' ? '#10b981' : '#d1d5db'}`, background: form.contactMode === 'direct' ? '#10b981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {form.contactMode === 'direct' && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
              </div>
            </div>

            {/* WhatsApp toggle */}
            <div
              onClick={() => fSet('whatsappAvailable', !form.whatsappAvailable)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, border: `2px solid ${form.whatsappAvailable ? '#25d366' : 'var(--border)'}`, background: form.whatsappAvailable ? '#f0fdf4' : 'white', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>💚</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: form.whatsappAvailable ? '#25d366' : 'var(--text-secondary)' }}>WhatsApp Available</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Buyers can message you on WhatsApp</p>
                </div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${form.whatsappAvailable ? '#25d366' : '#d1d5db'}`, background: form.whatsappAvailable ? '#25d366' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {form.whatsappAvailable && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          </div>
        </Section>

        {/* Description */}
        <Section title={t('description')} icon="📄">
          <textarea
            className="form-input"
            rows={4}
            placeholder={isProduct ? 'Describe your product — quality, specifications, usage...' : 'Describe your service — past work, specialization, what areas you cover...'}
            value={form.description}
            onChange={e => fSet('description', e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </Section>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ borderRadius: 50, fontWeight: 800, fontSize: 16, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? t('posting') : editAd ? t('updateAd') : t('postAdBtn')}
        </button>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onSelect={onLocSelect}
        currentCity={form.city}
      />

      {/* Map Pin Picker */}
      <MapPinPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={onMapConfirm}
        initialLat={form.lat}
        initialLng={form.lng}
      />
    </div>
  );
}
