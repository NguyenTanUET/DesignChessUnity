// Command Chamber — assignment briefing & deployment
const CommandChamber = ({ run, setRun, go }) => {
  // Split assignments
  const MAIN = OP_ASSIGNMENTS.filter(a => a.kind === 'main');
  const SIDE = OP_ASSIGNMENTS.filter(a => a.kind === 'side');

  const [picked, setPicked] = React.useState(run.pickedAssignmentId || MAIN[0].id);
  const assignment = OP_ASSIGNMENTS.find(a => a.id === picked);

  // Decision gating: if a decision-main is committed elsewhere, some are locked
  // (We won't commit here until deploy; show decision-branch hint instead.)

  // Deployment synced with Manage Follower
  const roster = run.roster || [];
  const allLineups = run.lineups || {};

  // Required width for this assignment (defaults to 6 if unset)
  const requiredWidth = assignment.width || 6;

  // Eligible lineups: any saved layout matching the required width.
  // (Player can have multiple variants — keyed by name; legacy shape: {[width]:{squareId:instanceId}})
  // We treat each width slot as a single lineup. If the player wants multiple per width
  // we'd need a richer schema; for now show all 4 widths and highlight matches.
  const formations = [
    { w:4,  label:'W4',  title:'Skirmish',  cap:6,  color:'oklch(0.7 0.12 35)' },
    { w:6,  label:'W6',  title:'Vanguard',  cap:10, color:'oklch(0.7 0.13 195)' },
    { w:8,  label:'W8',  title:'Phalanx',   cap:14, color:'oklch(0.72 0.12 75)' },
    { w:10, label:'W10', title:'Tide-Wall', cap:18, color:'oklch(0.65 0.15 290)' },
  ];

  // Eligible lineups for this assignment: all named plans saved at the required width
  const eligibleLineups = (allLineups[requiredWidth] || []).filter(ln =>
    Object.keys(ln.board || {}).length > 0
  );

  // Selected lineup id within the eligible array
  const [selectedLineupId, setSelectedLineupId] = React.useState(() =>
    eligibleLineups[0]?.id || null
  );

  // Reset when assignment changes
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
    }));
    go('map');
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-command" subtitle="Command Chamber · War-Map & Orders"/>

      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0, display:'grid',
        gridTemplateColumns:'340px 1fr 340px', gap:0 }}>

        {/* === LEFT: Assignment list === */}
        <div style={{ borderRight:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          overflowY:'auto', padding:'18px 14px' }}>

          <div className="caps" style={{ marginBottom:10 }}>Main Assignments</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {MAIN.map(a => (
              <AssignmentPick key={a.id} assignment={a}
                active={picked===a.id}
                onClick={()=>setPicked(a.id)}/>
            ))}
          </div>

          <div className="caps" style={{ marginBottom:10 }}>Side Assignments</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {SIDE.map(a => (
              <AssignmentPick key={a.id} assignment={a}
                active={picked===a.id}
                onClick={()=>setPicked(a.id)}/>
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

        {/* === CENTER: Assignment dossier === */}
        <div style={{ overflowY:'auto', padding:'24px 28px' }}>
          <AssignmentDossier assignment={assignment} overseer={overseer} locksOut={
            assignment.locksOut ? OP_ASSIGNMENTS.filter(a => assignment.locksOut.includes(a.id)) : []
          }/>
        </div>

        {/* === RIGHT: Deployment Option === */}
        <div style={{ borderLeft:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          overflowY:'auto', padding:'18px 14px' }}>
          <div className="caps" style={{ marginBottom:6 }}>Deployment Option</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)',
            letterSpacing:'0.2em', marginBottom:14 }}>
            REQUIRED FORMATION · W{requiredWidth}
          </div>

          {/* Required formation banner */}
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
                    {/* mini token row */}
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

          {/* Undertake button */}
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
    </div>
  );
};

// Assignment pick card (left rail)
const AssignmentPick = ({ assignment, active, onClick }) => {
  const overseer = OVERSEERS[assignment.overseer];
  return (
    <button onClick={onClick}
      style={{
        padding:'12px 14px', cursor:'pointer', textAlign:'left',
        background: active ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
        border:'1px solid', borderColor: active ? assignment.palette.accent : 'var(--abyss-3)',
        borderLeft: active ? `3px solid ${assignment.palette.accent}` : '3px solid transparent',
        color:'var(--bone)',
        position:'relative',
        transition:'all 0.15s',
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

// Full assignment dossier
const AssignmentDossier = ({ assignment, overseer, locksOut }) => {
  return (
    <div>
      {/* Header */}
      <div style={{ position:'relative', padding:'20px 24px', marginBottom:20,
        background:`linear-gradient(180deg, ${assignment.palette.top}, ${assignment.palette.bottom})`,
        border:'1px solid var(--brass-deep)',
        overflow:'hidden',
      }}>
        {/* nautical chart backdrop */}
        <svg viewBox="0 0 800 220" preserveAspectRatio="none"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.3, pointerEvents:'none' }}>
          {/* grid */}
          {[...Array(16)].map((_,i)=>(
            <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="220" stroke="oklch(0.5 0.08 75)" strokeWidth="0.3"/>
          ))}
          {[...Array(6)].map((_,i)=>(
            <line key={`h${i}`} x1="0" y1={i*40} x2="800" y2={i*40} stroke="oklch(0.5 0.08 75)" strokeWidth="0.3"/>
          ))}
          {/* compass */}
          <g transform="translate(720 50)">
            <circle cx="0" cy="0" r="28" fill="none" stroke="oklch(0.6 0.1 75)" strokeWidth="0.5"/>
            <circle cx="0" cy="0" r="20" fill="none" stroke="oklch(0.6 0.1 75)" strokeWidth="0.3"/>
            <path d="M 0 -28 L 4 0 L 0 28 L -4 0 Z" fill="oklch(0.7 0.12 85)"/>
            <text x="0" y="-34" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="9" fill="oklch(0.7 0.12 85)">N</text>
          </g>
          {/* depth contours */}
          <path d="M 60 140 Q 200 120 340 150 Q 460 180 600 160" stroke="oklch(0.6 0.12 195)" strokeWidth="0.7" fill="none" opacity="0.6"/>
          <path d="M 80 170 Q 220 150 360 180 Q 480 200 620 190" stroke="oklch(0.6 0.12 195)" strokeWidth="0.7" fill="none" opacity="0.5"/>
          {/* hazard X marks */}
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

      {/* Two-column body: description + meta */}
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
          {/* Overseer card */}
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

          {/* Weather / hazards */}
          <div style={{ padding:'14px 16px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
            <div className="caps" style={{ marginBottom:8 }}>Tidal Conditions</div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone)', fontStyle:'italic', lineHeight:1.5 }}>
              {assignment.weather}
            </div>
          </div>

          {/* Location details */}
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

// Overseer portrait (abstract silhouette based on id)
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
      {/* generic hood silhouette */}
      <path d="M 10 80 L 10 50 Q 12 30 32 22 Q 52 30 54 50 L 54 80 Z" fill="oklch(0.1 0.02 220)"/>
      <path d="M 32 22 Q 22 30 20 42 Q 28 38 32 42 Q 36 38 44 42 Q 42 30 32 22 Z" fill="oklch(0.07 0.02 220)"/>
      <ellipse cx="32" cy="40" rx="8" ry="10" fill="oklch(0.03 0.01 220)"/>
      {/* eye signature per overseer */}
      {overseer.id === 'witness-marrow' && (
        <g>
          <circle cx="28" cy="38" r="1" fill="oklch(0.85 0.08 85)"/>
          <circle cx="36" cy="38" r="1" fill="oklch(0.85 0.08 85)"/>
        </g>
      )}
      {overseer.id === 'choir-below' && (
        <g>
          {[...Array(7)].map((_,i)=>(
            <circle key={i} cx={24+(i%4)*3} cy={36+(i>3?4:0)} r="0.8" fill={overseer.color}/>
          ))}
        </g>
      )}
      {overseer.id === 'iron-widow' && (
        <g>
          <circle cx="32" cy="38" r="2" fill={overseer.color}/>
          <circle cx="32" cy="38" r="4" fill="none" stroke={overseer.color} strokeWidth="0.5" opacity="0.6"/>
        </g>
      )}
      {overseer.id === 'pale-mariner' && (
        <g>
          <line x1="26" y1="38" x2="30" y2="38" stroke={overseer.color} strokeWidth="1.5"/>
          <line x1="34" y1="38" x2="38" y2="38" stroke={overseer.color} strokeWidth="1.5"/>
        </g>
      )}
      {overseer.id === 'drowned-duke' && (
        <g>
          <path d="M 24 34 L 28 38 L 24 42 Z" fill={overseer.color} opacity="0.8"/>
          <path d="M 40 34 L 36 38 L 40 42 Z" fill={overseer.color} opacity="0.8"/>
        </g>
      )}
      {/* crown/halo of title */}
      <path d="M 20 22 L 22 14 L 28 20 L 32 12 L 36 20 L 42 14 L 44 22" fill="none" stroke={overseer.color} strokeWidth="0.7" opacity="0.8"/>
    </svg>
  </div>
);

window.CommandChamber = CommandChamber;
