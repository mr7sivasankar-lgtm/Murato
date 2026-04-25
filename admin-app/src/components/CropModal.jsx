import { useState, useRef, useCallback } from 'react';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const MIN = 10;

export default function CropModal({ imageSrc, onConfirm, onCancel }) {
  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const drag         = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });

  const getXY = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - rect.left) / rect.width)  * 100,
      y: ((src.clientY - rect.top)  / rect.height) * 100,
    };
  };

  const startDrag = (type) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const pt = getXY(e);
    drag.current = { type, sx: pt.x, sy: pt.y, sc: { ...crop } };
  };

  const onMove = useCallback((e) => {
    if (!drag.current) return;
    e.preventDefault();
    const { sx, sy, sc, type } = drag.current;
    const pt = getXY(e);
    const dx = pt.x - sx, dy = pt.y - sy;
    let { x, y, w, h } = sc;
    if (type === 'move') {
      x = clamp(sc.x + dx, 0, 100 - w); y = clamp(sc.y + dy, 0, 100 - h);
    } else if (type === 'br') {
      w = clamp(sc.w + dx, MIN, 100 - x); h = clamp(sc.h + dy, MIN, 100 - y);
    } else if (type === 'bl') {
      w = clamp(sc.w - dx, MIN, 100); x = clamp(sc.x + dx, 0, sc.x + sc.w - MIN); h = clamp(sc.h + dy, MIN, 100 - y);
    } else if (type === 'tr') {
      w = clamp(sc.w + dx, MIN, 100 - x); h = clamp(sc.h - dy, MIN, 100); y = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
    } else if (type === 'tl') {
      w = clamp(sc.w - dx, MIN, 100); x = clamp(sc.x + dx, 0, sc.x + sc.w - MIN);
      h = clamp(sc.h - dy, MIN, 100); y = clamp(sc.y + dy, 0, sc.y + sc.h - MIN);
    }
    setCrop({ x, y, w, h });
  }, []);

  const endDrag = () => { drag.current = null; };

  const handleConfirm = () => {
    const img = imgRef.current;
    const sx  = (crop.x / 100) * img.naturalWidth;
    const sy  = (crop.y / 100) * img.naturalHeight;
    const sw  = (crop.w / 100) * img.naturalWidth;
    const sh  = (crop.h / 100) * img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(blob => {
      const file    = new File([blob], 'banner-cropped.jpg', { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', 0.95);
      onConfirm({ file, preview });
    }, 'image/jpeg', 0.95);
  };

  const H = 20;
  const handles = [
    { type: 'tl', s: { top: -H/2, left: -H/2 } }, { type: 'tr', s: { top: -H/2, right: -H/2 } },
    { type: 'bl', s: { bottom: -H/2, left: -H/2 } }, { type: 'br', s: { bottom: -H/2, right: -H/2 } },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: 0 }}>✂️ Crop Banner Image</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 }}>Drag the box · resize corners · click "Use Crop" when ready</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onConfirm({ file: null, preview: imageSrc })} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Use Full Image</button>
            <button onClick={handleConfirm} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>✓ Use Crop</button>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', touchAction: 'none', userSelect: 'none', cursor: 'crosshair' }}
          onMouseMove={onMove} onTouchMove={onMove}
          onMouseUp={endDrag} onTouchEnd={endDrag}
          onMouseLeave={endDrag}
        >
          <img ref={imgRef} src={imageSrc} alt="crop" draggable={false}
            style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain' }} />

          {[
            { top: 0, left: 0, right: 0, height: `${crop.y}%` },
            { top: `${crop.y + crop.h}%`, left: 0, right: 0, bottom: 0 },
            { top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.h}%` },
            { top: `${crop.y}%`, left: `${crop.x + crop.w}%`, right: 0, height: `${crop.h}%` },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', background: 'rgba(0,0,0,0.65)', pointerEvents: 'none', ...s }} />
          ))}

          <div
            onMouseDown={startDrag('move')} onTouchStart={startDrag('move')}
            style={{ position: 'absolute', left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%`, border: '2px solid white', boxSizing: 'border-box', cursor: 'move', touchAction: 'none' }}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {[33.3, 66.6].map(p => (
                <div key={p}>
                  <div style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.3)' }} />
                  <div style={{ position: 'absolute', top: `${p}%`, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.3)' }} />
                </div>
              ))}
            </div>
            {handles.map(({ type, s }) => (
              <div key={type}
                onMouseDown={startDrag(type)} onTouchStart={startDrag(type)}
                style={{ position: 'absolute', width: H, height: H, background: 'white', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', cursor: 'pointer', touchAction: 'none', ...s }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
