// Shared follower components used across all 4 sub-tabs

// =============================================================================
// CONFIRM DIALOG — shared yes/no modal. Render conditionally:
//   {confirm && <ConfirmDialog {...confirm} onClose={()=>setConfirm(null)}/>}
// Props: title, message, confirmLabel, danger (bool), onConfirm, onClose.
// =============================================================================
const ConfirmDialog = ({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onClose }) => {
  if (window.useEscClose) window.useEscClose(onClose);
  const accent = danger ? 'oklch(0.7 0.16 25)' : 'var(--brass)';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:440 }}>
        <div className="eyebrow" style={{ color: accent }}>
          {danger ? '◣ Confirm' : '◈ Confirm'}
        </div>
        <h2 style={{ margin:'6px 0 8px', fontSize:22, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>
          {title}
        </h2>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
          lineHeight:1.6 }}>
          {message}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
          <button className="btn ghost sm" onClick={onClose}>{cancelLabel || 'Cancel'}</button>
          <button className="btn sm" onClick={()=>{ onConfirm(); onClose(); }}
            style={{ border:`1px solid ${accent}`, color: accent, padding:'6px 16px' }}>
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
window.ConfirmDialog = ConfirmDialog;

const Stat2 = ({label, value}) => (
  <div>
    <div style={{ color:'var(--brass-dim)', textTransform:'uppercase', fontSize:8, letterSpacing:'0.2em' }}>{label}</div>
    <div style={{ color:'var(--bone)', fontSize:12, marginTop:2 }}>{value}</div>
  </div>
);

// Painterly portrait (class-adaptive)
const FollowerPortrait = ({ arch, evoTier }) => (
  <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice"
    style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id={`fp-${arch.key}`} cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor={arch.color} stopOpacity="0.5"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
    </defs>
    <rect width="160" height="200" fill={`url(#fp-${arch.key})`}/>
    <ellipse cx="80" cy="110" rx="50" ry="65" fill="oklch(0.1 0.025 220)"/>
    <path d="M 30 200 L 30 140 Q 30 80 80 70 Q 130 80 130 140 L 130 200 Z" fill="oklch(0.13 0.03 215)"/>
    <text x="80" y="130" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="60" fill={arch.color} opacity="0.55">{arch.glyph}</text>
    {[...Array(evoTier)].map((_,i)=>(
      <circle key={i} cx="80" cy="85" r={25+i*6} fill="none" stroke={arch.color} strokeWidth="0.8" opacity={0.6-i*0.12}/>
    ))}
    <circle cx="80" cy="80" r="2.5" fill={arch.color}>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite"/>
    </circle>
    {[...Array(14)].map((_,i)=>(
      <circle key={i} cx={(i*23)%160} cy={(i*37)%200} r="0.8" fill={arch.color} opacity={0.3+(i%3)*0.15}/>
    ))}
  </svg>
);

window.Stat2 = Stat2;
window.FollowerPortrait = FollowerPortrait;
