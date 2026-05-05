import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('show'); // 'show' | 'fadeout'

  useEffect(() => {
    // Hold for 2.2s then fade out
    const hold = setTimeout(() => setPhase('fadeout'), 2200);
    // Tell parent to unmount after fade completes
    const done = setTimeout(() => onFinish?.(), 2800);
    return () => { clearTimeout(hold); clearTimeout(done); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'linear-gradient(180deg, #ffffff 0%, #fff8f0 55%, #fde8c8 100%)',
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo + Text (vertically centered in top 60%) ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingBottom: 20,
      }}>
        {/* Logo Mark */}
        <div
          style={{
            width: 140, height: 140, marginBottom: 20,
            animation: 'splash-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffb347" />
                <stop offset="100%" stopColor="#e87e04" />
              </linearGradient>
            </defs>

            {/* Orange M shape */}
            <path
              d="M10 110 L10 30 L70 75 L130 30 L130 110"
              stroke="url(#mg)" strokeWidth="22" strokeLinecap="square"
              strokeLinejoin="miter" fill="none"
            />

            {/* Navy roof / house that sits in the M valley */}
            <polygon points="70,60 105,88 35,88" fill="#1a2b5f" />
            {/* House body */}
            <rect x="44" y="88" width="52" height="36" fill="#1a2b5f" rx="2" />
            {/* Window grid */}
            <rect x="59" y="96" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="73" y="96" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="59" y="108" width="8" height="8" fill="#f5c518" rx="1" />
            <rect x="73" y="108" width="8" height="8" fill="#f5c518" rx="1" />
          </svg>
        </div>

        {/* App Name */}
        <div
          style={{
            fontSize: 52, fontWeight: 900, letterSpacing: -1,
            color: '#1a2b5f', lineHeight: 1,
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            animation: 'splash-rise 0.5s 0.2s ease both',
          }}
        >
          My<span style={{ color: '#e87e04' }}>i</span>llo
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 10, fontSize: 16, fontWeight: 500,
            color: '#4b5563', fontFamily: "'Inter', 'Segoe UI', sans-serif",
            animation: 'splash-rise 0.5s 0.35s ease both',
          }}
        >
          Build Better.{' '}
          <span style={{ color: '#e87e04', fontWeight: 700 }}>Together.</span>
        </div>
      </div>

      {/* ── Construction Silhouette ── */}
      <div style={{ width: '100%', position: 'relative', flexShrink: 0, height: 220 }}>
        <svg
          viewBox="0 0 430 220"
          preserveAspectRatio="xMidYMax meet"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%' }}
        >
          {/* Background buildings */}
          <rect x="0"   y="90"  width="55" height="120" fill="#fdd9a0" opacity="0.6" />
          <rect x="5"   y="110" width="10" height="14"  fill="#f5c060" opacity="0.5" />
          <rect x="20"  y="105" width="10" height="14"  fill="#f5c060" opacity="0.5" />
          <rect x="35"  y="115" width="10" height="14"  fill="#f5c060" opacity="0.5" />
          <rect x="60"  y="70"  width="40" height="140" fill="#fdd9a0" opacity="0.5" />
          <rect x="63"  y="80"  width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="78"  y="80"  width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="63"  y="100" width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="78"  y="100" width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="330" y="80"  width="50" height="130" fill="#fdd9a0" opacity="0.5" />
          <rect x="335" y="90"  width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="350" y="90"  width="10" height="12"  fill="#f5c060" opacity="0.4" />
          <rect x="380" y="60"  width="50" height="150" fill="#fdd9a0" opacity="0.4" />

          {/* Crane tower (right) */}
          <rect x="310" y="20" width="6"  height="170" fill="#e87e04" opacity="0.7" />
          <rect x="250" y="20" width="66" height="6"   fill="#e87e04" opacity="0.7" />
          <line x1="313" y1="26" x2="310" y2="90" stroke="#e87e04" strokeWidth="2" opacity="0.5" />
          <line x1="280" y1="26" x2="313" y2="90" stroke="#e87e04" strokeWidth="2" opacity="0.5" />
          {/* Hook */}
          <line x1="258" y1="26" x2="258" y2="90" stroke="#e87e04" strokeWidth="2" opacity="0.6" />
          <rect x="252" y="90" width="12" height="8"   fill="#e87e04" opacity="0.6" rx="2" />

          {/* Crane tower (left) */}
          <rect x="120" y="30" width="5"  height="160" fill="#e87e04" opacity="0.5" />
          <rect x="120" y="30" width="55" height="5"   fill="#e87e04" opacity="0.5" />
          <line x1="122" y1="35" x2="122" y2="100" stroke="#e87e04" strokeWidth="2" opacity="0.3" />
          <line x1="165" y1="35" x2="122" y2="100" stroke="#e87e04" strokeWidth="2" opacity="0.3" />
          <line x1="140" y1="35" x2="140" y2="95"  stroke="#e87e04" strokeWidth="2" opacity="0.4" />
          <rect x="134" y="95" width="12" height="8" fill="#e87e04" opacity="0.5" rx="2" />

          {/* Ground + wave */}
          <path
            d="M0,165 Q107,145 215,158 Q323,170 430,155 L430,220 L0,220 Z"
            fill="#e87e04"
          />

          {/* Worker 1 – bending (shovelling) */}
          <g fill="#c05c00" opacity="0.85">
            {/* hard hat */}
            <ellipse cx="115" cy="148" rx="9" ry="5" />
            <rect x="110" y="150" width="10" height="2" />
            {/* torso bent */}
            <path d="M120,152 Q130,162 125,170" stroke="#c05c00" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* arm + shovel */}
            <line x1="125" y1="170" x2="140" y2="178" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
            <rect x="138" y="176" width="14" height="3" fill="#c05c00" rx="1" transform="rotate(-20 138 178)" />
            {/* legs */}
            <line x1="120" y1="168" x2="112" y2="182" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
            <line x1="120" y1="168" x2="124" y2="183" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Worker 2 – standing with clipboard */}
          <g fill="#c05c00" opacity="0.85">
            {/* hard hat */}
            <ellipse cx="175" cy="138" rx="9" ry="5" />
            <rect x="170" y="141" width="10" height="2" />
            {/* head */}
            <circle cx="175" cy="147" r="6" />
            {/* body */}
            <rect x="170" y="154" width="11" height="22" rx="2" />
            {/* arm holding clipboard */}
            <line x1="181" y1="158" x2="192" y2="162" stroke="#c05c00" strokeWidth="4" strokeLinecap="round" />
            <rect x="190" y="158" width="9" height="12" fill="#c05c00" rx="1" />
            {/* other arm */}
            <line x1="170" y1="158" x2="163" y2="165" stroke="#c05c00" strokeWidth="4" strokeLinecap="round" />
            {/* legs */}
            <line x1="172" y1="176" x2="170" y2="192" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
            <line x1="179" y1="176" x2="181" y2="192" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Cement mixer truck */}
          <g fill="#c05c00" opacity="0.8">
            {/* cabin */}
            <rect x="220" y="162" width="38" height="30" rx="4" />
            {/* windshield */}
            <rect x="224" y="165" width="16" height="14" rx="2" fill="#e87e04" opacity="0.6" />
            {/* drum */}
            <ellipse cx="275" cy="168" rx="22" ry="18" />
            {/* drum lines */}
            <line x1="255" y1="162" x2="295" y2="174" stroke="#e87e04" strokeWidth="2" opacity="0.5" />
            <line x1="255" y1="174" x2="295" y2="162" stroke="#e87e04" strokeWidth="2" opacity="0.5" />
            {/* wheels */}
            <circle cx="234" cy="194" r="8" fill="#a04a00" />
            <circle cx="234" cy="194" r="4" fill="#c05c00" />
            <circle cx="258" cy="194" r="8" fill="#a04a00" />
            <circle cx="258" cy="194" r="4" fill="#c05c00" />
            <circle cx="278" cy="194" r="8" fill="#a04a00" />
            <circle cx="278" cy="194" r="4" fill="#c05c00" />
            {/* chute */}
            <path d="M255,180 L240,200" stroke="#c05c00" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Wheelbarrow */}
          <g fill="#c05c00" opacity="0.7">
            <path d="M75,190 L100,175 L120,175 L110,192 Z" />
            <circle cx="77" cy="192" r="7" fill="#a04a00" />
            <line x1="100" y1="175" x2="88" y2="200" stroke="#c05c00" strokeWidth="4" strokeLinecap="round" />
            <line x1="120" y1="175" x2="108" y2="200" stroke="#c05c00" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Bricks pile */}
          <g fill="#c05c00" opacity="0.6">
            <rect x="30" y="185" width="40" height="8"  rx="1" />
            <rect x="33" y="177" width="34" height="8"  rx="1" />
            <rect x="37" y="169" width="26" height="8"  rx="1" />
          </g>

          {/* Birds */}
          <path d="M190,50 Q193,46 196,50" stroke="#e87e04" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M205,42 Q208,38 211,42" stroke="#e87e04" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M360,35 Q363,31 366,35" stroke="#e87e04" strokeWidth="1.5" fill="none" opacity="0.4" />
        </svg>
      </div>

      <style>{`
        @keyframes splash-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes splash-rise {
          from { transform: translateY(18px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
