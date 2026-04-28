// Manage Followers — orchestrator with 3 sub-tabs:
//   1. Unit Info  · stats, biography, archetype info
//   2. Item       · Augmentation + Relic + Quest Items
//   3. Lineup     · 4 formations (W4 / W6 / W8 / W10)
const ManageFollower = ({ run, setRun, go, initialSubTab }) => {
  const roster = run.roster || [];
  const [selId, setSelId] = React.useState(roster[0]?.instanceId || null);
  const sel = roster.find(f => f.instanceId === selId) || roster[0];
  const [subTab, setSubTab] = React.useState(initialSubTab || 'unit-info');

  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;

  // Deployment toggle (used by Lineup)
  const inPool = roster.filter(f => f.inPool);
  const togglePool = (id, capForFormation) => {
    setRun(r => ({
      ...r,
      roster: r.roster.map(f => {
        if (f.instanceId !== id) return f;
        const currentDeployed = r.roster.filter(x => x.inPool).length;
        if (!f.inPool && currentDeployed >= capForFormation) return f;
        return { ...f, inPool: !f.inPool };
      }),
    }));
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-follower" subtitle="Brood Council · Manage Followers"/>

      {/* Sub-navigation bar */}
      <SubNav active={subTab} onChange={setSubTab}/>

      <div style={{ position:'absolute', top:108, left:0, right:0, bottom:0,
        display:'grid', gridTemplateColumns: subTab === 'lineup' ? '1fr' : '300px 1fr', gap:0 }}>

        {/* === LEFT: Roster picker (hidden on Lineup since it's full-bleed) === */}
        {subTab !== 'lineup' && (
          <RosterList roster={roster} selId={selId} setSelId={setSelId}/>
        )}

        {/* === CENTER: sub-tab content === */}
        <div style={{ position:'relative', overflowY:'auto' }}>
          {subTab === 'unit-info' && sel && arch && (
            <UnitInfoTab run={run} setRun={setRun} sel={sel} arch={arch} go={go} togglePool={togglePool} setSubTab={setSubTab}/>
          )}
          {subTab === 'item' && (
            <ItemTab run={run} setRun={setRun} sel={sel} arch={arch}/>
          )}
          {subTab === 'lineup' && (
            <LineupTab run={run} setRun={setRun} togglePool={togglePool}/>
          )}
          {!sel && subTab !== 'lineup' && (
            <div style={{ padding:'80px 40px', textAlign:'center', color:'var(--bone-dim)', fontStyle:'italic' }}>
              The brood is empty. Recruit followers from the Trader.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-NAV BAR
// =============================================================================
const SubNav = ({ active, onChange }) => {
  const tabs = [
    { id:'unit-info', label:'Unit Info',  glyph:'◈', desc:'Specimen biography & patterns' },
    { id:'item',      label:'Item',       glyph:'⌬', desc:'Augmentation · Relic · Quest' },
    { id:'lineup',    label:'Lineup',     glyph:'▦', desc:'Battle formations · W4/W6/W8/W10' },
  ];
  return (
    <div style={{
      position:'absolute', top:60, left:0, right:0, height:48, zIndex:15,
      display:'flex', alignItems:'stretch',
      background:'linear-gradient(180deg, rgba(8,12,16,0.92), rgba(0,0,0,0.6))',
      borderBottom:'1px solid var(--abyss-4)',
      boxShadow:'0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
    }}>
      {/* eyebrow on the left */}
      <div style={{ padding:'0 18px', display:'flex', alignItems:'center', gap:8,
        borderRight:'1px solid var(--abyss-3)', minWidth:200 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--brass-dim)' }}>♘</span>
        <div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em', color:'var(--brass-dim)', textTransform:'uppercase' }}>
            Council Sub-Hall
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'var(--bone)', letterSpacing:'0.08em' }}>
            {(tabs.find(t=>t.id===active) || tabs[0]).desc}
          </div>
        </div>
      </div>

      {/* tab buttons */}
      <div style={{ flex:1, display:'flex', alignItems:'stretch' }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={()=>onChange(t.id)}
              style={{
                position:'relative', padding:'0 24px', background:'transparent', border:'none',
                cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                color: isActive ? 'var(--brass)' : 'var(--bone-dim)',
                fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.18em', textTransform:'uppercase',
                borderRight:'1px solid var(--abyss-3)', transition:'color 0.15s',
              }}
              onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.color='var(--bone)'; }}
              onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.color='var(--bone-dim)'; }}
            >
              <span style={{ fontSize:14 }}>{t.glyph}</span>
              <span>{t.label}</span>
              {isActive && (
                <>
                  <span style={{ position:'absolute', bottom:-1, left:14, right:14, height:2,
                    background:'linear-gradient(90deg, transparent, var(--brass), transparent)' }}/>
                  <span style={{ position:'absolute', top:0, left:14, right:14, height:1,
                    background:'var(--brass-deep)', opacity:0.4 }}/>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// SHARED · ROSTER LIST
// =============================================================================
const RosterList = ({ roster, selId, setSelId }) => (
  <div style={{
    borderRight:'1px solid var(--abyss-4)',
    background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
    overflowY:'auto', padding:'14px 10px',
  }}>
    <div style={{ padding:'4px 8px 10px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
      <div className="caps">Brood Roster</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)' }}>
        {roster.length} souls
      </div>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {roster.map(f => {
        const a = FOLLOWER_ARCHETYPES[f.archetype];
        const isSel = f.instanceId === selId;
        const auged = Object.values(f.augments || {}).filter(Boolean).length;
        const slotCap = f.augSlotCount ?? 5;
        return (
          <div key={f.instanceId} onClick={()=>setSelId(f.instanceId)}
            style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer',
              background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
              border:'1px solid', borderColor: isSel ? a.color : 'var(--abyss-3)',
              borderLeft: isSel ? `3px solid ${a.color}` : '3px solid transparent',
              transition:'all 0.15s',
            }}>
            <div style={{ fontSize:22, fontFamily:'Cinzel, serif', width:28, textAlign:'center',
              color: a.color, textShadow: isSel ? `0 0 12px ${a.color}` : 'none' }}>{a.glyph}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', letterSpacing:'0.04em',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {f.name}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:3, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.1em' }}>
                <span>EVO·{f.evoTier}</span>
                <span>AUG·{auged}/{slotCap}</span>
              </div>
            </div>
            {f.inPool && (
              <div title="Deployed" style={{ width:8, height:8, borderRadius:'50%',
                background:'var(--brass)', boxShadow:'0 0 6px var(--brass)' }}/>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

window.ManageFollower = ManageFollower;
