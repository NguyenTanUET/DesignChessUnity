// Evolution Chamber — 3-tier linear DNA tree per follower
const EvolutionScreen = ({ run, setRun, go }) => {
  const roster = run.roster || [];
  const [selId, setSelId] = React.useState(roster[0]?.instanceId || null);
  const sel = roster.find(f => f.instanceId === selId) || roster[0];
  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;
  const chain = sel ? EVOLUTION[sel.archetype] : [];
  const dna = run.res?.dna || 0;

  const canAfford = (cost) => cost && (cost.dna || 0) <= dna;
  const evolve = (target) => {
    if (target !== sel.evoTier + 1) return;
    const stage = chain[target];
    if (!stage || !canAfford(stage.cost)) return;
    setRun(r => ({
      ...r,
      res: { ...r.res, dna: (r.res.dna||0) - (stage.cost.dna||0) },
      roster: r.roster.map(f =>
        f.instanceId === selId ? { ...f, evoTier: target } : f
      ),
    }));
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-evolve" subtitle="Evolution Chamber · DNA Altar"/>

      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0, display:'grid', gridTemplateColumns:'300px 1fr', gap:0 }}>
        {/* Roster picker */}
        <div style={{ borderRight:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          overflowY:'auto', padding:'16px 12px' }}>
          <div className="caps" style={{ padding:'4px 8px 12px' }}>Select Specimen</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {roster.map(f => {
              const a = FOLLOWER_ARCHETYPES[f.archetype];
              const isSel = f.instanceId === selId;
              const nextStage = EVOLUTION[f.archetype][f.evoTier + 1];
              const ready = nextStage && (nextStage.cost?.dna || 0) <= dna;
              return (
                <div key={f.instanceId} onClick={()=>setSelId(f.instanceId)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer',
                    background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid', borderColor: isSel ? a.color : 'var(--abyss-3)',
                    borderLeft: isSel ? `3px solid ${a.color}` : '3px solid transparent',
                  }}>
                  <div style={{ fontSize:22, color:a.color, fontFamily:'Cinzel, serif', width:28, textAlign:'center' }}>{a.glyph}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', marginTop:3, letterSpacing:'0.12em' }}>
                      EVO·{f.evoTier}{f.evoTier<3?' / 3':' MAX'}
                    </div>
                  </div>
                  {ready && f.evoTier < 3 && (
                    <div title="Ready to evolve" style={{ width:6, height:6, borderRadius:'50%',
                      background:'oklch(0.72 0.14 150)', boxShadow:'0 0 8px oklch(0.72 0.14 150)' }}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Evolution tree canvas */}
        <div style={{ position:'relative', overflow:'hidden',
          background:`
            radial-gradient(ellipse at 50% 30%, oklch(0.22 0.1 150 / 0.25), transparent 60%),
            radial-gradient(ellipse at 50% 100%, oklch(0.1 0.04 280 / 0.4), transparent 60%),
            linear-gradient(180deg, var(--abyss-1), var(--abyss-0))
          ` }}>

          {/* DNA column backdrop */}
          <svg viewBox="0 0 900 720" preserveAspectRatio="xMidYMid slice"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.5 }}>
            {/* suspended tank */}
            <rect x="340" y="60" width="220" height="600" fill="oklch(0.08 0.03 210)" stroke="oklch(0.4 0.06 75)" strokeWidth="2"/>
            {/* helix strand */}
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
            {/* bubbles */}
            {[...Array(18)].map((_,i)=>(
              <circle key={i} cx={355+(i*19)%210} cy={650-(i*32)%580} r={1.5+(i%3)} fill="oklch(0.8 0.1 150)" opacity={0.4+(i%3)*0.15}/>
            ))}
          </svg>

          {/* Evolution chain UI */}
          {sel && arch && (
            <div style={{ position:'absolute', inset:0, padding:'28px 36px',
              display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div className="eyebrow" style={{ color: arch.color }}>{arch.role} · Linear Evolution</div>
              <h2 style={{ margin:'4px 0 28px', fontFamily:'Cinzel, serif', fontSize:30, color:'var(--bone)', letterSpacing:'0.05em' }}>
                {sel.name}
              </h2>

              <div style={{ display:'flex', alignItems:'center', gap:0, width:'100%', maxWidth: 820 }}>
                {chain.map((stage, i) => {
                  const isCurrent = i === sel.evoTier;
                  const isPast = i < sel.evoTier;
                  const isNext = i === sel.evoTier + 1;
                  const isLocked = i > sel.evoTier + 1;
                  const affordable = isNext && canAfford(stage.cost);
                  return (
                    <React.Fragment key={i}>
                      <div style={{
                        flex:1, position:'relative',
                        padding:'18px 16px',
                        background: isCurrent
                          ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))`
                          : 'var(--abyss-1)',
                        border:'1px solid',
                        borderColor: isCurrent ? arch.color
                          : isPast ? 'var(--brass-deep)'
                          : affordable ? 'var(--bio)'
                          : 'var(--abyss-3)',
                        opacity: isLocked ? 0.5 : 1,
                        boxShadow: isCurrent ? `0 0 30px ${arch.color.replace(')', ' / 0.3)')}, inset 0 0 20px rgba(0,0,0,0.4)` : 'var(--shadow-inset)',
                        minHeight: 200,
                      }}>
                        {/* stage label */}
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                          color: isCurrent ? arch.color : isPast ? 'var(--brass-dim)' : 'var(--bone-dim)' }}>
                          TIER {i} {isCurrent && '· CURRENT'}{isPast && '· COMPLETE'}
                        </div>
                        {/* stage icon */}
                        <div style={{ fontSize:44, textAlign:'center', margin:'14px 0 8px',
                          fontFamily:'Cinzel, serif',
                          color: isLocked ? 'var(--bone-dim)' : arch.color,
                          textShadow: isCurrent ? `0 0 20px ${arch.color}` : 'none',
                          opacity: isLocked ? 0.4 : 1,
                        }}>{arch.glyph}{i>0 && <sup style={{ fontSize:14, color:'var(--brass)' }}>{'+'.repeat(i)}</sup>}</div>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', textAlign:'center',
                          letterSpacing:'0.04em', marginBottom:6 }}>
                          {stage.name}
                        </div>
                        <div style={{ fontSize:11, color:'var(--bone-dim)', textAlign:'center',
                          lineHeight:1.4, fontStyle:'italic', minHeight:42 }}>
                          {stage.effect}
                        </div>

                        {/* cost + evolve button */}
                        {isNext && stage.cost && (
                          <div style={{ marginTop:14, textAlign:'center' }}>
                            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bio-dim)',
                              letterSpacing:'0.15em', marginBottom:6 }}>
                              COST · <span style={{ color: affordable ? 'var(--bone)' : 'var(--coral)' }}>
                                ✧ {stage.cost.dna} DNA
                              </span>
                            </div>
                            <button disabled={!affordable}
                              onClick={()=>evolve(i)}
                              className={`btn sm ${affordable?'primary':''}`}
                              style={{ width:'100%', justifyContent:'center' }}>
                              {affordable ? '✧ EVOLVE' : 'Insufficient DNA'}
                            </button>
                          </div>
                        )}
                        {isPast && (
                          <div style={{ textAlign:'center', marginTop:14,
                            fontFamily:'JetBrains Mono, monospace', fontSize:10,
                            color:'var(--brass-dim)', letterSpacing:'0.15em' }}>
                            ✓ ASCENDED
                          </div>
                        )}
                        {isLocked && (
                          <div style={{ textAlign:'center', marginTop:14,
                            fontFamily:'JetBrains Mono, monospace', fontSize:10,
                            color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
                            ⚿ SEALED
                          </div>
                        )}
                      </div>
                      {/* connector */}
                      {i < chain.length - 1 && (
                        <div style={{ width:36, height:1,
                          background: i < sel.evoTier
                            ? `linear-gradient(90deg, ${arch.color}, var(--brass-deep))`
                            : 'var(--abyss-3)',
                          position:'relative',
                        }}>
                          {i === sel.evoTier && (
                            <span style={{ position:'absolute', top:-4, right:-4,
                              fontFamily:'Cinzel, serif', color:'var(--bio)', fontSize:12 }}>▸</span>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* ritual footer */}
              <div style={{ marginTop:36, maxWidth:640, textAlign:'center',
                padding:'14px 20px', background:'rgba(0,0,0,0.4)',
                border:'1px solid var(--abyss-3)' }}>
                <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>‣ Chamber Sermon</div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontStyle:'italic',
                  color:'var(--bone-dim)', marginTop:6, lineHeight:1.5 }}>
                  &ldquo;Each evolution is a covenant. The flesh remembers what thou hast paid it. The DNA remembers further.&rdquo;
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

window.EvolutionScreen = EvolutionScreen;
