// Main menu — Abyssal Gambit
const MainMenu = ({ go }) => {
  const [hover, setHover] = React.useState(null);
  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', background:'var(--abyss-0)' }}>
      {/* abyssal light shafts */}
      <div style={{
        position:'absolute', inset:0,
        background:`
          radial-gradient(ellipse at 25% 0%, oklch(0.35 0.08 200 / 0.4), transparent 55%),
          radial-gradient(ellipse at 75% 10%, oklch(0.3 0.1 190 / 0.3), transparent 60%),
          radial-gradient(ellipse at 50% 110%, oklch(0.2 0.12 280 / 0.4), transparent 55%),
          radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.92) 100%)
        `
      }}/>

      {/* giant silhouette: ancient whale-god */}
      <svg viewBox="0 0 1440 900" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.22, pointerEvents:'none' }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="levi" cx="50%" cy="40%">
            <stop offset="0%" stopColor="oklch(0.4 0.08 200)" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="oklch(0.1 0.02 220)" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="720" cy="450" rx="620" ry="260" fill="url(#levi)"/>
        <path d="M 200 500 Q 400 380 720 420 Q 1040 460 1240 520 Q 1100 560 900 570 Q 700 580 500 560 Q 300 540 200 500 Z"
              fill="oklch(0.08 0.02 220)" opacity="0.8"/>
        {/* eye */}
        <circle cx="1100" cy="480" r="8" fill="oklch(0.85 0.18 35)" opacity="0.7"/>
        <circle cx="1100" cy="480" r="24" fill="none" stroke="oklch(0.5 0.14 25)" strokeWidth="1" opacity="0.4"/>
      </svg>

      {/* particles */}
      <div className="plankton">
        {Array.from({length:40}).map((_,i) => (
          <span key={i} style={{
            left:`${(i*173)%100}%`,
            animationDuration:`${14+(i%7)*3}s`,
            animationDelay:`${-(i*1.3)}s`,
            width:`${2+(i%3)}px`, height:`${2+(i%3)}px`,
          }}/>
        ))}
      </div>

      <div style={{ position:'relative', zIndex:3, textAlign:'center' }}>
        <div className="eyebrow" style={{ marginBottom: 20, color:'var(--bio-dim)' }}>
          ◆ An Oceanic Roguelike of Evolving Brood ◆
        </div>
        <h1 style={{
          fontFamily:'Cinzel, serif',
          fontSize: 116, fontWeight: 600, margin:'0 0 6px',
          letterSpacing:'0.08em',
          background:'linear-gradient(180deg, oklch(0.92 0.04 85), oklch(0.5 0.1 75))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          textShadow:'0 10px 50px rgba(0,0,0,0.7)',
        }}>
          ABYSSAL GAMBIT
        </h1>
        <div style={{ color:'var(--bone-dim)', fontSize:17, fontStyle:'italic', marginBottom: 8 }}>
          &ldquo;What crawls beneath remembers. What crawls beneath is patient.&rdquo;
        </div>
        <div className="divider fancy" style={{ width:400, margin:'20px auto 40px' }}>
          <span>◈ ◈ ◈</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, width:340, margin:'0 auto' }}>
          {[
            { id:'new', label:'Spawn a New Brood', kind:'primary', onClick:()=>go('class') },
            { id:'cont', label:'Resume the Tide', kind:'ghost' },
            { id:'codex', label:'Bestiary of the Deep', kind:'ghost' },
            { id:'meta', label:'Sanctum — Meta Evolution', kind:'ghost' },
            { id:'opts', label:'Rites &amp; Settings', kind:'ghost' },
          ].map(b => (
            <button key={b.id} className={`btn ${b.kind||''}`}
              style={{ justifyContent:'center', padding:'14px 22px', fontSize:16 }}
              onMouseEnter={()=>setHover(b.id)} onMouseLeave={()=>setHover(null)}
              onClick={b.onClick}
            >
              {hover===b.id && <span style={{ color:'var(--bio)' }}>◆</span>}
              <span dangerouslySetInnerHTML={{__html: b.label}}/>
              {hover===b.id && <span style={{ color:'var(--bio)' }}>◆</span>}
            </button>
          ))}
        </div>

        <div style={{ position:'absolute', bottom:-90, left:0, right:0, textAlign:'center',
          fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)',
          letterSpacing:'0.3em', textTransform:'uppercase', opacity:0.45 }}>
          v0.4.1 — Patch of the Drowned Duke
        </div>
      </div>
    </div>
  );
};

window.MainMenu = MainMenu;
