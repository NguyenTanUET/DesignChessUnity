// Shared follower components used across all 4 sub-tabs

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
