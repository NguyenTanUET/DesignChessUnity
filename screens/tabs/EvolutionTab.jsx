// Tab 2 — Evolution: 3-tier linear DNA tree per follower
const EvolutionTab = ({ run, setRun, selId }) => {
  const roster = run.roster || [];
  const sel = roster.find(f => f.instanceId === selId) || roster[0];
  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;
  const chain = sel ? EVOLUTION[sel.archetype] : [];
  const dna = run.res?.dna || 0;

  if (!sel || !arch) return null;

  const canAfford = (cost) => cost && (cost.dna || 0) <= dna;
  const evolve = (target) => {
    if (target !== sel.evoTier + 1) return;
    const stage = chain[target];
    if (!stage || !canAfford(stage.cost)) return;
    setRun(r => ({
      ...r,
      res: { ...r.res, dna: (r.res.dna||0) - (stage.cost.dna||0) },
      roster: r.roster.map(f => f.instanceId === sel.instanceId ? { ...f, evoTier: target } : f),
    }));
  };

  return (
    <div style={{ position:'relative', minHeight:'100%', overflow:'hidden',
      background:`
        radial-gradient(ellipse at 50% 30%, oklch(0.22 0.1 150 / 0.25), transparent 60%),
        radial-gradient(ellipse at 50% 100%, oklch(0.1 0.04 280 / 0.4), transparent 60%),
        linear-gradient(180deg, var(--abyss-1), var(--abyss-0))` }}>

      {/* DNA helix backdrop */}
      <svg viewBox="0 0 900 720" preserveAspectRatio="xMidYMid slice"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.4 }}>
        <rect x="340" y="60" width="220" height="600" fill="oklch(0.08 0.03 210)" stroke="oklch(0.4 0.06 75)" strokeWidth="2"/>
        {[...Array(40)].map((_,i)=>{
          const t = i/39;
          const x1 = 380 + Math.sin(t*Math.PI*6)*60;
          const x2 = 520 - Math.sin(t*Math.PI*6)*60;
          const y = 80 + t*560;
          return (
            <g key={i}>
              <circle cx={x1} cy={y} r="2.5" fill="oklch(0.72 0.14 150)" opacity="0.8"/>
              <circle cx={x2} cy={y} r="2.5" fill="oklch(0.72 0.14 150)" opacity="0.8"/>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="oklch(0.5 0.1 150)" strokeWidth="0.5" opacity="0.4"/>
            </g>
          );
        })}
      </svg>

      <div style={{ position:'relative', padding:'28px 36px',
        display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div className="eyebrow" style={{ color: arch.color }}>{arch.role} · Linear Evolution</div>
        <h2 style={{ margin:'4px 0 28px', fontFamily:'Cinzel, serif', fontSize:28, color:'var(--bone)', letterSpacing:'0.05em' }}>
          {sel.name}
        </h2>

        <div style={{ display:'flex', alignItems:'stretch', gap:0, width:'100%', maxWidth:820 }}>
          {chain.map((stage, i) => {
            const isCurrent = i === sel.evoTier;
            const isPast = i < sel.evoTier;
            const isNext = i === sel.evoTier + 1;
            const isLocked = i > sel.evoTier + 1;
            const affordable = isNext && canAfford(stage.cost);
            return (
              <React.Fragment key={i}>
                <div style={{
                  flex:1, position:'relative', padding:'16px 14px',
                  background: isCurrent ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))` : 'var(--abyss-1)',
                  border:'1px solid',
                  borderColor: isCurrent ? arch.color
                    : isPast ? 'var(--brass-deep)'
                    : affordable ? 'var(--bio)'
                    : 'var(--abyss-3)',
                  opacity: isLocked ? 0.5 : 1,
                  boxShadow: isCurrent ? `0 0 30px ${arch.color}33, inset 0 0 20px rgba(0,0,0,0.4)` : 'none',
                  minHeight:200,
                }}>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                    color: isCurrent ? arch.color : isPast ? 'var(--brass-dim)' : 'var(--bone-dim)' }}>
                    TIER {i}{isCurrent && ' · CURRENT'}{isPast && ' · COMPLETE'}
                  </div>
                  <div style={{ fontSize:42, textAlign:'center', margin:'12px 0 6px',
                    fontFamily:'Cinzel, serif',
                    color: isLocked ? 'var(--bone-dim)' : arch.color,
                    textShadow: isCurrent ? `0 0 20px ${arch.color}` : 'none',
                    opacity: isLocked ? 0.4 : 1,
                  }}>{arch.glyph}{i>0 && <sup style={{ fontSize:13, color:'var(--brass)' }}>{'+'.repeat(i)}</sup>}</div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', textAlign:'center',
                    letterSpacing:'0.04em', marginBottom:6 }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize:10.5, color:'var(--bone-dim)', textAlign:'center',
                    lineHeight:1.4, fontStyle:'italic', minHeight:42 }}>
                    {stage.effect}
                  </div>

                  {isNext && stage.cost && (
                    <div style={{ marginTop:12, textAlign:'center' }}>
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bio-dim)',
                        letterSpacing:'0.15em', marginBottom:6 }}>
                        COST · <span style={{ color: affordable ? 'var(--bone)' : 'var(--coral)' }}>
                          ✧ {stage.cost.dna} DNA
                        </span>
                      </div>
                      <button disabled={!affordable} onClick={()=>evolve(i)}
                        className={`btn sm ${affordable?'primary':''}`}
                        style={{ width:'100%', justifyContent:'center' }}>
                        {affordable ? '✧ EVOLVE' : 'Insufficient DNA'}
                      </button>
                    </div>
                  )}
                  {isPast && (
                    <div style={{ textAlign:'center', marginTop:12,
                      fontFamily:'JetBrains Mono, monospace', fontSize:10,
                      color:'var(--brass-dim)', letterSpacing:'0.15em' }}>
                      ✓ ASCENDED
                    </div>
                  )}
                  {isLocked && (
                    <div style={{ textAlign:'center', marginTop:12,
                      fontFamily:'JetBrains Mono, monospace', fontSize:10,
                      color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
                      ⚿ SEALED
                    </div>
                  )}
                </div>
                {i < chain.length - 1 && (
                  <div style={{ width:24, alignSelf:'center', height:1,
                    background: i < sel.evoTier
                      ? `linear-gradient(90deg, ${arch.color}, var(--brass-deep))`
                      : 'var(--abyss-3)' }}/>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ marginTop:28, maxWidth:640, textAlign:'center',
          padding:'12px 18px', background:'rgba(0,0,0,0.4)', border:'1px solid var(--abyss-3)' }}>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>‣ Chamber Sermon</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontStyle:'italic',
            color:'var(--bone-dim)', marginTop:4, lineHeight:1.5 }}>
            &ldquo;Each evolution is a covenant. The flesh remembers what thou hast paid it.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
};

window.EvolutionTab = EvolutionTab;
