import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Check, Navigation } from 'lucide-react';

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
  const markerRef   = useRef(null);
  const [address, setAddress] = useState('');
  const [geoData, setGeoData] = useState(null);
  const [locating, setLocating] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation || !mapInstance.current || !markerRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        mapInstance.current.panTo({ lat: newLat, lng: newLng });
        markerRef.current.setPosition({ lat: newLat, lng: newLng });
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
      setAddress(d.display_name || '');
      setGeoData({ lat, lng, raw: d });
    } catch { setAddress(''); }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!KEY) return;

    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstance.current) return;
      const lat = initialLat || 17.385;
      const lng = initialLng || 78.4867;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng }, zoom: 14,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });

      const marker = new window.google.maps.Marker({
        position: { lat, lng }, map, draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      updateFromLatLng(lat, lng);

      if (navigator.geolocation && !initialLat) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            map.setCenter({ lat: newLat, lng: newLng });
            marker.setPosition({ lat: newLat, lng: newLng });
            updateFromLatLng(newLat, newLng);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        updateFromLatLng(p.lat(), p.lng());
      });

      map.addListener('click', (e) => {
        const lat = e.latLng.lat(), lng = e.latLng.lng();
        marker.setPosition(e.latLng);
        updateFromLatLng(lat, lng);
      });

      mapInstance.current = map;
      markerRef.current   = marker;
    });

    return () => { mapInstance.current = null; markerRef.current = null; };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!geoData) return;
    const a    = geoData.raw?.address || {};
    const city = a.city || a.town || a.village || a.county || '';
    const area = a.suburb || a.neighbourhood || a.road || a.state_district || '';
    const pin  = a.postcode || '';
    onConfirm({ lat: geoData.lat, lng: geoData.lng, city, area: `${area}${pin ? ` - ${pin}` : ''}`.trim() });
  };

  if (!isOpen) return null;

  if (!KEY) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        <p style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>📍 Pin Your Location</p>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🗺️</p>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Google Maps API Key Required</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Add <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>VITE_GOOGLE_MAPS_KEY</code> to your Vercel environment variables to enable the map picker.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>📍 Pin Your Location</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Drag the pin or tap anywhere on the map</p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Locate Me Button */}
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

      <div style={{ background: 'white', padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, background: '#f0f3fc', borderRadius: 12, padding: '12px 14px' }}>
          <MapPin size={16} color="var(--navy)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: address ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.5 }}>
            {address || 'Tap the map or drag the pin to see address…'}
          </p>
        </div>
        <button onClick={handleConfirm} disabled={!geoData}
          style={{ width: '100%', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 15, cursor: geoData ? 'pointer' : 'not-allowed', opacity: geoData ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Check size={18} /> Confirm This Location
        </button>
      </div>
    </div>
  );
}
