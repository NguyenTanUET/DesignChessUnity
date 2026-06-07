// GameOver — assignment outcome screens (victory + defeat).
// Victory => "ASSIGNMENT COMPLETE"  ·  Defeat => "ASSIGNMENT FAILED"
// Both display resources harvested during the assignment.
const GameOver = ({ won, run, onAgain, onMenu }) => {
  // Compute resources collected during the assignment.
  // Falls back to current totals if the start-snapshot wasn't captured (legacy run).
  const currentRes = run.res || { coral:0, dna:0, lumin:0 };
  const startRes   = (run.assignmentStart && run.assignmentStart.res) || { coral:0, dna:0, lumin:0 };
  const hasSnapshot = !!run.assignmentStart;

  const gained = {
    coral: Math.max(0, (currentRes.coral||0) - (startRes.coral||0)),
    dna:   Math.max(0, (currentRes.dna||0)   - (startRes.dna||0)),
    lumin: Math.max(0, (currentRes.lumin||0) - (startRes.lumin||0)),
  };
  const fallback = {
    coral: currentRes.coral || 0,
    dna:   currentRes.dna   || 0,
    lumin: currentRes.lumin || 0,
  };
  const display = hasSnapshot ? gained : fallback;

  const broodGained      = hasSnapshot ? Math.max(0, (run.deck       || []).length - (run.assignmentStart.deckSize       || 0)) : 0;
  const relicsGained     = hasSnapshot ? Math.max(0, (run.relics     || []).length - (run.assignmentStart.relicsSize     || 0)) : (run.relics || []).length;
  const questItemsGained = hasSnapshot ? Math.max(0, (run.questItems || []).length - (run.assignmentStart.questItemsSize || 0)) : (run.questItems || []).length;

  const assignmentName = run.assignmentStart?.name || run.cls?.name || 'Unnamed Tide';

  const title    = won ? 'ASSIGNMENT COMPLETE' : 'ASSIGNMENT FAILED';
  const eyebrow  = won ? 'The Trench Sings Back' : 'The Brood Is Unmade';
  const glyph    = won ? '◉' : '☠';
  const accent   = won ? 'var(--bio)' : 'var(--coral)';
  const accentDim= won ? 'var(--bio-dim)' : 'var(--coral-dim)';
  const flavor   = won
    ? '"The hunt is closed. What the brood took from the deep, the deep cannot take back."'
    : '"The pieces sink. Scavengers come. What the brood gathered, they still hold — for the next tide."';

  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', background:'var(--abyss-0)' }}>
      {/* Mood wash */}
      <div style={{ position:'absolute', inset:0,
        background: won
          ? 'radial-gradient(ellipse at center, oklch(0.32 0.1 190 / 0.5), var(--abyss-0) 70%)'
          : 'radial-gradient(ellipse at center, oklch(0.2 0.14 25 / 0.45), var(--abyss-0) 70%)'
      }}/>

      {/* Silhouette backdrop */}
      <svg viewBox="0 0 1440 900" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.2, pointerEvents:'none' }} preserveAspectRatio="xMidYMid slice">
        {won ? (
          <g>
            <path d="M 200 500 Q 400 380 720 420 Q 1040 460 1240 520 Q 1100 560 900 570 Q 700 580 500 560 Q 300 540 200 500 Z"
                  fill="oklch(0.1 0.04 200)" opacity="0.9"/>
            <circle cx="1100" cy="480" r="10" fill="oklch(0.85 0.15 190)"/>
          </g>
        ) : (
          <g>
            <path d="M 640 420 L 670 380 L 700 410 L 730 370 L 760 410 L 790 380 L 820 420 L 810 470 L 650 470 Z"
                  fill="oklch(0.35 0.07 72)" opacity="0.7"/>
            <circle cx="730" cy="500" r="80" fill="oklch(0.08 0.02 220)" opacity="0.5"/>
          </g>
        )}
      </svg>

      {/* ambient plankton */}
      <div className="plankton">
        {Array.from({length:20}).map((_,i) => (
          <span key={i} style={{
            left:`${(i*173)%100}%`,
            animationDuration:`${18+(i%5)*4}s`,
            animationDelay:`${-(i*1.3)}s`,
            width:`${1.5+(i%3)}px`, height:`${1.5+(i%3)}px`, opacity:0.4,
            background: accent, boxShadow:`0 0 8px ${accent}`,
          }}/>
        ))}
      </div>

      <div style={{ position:'relative', textAlign:'center', maxWidth:760, padding:'0 32px' }}>
        {/* Sigil glyph */}
        <div style={{ fontSize:130, fontFamily:'Cinzel, serif', color: accent,
          lineHeight:1, marginBottom: 4,
          textShadow: `0 0 60px ${won?'oklch(0.78 0.14 190 / 0.6)':'oklch(0.6 0.18 25 / 0.5)'}, 0 10px 40px rgba(0,0,0,0.9)` }}>
          {glyph}
        </div>

        <div className="eyebrow" style={{ color: accentDim, marginBottom:6 }}>{eyebrow}</div>

        {/* Big title */}
        <h1 style={{ fontSize:64, margin:'4px 0 6px', fontFamily:'Cinzel, serif', letterSpacing:'0.12em',
          background: won
            ? 'linear-gradient(180deg, oklch(0.95 0.06 188), oklch(0.55 0.13 190))'
            : 'linear-gradient(180deg, oklch(0.85 0.13 30), oklch(0.45 0.16 25))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          textShadow:'0 10px 50px rgba(0,0,0,0.7)' }}>
          {title}
        </h1>

        {/* Assignment subtitle */}
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, letterSpacing:'0.3em',
          color:'var(--bone-dim)', textTransform:'uppercase', marginBottom:14 }}>
          ‣ {assignmentName} ‣
        </div>

        <div className="divider fancy" style={{ width:340, margin:'14px auto 22px' }}>
          <span style={{ color: accentDim }}>◈ ◈ ◈</span>
        </div>

        {/* Flavor */}
        <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:14, marginBottom:28, lineHeight:1.7,
          fontFamily:'Cormorant Garamond, serif', maxWidth:560, margin:'0 auto 28px' }}>
          {flavor}
        </div>

        {/* Resources harvested — the focal block */}
        <div className="panel ornate" style={{ display:'inline-block', padding:'20px 32px 22px', marginBottom:18,
          minWidth:560, borderColor: won ? 'var(--bio-dim)' : 'var(--coral-dim)' }}>
          <div className="eyebrow" style={{ color: accentDim, marginBottom:14 }}>
            ◆ Resources Harvested {hasSnapshot ? '' : '(Current Hoard)'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:18 }}>
            <ResHarvest glyph="◎" label="Refined Coral" value={display.coral} color="oklch(0.72 0.12 35)"  won={won}/>
            <ResHarvest glyph="✧" label="DNA"           value={display.dna}   color="oklch(0.72 0.14 150)" won={won}/>
            <ResHarvest glyph="◆" label="Lumin Deposit" value={display.lumin} color="oklch(0.75 0.13 195)" won={won}/>
          </div>
        </div>

        {/* Secondary spoils — victory only */}
        {won && (
          <div style={{ display:'flex', gap:14, justifyContent:'center', marginBottom:28 }}>
            <SpoilChip glyph="♘" label="Follower Received"   value={broodGained}/>
            <SpoilChip glyph="✠" label="Relics Claimed"      value={relicsGained}/>
            <SpoilChip glyph="◇" label="Quest Item Gathered" value={questItemsGained}/>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button className="btn ghost" onClick={onMenu}>To the Sanctum</button>
        </div>
      </div>
    </div>
  );
};

// One harvested resource — large glyph, count, label.
const ResHarvest = ({ glyph, label, value, color, won }) => (
  <div style={{
    padding:'14px 10px',
    background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
    border:'1px solid var(--abyss-4)',
    position:'relative',
  }}>
    {/* corner filigree */}
    {[[0,0],[1,0],[0,1],[1,1]].map(([x,y]) => (
      <span key={`${x}${y}`} style={{
        position:'absolute',
        [x?'right':'left']:3, [y?'bottom':'top']:3,
        width:8, height:8,
        [`border${y?'Bottom':'Top'}`]: `1px solid ${color}`,
        [`border${x?'Right':'Left'}`]:  `1px solid ${color}`,
        opacity:0.7,
      }}/>
    ))}
    <div style={{ fontFamily:'Cinzel, serif', fontSize:36, color, lineHeight:1,
      textShadow:`0 0 14px ${color}, 0 0 24px ${color}`, marginBottom:6 }}>{glyph}</div>
    <div style={{ fontFamily:'Cinzel, serif', fontSize:30, color:'var(--bone)',
      letterSpacing:'0.04em', lineHeight:1.1,
      textShadow: won ? '0 0 20px oklch(0.78 0.14 188 / 0.35)' : '0 0 14px oklch(0.6 0.18 25 / 0.25)' }}>
      +{value}
    </div>
    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.22em',
      color:'var(--bone-dim)', textTransform:'uppercase', marginTop:6 }}>
      {label}
    </div>
  </div>
);

// Small chip — secondary stats row.
const SpoilChip = ({ glyph, label, value, isText }) => (
  <div style={{
    display:'flex', alignItems:'center', gap:10,
    padding:'10px 16px',
    background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
    border:'1px solid var(--abyss-4)', minWidth:160,
  }}>
    <span style={{ fontFamily:'Cinzel, serif', fontSize:22, color:'var(--brass)' }}>{glyph}</span>
    <div style={{ textAlign:'left' }}>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em',
        color:'var(--bone-dim)', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontFamily:'Cinzel, serif', fontSize: isText ? 14 : 18,
        color:'var(--bone)', letterSpacing:'0.04em', lineHeight:1.1 }}>
        {isText ? value : `× ${value}`}
      </div>
    </div>
  </div>
);

window.GameOver = GameOver;
