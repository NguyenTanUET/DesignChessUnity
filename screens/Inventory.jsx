// Inventory, GameOver — Reliquary & end states
const Inventory = ({ run, onClose }) => (
  <div className="screen noise" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
    <TopBar run={run}/>
    <div style={{ position:'absolute', inset:'56px 0 0 0', padding:'32px 48px', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20 }}>
        <div>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>Thy Burdens</div>
          <h1 style={{ fontSize:38, margin:'4px 0 2px', fontFamily:'Cinzel, serif', letterSpacing:'0.04em' }}>Reliquary &amp; Brood</h1>
        </div>
        <button className="btn ghost" onClick={onClose}>← Close</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <div className="panel ornate" style={{ padding:18 }}>
          <div className="eyebrow">Brood · {run.deck.length} creatures</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:8, marginTop:12 }}>
            {run.deck.map((k, i) => {
              const p = PIECES[k];
              return (
                <div key={i} className="card" style={{ padding:10, textAlign:'center' }}>
                  <div style={{ fontSize:34, fontFamily:'Cinzel, serif',
                    color: p.rarity==='legendary'?'var(--void)': p.rarity==='rare'?'var(--bio)':'var(--bone)' }}>{p.glyph}</div>
                  <div style={{ fontSize:10, fontFamily:'Cinzel, serif', marginTop:4, letterSpacing:'0.03em' }}>{p.name}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel ornate" style={{ padding:18 }}>
          <div className="eyebrow">Bone-Relics · {run.relics.length}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, marginTop:12 }}>
            {run.relics.map((r, i) => (
              <div key={i} className="card gold" style={{ padding:12, display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ fontSize:30, color:'var(--brass)', fontFamily:'Cinzel, serif',
                  textShadow:'0 0 10px oklch(0.72 0.11 80 / 0.4)' }}>{r.glyph}</div>
                <div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.03em' }}>{r.name}</div>
                  <div className="eyebrow" style={{ fontSize:9, marginTop:2 }}>{r.rarity}</div>
                  <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:6, lineHeight:1.5, fontStyle:'italic' }}>
                    &ldquo;{r.desc}&rdquo;
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const GameOver = ({ won, run, onAgain, onMenu }) => (
  <div className="screen noise" style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', background:'var(--abyss-0)' }}>
    <div style={{ position:'absolute', inset:0,
      background: won
        ? 'radial-gradient(ellipse at center, oklch(0.32 0.1 190 / 0.5), var(--abyss-0) 70%)'
        : 'radial-gradient(ellipse at center, oklch(0.2 0.14 25 / 0.45), var(--abyss-0) 70%)'
    }}/>

    {/* silhouette */}
    <svg viewBox="0 0 1440 900" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.2, pointerEvents:'none' }} preserveAspectRatio="xMidYMid slice">
      {won ? (
        <g>
          <path d="M 200 500 Q 400 380 720 420 Q 1040 460 1240 520 Q 1100 560 900 570 Q 700 580 500 560 Q 300 540 200 500 Z"
                fill="oklch(0.1 0.04 200)" opacity="0.9"/>
          <circle cx="1100" cy="480" r="10" fill="oklch(0.85 0.15 190)"/>
        </g>
      ) : (
        <g>
          {/* sinking crown */}
          <path d="M 640 420 L 670 380 L 700 410 L 730 370 L 760 410 L 790 380 L 820 420 L 810 470 L 650 470 Z"
                fill="oklch(0.35 0.07 72)" opacity="0.7"/>
          <circle cx="730" cy="500" r="80" fill="oklch(0.08 0.02 220)" opacity="0.5"/>
        </g>
      )}
    </svg>

    <div style={{ position:'relative', textAlign:'center', maxWidth:640 }}>
      <div style={{ fontSize:150, fontFamily:'Cinzel, serif', color: won?'var(--bio)':'var(--coral)',
        lineHeight:1, marginBottom: 8,
        textShadow: won ? '0 0 60px oklch(0.78 0.14 190 / 0.6), 0 10px 40px rgba(0,0,0,0.9)'
                        : '0 0 60px oklch(0.6 0.18 25 / 0.5), 0 10px 40px rgba(0,0,0,0.9)' }}>
        {won ? '◉' : '☠'}
      </div>
      <div className="eyebrow" style={{ color: won?'var(--bio-dim)':'var(--coral-dim)' }}>
        {won ? 'The Trench Sings Back' : 'The Brood Is Unmade'}
      </div>
      <h1 style={{ fontSize:72, margin:'8px 0 12px', fontFamily:'Cinzel, serif', letterSpacing:'0.05em' }}>
        {won ? 'APOTHEOSIS' : 'CARRION'}
      </h1>
      <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:15, marginBottom:32, lineHeight:1.7 }}>
        {won
          ? '"The Sovereign ascends through the thermocline, dragging a pale new sun behind them. The abyss, for one tide, is quiet."'
          : '"The pieces sink. Scavengers come. The trench was always patient — it can wait for the next brood."'}
      </div>

      <div className="panel ornate" style={{ display:'inline-block', padding:'16px 32px', marginBottom:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, auto)', gap:'6px 32px', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
          <StatGO k="BROODS" v="7"/><StatGO k="FOES DEVOURED" v="24"/><StatGO k="CORAL HOARDED" v="412"/>
          <StatGO k="FATHOMS CLEARED" v={won?'3':'1'}/><StatGO k="BROOD LINEAGE" v={run.cls.name}/><StatGO k="RELICS" v={String(run.relics.length)}/>
        </div>
      </div>

      {won && (
        <div className="panel gold ornate" style={{ display:'inline-block', padding:'14px 28px', marginBottom:24, borderColor:'var(--void)' }}>
          <div className="eyebrow" style={{ color:'var(--void)' }}>Brood Unlocked</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:20, letterSpacing:'0.05em' }}>The Hollow Mariner</div>
        </div>
      )}

      <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
        <button className="btn primary" onClick={onAgain}>Spawn Anew</button>
        <button className="btn ghost" onClick={onMenu}>To the Sanctum</button>
      </div>
    </div>
  </div>
);

const StatGO = ({k,v}) => (<>
  <span style={{ color:'var(--bone-dim)', textTransform:'uppercase', letterSpacing:'0.15em', fontSize:10 }}>{k}</span>
  <span style={{ color:'var(--bone)', textAlign:'right', gridColumn:'span 2' }}>{v}</span>
</>);

window.Inventory = Inventory;
window.GameOver = GameOver;
