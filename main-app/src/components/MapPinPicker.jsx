import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Check } from 'lucide-react';

export default function MapPinPicker({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markerRef   = useRef(null);
  const [address, setAddress] = useState('');
  const [coords,  setCoords]  = useState({ lat: initialLat || 17.3850, lng: initialLng || 78.4867 });

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      const d = await res.json();
      setAddress(d.display_name || '');
      setCoords({ lat, lng, raw: d });
    } catch { setAddress(''); }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(); return; }
      if (document.getElementById('leaflet-js')) {
        document.getElementById('leaflet-js').addEventListener('load', resolve);
        return;
      }
      const s = document.createElement('script');
      s.id = 'leaflet-js';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = resolve;
      document.head.appendChild(s);
    });

    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstance.current) return;
      const L = window.L;
      const lat = initialLat || 17.3850;
      const lng = initialLng || 78.4867;

      const map = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#1a2b5f;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4)"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28], className: '',
      });

      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      reverseGeocode(lat, lng);

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        reverseGeocode(lat, lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstance.current = map;
      markerRef.current   = marker;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current   = null;
      }
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!coords.raw) return;
    const a    = coords.raw.address || {};
    const city = a.city || a.town || a.village || a.county || '';
    const area = a.suburb || a.neighbourhood || a.road || a.state_district || '';
    const pin  = a.postcode || '';
    onConfirm({ lat: coords.lat, lng: coords.lng, city, area: `${area}${pin ? ` - ${pin}` : ''}`.trim() });
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
          <X size={20} />
        </button>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>📍 Pin Your Location</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Drag the pin or tap anywhere on the map</p>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Address bar + confirm */}
      <div style={{ background: 'white', padding: '16px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, background: '#f0f3fc', borderRadius: 12, padding: '12px 14px' }}>
          <MapPin size={16} color="var(--navy)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: address ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.5 }}>
            {address || 'Tap the map or drag the pin to see address…'}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!coords.raw}
          style={{ width: '100%', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontWeight: 700, fontSize: 15, cursor: coords.raw ? 'pointer' : 'not-allowed', opacity: coords.raw ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Check size={18} /> Confirm This Location
        </button>
      </div>
    </div>
  );
}
