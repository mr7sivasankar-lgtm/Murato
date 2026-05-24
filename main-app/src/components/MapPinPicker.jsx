import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation, Search } from 'lucide-react';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    if (document.getElementById('gmaps-js')) {
      const wait = setInterval(() => { if (window.google?.maps) { clearInterval(wait); resolve(); } }, 100);
      return;
    }
    const s = document.createElement('script');
    s.id = 'gmaps-js';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
    s.async = true;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
  );
  return res.json();
}

export default function MapPinPicker({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const [address, setAddress] = useState('');
  const [geoData, setGeoData] = useState(null);
  const [locating, setLocating] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation || !mapInstance.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        mapInstance.current.panTo({ lat: newLat, lng: newLng });
        updateFromLatLng(newLat, newLng);
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const updateFromLatLng = async (lat, lng) => {
    try {
      const d = await reverseGeocode(lat, lng);
      const a = d.address || {};
      
      const doorNo = a.house_number || '';
      const street = a.road || '';
      const area = a.suburb || a.neighbourhood || '';
      const city = a.city || a.town || a.village || a.county || '';
      const state = a.state || '';
      const pincode = a.postcode || '';
      
      const fullAddress = d.display_name || '';
      
      // Premium primary street line formatting
      const primary = [doorNo, street].filter(Boolean).join(', ') || area || city || 'Pinned Location';
      const secondary = fullAddress;
      
      setAddress(fullAddress);
      setGeoData({
        lat,
        lng,
        doorNo,
        street,
        area,
        city,
        state,
        pincode,
        fullAddress,
        primary,
        secondary
      });
    } catch {
      setAddress('');
      setGeoData(null);
    }
  };

  // Re-centre map when lat/lng change dynamically from search suggestions
  useEffect(() => {
    if (isOpen && mapInstance.current && initialLat && initialLng) {
      mapInstance.current.panTo({ lat: initialLat, lng: initialLng });
      mapInstance.current.setZoom(16);
      updateFromLatLng(initialLat, initialLng);
    }
  }, [isOpen, initialLat, initialLng]);

  useEffect(() => {
    if (!isOpen) return;
    if (!KEY) return;

    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstance.current) return;
      const lat = initialLat || 13.6288; // Tirupati default
      const lng = initialLng || 79.4192;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng }, zoom: 16,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        zoomControl: false,
        gestureHandling: 'greedy',
      });

      updateFromLatLng(lat, lng);

      if (navigator.geolocation && !initialLat) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            map.setCenter({ lat: newLat, lng: newLng });
            updateFromLatLng(newLat, newLng);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      // Drag center map trigger reverse geocode on idle (Swiggy Style)
      map.addListener('idle', () => {
        const c = map.getCenter();
        updateFromLatLng(c.lat(), c.lng());
      });

      mapInstance.current = map;
    });

    return () => { mapInstance.current = null; };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!geoData) return;
    onConfirm({
      lat: geoData.lat,
      lng: geoData.lng,
      city: geoData.city,
      area: geoData.area,
      street: geoData.street,
      doorNo: geoData.doorNo,
      state: geoData.state,
      pincode: geoData.pincode,
      fullAddress: geoData.fullAddress,
      primary: geoData.primary,
      secondary: geoData.secondary
    });
  };

  if (!isOpen) return null;

  if (!KEY) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        <p style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>📍 Pin Your Location</p>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🗺️</p>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Google Maps API Key Required</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Add <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>VITE_GOOGLE_MAPS_KEY</code> to your environment variables to enable the map picker.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', flexDirection: 'column', background: '#e5e7eb' }}>
      
      {/* MAP Portion */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Floating search / back header (matching second screenshot) */}
        <div style={{
          position: 'absolute', top: 20, left: 16, right: 16, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <button
            onClick={onClose}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'white', border: 'none',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--navy)'
            }}
          >
            ←
          </button>
          
          <div
            onClick={onClose} /* Closes map picker to let user search in LocationPicker list */
            style={{
              flex: 1, height: 44, borderRadius: 24,
              background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
              cursor: 'pointer', color: '#6b7280', fontSize: 14
            }}
          >
            <Search size={16} color="#9ca3af" />
            <span>Search an area or address</span>
          </div>
        </div>

        {/* Fixed Center Pin (Swiggy Style - matching second screenshot) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -100%)',
          zIndex: 10, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Blue Pin matching second screenshot */}
          <div style={{ width: 34, height: 34, borderRadius: '50% 50% 50% 0', background: '#2563eb', transform: 'rotate(-45deg)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '2px solid white' }} />
          <div style={{ width: 10, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', marginTop: -2 }} />
        </div>
        
        {/* Current Location button */}
        <button
          onClick={locateMe}
          disabled={locating}
          style={{
            position: 'absolute', bottom: 20, right: 20, width: 44, height: 44,
            borderRadius: '50%', background: 'white', border: 'none',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, color: 'var(--navy)'
          }}
        >
          <Navigation size={20} fill={locating ? 'var(--navy)' : 'transparent'} style={{ opacity: locating ? 0.5 : 1 }} />
        </button>
      </div>

      {/* Bottom Sheet Card (matching second screenshot exactly) */}
      <div style={{
        background: 'white', padding: '16px 20px 28px',
        borderRadius: '24px 24px 0 0', boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
        flexShrink: 0, zIndex: 10
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '0 auto 14px' }} />
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#eff6ff', padding: 8, borderRadius: '50%', color: '#2563eb', flexShrink: 0 }}>
            <MapPin size={20} fill="#2563eb" color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#1a2b5f', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {geoData?.primary || 'Detecting Location…'}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {geoData?.secondary || 'Searching for address details...'}
            </p>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!geoData}
          style={{
            width: '100%',
            background: geoData ? '#2563eb' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: 15,
            fontWeight: 800,
            fontSize: 16,
            cursor: geoData ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            boxShadow: geoData ? '0 4px 12px rgba(37,99,235,0.25)' : 'none'
          }}
        >
          Confirm & proceed
        </button>
      </div>
    </div>
  );
}
