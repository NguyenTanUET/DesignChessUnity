// Operation Center Hub — 2D submarine station with 4 clickable rooms
const OperationCenter = ({ run, setRun, go }) => {
  const [hover, setHover] = React.useState(null);
  const [hullFlicker, setHullFlicker] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(()=>setHullFlicker(f=>f+1), 3200);
    return ()=>clearInterval(t);
  }, []);

  const rooms = [
    {
      id:'op-follower', label:'Manage Followers', target:'op-follower',
      epithet:'Medical bay & surgical theatre',
      x: 200, y: 300, w: 420, h: 240,
    },
    {
      id:'op-trader', label:'Trader\'s Hold', target:'op-trader',
      epithet:'Cargo manifest · brine market',
      x: 760, y: 300, w: 420, h: 240,
    },
    {
      id:'op-command', label:'Command Chamber', target:'op-command',
      epithet:'War-map · assignments',
      x: 450, y: 620, w: 540, h: 180,
    },
  ];

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)', overflow:'hidden' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-hub" subtitle="Vessel Karrenhal-IX · Home Depths"/>

      {/* Station background — hand-drawn submarine cross-section */}
      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0 }}>
        <StationBackdrop hullFlicker={hullFlicker}/>

        {/* Room hotspots (overlay) */}
        <div style={{ position:'absolute', inset:0 }}>
          {rooms.map(rm => {
            const isHover = hover === rm.id;
            return (
              <button key={rm.id}
                onMouseEnter={()=>setHover(rm.id)}
                onMouseLeave={()=>setHover(null)}
                onClick={()=>go(rm.target)}
                style={{
                  position:'absolute',
                  left: rm.x, top: rm.y, width: rm.w, height: rm.h,
                  background:'transparent',
                  border: isHover ? '1px solid var(--brass)' : '1px dashed rgba(180,140,60,0.25)',
                  boxShadow: isHover
                    ? 'inset 0 0 60px rgba(30,120,150,0.4), 0 0 30px rgba(30,120,150,0.4)'
                    : 'inset 0 0 30px rgba(0,0,0,0.6)',
                  cursor:'pointer',
                  padding:0,
                  transition:'all 0.25s ease',
                  overflow:'hidden',
                }}>
                {/* hover ink wash */}
                <div style={{
                  position:'absolute', inset:0,
                  background: isHover
                    ? 'radial-gradient(ellipse at center, oklch(0.5 0.12 190 / 0.22), transparent 70%)'
                    : 'transparent',
                  pointerEvents:'none', transition:'opacity 0.25s',
                }}/>
                {/* Room label plate */}
                <div style={{
                  position:'absolute', left:'50%', bottom:14, transform:'translateX(-50%)',
                  background:'rgba(0,0,0,0.8)',
                  border:`1px solid ${isHover ? 'var(--brass)' : 'var(--brass-deep)'}`,
                  padding:'8px 18px',
                  minWidth:180, textAlign:'center',
                  transition:'all 0.2s',
                }}>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.3em', color:'var(--bio-dim)', textTransform:'uppercase' }}>
                    {isHover ? '▸ ENTER' : 'STATION'}
                  </div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:isHover?'var(--brass)':'var(--bone)', letterSpacing:'0.08em', marginTop:2 }}>
                    {rm.label}
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, color:'var(--bone-dim)', fontStyle:'italic', marginTop:3 }}>
                    {rm.epithet}
                  </div>
                </div>

                {/* Corner filigree when hover */}
                {isHover && (
                  <>
                    {[[0,0,'tl'],[1,0,'tr'],[0,1,'bl'],[1,1,'br']].map(([x,y,k])=>(
                      <span key={k} style={{
                        position:'absolute',
                        [x?'right':'left']: 4, [y?'bottom':'top']: 4,
                        width:12, height:12,
                        [`border${y?'Bottom':'Top'}`]: '1px solid var(--brass)',
                        [`border${x?'Right':'Left'}`]: '1px solid var(--brass)',
                      }}/>
                    ))}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* bottom-left status log */}
      <div style={{
        position:'absolute', left:20, bottom:20, zIndex:3,
        padding:'10px 14px',
        background:'rgba(0,0,0,0.55)',
        border:'1px solid var(--abyss-4)',
        fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)',
        letterSpacing:'0.15em', textTransform:'uppercase',
        maxWidth: 360,
      }}>
        <div style={{ color:'var(--bio-dim)', marginBottom:4 }}>‣ VESSEL LOG</div>
        <div>· Hull integrity nominal.</div>
        <div>· Brood roster: {(run.roster||[]).length} followers catalogued.</div>
        <div>· Current assignment: {run.deployedAssignmentId ? '◆ COMMITTED' : '— AWAITING ORDERS —'}</div>
      </div>

      {/* ambient plankton */}
      <div className="plankton" style={{ top:60 }}>
        {Array.from({length:28}).map((_,i) => (
          <span key={i} style={{
            left:`${(i*167)%100}%`,
            animationDuration:`${18+(i%6)*3}s`,
            animationDelay:`${-(i*1.1)}s`,
            width:`${1.5+(i%3)}px`, height:`${1.5+(i%3)}px`,
          }}/>
        ))}
      </div>
    </div>
  );
};

// Painterly station backdrop — submarine cross-section, abyssal brass + teal
const StationBackdrop = ({ hullFlicker }) => (
  <svg viewBox="0 0 1440 840" preserveAspectRatio="xMidYMid slice"
    style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
    <defs>
      {/* water column gradient */}
      <linearGradient id="abyss-col" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"  stopColor="oklch(0.2 0.05 200)"/>
        <stop offset="40%" stopColor="oklch(0.11 0.035 215)"/>
        <stop offset="100%" stopColor="oklch(0.06 0.02 225)"/>
      </linearGradient>
      <radialGradient id="bio-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"  stopColor="oklch(0.7 0.15 195)" stopOpacity="0.5"/>
        <stop offset="70%" stopColor="oklch(0.5 0.12 195)" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
      <linearGradient id="brass-panel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="oklch(0.32 0.06 80)"/>
        <stop offset="100%" stopColor="oklch(0.18 0.04 70)"/>
      </linearGradient>
      <linearGradient id="hull-wall" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"  stopColor="oklch(0.22 0.04 215)"/>
        <stop offset="100%" stopColor="oklch(0.11 0.025 220)"/>
      </linearGradient>
      <pattern id="rivets" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="1.2" fill="oklch(0.5 0.08 75)" opacity="0.55"/>
      </pattern>
      <filter id="soft"><feGaussianBlur stdDeviation="0.4"/></filter>
    </defs>

    {/* water column */}
    <rect width="1440" height="840" fill="url(#abyss-col)"/>

    {/* light shafts from above */}
    {[220, 560, 920, 1240].map((x,i)=>(
      <path key={i} d={`M ${x} 0 L ${x-60} 840 L ${x+60} 840 Z`}
        fill="oklch(0.5 0.1 195)" opacity="0.05"/>
    ))}

    {/* distant silhouette — kraken arm */}
    <g opacity="0.18">
      <path d="M 0 700 Q 200 560 380 620 Q 520 660 620 760 Q 560 820 400 820 Q 180 820 0 760 Z"
        fill="oklch(0.08 0.03 220)"/>
      <path d="M 1200 60 Q 1340 80 1400 220 Q 1360 260 1280 240 Q 1230 180 1200 60 Z"
        fill="oklch(0.1 0.04 280)"/>
    </g>

    {/* big bioluminescent jellyfish in background */}
    <g opacity="0.55">
      <circle cx="1150" cy="160" r="60" fill="url(#bio-glow)"/>
      <path d="M 1100 160 Q 1100 115 1150 115 Q 1200 115 1200 160 L 1200 170 Q 1185 155 1170 175 Q 1155 160 1140 180 Q 1125 165 1110 180 Q 1100 170 1100 160 Z"
        fill="oklch(0.55 0.12 290)" opacity="0.75"/>
      {[...Array(6)].map((_,i)=>(
        <path key={i} d={`M ${1115+i*12} 170 Q ${1115+i*12} 230 ${1110+i*12+(i%2?4:-4)} 260`}
          stroke="oklch(0.6 0.14 290)" strokeWidth="1" fill="none" opacity="0.5"/>
      ))}
    </g>

    {/* === HULL CROSS-SECTION === */}
    {/* Outer shell */}
    <path d="M 60 140
             Q 90 70 190 70
             L 1250 70
             Q 1380 70 1400 200
             L 1400 680
             Q 1380 810 1250 810
             L 190 810
             Q 80 810 60 700 Z"
      fill="url(#hull-wall)" stroke="oklch(0.4 0.06 75)" strokeWidth="2"/>
    {/* rivet pattern band */}
    <path d="M 60 140
             Q 90 70 190 70
             L 1250 70
             Q 1380 70 1400 200
             L 1400 680
             Q 1380 810 1250 810
             L 190 810
             Q 80 810 60 700 Z"
      fill="url(#rivets)"/>

    {/* inner dark hull */}
    <path d="M 110 180
             Q 140 130 220 130
             L 1220 130
             Q 1330 130 1350 220
             L 1350 660
             Q 1330 760 1220 760
             L 220 760
             Q 120 760 110 670 Z"
      fill="oklch(0.08 0.025 220)" stroke="oklch(0.25 0.05 70)" strokeWidth="1"/>

    {/* === ROOM DIVIDERS (walls) === */}
    {/* vertical wall separating top 2 rooms */}
    <g stroke="oklch(0.3 0.06 75)" strokeWidth="2" fill="none">
      <line x1="720" y1="200" x2="720" y2="560"/>
      {/* horizontal floor between top & bottom */}
      <line x1="140" y1="560" x2="1330" y2="560"/>
    </g>
    {/* thin light strips */}
    <g>
      <rect x="140" y="558" width="1190" height="1" fill="oklch(0.7 0.12 195)" opacity="0.3"/>
      <rect x="720" y="200" width="1" height="360" fill="oklch(0.7 0.12 195)" opacity="0.2"/>
    </g>

    {/* === ROOM 1: Medical Bay (Manage Followers) === */}
    <g opacity="0.85">
      {/* gurney */}
      <rect x="260" y="440" width="260" height="18" fill="oklch(0.32 0.04 200)" stroke="oklch(0.5 0.06 75)"/>
      <rect x="260" y="458" width="260" height="60" fill="oklch(0.14 0.03 210)"/>
      {/* surgical lamp */}
      <circle cx="390" cy="260" r="22" fill="oklch(0.22 0.04 210)" stroke="oklch(0.5 0.08 75)"/>
      <circle cx="390" cy="260" r="14" fill="oklch(0.85 0.12 85)" opacity="0.75"/>
      <line x1="390" y1="238" x2="390" y2="210" stroke="oklch(0.4 0.06 75)" strokeWidth="2"/>
      {/* specimen jars */}
      {[0,1,2,3].map(i=>(
        <g key={i} transform={`translate(${260+i*55} 340)`}>
          <rect x="0" y="0" width="30" height="60" fill="oklch(0.18 0.06 200)" stroke="oklch(0.4 0.06 75)" rx="2"/>
          <ellipse cx="15" cy="30" rx="8" ry="18" fill="oklch(0.45 0.12 195)" opacity="0.7"/>
          <circle cx="15" cy="30" r="2.5" fill="oklch(0.85 0.1 85)" opacity="0.8"/>
        </g>
      ))}
      {/* monitor */}
      <rect x="510" y="340" width="70" height="50" fill="oklch(0.08 0.02 220)" stroke="oklch(0.5 0.08 75)"/>
      <polyline points="515,370 530,365 540,355 550,375 565,360 575,370" fill="none" stroke="oklch(0.7 0.14 150)" strokeWidth="1.2"/>
    </g>

    {/* === ROOM 2: Trader's Hold === */}
    <g opacity="0.85">
      {/* shelving */}
      {[0,1,2].map(row=>(
        <g key={row}>
          <rect x={780} y={260+row*60} width={320} height={4} fill="oklch(0.3 0.05 75)"/>
          {[...Array(7)].map((_,i)=>{
            const shape = (row*7+i)%3;
            const x = 790+i*44, y = 266+row*60;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                {shape===0 && <rect width="16" height="30" fill="oklch(0.4 0.12 35)" stroke="oklch(0.55 0.1 75)"/>}
                {shape===1 && <ellipse cx="8" cy="18" rx="9" ry="14" fill="oklch(0.35 0.08 290)" stroke="oklch(0.55 0.1 75)"/>}
                {shape===2 && (
                  <g>
                    <rect width="18" height="22" fill="oklch(0.22 0.04 210)" stroke="oklch(0.55 0.1 75)"/>
                    <circle cx="9" cy="11" r="4" fill="oklch(0.7 0.14 195)" opacity="0.7"/>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      ))}
      {/* scale / balance */}
      <line x1="960" y1="450" x2="960" y2="510" stroke="oklch(0.5 0.08 75)" strokeWidth="2"/>
      <line x1="920" y1="460" x2="1000" y2="460" stroke="oklch(0.5 0.08 75)" strokeWidth="2"/>
      <line x1="920" y1="460" x2="910" y2="490" stroke="oklch(0.4 0.06 75)" strokeWidth="1"/>
      <line x1="1000" y1="460" x2="1010" y2="488" stroke="oklch(0.4 0.06 75)" strokeWidth="1"/>
      <path d="M 895 490 Q 910 485 925 490 L 925 500 L 895 500 Z" fill="oklch(0.35 0.08 75)"/>
      <path d="M 995 488 Q 1010 483 1025 488 L 1025 498 L 995 498 Z" fill="oklch(0.35 0.08 75)"/>
    </g>

    {/* === ROOM 4: Command Chamber (bottom wide) === */}
    <g opacity="0.9">
      {/* war table */}
      <rect x="470" y="650" width="500" height="140" fill="oklch(0.16 0.03 210)" stroke="oklch(0.5 0.08 75)" strokeWidth="2"/>
      <rect x="480" y="660" width="480" height="120" fill="oklch(0.22 0.06 200)" stroke="oklch(0.4 0.06 75)"/>
      {/* map lines */}
      {[...Array(6)].map((_,i)=>(
        <path key={i} d={`M ${490+i*80} 665 Q ${540+i*80} ${710+(i%2?10:-10)} ${590+i*80} ${770}`}
          stroke="oklch(0.55 0.1 195)" strokeWidth="0.7" fill="none" opacity="0.5"/>
      ))}
      {/* pins */}
      {[[570,700],[720,680],[860,720],[650,750]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="oklch(0.75 0.16 35)" opacity="0.9"/>
          <circle cx={x} cy={y} r="8" fill="none" stroke="oklch(0.6 0.14 25)" opacity="0.5"/>
        </g>
      ))}
      {/* sigil at center */}
      <circle cx="720" cy="720" r="18" fill="none" stroke="oklch(0.65 0.12 85)" strokeWidth="1" opacity="0.6"/>
      <text x="720" y="726" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="18" fill="oklch(0.75 0.12 85)" opacity="0.85">✠</text>
      {/* overseer silhouettes around */}
      {[490, 560, 870, 940].map((x,i)=>(
        <g key={i} opacity="0.45">
          <ellipse cx={x} cy={640} rx="18" ry="8" fill="oklch(0.1 0.02 220)"/>
          <path d={`M ${x-14} 640 Q ${x} 590 ${x+14} 640 Z`} fill="oklch(0.12 0.03 220)" stroke="oklch(0.4 0.06 75)" strokeWidth="0.6"/>
          <circle cx={x} cy={610} r="6" fill="oklch(0.18 0.04 215)"/>
          {i%2===0 && <circle cx={x-2} cy={609} r="1" fill="oklch(0.75 0.14 195)" opacity="0.8"/>}
        </g>
      ))}
    </g>

    {/* large porthole on far right */}
    <g>
      <circle cx="1280" cy="420" r="70" fill="oklch(0.06 0.02 225)" stroke="oklch(0.5 0.08 75)" strokeWidth="3"/>
      <circle cx="1280" cy="420" r="70" fill="url(#bio-glow)" opacity="0.6"/>
      {/* rivets around porthole */}
      {[...Array(12)].map((_,i)=>{
        const a = (i/12)*Math.PI*2;
        return <circle key={i} cx={1280+Math.cos(a)*78} cy={420+Math.sin(a)*78} r="2" fill="oklch(0.45 0.08 75)"/>;
      })}
      {/* creature passing */}
      <ellipse cx="1290" cy="410" rx="28" ry="6" fill="oklch(0.2 0.05 210)" opacity="0.6"/>
      <circle cx="1310" cy="408" r="1.5" fill="oklch(0.85 0.14 35)"/>
    </g>

    {/* hanging cable / kelp accents */}
    <g stroke="oklch(0.25 0.06 155)" strokeWidth="1.5" fill="none" opacity="0.5">
      <path d="M 200 70 Q 205 120 195 170 Q 200 210 198 260"/>
      <path d="M 720 70 Q 725 110 718 150"/>
      <path d="M 1150 70 Q 1140 130 1155 190"/>
    </g>

    {/* overlay vignette */}
    <rect width="1440" height="840" fill="url(#bio-glow)" opacity="0.08"/>
  </svg>
);

window.OperationCenter = OperationCenter;
