// Class select — choose thy Brood
const ClassSelect = ({ go, setRun }) => {
  const [pick, setPick] = React.useState(0);
  const c = CLASSES[pick];

  const begin = () => {
    const roster = window.buildStartingRoster ? window.buildStartingRoster(c) : [];
    // First 6 followers auto-marked for deployment pool
    roster.slice(0, 6).forEach(f => { f.inPool = true; });
    setRun({
      cls: c,
      hp: c.startHp, hpMax: c.startHp,
      gold: c.startGold,
      deck: [...c.deck],
      relics: [RELICS[0]],
      mapSeed: Math.floor(Math.random()*9999),
      currentNode: 'n-start',
      visited: ['n-start'],
      floor: 0,
      assignmentIdx: 0,
      currentNodeIdx: 0,
      // Op Center state
      res: { coral: 120, dna: 40, lumin: 30 },
      roster,
      augInventory: ['a-lantern-eye','a-brine-humors','a-barnacle-plate','a-cartilage-foil','a-ganglion-knot','a-abyssal-pupil','a-saltwater-lung','a-coral-sail','a-nacre-shell','a-vitreous-lens','a-black-ichor','a-hive-mind','a-eel-ribbon','a-ossuary-spine'],
      relicsOwned: ['r-lantern','r-sigil'],
      relicsLoadout: ['r-lantern'],
      augLoadout: [],
      traderPurchased: {},
      pickedAssignmentId: null,
      deployedAssignmentId: null,
    });
    go('op-hub');
  };

  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      {/* ambient ocean backdrop */}
      <div style={{
        position:'absolute', inset:0,
        background:`
          radial-gradient(ellipse at 50% 0%, oklch(0.28 0.08 200 / 0.5), transparent 55%),
          radial-gradient(ellipse at 50% 100%, oklch(0.15 0.1 280 / 0.5), transparent 55%)
        `
      }}/>

      {/* top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:2 }}>
        <button className="btn ghost sm" onClick={()=>go('menu')}>← Return to Shore</button>
        <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>Chapter I · Bind Thyself to a Brood</div>
        <div style={{ width:120 }}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', height:'100%', gap:0, position:'relative', zIndex:1 }}>
        {/* Left: class list */}
        <div style={{ padding:'80px 24px 24px 48px', display:'flex', flexDirection:'column', gap:8 }}>
          <div className="caps" style={{ marginBottom:8 }}>Awakened Broods</div>
          {CLASSES.map((cc, i) => (
            <button key={cc.id} onClick={()=>setPick(i)}
              style={{
                textAlign:'left', padding:'14px 16px',
                background: i===pick ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                border: i===pick ? `1px solid ${cc.color}` : '1px solid var(--abyss-3)',
                color:'var(--bone)', cursor:'pointer',
                borderLeft: i===pick ? `3px solid ${cc.color}` : '3px solid transparent',
                display:'flex', alignItems:'center', gap:14,
                transition:'all 0.15s',
                boxShadow: i===pick ? '0 0 20px rgba(30,120,150,0.2), var(--shadow-inset)' : 'var(--shadow-inset)',
              }}
            >
              <div style={{ fontSize:40, color: cc.color, fontFamily:'Cinzel, serif',
                width:48, textAlign:'center',
                textShadow: i===pick ? `0 0 18px ${cc.color}` : 'none' }}>{cc.glyph}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:17, lineHeight:1.1, letterSpacing:'0.05em' }}>{cc.name}</div>
                <div style={{ fontSize:11, color:'var(--bone-dim)', marginTop:4, fontStyle:'italic' }}>{cc.epithet}</div>
              </div>
              {i===pick && <div style={{ color:cc.color }}>◆</div>}
            </button>
          ))}
          <div className="divider fancy"><span>◈</span></div>
          <div className="caps">Slumbering — Unlock via the Sanctum</div>
          {['The Glass Eel Syndicate','The Hollow Mariner','Thalassic Heretics'].map(n => (
            <div key={n} style={{ padding:'10px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
              color:'var(--bone-dim)', display:'flex', alignItems:'center', gap:12, opacity:0.55 }}>
              <div style={{ width:20, textAlign:'center', color:'var(--brass-dim)' }}>⚿</div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.05em' }}>{n}</div>
            </div>
          ))}
        </div>

        {/* Center: portrait + lore */}
        <div style={{ padding:'80px 24px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div className="portrait ornate" style={{ width:340, height:420, aspectRatio:'unset' }}>
            {/* Painterly scene: abyssal silhouette */}
            <svg viewBox="0 0 340 420" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
              <defs>
                <radialGradient id={`lig-${c.id}`} cx="50%" cy="35%">
                  <stop offset="0%" stopColor={c.color} stopOpacity="0.55"/>
                  <stop offset="100%" stopColor="transparent"/>
                </radialGradient>
              </defs>
              <rect width="340" height="420" fill="url(#lig-)" opacity="0"/>
              <rect width="340" height="420" fill={`url(#lig-${c.id})`}/>
              {/* crude silhouette body */}
              {c.id === 'leviathan' && (
                <g opacity="0.92">
                  <ellipse cx="170" cy="240" rx="140" ry="70" fill="oklch(0.1 0.02 220)"/>
                  <path d="M 30 240 Q 170 170 310 240 Q 280 280 170 290 Q 60 280 30 240 Z" fill="oklch(0.14 0.03 210)"/>
                  <circle cx="240" cy="225" r="5" fill="oklch(0.85 0.18 35)"/>
                  <circle cx="240" cy="225" r="14" fill="none" stroke="oklch(0.5 0.14 25)" strokeWidth="1" opacity="0.5"/>
                  {/* teeth */}
                  {[...Array(8)].map((_,i)=>(
                    <polygon key={i} points={`${60+i*18},260 ${68+i*18},280 ${76+i*18},260`} fill="oklch(0.85 0.015 85)" opacity="0.8"/>
                  ))}
                </g>
              )}
              {c.id === 'abyssal-cult' && (
                <g opacity="0.92">
                  {/* nautilus spiral */}
                  <circle cx="170" cy="230" r="90" fill="oklch(0.12 0.04 280)"/>
                  {[...Array(7)].map((_,i)=>(
                    <circle key={i} cx={170+i*4} cy={230-i*3} r={85-i*11} fill="none"
                      stroke="oklch(0.5 0.12 290)" strokeWidth="1.5" opacity={0.3+i*0.08}/>
                  ))}
                  {/* tendrils */}
                  {[...Array(8)].map((_,i)=>{
                    const a = (i/8)*Math.PI*2;
                    return <path key={i} d={`M ${170+Math.cos(a)*80} ${230+Math.sin(a)*80} Q ${170+Math.cos(a)*130} ${230+Math.sin(a)*130} ${170+Math.cos(a)*160+ (i%2?20:-20)} ${230+Math.sin(a)*160}`}
                      stroke="oklch(0.3 0.1 290)" strokeWidth="3" fill="none" opacity="0.7"/>;
                  })}
                  {/* eye */}
                  <circle cx="170" cy="230" r="12" fill="oklch(0.8 0.16 320)"/>
                  <circle cx="170" cy="230" r="4" fill="oklch(0.1 0.02 220)"/>
                </g>
              )}
              {c.id === 'coral-wardens' && (
                <g opacity="0.92">
                  {/* coral tower silhouette */}
                  <path d="M 100 380 L 110 200 L 130 190 L 140 140 L 160 130 L 170 80 L 180 130 L 200 140 L 210 190 L 230 200 L 240 380 Z"
                    fill="oklch(0.2 0.06 40)"/>
                  <path d="M 110 380 L 120 240 L 150 230 L 170 180 L 190 230 L 220 240 L 230 380 Z"
                    fill="oklch(0.35 0.1 35)" opacity="0.7"/>
                  {/* barnacles */}
                  {[...Array(12)].map((_,i)=>(
                    <circle key={i} cx={110+(i*11)%140} cy={180+i*14} r="3" fill="oklch(0.8 0.015 85)" opacity="0.7"/>
                  ))}
                  {/* crown glow */}
                  <circle cx="170" cy="80" r="14" fill="oklch(0.75 0.14 45)" opacity="0.6"/>
                </g>
              )}
              {/* ambient particles */}
              {[...Array(20)].map((_,i)=>(
                <circle key={i} cx={(i*41)%340} cy={(i*73)%420} r="1" fill={c.color} opacity="0.5"/>
              ))}
            </svg>
            <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center',
              fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em', zIndex:2 }}>
              [ ILLUMINATION · {c.name.toUpperCase()} ]
            </div>
          </div>
          <div style={{ marginTop: 24, textAlign:'center', maxWidth:420 }}>
            <div className="eyebrow" style={{ color: c.color }}>{c.epithet}</div>
            <h2 style={{ margin:'6px 0 12px', fontSize:38, fontFamily:'Cinzel, serif', letterSpacing:'0.04em' }}>{c.name}</h2>
            <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:14, lineHeight:1.6 }}>
              &ldquo;{c.lore}&rdquo;
            </div>
          </div>
        </div>

        {/* Right: stats + deck preview */}
        <div style={{ padding:'80px 48px 24px 24px' }}>
          <div className="panel ornate" style={{ marginBottom:14, padding:'20px 18px' }}>
            <div className="caps" style={{ marginBottom:10 }}>Starting Tide</div>
            <Stat label="Sovereign's Vigor" value={`${c.startHp} ♥`}/>
            <Stat label="Coral Coin" value={`${c.startGold} ◎`}/>
            <Stat label="Brood Size" value={`${c.deck.length} pieces`}/>
            <div className="divider"/>
            <div className="caps" style={{ marginBottom:6 }}>Lineage Rite</div>
            <div style={{ fontSize:13, color:'var(--bone)', lineHeight:1.5, fontStyle:'italic' }}>
              {c.passive}
            </div>
          </div>
          <div className="panel" style={{ padding:'16px 14px' }}>
            <div className="caps" style={{ marginBottom:10 }}>Brood Roster</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:5 }}>
              {c.deck.map((k,i) => {
                const p = PIECES[k];
                return (
                  <div key={i} title={p.name} style={{
                    aspectRatio:'1', background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                    border:'1px solid var(--abyss-3)',
                    display:'grid', placeItems:'center', fontSize:22, color:'var(--bone)',
                    fontFamily:'Cinzel, serif',
                    boxShadow: 'inset 0 1px 0 rgba(160,200,220,0.06)',
                  }}>{p.glyph}</div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end' }}>
            <button className="btn primary" onClick={begin}>Descend ↓</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({label, value}) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', margin:'4px 0', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
    <span style={{ color:'var(--bone-dim)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.15em' }}>{label}</span>
    <span style={{ color:'var(--bone)' }}>{value}</span>
  </div>
);

window.ClassSelect = ClassSelect;
