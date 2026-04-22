// Reward — Spoils of the Tide
const Reward = ({ run, node, enemy, onClaim }) => {
  const [picked, setPicked] = React.useState(null);
  const goldGain = node?.type === 'boss' ? 100 : node?.type === 'elite' ? 45 : 20 + Math.floor(Math.random()*10);

  const pieceOptions = React.useMemo(() => {
    const pool = ['N','B','R','A','G','S','W'];
    const picks = [];
    while (picks.length < 3) {
      const k = pool[Math.floor(Math.random()*pool.length)];
      if (!picks.includes(k)) picks.push(k);
    }
    return picks;
  }, [node?.id]);

  const relicOpt = RELICS[Math.floor(Math.random()*RELICS.length)];

  const claim = (type, val) => {
    const updates = { gold: run.gold + goldGain };
    if (type === 'piece' && val) updates.deck = [...run.deck, val];
    if (type === 'relic') updates.relics = [...run.relics, relicOpt];
    onClaim(updates);
  };

  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <div style={{ position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 30%, oklch(0.3 0.08 200 / 0.35), transparent 60%)' }}/>
      <TopBar run={run}/>
      <div style={{ position:'absolute', inset:'56px 0 0 0', display:'grid', placeItems:'center' }}>
        <div style={{ width: 820, maxWidth:'95%' }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>Spoils of the Tide</div>
            <h1 style={{ fontSize:52, margin:'8px 0 4px', fontFamily:'Cinzel, serif', letterSpacing:'0.04em' }}>The Carcass Drifts Down</h1>
            <div style={{ fontStyle:'italic', color:'var(--bone-dim)' }}>
              {enemy?.name} sinks into the silt. Thy brood feeds, and grows.
            </div>
          </div>

          <div className="card gold ornate" style={{ padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div>
              <div className="eyebrow">Coral Hoard</div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:20, letterSpacing:'0.05em' }}>Harvest Claimed</div>
            </div>
            <div style={{ fontSize:36, color:'var(--brass)', fontFamily:'Cinzel, serif' }}>◎ +{goldGain}</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <div className="panel ornate" style={{ padding:18 }}>
              <div className="eyebrow">Absorb a Spawn</div>
              <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:4, marginBottom:14, fontStyle:'italic' }}>
                A creature joins thy brood. Or leave it — keep thy coral.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {pieceOptions.map(k => {
                  const p = PIECES[k];
                  const sel = picked === k;
                  return (
                    <button key={k} onClick={()=>setPicked(k)}
                      className={sel?'card gold':'card'}
                      style={{
                        padding:'14px 10px', textAlign:'center', cursor:'pointer',
                        background: sel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : undefined,
                        color: 'var(--bone)', fontFamily:'inherit',
                      }}
                    >
                      <div style={{ fontSize:40, fontFamily:'Cinzel, serif',
                        color: p.rarity==='legendary'?'var(--void)': p.rarity==='rare'?'var(--bio)':'var(--bone)',
                        textShadow: sel ? '0 0 12px currentColor' : 'none' }}>{p.glyph}</div>
                      <div style={{ fontSize:12, fontFamily:'Cinzel, serif', marginTop:6, letterSpacing:'0.03em' }}>{p.name}</div>
                      <div className="eyebrow" style={{ fontSize:9, marginTop:6,
                        color: p.rarity==='legendary'?'var(--void)': p.rarity==='rare'?'var(--bio-dim)':'var(--bone-dim)' }}>
                        {p.rarity}
                      </div>
                      <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:8, lineHeight:1.5, minHeight:46 }}>
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                <button className="btn ghost sm" onClick={()=>claim('gold')}>Skip</button>
                <button className="btn primary sm" disabled={!picked} onClick={()=>claim('piece', picked)}>
                  Absorb {picked ? PIECES[picked].name : ''}
                </button>
              </div>
            </div>

            <div className="panel ornate" style={{ padding:18 }}>
              <div className="eyebrow">Bone-Relic Adrift</div>
              <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:4, marginBottom:14, fontStyle:'italic' }}>
                Lodged in the corpse's gizzard.
              </div>
              <div className="card gold" style={{ padding:20, textAlign:'center' }}>
                <div style={{ fontSize:60, color:'var(--brass)', fontFamily:'Cinzel, serif',
                  textShadow:'0 0 18px oklch(0.72 0.11 80 / 0.5)' }}>{relicOpt.glyph}</div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:20, marginTop:8, letterSpacing:'0.04em' }}>{relicOpt.name}</div>
                <div className="eyebrow" style={{ marginTop:6 }}>{relicOpt.rarity}</div>
                <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:12, lineHeight:1.6, fontStyle:'italic' }}>
                  &ldquo;{relicOpt.desc}&rdquo;
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                <button className="btn ghost sm" onClick={()=>claim('gold')}>Leave It</button>
                <button className="btn primary sm" onClick={()=>claim('relic')}>Claim Relic</button>
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <button className="btn ghost sm" onClick={()=>claim('gold')}>Drift Onward Without Either →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Shop = ({ run, onClose, onBuy }) => {
  const inventory = React.useMemo(() => ([
    { id:'piece-q', kind:'piece', key:'Q', cost:80 },
    { id:'piece-a', kind:'piece', key:'A', cost:50 },
    { id:'piece-n', kind:'piece', key:'N', cost:30 },
    { id:'relic-1', kind:'relic', relic: RELICS[1], cost:75 },
    { id:'relic-2', kind:'relic', relic: RELICS[2], cost:90 },
    { id:'heal', kind:'service', name:'Anemone Balm', desc:'Restore 1 ♥ of the Sovereign\'s vigor', cost:40 },
    { id:'purge', kind:'service', name:'Cull a Spawnling', desc:'Devour one Spawnling from thy brood', cost:25 },
  ]), []);

  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <TopBar run={run}/>
      <div style={{ position:'absolute', inset:'56px 0 0 0', padding:'32px 48px', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20 }}>
          <div>
            <div className="eyebrow">The Bone-Trader's Wreck</div>
            <h1 style={{ fontSize:38, margin:'4px 0 2px', fontFamily:'Cinzel, serif', letterSpacing:'0.04em' }}>Market Beneath the Hull</h1>
            <div style={{ color:'var(--bone-dim)', fontStyle:'italic', fontSize:14 }}>
              &ldquo;Coral for comfort. Coral for cruelty. The tide asks nothing.&rdquo;
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}>← Return to Current</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
          {inventory.map(item => {
            const afford = run.gold >= item.cost;
            const title = item.kind==='piece' ? PIECES[item.key].name : item.kind==='relic' ? item.relic.name : item.name;
            const glyph = item.kind==='piece' ? PIECES[item.key].glyph : item.kind==='relic' ? item.relic.glyph : '✚';
            const desc = item.kind==='piece' ? PIECES[item.key].desc : item.kind==='relic' ? item.relic.desc : item.desc;
            return (
              <div key={item.id} className="card ornate" style={{ padding:16, display:'flex', flexDirection:'column', opacity: afford?1:0.55 }}>
                <div style={{ fontSize:52, color: item.kind==='relic'?'var(--brass)':'var(--bone)',
                  fontFamily:'Cinzel, serif', textAlign:'center', marginBottom:8,
                  textShadow:'0 0 12px rgba(0,0,0,0.6)' }}>{glyph}</div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:16, textAlign:'center', letterSpacing:'0.04em' }}>{title}</div>
                <div className="eyebrow" style={{ textAlign:'center', marginTop:4 }}>{item.kind}</div>
                <div style={{ fontSize:11, color:'var(--bone-dim)', textAlign:'center', marginTop:10, lineHeight:1.5, minHeight:52 }}>{desc}</div>
                <div style={{ marginTop:'auto', paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:18, color: afford?'var(--brass)':'var(--bone-dim)' }}>◎ {item.cost}</span>
                  <button className="btn sm" disabled={!afford} onClick={()=>onBuy(item)}>Trade</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

window.Reward = Reward;
window.Shop = Shop;
