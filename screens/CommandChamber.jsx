// Command Chamber — 4 sub-halls: Assignment · Reflection · Portal · Training Ground
const CommandChamber = ({ run, setRun, go }) => {
  // Honor a one-shot return tab (e.g. coming back from the Sparring Field), then
  // clear it so normal entry defaults to Assignment.
  const [subTab, setSubTab] = React.useState(run.commandSubTab || 'assignment');
  React.useEffect(() => {
    if (run.commandSubTab) setRun(r => { const { commandSubTab, ...rest } = r; return rest; });
  // eslint-disable-next-line
  }, []);

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-command" subtitle="Command Chamber · War-Map & Orders"/>
      <CommandSubNav active={subTab} onChange={setSubTab}/>

      <div style={{ position:'absolute', top:108, left:0, right:0, bottom:0 }}>
        {subTab === 'assignment' && <AssignmentPanel run={run} setRun={setRun} go={go}/>}
        {subTab === 'reflection' && <ReflectionPanel run={run} setRun={setRun} go={go}/>}
        {subTab === 'portal'     && <PortalPanel     run={run} setRun={setRun} go={go}/>}
        {subTab === 'training'   && <TrainingPanel   run={run} setRun={setRun} go={go}/>}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-NAVIGATION BAR
// =============================================================================
const CommandSubNav = ({ active, onChange }) => {
  const tabs = [
    { id:'assignment', label:'Assignment',      glyph:'✠', desc:'War-map · briefings · deployment' },
    { id:'reflection', label:'Reflection',      glyph:'◐', desc:'Separate hunts · seven mirrored modes' },
    { id:'portal',     label:'Portal',          glyph:'◉', desc:'Open the tide · match a distant sovereign' },
    { id:'training',   label:'Training Ground', glyph:'▦', desc:'Custom skirmish · build both sides' },
  ];
  return (
    <div style={{
      position:'absolute', top:60, left:0, right:0, height:48, zIndex:15,
      display:'flex', alignItems:'stretch',
      background:'linear-gradient(180deg, rgba(8,12,16,0.92), rgba(0,0,0,0.6))',
      borderBottom:'1px solid var(--abyss-4)',
      boxShadow:'0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
    }}>
      <div style={{ padding:'0 18px', display:'flex', alignItems:'center', gap:8,
        borderRight:'1px solid var(--abyss-3)', minWidth:220 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--brass-dim)' }}>✠</span>
        <div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em', color:'var(--brass-dim)', textTransform:'uppercase' }}>
            War-Chamber Sub-Hall
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'var(--bone)', letterSpacing:'0.08em' }}>
            {(tabs.find(t=>t.id===active) || tabs[0]).desc}
          </div>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'stretch' }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={()=>onChange(t.id)}
              style={{
                position:'relative', padding:'0 26px', background:'transparent', border:'none',
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
// PANEL 1 · ASSIGNMENT — current war-map / briefing / deployment
// =============================================================================
const AssignmentPanel = ({ run, setRun, go }) => {
  const MAIN = OP_ASSIGNMENTS.filter(a => a.kind === 'main');
  const SIDE = OP_ASSIGNMENTS.filter(a => a.kind === 'side');

  const [picked, setPicked] = React.useState(run.pickedAssignmentId || MAIN[0].id);
  const assignment = OP_ASSIGNMENTS.find(a => a.id === picked);

  const roster = run.roster || [];
  const allLineups = run.lineups || {};
  const requiredWidth = assignment.width || 6;

  const formations = [
    { w:4,  label:'W4',  title:'Skirmish',  cap:6,  color:'oklch(0.7 0.12 35)' },
    { w:6,  label:'W6',  title:'Vanguard',  cap:10, color:'oklch(0.7 0.13 195)' },
    { w:8,  label:'W8',  title:'Phalanx',   cap:14, color:'oklch(0.72 0.12 75)' },
    { w:10, label:'W10', title:'Tide-Wall', cap:18, color:'oklch(0.65 0.15 290)' },
  ];

  const eligibleLineups = (allLineups[requiredWidth] || []).filter(ln =>
    Object.keys(ln.board || {}).length > 0
  );

  const [selectedLineupId, setSelectedLineupId] = React.useState(() =>
    eligibleLineups[0]?.id || null
  );

  React.useEffect(() => {
    const fresh = (allLineups[requiredWidth] || []).filter(ln =>
      Object.keys(ln.board || {}).length > 0
    );
    setSelectedLineupId(fresh[0]?.id || null);
  // eslint-disable-next-line
  }, [picked]);

  const selectedLineup = eligibleLineups.find(l => l.id === selectedLineupId) || null;
  const selectedBoard = selectedLineup?.board || {};
  const selectedDeployedCount = Object.values(selectedBoard).filter(Boolean).length;

  const overseer = OVERSEERS[assignment.overseer];
  const canDeploy = !!selectedLineup && selectedDeployedCount > 0;

  const undertake = () => {
    if (!canDeploy) return;
    const placedIds = new Set(Object.values(selectedBoard));
    setRun(r => ({
      ...r,
      pickedAssignmentId: assignment.id,
      deployedAssignmentId: assignment.id,
      assignmentIdx: assignment.map || 0,
      currentNodeIdx: 0,
      lineupWidth: requiredWidth,
      activeLineupId: selectedLineupId,
      roster: r.roster.map(f => ({ ...f, inPool: placedIds.has(f.instanceId) })),
      assignmentStart: {
        id: assignment.id,
        name: assignment.name,
        res: { ...(r.res || { coral:0, dna:0, lumin:0 }) },
        rosterSize: (r.roster || []).length,
        deckSize: (r.deck || []).length,
        relicsSize: (r.relics || []).length,
        questItemsSize: (r.questItems || []).length,
      },
    }));
    go('map');
  };

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'340px 1fr 340px', gap:0 }}>
      {/* LEFT — Assignment list */}
      <div style={{ borderRight:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        overflowY:'auto', padding:'18px 14px' }}>

        <div className="caps" style={{ marginBottom:10 }}>Main Assignments</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {MAIN.map(a => (
            <AssignmentPick key={a.id} assignment={a} active={picked===a.id} onClick={()=>setPicked(a.id)}/>
          ))}
        </div>

        <div className="caps" style={{ marginBottom:10 }}>Side Assignments</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {SIDE.map(a => (
            <AssignmentPick key={a.id} assignment={a} active={picked===a.id} onClick={()=>setPicked(a.id)}/>
          ))}
        </div>

        <div className="divider fancy"><span>◈</span></div>
        <div style={{ padding:'10px 12px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
          <div className="eyebrow" style={{ color:'var(--coral-dim)', marginBottom:6 }}>◣ DECISION</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.5 }}>
            Some Main Assignments bar the way to others. Choosing one breaks the alternate tide forever.
          </div>
        </div>
      </div>

      {/* CENTER — Dossier */}
      <div style={{ overflowY:'auto', padding:'24px 28px' }}>
        <AssignmentDossier assignment={assignment} overseer={overseer} locksOut={
          assignment.locksOut ? OP_ASSIGNMENTS.filter(a => assignment.locksOut.includes(a.id)) : []
        }/>
      </div>

      {/* RIGHT — Deployment */}
      <div style={{ borderLeft:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        overflowY:'auto', padding:'18px 14px' }}>
        <div className="caps" style={{ marginBottom:6 }}>Deployment Option</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)',
          letterSpacing:'0.2em', marginBottom:14 }}>
          REQUIRED FORMATION · W{requiredWidth}
        </div>

        <div style={{ padding:'10px 12px', background:'var(--abyss-2)',
          border:`1px solid ${assignment.palette.accent}`,
          borderLeft:`3px solid ${assignment.palette.accent}`, marginBottom:14 }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:assignment.palette.accent, letterSpacing:'0.22em', textTransform:'uppercase' }}>
            ◣ This Tide Demands
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)',
            letterSpacing:'0.05em', marginTop:4 }}>
            {(formations.find(f=>f.w===requiredWidth)?.title) || 'Vanguard'} · W{requiredWidth}
          </div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)',
            fontStyle:'italic', marginTop:3 }}>
            Only formations of this width may answer the call.
          </div>
        </div>

        <div className="caps" style={{ marginBottom:8 }}>Choose a Lineup</div>

        {eligibleLineups.length === 0 && (
          <div style={{ padding:'18px 14px', border:'1px dashed var(--abyss-4)',
            background:'var(--abyss-1)', textAlign:'center' }}>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone-dim)',
              fontStyle:'italic', lineHeight:1.5, marginBottom:10 }}>
              No W{requiredWidth} lineup has been arrayed.
            </div>
            <button className="btn primary"
              onClick={()=>{
                setRun(r => ({ ...r, lineupWidth: requiredWidth }));
                go('op-lineup');
              }}
              style={{ width:'100%', justifyContent:'center', padding:'10px' }}>
              + Forge New Lineup
            </button>
            <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:9,
              color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
              ‣ OPENS LINEUP TAB · W{requiredWidth}
            </div>
          </div>
        )}

        {eligibleLineups.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {eligibleLineups.map(ln => {
              const placed = Object.values(ln.board).filter(Boolean);
              const sel = selectedLineupId === ln.id;
              const accent = formations.find(f=>f.w===requiredWidth)?.color || assignment.palette.accent;
              return (
                <div key={ln.id} onClick={()=>setSelectedLineupId(ln.id)}
                  style={{
                    padding:'12px 14px', cursor:'pointer',
                    background: sel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid', borderColor: sel ? accent : 'var(--abyss-3)',
                    borderLeft: sel ? `3px solid ${accent}` : '3px solid transparent',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
                      letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ color: accent, fontSize:11 }}>◈</span>
                      {ln.name}
                    </div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                      color:accent, letterSpacing:'0.18em' }}>
                      {placed.length} SOULS
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:3, marginTop:8, flexWrap:'wrap' }}>
                    {placed.slice(0, 12).map((iid, i) => {
                      const fl = roster.find(x => x.instanceId === iid);
                      if (!fl) return null;
                      const a = FOLLOWER_ARCHETYPES[fl.archetype];
                      return (
                        <div key={i} title={fl.name} style={{
                          width:18, height:18, display:'grid', placeItems:'center',
                          background:'var(--abyss-0)', border:`1px solid ${a.color}`,
                          color:a.color, fontFamily:'Cinzel, serif', fontSize:11,
                        }}>{a.glyph}</div>
                      );
                    })}
                    {placed.length > 12 && (
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                        color:'var(--bone-dim)', alignSelf:'center', marginLeft:4 }}>
                        +{placed.length - 12}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <button className="btn ghost sm"
              onClick={()=>{
                setRun(r => ({ ...r, lineupWidth: requiredWidth }));
                go('op-lineup');
              }}
              style={{ marginTop:4, justifyContent:'center', padding:'8px' }}>
              ✎ Edit / Forge Another W{requiredWidth} Lineup
            </button>
          </div>
        )}

        <div className="divider fancy" style={{ marginTop:18 }}><span>◈ ORDERS ◈</span></div>
        <button
          className="btn primary"
          disabled={!canDeploy}
          onClick={undertake}
          style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14 }}>
          {!canDeploy ? 'Array a Lineup First' : `Undertake Assignment`}
        </button>
        <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.15em', textAlign:'center' }}>
          ‣ SETS THE TIDE IN MOTION
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PANEL 2 · REFLECTION — seven separate hunt-modes
// =============================================================================
const REFLECTION_MODES = [
  { id:'mirror-match',     glyph:'◐', name:'Mirror Match',     epithet:'The brood faces its own reflection',
    desc:'A hunt against a copy of your own lineup. Every move is a confession to yourself.',
    accent:'oklch(0.72 0.13 195)', difficulty:'Equal Tide' },
  { id:'empty-reef',       glyph:'◌', name:'Empty Reef',       epithet:'All augmentations stripped',
    desc:'No augments, no relics. Only the bare carapace and the chess between you and the deep.',
    accent:'oklch(0.65 0.09 80)',  difficulty:'Stark' },
  { id:'single-specimen',  glyph:'☥', name:'Single Specimen',  epithet:'Choose one archetype only',
    desc:'Your entire brood becomes copies of one chosen follower. A pure hymn, sung in monotone.',
    accent:'oklch(0.7 0.14 290)',  difficulty:'Discipline' },
  { id:'tide-trial',       glyph:'⏳', name:'Tide Trial',       epithet:'Strict turn-clock per match',
    desc:'Every hunt is governed by an ebbing turn count. Decisive blood, or forfeit to the dark.',
    accent:'oklch(0.7 0.15 25)',   difficulty:'Pressing' },
  { id:'boss-gauntlet',    glyph:'✠', name:'Boss Gauntlet',    epithet:'Five overseers, no respite',
    desc:'A chain of five boss-tier hunts back-to-back. Resources do not return between fights.',
    accent:'oklch(0.7 0.16 35)',   difficulty:'Brutal' },
  { id:'endless-hunt',     glyph:'∞', name:'Endless Hunt',     epithet:'Wave after wave, until unmade',
    desc:'Survive ascending tides until the brood is broken. Each wave grows hungrier than the last.',
    accent:'oklch(0.72 0.14 150)', difficulty:'Unbounded' },
  { id:'daily-mirror',     glyph:'◈', name:'Daily Mirror',     epithet:'A new seed each rising tide',
    desc:'All sovereigns are dealt the same hand this day. Climb the leaderboard before the next tide.',
    accent:'oklch(0.8 0.13 82)',   difficulty:'Shared Seed' },
];

const ReflectionPanel = ({ run, setRun, go }) => {
  const [selected, setSelected] = React.useState(REFLECTION_MODES[0].id);
  const mode = REFLECTION_MODES.find(m => m.id === selected) || REFLECTION_MODES[0];

  const begin = () => {
    // UI scaffolding — mode logic is not yet wired. Stash selection on run for downstream consumers.
    setRun(r => ({ ...r, reflectionMode: mode.id }));
  };

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'1fr 380px', gap:0 }}>
      {/* LEFT — mode grid */}
      <div style={{ overflowY:'auto', padding:'28px 36px' }}>
        <div style={{ marginBottom:20 }}>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Mirror Halls</div>
          <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.06em' }}>
            REFLECTION
          </h1>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
            fontStyle:'italic', maxWidth:680, lineHeight:1.6 }}>
            Seven hunts held apart from the campaign. Choose a mirror to step through —
            the brood you bring will return to the vessel afterward, but the tide within is its own.
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
          {REFLECTION_MODES.map((m, i) => {
            const isSel = selected === m.id;
            return (
              <button key={m.id} onClick={()=>setSelected(m.id)}
                style={{
                  position:'relative', textAlign:'left', cursor:'pointer',
                  padding:'18px 16px 16px',
                  background: isSel
                    ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-1))'
                    : 'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                  border: `1px solid ${isSel ? m.accent : 'var(--abyss-4)'}`,
                  borderTop: `3px solid ${isSel ? m.accent : 'var(--abyss-4)'}`,
                  color:'var(--bone)', transition:'all 0.18s',
                  boxShadow: isSel ? `0 0 24px ${m.accent}33, inset 0 1px 0 rgba(180,230,235,0.08)` : 'var(--shadow-inset)',
                  gridColumn: (i === 6) ? 'span 4 / auto' : 'span 1', // last (7th) mode spans full row solo? we keep span 1, see below
                }}
                onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.borderColor=m.accent; }}
                onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.borderColor='var(--abyss-4)'; }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:38, color:m.accent, lineHeight:1,
                    textShadow:`0 0 14px ${m.accent}, 0 0 24px ${m.accent}66` }}>{m.glyph}</span>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
                    letterSpacing:'0.18em', textTransform:'uppercase',
                    border:'1px solid var(--abyss-4)', padding:'2px 6px' }}>
                    {String(i+1).padStart(2,'0')}
                  </span>
                </div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:15, letterSpacing:'0.04em', marginBottom:4 }}>
                  {m.name}
                </div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)',
                  fontStyle:'italic', lineHeight:1.5, minHeight:36 }}>
                  {m.epithet}
                </div>
                <div style={{ marginTop:10, paddingTop:8, borderTop:'1px dashed var(--abyss-3)',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                    color:m.accent, letterSpacing:'0.18em', textTransform:'uppercase' }}>
                    {m.difficulty}
                  </span>
                  {isSel && <span style={{ fontSize:11, color:m.accent }}>◆ chosen</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — selected mode detail + launch */}
      <div style={{ borderLeft:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        overflowY:'auto', padding:'24px 22px' }}>

        <div style={{ position:'relative', padding:'22px 18px', marginBottom:18,
          background:`linear-gradient(180deg, ${mode.accent}22, transparent 80%)`,
          border:`1px solid ${mode.accent}66`, borderLeft:`3px solid ${mode.accent}` }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:72, color:mode.accent, lineHeight:1,
            textShadow:`0 0 28px ${mode.accent}, 0 0 50px ${mode.accent}66`,
            position:'absolute', top:10, right:14, opacity:0.35 }}>
            {mode.glyph}
          </div>
          <div className="eyebrow" style={{ color:mode.accent }}>Reflection Hall</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:22, letterSpacing:'0.05em', marginTop:4 }}>
            {mode.name}
          </div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic',
            color:'var(--bone-dim)', marginTop:6, lineHeight:1.5, position:'relative' }}>
            &ldquo;{mode.epithet}.&rdquo;
          </div>
        </div>

        <div className="caps" style={{ marginBottom:8 }}>Ritual</div>
        <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
          fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone)', lineHeight:1.65 }}>
          {mode.desc}
        </div>

        <div className="caps" style={{ marginTop:14, marginBottom:8 }}>Tide Modifiers</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <ReflectMeta k="Brood Source"  v="Current vessel roster"/>
          <ReflectMeta k="Rewards"       v="Cosmetic — no campaign carry-over"/>
          <ReflectMeta k="Death Rule"    v={mode.id==='endless-hunt' ? 'Permadeath until break' : 'No permanent loss'}/>
          <ReflectMeta k="Status"        v="◇ Hall prepared"/>
        </div>

        <div className="divider fancy" style={{ marginTop:22 }}><span style={{ color:mode.accent }}>◈ STEP THROUGH ◈</span></div>
        <button className="btn primary" onClick={begin}
          style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14 }}>
          Begin {mode.name}
        </button>
        <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.15em', textAlign:'center' }}>
          ‣ STEPS INTO THE MIRROR
        </div>
      </div>
    </div>
  );
};

const ReflectMeta = ({ k, v }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
    padding:'8px 12px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
      color:'var(--bone-dim)', letterSpacing:'0.2em', textTransform:'uppercase' }}>{k}</span>
    <span style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', letterSpacing:'0.04em' }}>{v}</span>
  </div>
);

// =============================================================================
// PANEL 3 · PORTAL — online matchmaking UI
// =============================================================================
const PortalPanel = ({ run, setRun, go }) => {
  const [mode, setMode] = React.useState('ranked'); // 'ranked' | 'casual' | 'friend'
  const [searching, setSearching] = React.useState(false);
  const [waitSec, setWaitSec] = React.useState(0);

  // mock connection
  const onlineCount = 1287;
  const playerRank = { tier:'Pelagic IV', elo:1842, season:'Tide IX', wins:42, losses:31 };
  const leaderboard = [
    { name:'Vela-of-the-Salt-Choir', elo:2410, tier:'Abyssal I' },
    { name:'Carrion Hymnsmith',      elo:2386, tier:'Abyssal I' },
    { name:'Ossuary-Witness',        elo:2299, tier:'Abyssal II' },
    { name:'Iron Widow',             elo:2244, tier:'Abyssal II' },
    { name:'The Pale Mariner',       elo:2188, tier:'Abyssal III' },
  ];
  const friends = [
    { name:'Brood-Mother-Lethe',  status:'online',  activity:'Reflection · Mirror Match' },
    { name:'Hollow Mariner',      status:'online',  activity:'Portal · Queued (Ranked)' },
    { name:'Quietfin',            status:'idle',    activity:'Vessel · Manage Followers' },
    { name:'Salt-Eater',          status:'offline', activity:'Last seen 4 tides ago' },
  ];

  React.useEffect(() => {
    if (!searching) return;
    setWaitSec(0);
    const t = setInterval(()=>setWaitSec(s => s+1), 1000);
    return ()=>clearInterval(t);
  }, [searching]);

  const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const modes = [
    { id:'ranked', label:'Ranked Tide',  glyph:'✠', desc:'ELO-tracked. Affects your standing.' },
    { id:'casual', label:'Casual Hunt',  glyph:'◐', desc:'Untracked. For practice and play.' },
    { id:'friend', label:'Friend Bout',  glyph:'◈', desc:'Private match by invite code.' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'320px 1fr 320px', gap:0 }}>
      {/* LEFT — player profile */}
      <div style={{ borderRight:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        overflowY:'auto', padding:'24px 18px' }}>
        <div className="caps" style={{ marginBottom:12 }}>Sovereign Profile</div>

        {/* portrait */}
        <div style={{ position:'relative', aspectRatio:'1', marginBottom:14,
          background:`radial-gradient(ellipse at 40% 25%, oklch(0.45 0.07 188 / 0.85), transparent 60%),
                      linear-gradient(180deg, var(--abyss-3), var(--abyss-0))`,
          border:'1px solid var(--brass-deep)', display:'grid', placeItems:'center',
          boxShadow:'inset 0 0 40px rgba(0,8,12,0.55)' }}>
          <span style={{ fontFamily:'Cinzel, serif', fontSize:120, color:'var(--brass)',
            textShadow:'0 0 30px oklch(0.72 0.11 80 / 0.5)' }}>◈</span>
          <div style={{ position:'absolute', bottom:8, left:8, right:8,
            padding:'6px 8px', background:'rgba(0,8,12,0.75)', border:'1px solid var(--abyss-4)',
            fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.18em',
            color:'var(--bone-dim)', textTransform:'uppercase', textAlign:'center' }}>
            ‣ {run.cls?.name || 'Sovereign Unnamed'}
          </div>
        </div>

        <div style={{ padding:'12px 14px', background:'var(--abyss-2)', border:'1px solid var(--brass-deep)',
          marginBottom:12 }}>
          <div className="eyebrow" style={{ color:'var(--brass-dim)' }}>Tier</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:22, color:'var(--brass)',
            letterSpacing:'0.08em', marginTop:2,
            textShadow:'0 0 14px oklch(0.72 0.11 80 / 0.4)' }}>
            {playerRank.tier}
          </div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--bone)',
            letterSpacing:'0.1em', marginTop:4 }}>
            ELO {playerRank.elo}
          </div>
          {/* ELO bar */}
          <div style={{ marginTop:10, height:4, background:'var(--abyss-1)', position:'relative' }}>
            <div style={{ position:'absolute', inset:0, width:'68%',
              background:'linear-gradient(90deg, oklch(0.5 0.1 80), var(--brass))' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4,
            fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
            <span>1800</span><span>NEXT · 1900</span>
          </div>
        </div>

        <PortalStat k="Season"    v={playerRank.season}/>
        <PortalStat k="Wins"      v={String(playerRank.wins)}  accent="var(--bio)"/>
        <PortalStat k="Losses"    v={String(playerRank.losses)} accent="var(--coral)"/>
        <PortalStat k="Win Rate"  v={`${Math.round(playerRank.wins/(playerRank.wins+playerRank.losses)*100)}%`}/>
        <PortalStat k="Brood"     v={run.cls?.name || '—'}/>

        <div className="divider"/>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)',
          letterSpacing:'0.18em', textTransform:'uppercase', textAlign:'center' }}>
          ◉ {onlineCount.toLocaleString()} sovereigns adrift
        </div>
      </div>

      {/* CENTER — queue */}
      <div style={{ overflowY:'auto', padding:'28px 36px', display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:18 }}>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Tide-Bridge</div>
          <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
            PORTAL
          </h1>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
            fontStyle:'italic', lineHeight:1.6 }}>
            Open the channel and a distant sovereign will answer — their brood against yours, across the dark current.
          </div>
        </div>

        {/* mode toggle */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:22 }}>
          {modes.map(m => {
            const isSel = mode === m.id;
            return (
              <button key={m.id} onClick={()=>setMode(m.id)}
                style={{
                  padding:'14px 14px', cursor:'pointer', textAlign:'left',
                  background: isSel
                    ? 'linear-gradient(180deg, oklch(0.35 0.08 188), oklch(0.22 0.05 192))'
                    : 'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                  border:`1px solid ${isSel ? 'var(--brass)' : 'var(--abyss-4)'}`,
                  color:'var(--bone)', transition:'all 0.15s',
                  boxShadow: isSel ? '0 0 18px oklch(0.78 0.14 188 / 0.25)' : 'var(--shadow-inset)',
                }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:22, color: isSel ? 'var(--brass)' : 'var(--bone-dim)' }}>
                    {m.glyph}
                  </span>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.06em',
                    color: isSel ? 'var(--brass)' : 'var(--bone)' }}>{m.label}</span>
                </div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12,
                  color:'var(--bone-dim)', fontStyle:'italic', marginTop:6, lineHeight:1.4 }}>
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* invite code box for friend mode */}
        {mode === 'friend' && (
          <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
            marginBottom:18 }}>
            <div className="caps" style={{ marginBottom:6 }}>Invite Code</div>
            <div style={{ display:'flex', gap:8 }}>
              <input placeholder="ENTER-CODE-XXXX" style={{
                flex:1, padding:'10px 12px', background:'var(--abyss-0)', border:'1px solid var(--abyss-4)',
                color:'var(--bone)', fontFamily:'JetBrains Mono, monospace', fontSize:13, letterSpacing:'0.18em',
              }}/>
              <button className="btn ghost sm">Generate</button>
            </div>
          </div>
        )}

        {/* big queue button */}
        <div style={{ flex:1, display:'grid', placeItems:'center', position:'relative', minHeight:240 }}>
          {/* concentric search rings */}
          {searching && [...Array(3)].map((_,i)=>(
            <div key={i} style={{
              position:'absolute', width:240+i*80, height:240+i*80, borderRadius:'50%',
              border:`1px solid oklch(0.7 0.13 188 / ${0.4 - i*0.1})`,
              animation:'pulse 2.4s ease-in-out infinite', animationDelay:`${i*0.3}s`,
            }}/>
          ))}

          <div style={{ position:'relative', textAlign:'center' }}>
            <button onClick={()=>setSearching(s => !s)}
              style={{
                width:220, height:220, borderRadius:'50%', cursor:'pointer',
                background: searching
                  ? 'radial-gradient(ellipse at center, oklch(0.4 0.12 188), oklch(0.2 0.06 192))'
                  : 'radial-gradient(ellipse at center, oklch(0.3 0.08 188), oklch(0.16 0.04 192))',
                border:`2px solid ${searching ? 'var(--bio)' : 'var(--brass-deep)'}`,
                color:'var(--bone)',
                boxShadow: searching
                  ? '0 0 60px oklch(0.78 0.14 188 / 0.55), inset 0 0 30px oklch(0.78 0.14 188 / 0.25)'
                  : '0 0 30px oklch(0.72 0.11 80 / 0.25), inset 0 0 20px rgba(0,8,12,0.55)',
                transition:'all 0.25s',
              }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:60, lineHeight:1,
                color: searching ? 'var(--bio)' : 'var(--brass)',
                textShadow: searching ? '0 0 28px var(--bio)' : '0 0 14px oklch(0.72 0.11 80 / 0.5)' }}>
                ◉
              </div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:15, letterSpacing:'0.18em',
                marginTop:8, color: searching ? 'var(--bio)' : 'var(--brass)' }}>
                {searching ? 'SEEKING…' : 'ENTER QUEUE'}
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.2em',
                color:'var(--bone-dim)', marginTop:6 }}>
                {searching ? fmtTime(waitSec) : modes.find(m=>m.id===mode).label.toUpperCase()}
              </div>
            </button>

            {searching && (
              <div style={{ marginTop:18, fontFamily:'Cormorant Garamond, serif', fontSize:13,
                color:'var(--bio-dim)', fontStyle:'italic' }}>
                The current carries your call into the dark…
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'10px 14px', background:'rgba(0,8,12,0.45)', border:'1px solid var(--abyss-3)',
          fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bio-dim)',
          letterSpacing:'0.18em', textTransform:'uppercase', textAlign:'center' }}>
          ◇ TIDE-BRIDGE ONLINE · LATENCY 38MS · REGION ABYSSAL-WEST
        </div>
      </div>

      {/* RIGHT — leaderboard + friends */}
      <div style={{ borderLeft:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        overflowY:'auto', padding:'22px 16px' }}>
        <div className="caps" style={{ marginBottom:10 }}>Leaderboard · Tide IX</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
          {leaderboard.map((p, i) => (
            <div key={p.name} style={{
              padding:'10px 12px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
              borderLeft:`3px solid ${i===0?'var(--brass)':i===1?'oklch(0.7 0.05 200)':i===2?'oklch(0.55 0.1 35)':'var(--abyss-4)'}`,
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--brass)', width:18, textAlign:'center' }}>
                  {i+1}
                </span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)',
                    letterSpacing:'0.03em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                    letterSpacing:'0.15em', textTransform:'uppercase', marginTop:1 }}>
                    {p.tier}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--brass)',
                letterSpacing:'0.08em' }}>
                {p.elo}
              </div>
            </div>
          ))}
        </div>

        <div className="caps" style={{ marginBottom:10 }}>Brood-Kin</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {friends.map(f => {
            const dot = f.status==='online' ? 'var(--bio)' : f.status==='idle' ? 'oklch(0.7 0.12 80)' : 'var(--abyss-4)';
            return (
              <div key={f.name} style={{
                padding:'8px 12px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                opacity: f.status==='offline' ? 0.55 : 1,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:dot,
                    boxShadow: f.status==='online' ? `0 0 6px ${dot}` : 'none' }}/>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)',
                    letterSpacing:'0.03em' }}>{f.name}</span>
                </div>
                <div style={{ marginTop:4, marginLeft:16, fontFamily:'Cormorant Garamond, serif',
                  fontSize:11, color:'var(--bone-dim)', fontStyle:'italic' }}>
                  {f.activity}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PortalStat = ({ k, v, accent }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline',
    padding:'8px 10px', borderBottom:'1px dashed var(--abyss-3)' }}>
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
      color:'var(--bone-dim)', letterSpacing:'0.2em', textTransform:'uppercase' }}>{k}</span>
    <span style={{ fontFamily:'Cinzel, serif', fontSize:13,
      color: accent || 'var(--bone)', letterSpacing:'0.04em' }}>{v}</span>
  </div>
);

// =============================================================================
// PANEL 4 · TRAINING GROUND — custom both-side unit builder
// =============================================================================
const TRAINING_FORMATIONS = [
  { w:4,  label:'W4',  title:'Skirmish',  color:'oklch(0.7 0.12 35)' },
  { w:6,  label:'W6',  title:'Vanguard',  color:'oklch(0.7 0.13 195)' },
  { w:8,  label:'W8',  title:'Standard',  color:'var(--brass)' },
  { w:10, label:'W10', title:'Tide-Wall', color:'oklch(0.65 0.15 290)' },
];

const TRAINING_MODES = [
  { id:'pvp',   label:'PvP',      glyph:'⚔', tag:'Player · Player',
    blurb:'Two sovereigns share one board — a hot-seat duel.' },
  { id:'pvai',  label:'P vs AI',  glyph:'◈', tag:'Player · Machine',
    blurb:'Your chosen lineup against a Reef-mind brood.' },
  { id:'aivai', label:'AI vs AI', glyph:'◐', tag:'Machine · Machine',
    blurb:'Loose two lineups and watch the patterns unfold.' },
];

const TrainingPanel = ({ run, setRun, go }) => {
  const roster     = run.roster  || [];
  const allLineups = run.lineups || {};

  const [mode,    setMode]    = React.useState('pvai');
  const [width,   setWidth]   = React.useState(run.lineupWidth || 6);
  const [sideAId, setSideAId] = React.useState(null);
  const [sideBId, setSideBId] = React.useState(null);
  const [aiSkill, setAiSkill] = React.useState('measured');

  // Only lineups with pieces actually placed can spar. BOTH sides draw from the
  // SAME width's pool — that is the shared-W constraint, enforced by construction.
  const eligibleFor = (w) => (allLineups[w] || []).filter(ln => Object.keys(ln.board || {}).length > 0);
  const eligible = eligibleFor(width);

  // When the shared width changes, re-seed both side selections to that pool.
  React.useEffect(() => {
    const fresh = eligibleFor(width);
    setSideAId(fresh[0]?.id || null);
    setSideBId(fresh[1]?.id || fresh[0]?.id || null);
  // eslint-disable-next-line
  }, [width]);

  // Persist chosen width so the Lineup tab opens on the same formation.
  React.useEffect(() => {
    setRun(r => r.lineupWidth === width ? r : { ...r, lineupWidth: width });
  // eslint-disable-next-line
  }, [width]);

  const sideA = eligible.find(l => l.id === sideAId) || null;
  const sideB = eligible.find(l => l.id === sideBId) || null;

  const isPvP      = mode === 'pvp';
  const isAIvAI    = mode === 'aivai';
  const involvesAI = mode !== 'pvp';

  // Per-mode framing for the two columns.
  const sides = isAIvAI
    ? [
        { key:'A', title:'AI · Sovereign I',  subtitle:'First machine brood',  color:'var(--bio)',   colorDim:'var(--bio-dim)',   glyph:'◐' },
        { key:'B', title:'AI · Sovereign II', subtitle:'Second machine brood', color:'var(--coral)', colorDim:'var(--coral-dim)', glyph:'◑' },
      ]
    : [
        { key:'A', title:'Your Lineup',     subtitle:'The hand you will play', color:'var(--bio)',   colorDim:'var(--bio-dim)',   glyph:'◈' },
        { key:'B', title:'Enemy AI Lineup', subtitle:'The machine you face',   color:'var(--coral)', colorDim:'var(--coral-dim)', glyph:'◣' },
      ];

  const forge = () => { setRun(r => ({ ...r, lineupWidth: width })); go('op-lineup'); };

  const canBegin = !isPvP && !!sideA && !!sideB;

  // Stash the chosen bout and open the Sparring Field scene with both lineups loaded.
  const loadLineup = () => {
    if (!canBegin) return;
    setRun(r => ({ ...r, trainingConfig: {
      mode, width, sideA: sideAId, sideB: sideBId,
      aiSkill: involvesAI ? aiSkill : null,
    }}));
    go('training-board');
  };

  const aiOptions = [
    { id:'docile',   label:'Docile',   desc:'Predictable. Forgives most blunders.' },
    { id:'measured', label:'Measured', desc:'Plays the obvious line. A whetstone.' },
    { id:'cunning',  label:'Cunning',  desc:'Looks for traps and exchanges.' },
    { id:'merciless',label:'Merciless',desc:'Punishes every loose square.' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, overflowY:'auto' }}>
      <div style={{ padding:'28px 36px', maxWidth:1380, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Sparring Reef</div>
          <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
            TRAINING GROUND
          </h1>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
            fontStyle:'italic', lineHeight:1.6, maxWidth:760 }}>
            Choose the manner of the bout, then array both broods. The Reef remembers no test —
            both lineups must share the same width to meet across the same board.
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:22 }}>
          {TRAINING_MODES.map(m => (
            <TrainingModeCard key={m.id} mode={m} active={mode===m.id} onClick={()=>setMode(m.id)}/>
          ))}
        </div>

        {isPvP ? (
          <TrainingPvPPlaceholder/>
        ) : (
          <>
            {/* Shared formation width + bout params */}
            <div className="panel ornate" style={{ padding:'16px 20px', marginBottom:22,
              display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:24 }}>

              <ParamGroup label="Shared Formation · Width">
                <div style={{ display:'flex', gap:6 }}>
                  {TRAINING_FORMATIONS.map(f => {
                    const isSel = width === f.w;
                    const cnt = eligibleFor(f.w).length;
                    return (
                      <button key={f.w} onClick={()=>setWidth(f.w)} title={`${f.title} · ${cnt} ready`}
                        style={{
                          flex:1, padding:'8px 6px', cursor:'pointer', textAlign:'center',
                          background: isSel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-2)',
                          border:`1px solid ${isSel ? f.color : 'var(--abyss-4)'}`,
                          borderTop:`3px solid ${isSel ? f.color : 'var(--abyss-4)'}`,
                          color: isSel ? f.color : 'var(--bone-dim)', transition:'all 0.15s',
                        }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:15, letterSpacing:'0.05em' }}>{f.label}</div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8,
                          color: cnt>0 ? 'var(--bone-dim)' : 'var(--abyss-4)', letterSpacing:'0.15em', marginTop:2 }}>
                          {cnt} READY
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ParamGroup>

              <ParamGroup label="AI Skill">
                <div style={{ display:'flex', gap:6 }}>
                  {aiOptions.map(a => {
                    const isSel = aiSkill === a.id;
                    return (
                      <button key={a.id} onClick={()=>setAiSkill(a.id)} title={a.desc}
                        style={{
                          flex:1, padding:'8px 6px', cursor:'pointer',
                          background: isSel
                            ? 'linear-gradient(180deg, oklch(0.35 0.08 188), oklch(0.22 0.05 192))'
                            : 'var(--abyss-2)',
                          border:`1px solid ${isSel ? 'var(--brass)' : 'var(--abyss-4)'}`,
                          color: isSel ? 'var(--brass)' : 'var(--bone-dim)',
                          fontFamily:'Cinzel, serif', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase',
                          transition:'all 0.15s',
                        }}>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </ParamGroup>
            </div>

            {/* Two-side lineup picker — both pools are W{width}, the shared width */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', gap:18, marginBottom:22 }}>

              <TrainingLineupColumn
                side={sides[0]} lineups={eligible} selectedId={sideAId}
                onSelect={setSideAId} roster={roster} width={width} onForge={forge}/>

              {/* center divider */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
                <div style={{ width:1, flex:1, background:'linear-gradient(180deg, transparent, var(--brass-deep), transparent)' }}/>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:28, color:'var(--brass)',
                  textShadow:'0 0 14px oklch(0.72 0.11 80 / 0.4)' }}>vs</div>
                <div style={{ width:1, flex:1, background:'linear-gradient(180deg, transparent, var(--brass-deep), transparent)' }}/>
              </div>

              <TrainingLineupColumn
                side={sides[1]} lineups={eligible} selectedId={sideBId}
                onSelect={setSideBId} roster={roster} width={width} onForge={forge}/>
            </div>

            {/* Summary + launch */}
            <div className="panel ornate" style={{ padding:'18px 24px', display:'flex',
              alignItems:'center', gap:24 }}>
              <div style={{ flex:1 }}>
                <div className="caps" style={{ color:'var(--brass-dim)' }}>Sparring Configuration</div>
                <div style={{ display:'flex', gap:18, marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:11,
                  color:'var(--bone)', letterSpacing:'0.1em', flexWrap:'wrap' }}>
                  <span>{TRAINING_MODES.find(m=>m.id===mode).label.toUpperCase()}</span>
                  <span style={{ color:'var(--abyss-4)' }}>|</span>
                  <span>WIDTH {width}</span>
                  <span style={{ color:'var(--abyss-4)' }}>|</span>
                  <span>AI {aiSkill.toUpperCase()}</span>
                  <span style={{ color:'var(--abyss-4)' }}>|</span>
                  <span style={{ color:'var(--bio)' }}>{sideA ? sideA.name : '— none —'}</span>
                  <span style={{ color:'var(--bone-dim)' }}>vs</span>
                  <span style={{ color:'var(--coral)' }}>{sideB ? sideB.name : '— none —'}</span>
                </div>
              </div>
              <button className="btn primary" onClick={loadLineup}
                disabled={!canBegin}
                style={{ padding:'14px 28px', fontSize:14 }}>
                ▷ Load Lineup
              </button>
            </div>
            <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
              letterSpacing:'0.15em', textAlign:'right' }}>
              ‣ OPENS SPARRING FIELD{!canBegin ? ' · ARRAY BOTH LINEUPS TO LOAD' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ParamGroup = ({ label, children }) => (
  <div>
    <div className="eyebrow" style={{ color:'var(--brass-dim)', marginBottom:8 }}>{label}</div>
    {children}
  </div>
);

// --- Mode card: PvP / P vs AI / AI vs AI selector tile.
const TrainingModeCard = ({ mode, active, onClick }) => (
  <button onClick={onClick}
    style={{
      padding:'16px 16px', cursor:'pointer', textAlign:'left',
      background: active
        ? 'linear-gradient(180deg, oklch(0.35 0.08 188), oklch(0.22 0.05 192))'
        : 'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
      border:`1px solid ${active ? 'var(--brass)' : 'var(--abyss-4)'}`,
      borderTop:`3px solid ${active ? 'var(--brass)' : 'var(--abyss-4)'}`,
      color:'var(--bone)', transition:'all 0.16s',
      boxShadow: active ? '0 0 22px oklch(0.78 0.14 188 / 0.22)' : 'var(--shadow-inset)',
    }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
      <span style={{ fontFamily:'Cinzel, serif', fontSize:26, color: active ? 'var(--brass)' : 'var(--bone-dim)',
        textShadow: active ? '0 0 14px oklch(0.72 0.11 80 / 0.5)' : 'none' }}>{mode.glyph}</span>
      <div>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:16, letterSpacing:'0.06em',
          color: active ? 'var(--brass)' : 'var(--bone)' }}>{mode.label}</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
          letterSpacing:'0.22em', textTransform:'uppercase', marginTop:2 }}>{mode.tag}</div>
      </div>
    </div>
    <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, color:'var(--bone-dim)',
      fontStyle:'italic', lineHeight:1.45 }}>{mode.blurb}</div>
  </button>
);

// --- PvP placeholder: the duelling pit is not yet wired.
const TrainingPvPPlaceholder = () => (
  <div className="panel ornate" style={{ padding:'60px 40px', textAlign:'center',
    display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
    <div style={{ fontFamily:'Cinzel, serif', fontSize:54, color:'var(--brass-deep)',
      textShadow:'0 0 20px oklch(0.72 0.11 80 / 0.25)' }}>⚔</div>
    <div style={{ fontFamily:'Cinzel, serif', fontSize:20, color:'var(--bone)', letterSpacing:'0.08em' }}>
      Player versus Player
    </div>
    <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:15, fontStyle:'italic',
      color:'var(--bone-dim)', maxWidth:520, lineHeight:1.6 }}>
      The duelling pit is not yet open. Two sovereigns will one day share this board —
      for now, sharpen yourself against the Reef-mind.
    </div>
    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
      letterSpacing:'0.25em', textTransform:'uppercase', marginTop:4 }}>
      ◇ Coming on a later tide
    </div>
  </div>
);

// --- One side of the bout: a column of selectable lineups, all at the shared width.
const TrainingLineupColumn = ({ side, lineups, selectedId, onSelect, roster, width, onForge }) => (
  <div style={{ padding:'16px 16px', background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
    border:`1px solid ${side.colorDim}`, borderTop:`3px solid ${side.color}` }}>
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
      <div>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:17, color:side.color, letterSpacing:'0.06em',
          display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:21 }}>{side.glyph}</span>{side.title}
        </div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)',
          fontStyle:'italic', marginTop:2 }}>{side.subtitle}</div>
      </div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
        letterSpacing:'0.2em' }}>W{width}</div>
    </div>

    {lineups.length === 0 ? (
      <div style={{ padding:'22px 14px', border:'1px dashed var(--abyss-4)',
        background:'var(--abyss-1)', textAlign:'center' }}>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone-dim)',
          fontStyle:'italic', lineHeight:1.5, marginBottom:12 }}>
          No W{width} lineup has been arrayed.
        </div>
        <button className="btn primary" onClick={onForge}
          style={{ width:'100%', justifyContent:'center', padding:'10px' }}>
          + Forge W{width} Lineup
        </button>
        <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:9,
          color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
          ‣ OPENS LINEUP TAB · W{width}
        </div>
      </div>
    ) : (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {lineups.map(ln => (
          <LineupMiniCard key={ln.id} lineup={ln} roster={roster}
            accent={side.color} selected={selectedId === ln.id}
            onClick={()=>onSelect(ln.id)}/>
        ))}
        <button className="btn ghost sm" onClick={onForge}
          style={{ marginTop:2, justifyContent:'center', padding:'8px' }}>
          ✎ Forge / Edit W{width} Lineup
        </button>
      </div>
    )}
  </div>
);

// --- Compact lineup card with a souls preview, mirroring the Assignment deck.
const LineupMiniCard = ({ lineup, roster, accent, selected, onClick }) => {
  const placed = Object.values(lineup.board || {}).filter(Boolean);
  return (
    <div onClick={onClick}
      style={{
        padding:'12px 14px', cursor:'pointer',
        background: selected ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
        border:'1px solid', borderColor: selected ? accent : 'var(--abyss-3)',
        borderLeft: selected ? `3px solid ${accent}` : '3px solid transparent',
        transition:'all 0.15s',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
          letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:accent, fontSize:11 }}>◈</span>{lineup.name}
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:accent, letterSpacing:'0.18em' }}>
          {placed.length} SOULS
        </div>
      </div>
      <div style={{ display:'flex', gap:3, marginTop:8, flexWrap:'wrap' }}>
        {placed.slice(0, 12).map((iid, i) => {
          const fl = roster.find(x => x.instanceId === iid);
          if (!fl) return null;
          const a = FOLLOWER_ARCHETYPES[fl.archetype];
          return (
            <div key={i} title={fl.name} style={{
              width:18, height:18, display:'grid', placeItems:'center',
              background:'var(--abyss-0)', border:`1px solid ${a.color}`,
              color:a.color, fontFamily:'Cinzel, serif', fontSize:11,
            }}>{a.glyph}</div>
          );
        })}
        {placed.length > 12 && (
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
            color:'var(--bone-dim)', alignSelf:'center', marginLeft:4 }}>
            +{placed.length - 12}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SHARED · ASSIGNMENT CARDS (unchanged from prior version)
// =============================================================================
const AssignmentPick = ({ assignment, active, onClick }) => {
  const overseer = OVERSEERS[assignment.overseer];
  return (
    <button onClick={onClick}
      style={{
        padding:'12px 14px', cursor:'pointer', textAlign:'left',
        background: active ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
        border:'1px solid', borderColor: active ? assignment.palette.accent : 'var(--abyss-3)',
        borderLeft: active ? `3px solid ${assignment.palette.accent}` : '3px solid transparent',
        color:'var(--bone)', position:'relative', transition:'all 0.15s',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color: assignment.palette.accent, letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {assignment.type.replace('_',' ')}
        </div>
        {assignment.decision && (
          <div title="Decision: locks out an alternative"
            style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--coral)', letterSpacing:'0.2em' }}>
            ◣ DECISION
          </div>
        )}
      </div>
      <div style={{ fontFamily:'Cinzel, serif', fontSize:14, marginTop:4, letterSpacing:'0.04em', lineHeight:1.2 }}>
        {assignment.name}
      </div>
      <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:4, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic' }}>
        {overseer.name}
      </div>
    </button>
  );
};

const AssignmentDossier = ({ assignment, overseer, locksOut }) => {
  return (
    <div>
      <div style={{ position:'relative', padding:'20px 24px', marginBottom:20,
        background:`linear-gradient(180deg, ${assignment.palette.top}, ${assignment.palette.bottom})`,
        border:'1px solid var(--brass-deep)', overflow:'hidden' }}>
        <svg viewBox="0 0 800 220" preserveAspectRatio="none"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.3, pointerEvents:'none' }}>
          {[...Array(16)].map((_,i)=>(
            <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="220" stroke="oklch(0.5 0.08 75)" strokeWidth="0.3"/>
          ))}
          {[...Array(6)].map((_,i)=>(
            <line key={`h${i}`} x1="0" y1={i*40} x2="800" y2={i*40} stroke="oklch(0.5 0.08 75)" strokeWidth="0.3"/>
          ))}
          <g transform="translate(720 50)">
            <circle cx="0" cy="0" r="28" fill="none" stroke="oklch(0.6 0.1 75)" strokeWidth="0.5"/>
            <circle cx="0" cy="0" r="20" fill="none" stroke="oklch(0.6 0.1 75)" strokeWidth="0.3"/>
            <path d="M 0 -28 L 4 0 L 0 28 L -4 0 Z" fill="oklch(0.7 0.12 85)"/>
            <text x="0" y="-34" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="9" fill="oklch(0.7 0.12 85)">N</text>
          </g>
          <path d="M 60 140 Q 200 120 340 150 Q 460 180 600 160" stroke="oklch(0.6 0.12 195)" strokeWidth="0.7" fill="none" opacity="0.6"/>
          <path d="M 80 170 Q 220 150 360 180 Q 480 200 620 190" stroke="oklch(0.6 0.12 195)" strokeWidth="0.7" fill="none" opacity="0.5"/>
          {[[160,90],[380,100],[520,130]].map(([x,y],i)=>(
            <g key={i} transform={`translate(${x} ${y})`} opacity="0.6">
              <line x1="-5" y1="-5" x2="5" y2="5" stroke="oklch(0.7 0.15 25)" strokeWidth="1"/>
              <line x1="5" y1="-5" x2="-5" y2="5" stroke="oklch(0.7 0.15 25)" strokeWidth="1"/>
            </g>
          ))}
        </svg>

        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color: assignment.palette.accent, letterSpacing:'0.25em', textTransform:'uppercase' }}>
              {assignment.kind === 'main' ? 'Main Assignment' : 'Side Assignment'}
            </span>
            <span style={{ color:'var(--brass-dim)' }}>·</span>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.2em' }}>
              {assignment.type.replace(/_/g,' ')}
            </span>
            {assignment.decision && (
              <>
                <span style={{ color:'var(--brass-dim)' }}>·</span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--coral)', letterSpacing:'0.2em' }}>
                  ◣ DECISION
                </span>
              </>
            )}
          </div>
          <h1 style={{ margin:0, fontFamily:'Cinzel, serif', fontSize:38, color:'var(--bone)', letterSpacing:'0.04em', lineHeight:1.1 }}>
            {assignment.name}
          </h1>
          <div style={{ marginTop:8, fontFamily:'Cormorant Garamond, serif', fontSize:15, fontStyle:'italic', color:'var(--bone-dim)' }}>
            {assignment.location}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16 }}>
        <div style={{ padding:'18px 20px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
          <div className="caps" style={{ marginBottom:10 }}>Brief</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, color:'var(--bone)', lineHeight:1.65, fontStyle:'italic' }}>
            &ldquo;{assignment.description}&rdquo;
          </div>

          {locksOut.length > 0 && (
            <>
              <div className="divider"/>
              <div className="caps" style={{ marginBottom:8, color:'var(--coral-dim)' }}>Forsakes the Following</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {locksOut.map(lo => (
                  <div key={lo.id} style={{
                    padding:'6px 10px', border:'1px solid var(--coral-dim)',
                    fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone-dim)',
                    background:'rgba(90,30,30,0.2)',
                    textDecoration:'line-through', textDecorationColor:'var(--coral-dim)',
                  }}>{lo.name}</div>
                ))}
              </div>
            </>
          )}

          <div className="divider"/>
          <div className="caps" style={{ marginBottom:8 }}>Rewards</div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
            {assignment.rewards.coral > 0 && <RewardChip glyph="◎" color="oklch(0.72 0.12 35)" label="Refined Coral" v={assignment.rewards.coral}/>}
            {assignment.rewards.dna > 0 && <RewardChip glyph="✧" color="oklch(0.72 0.14 150)" label="DNA" v={assignment.rewards.dna}/>}
            {assignment.rewards.lumin > 0 && <RewardChip glyph="◆" color="oklch(0.75 0.13 195)" label="Lumin" v={assignment.rewards.lumin}/>}
            {assignment.rewards.relic && (() => {
              const r = OP_RELICS.find(x => x.id === assignment.rewards.relic);
              return r && <RewardChip glyph={r.glyph} color="var(--brass)" label="Relic" v={r.name}/>;
            })()}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
            <div className="caps" style={{ marginBottom:8 }}>Overseer</div>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <OverseerPortrait overseer={overseer}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:overseer.color, letterSpacing:'0.04em', lineHeight:1.2 }}>
                  {overseer.name}
                </div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', marginTop:3, letterSpacing:'0.15em', textTransform:'uppercase' }}>
                  {overseer.title}
                </div>
                <div style={{ marginTop:8, fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.5 }}>
                  {overseer.flavor}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
            <div className="caps" style={{ marginBottom:8 }}>Tidal Conditions</div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone)', fontStyle:'italic', lineHeight:1.5 }}>
              {assignment.weather}
            </div>
          </div>

          <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
            <div className="caps" style={{ marginBottom:8 }}>Coordinates</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--bone)' }}>
              {assignment.location}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RewardChip = ({ glyph, color, label, v }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
    <span style={{ color, fontSize:16, fontFamily:'Cinzel, serif' }}>{glyph}</span>
    <span style={{ color:'var(--bone)' }}>{v}</span>
    <span style={{ color:'var(--bone-dim)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</span>
  </div>
);

const OverseerPortrait = ({ overseer }) => (
  <div style={{
    width:64, height:80, flexShrink:0, position:'relative',
    background:'linear-gradient(180deg, var(--abyss-3), var(--abyss-0))',
    border:`1px solid ${overseer.color}`,
    overflow:'hidden',
  }}>
    <svg viewBox="0 0 64 80" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id={`os-${overseer.id}`} cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor={overseer.color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      <rect width="64" height="80" fill={`url(#os-${overseer.id})`}/>
      <path d="M 10 80 L 10 50 Q 12 30 32 22 Q 52 30 54 50 L 54 80 Z" fill="oklch(0.1 0.02 220)"/>
      <path d="M 32 22 Q 22 30 20 42 Q 28 38 32 42 Q 36 38 44 42 Q 42 30 32 22 Z" fill="oklch(0.07 0.02 220)"/>
      <ellipse cx="32" cy="40" rx="8" ry="10" fill="oklch(0.03 0.01 220)"/>
      {overseer.id === 'witness-marrow' && (
        <g><circle cx="28" cy="38" r="1" fill="oklch(0.85 0.08 85)"/><circle cx="36" cy="38" r="1" fill="oklch(0.85 0.08 85)"/></g>
      )}
      {overseer.id === 'choir-below' && (
        <g>{[...Array(7)].map((_,i)=>(
          <circle key={i} cx={24+(i%4)*3} cy={36+(i>3?4:0)} r="0.8" fill={overseer.color}/>
        ))}</g>
      )}
      {overseer.id === 'iron-widow' && (
        <g><circle cx="32" cy="38" r="2" fill={overseer.color}/>
          <circle cx="32" cy="38" r="4" fill="none" stroke={overseer.color} strokeWidth="0.5" opacity="0.6"/></g>
      )}
      {overseer.id === 'pale-mariner' && (
        <g><line x1="26" y1="38" x2="30" y2="38" stroke={overseer.color} strokeWidth="1.5"/>
          <line x1="34" y1="38" x2="38" y2="38" stroke={overseer.color} strokeWidth="1.5"/></g>
      )}
      {overseer.id === 'drowned-duke' && (
        <g><path d="M 24 34 L 28 38 L 24 42 Z" fill={overseer.color} opacity="0.8"/>
          <path d="M 40 34 L 36 38 L 40 42 Z" fill={overseer.color} opacity="0.8"/></g>
      )}
      <path d="M 20 22 L 22 14 L 28 20 L 32 12 L 36 20 L 42 14 L 44 22" fill="none" stroke={overseer.color} strokeWidth="0.7" opacity="0.8"/>
    </svg>
  </div>
);

window.CommandChamber = CommandChamber;
