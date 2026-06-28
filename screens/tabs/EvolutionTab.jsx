// Tab — Evolution: 3-tier linear DNA tree per follower
const EvolutionTab = ({ run, setRun, selId }) => {
  const roster = run.roster || [];
  const sel = roster.find(f => f.instanceId === selId) || roster[0];
  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;
  const chain = sel ? EVOLUTION[sel.archetype] : [];
  const dna = run.res?.dna || 0;

  // The two factors that shift with every evolution: species + temperament.
  const cls = sel ? classificationById(sel.classification || classificationFor(sel.archetype)) : null;
  const facet = sel ? facetById(sel.facet) : null;
  const maxTier = chain.length - 1;

  if (!sel || !arch) {
    return (
      <div style={{ padding:'80px 40px', textAlign:'center', color:'var(--bone-dim)', fontStyle:'italic' }}>
        Select a follower from the roster to inspect the DNA chain.
      </div>
    );
  }

  const evolveTo = (tier) => {
    if (tier <= sel.evoTier) return;
    if (tier !== sel.evoTier + 1) return; // linear only
    const node = chain[tier];
    const cost = node.cost?.dna || 0;
    if (dna < cost) return;
    setRun(r => ({
      ...r,
      res: { ...r.res, dna: (r.res.dna||0) - cost },
      roster: r.roster.map(f => f.instanceId === sel.instanceId
        ? { ...f, evoTier: tier, name: node.name }
        : f),
    }));
  };

  return (
    <div style={{ position:'relative', padding:'28px 36px',
      display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div className="eyebrow" style={{ color: arch.color }}>{arch.role} · Linear Evolution</div>
      <h2 style={{ margin:'4px 0 28px', fontFamily:'Cinzel, serif', fontSize:28, color:'var(--bone)', letterSpacing:'0.05em' }}>
        {sel.name}
      </h2>

      {/* DNA resource bar */}
      <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:24,
        padding:'10px 22px', border:'1px solid var(--abyss-4)', background:'rgba(0,0,0,0.45)' }}>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.3em',
          color:'var(--bio-dim)', textTransform:'uppercase' }}>DNA Reservoir</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:22, color:'var(--bio)',
          textShadow:'0 0 12px var(--bio)' }}>✧ {dna}</span>
      </div>

      {/* The two evolution factors: Classification (species) + Facet (temperament) */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, width:'100%',
        maxWidth:760, marginBottom:30 }}>
        {/* CLASSIFICATION */}
        <div style={{ padding:'16px 18px', background:'var(--abyss-1)',
          border:`1px solid ${cls.color.replace(')',' / 0.5)')}`, borderTop:`3px solid ${cls.color}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <span style={{ fontFamily:'Cinzel, serif', fontSize:24, color:cls.color,
              textShadow:`0 0 12px ${cls.color}` }}>{cls.glyph}</span>
            <div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.25em',
                color:'var(--bone-dim)', textTransform:'uppercase' }}>Classification · pre-assigned</div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.04em' }}>
                {cls.name}
              </div>
            </div>
          </div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
            letterSpacing:'0.18em', textTransform:'uppercase', margin:'10px 0 6px' }}>
            {cls.stat} · rises each evolution
          </div>
          {/* per-tier track */}
          <div style={{ display:'flex', gap:5 }}>
            {chain.map((_, t) => {
              const isNow = t === sel.evoTier;
              const reached = t <= sel.evoTier;
              return (
                <div key={t} style={{ flex:1, textAlign:'center', padding:'7px 2px',
                  background: isNow ? cls.color.replace(')',' / 0.18)') : 'var(--abyss-0)',
                  border:`1px solid ${isNow ? cls.color : 'var(--abyss-4)'}`,
                  opacity: reached ? 1 : 0.5 }}>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5,
                    color:'var(--bone-dim)', letterSpacing:'0.12em' }}>T{t}</div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:15,
                    color: isNow ? cls.color : reached ? 'var(--bone)' : 'var(--bone-dim)' }}>
                    {classValueAt(cls, t)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FACET */}
        <div style={{ padding:'16px 18px', background:'var(--abyss-1)',
          border:`1px solid ${facet ? facet.color.replace(')',' / 0.5)') : 'var(--abyss-4)'}`,
          borderTop:`3px solid ${facet ? facet.color : 'var(--abyss-4)'}` }}>
          {facet ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:24, color:facet.color,
                  textShadow:`0 0 12px ${facet.color}` }}>{facet.glyph}</span>
                <div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.25em',
                    color:'var(--bone-dim)', textTransform:'uppercase' }}>
                    Facet · rolled at purchase{facet.kind === 'mixed' ? ' · mixed' : ''}
                  </div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.04em' }}>
                    {facet.name}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone)',
                fontStyle:'italic', lineHeight:1.5, margin:'8px 0' }}>
                {facet.desc(sel.evoTier)}
              </div>
              {sel.evoTier < maxTier ? (
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:facet.color,
                  letterSpacing:'0.1em', lineHeight:1.5, paddingTop:6, borderTop:'1px dashed var(--abyss-3)' }}>
                  NEXT (T{sel.evoTier + 1}) → {facet.desc(sel.evoTier + 1)}
                  <span style={{ display:'block', color:'var(--bone-dim)', marginTop:2 }}>
                    {facet.kind === 'mixed' ? '↑ boon grows · ↓ bane fades' : '↑ effect grows each evolution'}
                  </span>
                </div>
              ) : (
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                  letterSpacing:'0.15em', paddingTop:6, borderTop:'1px dashed var(--abyss-3)' }}>
                  ◆ FULLY EVOLVED
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)',
              fontStyle:'italic', textAlign:'center', padding:'18px 8px' }}>
              No facet imprinted on this specimen.
            </div>
          )}
        </div>
      </div>

      {/* Linear chain */}
      <div style={{ display:'flex', alignItems:'stretch', gap:0, position:'relative' }}>
        {chain.map((node, i) => {
          const isCurrent = i === sel.evoTier;
          const isPast = i < sel.evoTier;
          const isNext = i === sel.evoTier + 1;
          const cost = node.cost?.dna || 0;
          const canAfford = dna >= cost;
          const locked = i > sel.evoTier + 1;

          return (
            <React.Fragment key={i}>
              {/* node card */}
              <div style={{
                width: 200, padding:'18px 16px',
                background: isCurrent
                  ? `linear-gradient(180deg, oklch(0.2 0.05 200), oklch(0.12 0.03 215))`
                  : isPast ? 'rgba(0,0,0,0.35)' : 'var(--abyss-1)',
                border:'1px solid',
                borderColor: isCurrent ? arch.color : isPast ? 'var(--bio-dim)' : 'var(--abyss-3)',
                boxShadow: isCurrent ? `0 0 24px ${arch.color}55, inset 0 0 30px rgba(0,0,0,0.5)` : 'none',
                opacity: locked ? 0.45 : 1,
                position:'relative',
              }}>
                {/* tier badge */}
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
                  background:'var(--abyss-0)', padding:'2px 10px',
                  border:'1px solid var(--brass-deep)',
                  fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                  color:isCurrent ? 'var(--brass)' : 'var(--bone-dim)' }}>
                  TIER {node.tier}
                </div>

                {/* glyph portrait */}
                <div style={{ textAlign:'center', fontSize:54, fontFamily:'Cinzel, serif',
                  color: isPast || isCurrent ? arch.color : 'var(--abyss-4)',
                  textShadow: isCurrent ? `0 0 16px ${arch.color}` : 'none',
                  marginBottom: 8, marginTop: 4 }}>
                  {arch.glyph}
                </div>

                <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)',
                  textAlign:'center', letterSpacing:'0.04em', marginBottom:8 }}>
                  {node.name}
                </div>

                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
                  color:'var(--bone-dim)', textAlign:'center', lineHeight:1.4, minHeight:48 }}>
                  {node.effect}
                </div>

                {/* status / action */}
                <div style={{ marginTop:14, textAlign:'center' }}>
                  {isCurrent && (
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                      color:'var(--brass)', textTransform:'uppercase' }}>◆ Current Form</div>
                  )}
                  {isPast && (
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                      color:'var(--bio-dim)', textTransform:'uppercase' }}>◇ Shed</div>
                  )}
                  {isNext && (
                    <button className={`btn ${canAfford?'primary':''}`}
                      disabled={!canAfford}
                      onClick={()=>evolveTo(i)}
                      style={{ padding:'8px 14px', fontSize:11, opacity: canAfford ? 1 : 0.45 }}>
                      {canAfford ? `✧ EVOLVE · ${cost} DNA` : `✧ ${cost} DNA`}
                    </button>
                  )}
                  {locked && (
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.25em',
                      color:'var(--bone-dim)', textTransform:'uppercase' }}>⊘ Sealed</div>
                  )}
                </div>
              </div>

              {/* connector */}
              {i < chain.length - 1 && (
                <div style={{ width:42, position:'relative', alignSelf:'center', height:2 }}>
                  <div style={{ position:'absolute', inset:0,
                    background: i < sel.evoTier
                      ? `linear-gradient(90deg, ${arch.color}, ${arch.color})`
                      : 'var(--abyss-4)',
                    boxShadow: i < sel.evoTier ? `0 0 8px ${arch.color}` : 'none' }}/>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop:32, maxWidth:680, textAlign:'center' }}>
        <div className="divider fancy" style={{ width:280, margin:'0 auto 12px' }}>
          <span>✦ ✦ ✦</span>
        </div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontStyle:'italic',
          color:'var(--bone-dim)', marginTop:4, lineHeight:1.5 }}>
          &ldquo;Each evolution is a covenant. The flesh remembers what thou hast paid it.&rdquo;
        </div>
      </div>
    </div>
  );
};

window.EvolutionTab = EvolutionTab;
