// World map — hand-drawn assignment map with fixed node positions.
const WorldMap = ({ go, run, setRun, openNode }) => {
  const OBJECTIVES = window.OBJECTIVES || {};
  const ASSIGNMENTS = window.ASSIGNMENTS || [];
  const assignment = React.useMemo(
    () => (window.getAssignment ? window.getAssignment(run.assignmentIdx || 0) : ASSIGNMENTS[0]),
    [run.assignmentIdx]
  );
  if (!assignment) {
    return <div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', color:'var(--bone-dim)', fontFamily:'Cinzel, serif'}}>Loading tide…</div>;
  }

  // Current linear progress: index of next unbeaten node
  const currentIdx = run.currentNodeIdx ?? 0;
  const currentNodeId = assignment.nodes[currentIdx]?.id;

  // --- Lineup & Recovered modals ---
  // Auto-open lineup on first entry into this assignment
  const [lineupOpen, setLineupOpen] = React.useState(!run.lineupConfirmed);
  const [recoveredOpen, setRecoveredOpen] = React.useState(false);

  // --- Companion dialogue ---
  const dialogueLines = React.useMemo(
    () => buildDialogue(assignment, currentIdx, run),
    [assignment.id, currentIdx, run.cls?.name]
  );
  const [dlgIdx, setDlgIdx] = React.useState(0);
  const [dlgOpen, setDlgOpen] = React.useState(true);
  const [dlgHidden, setDlgHidden] = React.useState(false);
  // Reset when situation changes
  React.useEffect(() => { setDlgIdx(0); setDlgOpen(true); setDlgHidden(false); }, [assignment.id, currentIdx]);
  const line = dialogueLines[dlgIdx % dialogueLines.length];
  const nextLine = () => setDlgIdx(i => (i + 1) % dialogueLines.length);

  const pos = (n) => ({ x: n.x * 1000, y: n.y * 720 });

  const nodeStatus = (i) => {
    if (i < currentIdx) return 'visited';
    if (i === currentIdx) return 'available';
    return 'locked';
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <TopBar run={run} go={go}/>

      <div className="map-wrap">
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          {/* abyssal gradient */}
          <div style={{ position:'absolute', inset:0,
            background:`linear-gradient(180deg, ${assignment.palette.top} 0%, ${assignment.palette.bottom} 100%)` }}/>

          {/* light shafts */}
          <svg viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.5 }}>
            <defs>
              <linearGradient id="wshaft" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor={assignment.palette.accent} stopOpacity="0.3"/>
                <stop offset="100%" stopColor="transparent"/>
              </linearGradient>
            </defs>
            {[120, 380, 640, 840].map((x,i)=>(
              <polygon key={i} points={`${x},0 ${x+40},0 ${x+140+i*20},720 ${x-40},720`} fill="url(#wshaft)" opacity="0.7"/>
            ))}
          </svg>

          {/* silt overlay */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none',
            background:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence baseFrequency='0.012' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.3 0 0 0 0 0.35 0 0 0 0.3 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
            mixBlendMode:'overlay', opacity:0.55 }}/>

          {/* plankton */}
          <div className="plankton">
            {Array.from({length:24}).map((_,i)=>(
              <span key={i} style={{
                left:`${(i*157)%100}%`,
                animationDuration:`${20+(i%6)*3}s`,
                animationDelay:`${-(i*1.7)}s`,
              }}/>
            ))}
          </div>

          {/* DECOR — painterly silhouettes */}
          <svg viewBox="0 0 1000 720" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
            {assignment.decor.map((d, i) => <MapDecor key={i} d={d}/>)}
            {/* seabed silhouette */}
            <path d="M 0 720 L 0 640 Q 120 600 240 620 Q 360 640 480 610 Q 600 580 720 620 Q 840 660 1000 620 L 1000 720 Z"
              fill="oklch(0.06 0.02 220)" opacity="0.85"/>
            <path d="M 0 720 L 0 680 Q 200 660 400 670 Q 600 680 800 660 Q 900 650 1000 670 L 1000 720 Z"
              fill="oklch(0.04 0.01 225)" opacity="0.9"/>
          </svg>

          {/* Title plate */}
          <div style={{ position:'absolute', top:14, left:24, zIndex:3 }}>
            <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>{assignment.subtitle}</div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:26, marginTop:2, letterSpacing:'0.06em', color:'var(--bone)',
              textShadow:'0 2px 10px rgba(0,0,0,0.9)' }}>
              {assignment.title}
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontStyle:'italic', color:'var(--bone-dim)', fontSize:12, marginTop:4, maxWidth:420 }}>
              {assignment.epigraph}
            </div>
          </div>

          {/* Progress ticker */}
          <div style={{ position:'absolute', top:14, right:20, zIndex:3, textAlign:'right',
            fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.18em' }}>
            HUNT {Math.min(currentIdx+1, assignment.nodes.length)} / {assignment.nodes.length}
          </div>

          {/* NODES + EDGES */}
          <svg viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
            <defs>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="2.5"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* edges: currents between nodes */}
            {assignment.edges.map(([a, b], i) => {
              const na = assignment.nodes.find(n => n.id === a);
              const nb = assignment.nodes.find(n => n.id === b);
              if (!na || !nb) return null;
              const pa = pos(na), pb = pos(nb);
              const ai = assignment.nodes.findIndex(n=>n.id===a);
              const bi = assignment.nodes.findIndex(n=>n.id===b);
              const isPath = bi <= currentIdx;
              const isNext = ai === currentIdx - 1 && bi === currentIdx;
              const isUpcoming = ai === currentIdx;
              const stroke = isPath ? 'var(--brass)'
                           : isUpcoming ? 'oklch(0.7 0.14 190 / 0.85)'
                           : 'oklch(0.4 0.04 210 / 0.4)';
              // wavy bezier
              const mx = (pa.x+pb.x)/2, my = (pa.y+pb.y)/2 + ((i%2)?20:-20);
              return (
                <g key={i}>
                  <path d={`M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`}
                    fill="none" stroke={stroke} strokeWidth={isPath?2.2:1.6}
                    strokeDasharray={isPath?'':'5 5'}
                    filter={isUpcoming?'url(#nodeGlow)':''}/>
                  {/* tiny animated dot pair on the upcoming edge */}
                  {isUpcoming && (
                    <circle r="2.5" fill="var(--bio)">
                      <animateMotion dur="2.6s" repeatCount="indefinite"
                        path={`M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`}/>
                    </circle>
                  )}
                </g>
              );
            })}

            {/* nodes */}
            {assignment.nodes.map((n, i) => {
              const p = pos(n);
              const status = nodeStatus(i);
              const obj = OBJECTIVES[n.obj];
              const available = status === 'available';
              const isBoss = n.obj === 'purge';
              const r = isBoss ? 32 : 24;
              const color = obj.color;
              const bgOpacity = status==='locked' ? 0.35 : 1;

              return (
                <g key={n.id}
                  style={{ cursor: available ? 'pointer' : 'default', opacity: bgOpacity }}
                  onClick={() => { if (available) openNode({ ...n, type: isBoss?'boss':'combat', assignmentIdx: run.assignmentIdx||0, idx: i }); }}
                >
                  {/* halo for available */}
                  {available && (
                    <>
                      <circle cx={p.x} cy={p.y} r={r+14} fill="none" stroke={color} strokeWidth="1" opacity="0.5">
                        <animate attributeName="r" values={`${r+12};${r+18};${r+12}`} dur="2.4s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2.4s" repeatCount="indefinite"/>
                      </circle>
                    </>
                  )}
                  {/* brass outer ring */}
                  <circle cx={p.x} cy={p.y} r={r+4} fill="none" stroke="var(--brass-deep)" strokeWidth="1.2" opacity="0.7"/>
                  {/* filled disk */}
                  <circle cx={p.x} cy={p.y} r={r}
                    fill={status==='visited' ? 'oklch(0.14 0.03 215)' : 'oklch(0.09 0.02 220)'}
                    stroke={status==='locked' ? 'var(--abyss-3)' : color}
                    strokeWidth={available?2.4:1.6}
                    filter={available?'url(#nodeGlow)':''}/>

                  {/* objective icon */}
                  <foreignObject x={p.x-r+3} y={p.y-r+3} width={r*2-6} height={r*2-6} style={{ pointerEvents:'none' }}>
                    <div style={{ width:'100%', height:'100%', display:'grid', placeItems:'center' }}>
                      <ObjectiveIcon type={n.obj} size={r*1.3}
                        color={status==='locked'?'var(--abyss-4)':status==='visited'?'var(--brass-dim)':color}/>
                    </div>
                  </foreignObject>

                  {/* completed checkmark */}
                  {status==='visited' && (
                    <g transform={`translate(${p.x+r-4}, ${p.y-r+4})`}>
                      <circle r="8" fill="var(--brass)" stroke="var(--abyss-0)" strokeWidth="1.5"/>
                      <path d="M -3 0 L -1 2.5 L 3 -2" stroke="var(--abyss-0)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                    </g>
                  )}

                  {/* boss crown */}
                  {isBoss && status !== 'locked' && (
                    <path d={`M ${p.x-10} ${p.y-r-4} L ${p.x-6} ${p.y-r-12} L ${p.x-2} ${p.y-r-6} L ${p.x+2} ${p.y-r-14} L ${p.x+6} ${p.y-r-6} L ${p.x+10} ${p.y-r-12} L ${p.x+10} ${p.y-r-4} Z`}
                      fill={color} stroke="var(--abyss-0)" strokeWidth="1" opacity="0.95"/>
                  )}

                  {/* name label */}
                  {status !== 'locked' && (
                    <text x={p.x} y={p.y + r + 16} textAnchor="middle"
                      fill={available?'var(--bone)':'var(--bone-dim)'}
                      fontSize={isBoss?13:11}
                      fontFamily="Cinzel, serif"
                      style={{ letterSpacing:'0.05em',
                        textShadow:'0 2px 6px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
                        paintOrder:'stroke', stroke:'rgba(0,0,0,0.85)', strokeWidth:'3px', strokeLinejoin:'round' }}>
                      {n.name}
                    </text>
                  )}
                  {status !== 'locked' && (
                    <text x={p.x} y={p.y + r + 28} textAnchor="middle"
                      fill={color} fontSize="9" opacity="0.85"
                      fontFamily="JetBrains Mono, monospace"
                      style={{ letterSpacing:'0.18em', textTransform:'uppercase',
                        paintOrder:'stroke', stroke:'rgba(0,0,0,0.85)', strokeWidth:'3px', strokeLinejoin:'round' }}>
                      {obj.label}
                    </text>
                  )}

                  {available && (
                    <text x={p.x} y={p.y - r - 14} textAnchor="middle"
                      fill="var(--bio)" fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      style={{ letterSpacing:'0.25em' }}>
                      ◆ NEXT ◆
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Companion dialogue overlay — collapsible, lower-left, avoids the node arc */}
          {!dlgHidden && (
            <div style={{
              position:'absolute', left:16, bottom:56, zIndex:4,
              pointerEvents:'auto',
              display:'flex', alignItems:'flex-end', gap:0,
              maxWidth: dlgOpen ? 460 : 62,
              transition:'max-width 0.35s ease',
              filter:'drop-shadow(0 10px 20px rgba(0,0,0,0.75))',
            }}>
              {/* Portrait toggle — compact 56×72 chip */}
              <button
                onClick={()=>setDlgOpen(o=>!o)}
                aria-label={dlgOpen ? 'Collapse dialogue' : 'Expand dialogue'}
                style={{
                  width:56, height:72, flexShrink:0,
                  position:'relative', padding:0, cursor:'pointer',
                  background:'linear-gradient(180deg, var(--abyss-3), var(--abyss-1))',
                  border:'1px solid var(--brass-deep)',
                  borderRight: dlgOpen ? 'none' : '1px solid var(--brass-deep)',
                }}>
                <CompanionPortrait cls={run.cls} accent={assignment.palette.accent}/>
                {/* new-line ping when collapsed */}
                {!dlgOpen && (
                  <span style={{
                    position:'absolute', top:-4, right:-4,
                    width:12, height:12, borderRadius:'50%',
                    background:'var(--bio)', border:'1px solid var(--abyss-0)',
                    boxShadow:'0 0 8px var(--bio)',
                    animation:'dlgBlink 1.8s ease-in-out infinite',
                  }}/>
                )}
                {/* collapse chevron */}
                <span style={{
                  position:'absolute', bottom:2, right:2,
                  fontFamily:'JetBrains Mono, monospace', fontSize:10,
                  color:'var(--brass)', opacity:0.85,
                }}>{dlgOpen ? '‹' : '›'}</span>
              </button>

              {/* Dialogue body */}
              {dlgOpen && (
                <div style={{
                  flex:1, position:'relative',
                  background:'linear-gradient(180deg, rgba(8,18,28,0.82), rgba(4,10,18,0.82))',
                  backdropFilter:'blur(2px)',
                  WebkitBackdropFilter:'blur(2px)',
                  border:'1px solid var(--brass-deep)',
                  padding:'10px 14px 20px',
                  minWidth: 300,
                }}>
                  {/* filigree corners */}
                  <span style={{position:'absolute', top:3, left:3, width:8, height:8, borderTop:'1px solid var(--brass-dim)', borderLeft:'1px solid var(--brass-dim)'}}/>
                  <span style={{position:'absolute', bottom:3, right:3, width:8, height:8, borderBottom:'1px solid var(--brass-dim)', borderRight:'1px solid var(--brass-dim)'}}/>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.22em',
                      color:'var(--bio-dim)', textTransform:'uppercase' }}>
                      {line.speaker} · {line.cue}
                    </div>
                    <button
                      onClick={()=>setDlgHidden(true)}
                      aria-label="Silence"
                      style={{
                        background:'transparent', border:'none', padding:'0 4px',
                        color:'var(--bone-dim)', cursor:'pointer',
                        fontFamily:'JetBrains Mono, monospace', fontSize:11, lineHeight:1,
                        opacity:0.5,
                      }}
                      onMouseEnter={e=>e.currentTarget.style.opacity=1}
                      onMouseLeave={e=>e.currentTarget.style.opacity=0.5}
                    >×</button>
                  </div>
                  <div key={dlgIdx} style={{
                    fontFamily:'Cormorant Garamond, Cinzel, serif',
                    fontSize:15, lineHeight:1.42, color:'var(--bone)',
                    fontStyle: line.whisper ? 'italic' : 'normal',
                    animation:'dlgIn 0.35s ease',
                  }}>
                    {line.whisper ? '"' : ''}{line.text}{line.whisper ? '"' : ''}
                  </div>

                  {/* advance */}
                  <button
                    onClick={nextLine}
                    aria-label="Next line"
                    style={{
                      position:'absolute', right:8, bottom:4,
                      background:'transparent', border:'none',
                      color:'var(--brass)', cursor:'pointer',
                      fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em',
                      padding:'2px 4px',
                      display:'flex', alignItems:'center', gap:5,
                      opacity:0.7,
                    }}
                    onMouseEnter={e=>e.currentTarget.style.opacity=1}
                    onMouseLeave={e=>e.currentTarget.style.opacity=0.7}
                  >
                    <span>{dlgIdx + 1}/{dialogueLines.length}</span>
                    <span style={{ fontSize:12, animation:'dlgBlink 1.4s ease-in-out infinite' }}>▸</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* hidden-dialogue re-summon tab */}
          {dlgHidden && (
            <button
              onClick={()=>{ setDlgHidden(false); setDlgOpen(true); }}
              style={{
                position:'absolute', left:16, bottom:56, zIndex:4,
                width:28, height:60,
                background:'linear-gradient(180deg, var(--abyss-3), var(--abyss-1))',
                border:'1px solid var(--brass-deep)',
                color:'var(--brass)', cursor:'pointer',
                fontFamily:'Cinzel, serif', fontSize:16, lineHeight:1,
                padding:0,
              }}
              title="Summon companion"
            >
              ☙
            </button>
          )}

          {/* objective legend (bottom) */}
          <div style={{ position:'absolute', bottom:14, left:24, right:24, zIndex:3,
            display:'flex', gap:14, alignItems:'center', flexWrap:'wrap',
            fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.1em' }}>
            <span style={{ color:'var(--brass-dim)', letterSpacing:'0.2em' }}>OBJECTIVES ·</span>
            {Object.values(OBJECTIVES).map(o => (
              <span key={o.id} style={{ display:'inline-flex', alignItems:'center', gap:5, color:o.color, opacity:0.85 }}>
                <ObjectiveIcon type={o.id} size={14} color={o.color}/>
                {o.label}
              </span>
            ))}
          </div>
        </div>

        {/* right sidebar */}
        <div className="map-side">
          <div>
            <div className="caps">Campaign</div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:15, marginTop:4, letterSpacing:'0.04em', color:'var(--brass)' }}>
              {assignment.subtitle} of {window.ASSIGNMENTS.length}
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:12, fontStyle:'italic', color:'var(--bone-dim)', marginTop:2 }}>
              {assignment.title}
            </div>
            <div style={{ height:3, background:'var(--abyss-2)', marginTop:10, borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(currentIdx/assignment.nodes.length)*100}%`,
                background:'linear-gradient(90deg, var(--brass-dim), var(--brass))' }}/>
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', marginTop:6, letterSpacing:'0.15em' }}>
              {currentIdx}/{assignment.nodes.length} CLEARED
            </div>
          </div>

          <div className="divider"/>

          {/* upcoming objective detail */}
          {assignment.nodes[currentIdx] && (()=>{
            const n = assignment.nodes[currentIdx];
            const obj = OBJECTIVES[n.obj];
            return (
              <div className="panel ornate" style={{ padding:14 }}>
                <div className="eyebrow" style={{ color:obj.color }}>Next Hunt</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  <div style={{ width:44, height:44, border:`1px solid ${obj.color}`, display:'grid', placeItems:'center',
                    background:'var(--abyss-2)' }}>
                    <ObjectiveIcon type={n.obj} size={28} color={obj.color}/>
                  </div>
                  <div>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.03em' }}>{n.name}</div>
                    <div style={{ fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.15em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace', marginTop:2 }}>
                      {obj.label}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--bone-dim)', marginTop:10, lineHeight:1.5, fontStyle:'italic' }}>
                  "{n.flavor}"
                </div>
                <div style={{ fontSize:11, color:'var(--bone)', marginTop:10, lineHeight:1.5, paddingTop:10, borderTop:'1px dotted var(--abyss-3)', fontFamily:'system-ui' }}>
                  <span style={{color:obj.color, fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.18em'}}>GOAL · </span>
                  {n.obj === 'exterminate' ? 'Exterminate every creature in on the way.' : obj.desc}
                </div>
              </div>
            );
          })()}

          <div className="divider"/>

          <div className="divider"/>

          <div>
            <div className="caps" style={{ marginBottom:10 }}>Resources</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <ResourceRow glyph="◎" label="Coral" value={run.res?.coral ?? 0} color="oklch(0.72 0.12 35)"/>
              <ResourceRow glyph="◆" label="Lumin" value={run.res?.lumin ?? 0} color="oklch(0.75 0.13 195)"/>
              <ResourceRow glyph="✧" label="DNA" value={run.res?.dna ?? 0} color="oklch(0.72 0.14 150)"/>
              <ResourceRow glyph="⚑" label="Recovered"
                value={(run.recovered?.followers?.length||0) + (run.recovered?.relics?.length||0) + (run.recovered?.augments?.length||0)}
                color="var(--coral-dim)"
                onClick={()=>setRecoveredOpen(true)}/>
            </div>
          </div>

          <button className="btn primary sm" style={{ justifyContent:'center' }} onClick={()=>setLineupOpen(true)}>
            ◆ LINEUP
          </button>

          <div style={{ flex:1 }}/>

          <button className="btn danger sm" style={{ justifyContent:'center' }} onClick={()=>go('menu')}>
            ABANDON
          </button>
        </div>
      </div>

      {/* Lineup modal — auto-opens on entry */}
      {lineupOpen && (
        <LineupModal run={run} setRun={setRun} onClose={()=>setLineupOpen(false)}
          onConfirm={()=>{
            setRun(r => ({ ...r, lineupConfirmed: true }));
            setLineupOpen(false);
          }}/>
      )}

      {/* Recovered modal */}
      {recoveredOpen && (
        <RecoveredModal run={run} onClose={()=>setRecoveredOpen(false)}/>
      )}
    </div>
  );
};

// Small resource chip used in the sidebar
const ResourceRow = ({ glyph, label, value, color, onClick }) => (
  <div onClick={onClick} style={{
    display:'flex', alignItems:'center', gap:8,
    padding:'8px 10px',
    background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
    border:'1px solid var(--abyss-4)',
    borderLeft:`2px solid ${color}`,
    cursor: onClick ? 'pointer' : 'default',
    transition:'all 0.15s',
  }}
  onMouseEnter={onClick ? (e)=>{ e.currentTarget.style.borderColor = color; } : undefined}
  onMouseLeave={onClick ? (e)=>{ e.currentTarget.style.borderColor = 'var(--abyss-4)'; e.currentTarget.style.borderLeft = `2px solid ${color}`; } : undefined}
  >
    <div style={{ fontSize:18, color, lineHeight:1, fontFamily:'Cinzel, serif' }}>{glyph}</div>
    <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
      <span style={{ fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace' }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--bone)', fontFamily:'JetBrains Mono, monospace' }}>{value}</span>
    </div>
  </div>
);

// Painterly decor silhouettes
const MapDecor = ({ d }) => {
  const X = (v) => v * 1000, Y = (v) => v * 720;
  switch (d.kind) {
    case 'kelp': {
      const x = X(d.x), y = Y(d.y), h = Y(d.h);
      return (
        <g opacity="0.5">
          {[0,1,2,3].map(i => (
            <path key={i} d={`M ${x+i*6} ${y+h} Q ${x+i*6+(i%2?10:-10)} ${y+h*0.5} ${x+i*6+(i%2?-4:4)} ${y}`}
              stroke="oklch(0.22 0.08 150)" strokeWidth="4" fill="none" opacity={0.5 + i*0.1}/>
          ))}
        </g>
      );
    }
    case 'reef': {
      const x = X(d.x), y = Y(d.y), w = X(d.w), h = Y(d.h);
      return (
        <g opacity="0.7">
          <path d={`M ${x} ${y+h} L ${x+w*0.15} ${y+h*0.3} L ${x+w*0.35} ${y+h*0.6} L ${x+w*0.5} ${y+h*0.15} L ${x+w*0.7} ${y+h*0.5} L ${x+w*0.88} ${y+h*0.25} L ${x+w} ${y+h} Z`}
            fill="oklch(0.1 0.04 35)"/>
          <path d={`M ${x} ${y+h} L ${x+w*0.2} ${y+h*0.55} L ${x+w*0.45} ${y+h*0.75} L ${x+w*0.7} ${y+h*0.55} L ${x+w} ${y+h} Z`}
            fill="oklch(0.18 0.08 35)" opacity="0.7"/>
        </g>
      );
    }
    case 'wreck': {
      const x = X(d.x), y = Y(d.y), w = X(d.w);
      return (
        <g opacity="0.55" transform={`rotate(-8 ${x+w/2} ${y})`}>
          <rect x={x} y={y} width={w} height={w*0.22} fill="oklch(0.1 0.03 40)"/>
          <rect x={x+w*0.2} y={y-w*0.18} width={w*0.08} height={w*0.2} fill="oklch(0.14 0.03 40)"/>
          <rect x={x+w*0.55} y={y-w*0.3} width={w*0.06} height={w*0.3} fill="oklch(0.14 0.03 40)"/>
          {[0,1,2,3].map(i => (
            <line key={i} x1={x+i*(w/4)} y1={y} x2={x+i*(w/4)} y2={y+w*0.22} stroke="oklch(0.06 0.02 220)"/>
          ))}
        </g>
      );
    }
    case 'rock': {
      const x = X(d.x), y = Y(d.y), r = X(d.r);
      return <ellipse cx={x} cy={y} rx={r} ry={r*0.6} fill="oklch(0.08 0.02 220)" opacity="0.7"/>;
    }
    case 'layer': {
      const y = Y(d.y);
      return <line x1="0" y1={y} x2="1000" y2={y} stroke="var(--bio-dim)" strokeWidth="1" strokeDasharray="4 8" opacity="0.3"/>;
    }
    case 'jelly': {
      const x = X(d.x), y = Y(d.y);
      return (
        <g opacity="0.5">
          <path d={`M ${x-14} ${y} Q ${x} ${y-16} ${x+14} ${y} Z`} fill="oklch(0.5 0.14 290)" opacity="0.5"/>
          <path d={`M ${x-14} ${y} Q ${x} ${y-16} ${x+14} ${y}`} fill="none" stroke="oklch(0.8 0.18 320)" strokeWidth="1"/>
          {[-8,-3,2,7].map((dx,i)=>(
            <path key={i} d={`M ${x+dx} ${y} Q ${x+dx+2} ${y+16} ${x+dx-3} ${y+30}`} stroke="oklch(0.55 0.15 300)" strokeWidth="1" fill="none" opacity="0.7"/>
          ))}
        </g>
      );
    }
    case 'rift': {
      const x = X(d.x), y = Y(d.y), w = X(d.w);
      return (
        <g opacity="0.7">
          <ellipse cx={x} cy={y} rx={w/2} ry="16" fill="oklch(0.04 0.01 230)"/>
          <ellipse cx={x} cy={y} rx={w/2-14} ry="10" fill="oklch(0.4 0.2 25)" opacity="0.5"/>
          <ellipse cx={x} cy={y} rx={w/2-30} ry="5" fill="oklch(0.75 0.22 35)" opacity="0.6"/>
        </g>
      );
    }
    case 'bones': {
      const x = X(d.x), y = Y(d.y), w = X(d.w);
      return (
        <g opacity="0.5">
          <path d={`M ${x} ${y} Q ${x+w/2} ${y-w*0.3} ${x+w} ${y}`} stroke="oklch(0.7 0.02 85)" strokeWidth="3" fill="none"/>
          {[0.2,0.4,0.6,0.8].map((t,i)=>(
            <line key={i} x1={x+w*t} y1={y-10} x2={x+w*t} y2={y+10} stroke="oklch(0.6 0.02 85)" strokeWidth="2"/>
          ))}
        </g>
      );
    }
    default: return null;
  }
};

const TopBar = ({ run, go }) => (
  <div className="topbar">
    <div style={{ display:'flex', gap:24, alignItems:'center' }}>
      <div style={{ fontFamily:'Cinzel, serif', fontSize:18, color:'var(--brass)', letterSpacing:'0.05em' }}>
        {run.cls.glyph} <span style={{color:'var(--bone)'}}>{run.cls.name}</span>
      </div>
      <div className="stat">
        <span className="lbl">Sovereign</span>
        <span style={{ color:'var(--coral)' }}>
          {'♥'.repeat(run.hp)}<span style={{color:'var(--abyss-3)'}}>{'♥'.repeat(run.hpMax-run.hp)}</span>
        </span>
      </div>
      <div className="stat">
        <span className="lbl">Coral</span>
        <span style={{ color:'var(--brass)' }}>◎ {run.gold}</span>
      </div>
      <div className="stat">
        <span className="lbl">Relics</span>
        <span>{run.relics.length}</span>
      </div>
    </div>
    <div style={{ display:'flex', gap:8 }}>
      <button className="btn ghost sm" onClick={()=>go('menu')}>Rites</button>
    </div>
  </div>
);

window.WorldMap = WorldMap;
window.TopBar = TopBar;

// ------------------ Companion dialogue system ------------------

// Build a deck of dialogue lines keyed to assignment + progress.
// Each line: { speaker, cue, text, whisper? }
function buildDialogue(assignment, currentIdx, run) {
  const sovereign = run.cls?.name || 'Sovereign';
  const node = assignment.nodes[currentIdx];
  const nodeName = node?.name || 'the next tide';
  const obj = node ? (window.OBJECTIVES?.[node.obj]?.label || 'hunt') : 'hunt';
  const progress = currentIdx;
  const total = assignment.nodes.length;

  const lines = [];

  // Opening lines — first time into this assignment
  if (progress === 0) {
    if (assignment.id === 'a1') {
      lines.push({ speaker:'Witness', cue:'Prelude', text:'Thy brood wakes in the silted mouth, where salt remembers the taste of kings.' });
      lines.push({ speaker:'Sovereign', cue:sovereign, text:'Eight hunts between me and the Iron Widow. The trench is patient. We shall not be.' });
      lines.push({ speaker:'Witness', cue:'Counsel', text:`Mark the glyphs on the map. Each is a wound the sea asks thee to deepen.` });
    } else if (assignment.id === 'a2') {
      lines.push({ speaker:'Witness', cue:'Prelude', text:'Between warm and cold, the sea holds its breath. Something old speaks in that pause.' });
      lines.push({ speaker:'Sovereign', cue:sovereign, text:'I heard the hymn in my sleep last tide. It knew my name before I did.' });
    } else {
      lines.push({ speaker:'Witness', cue:'Prelude', text:'The abyss has no bottom, only rooms thou hast not yet fallen into.' });
      lines.push({ speaker:'Sovereign', cue:sovereign, text:'Then I shall learn their architecture with my teeth.' });
    }
  }

  // Mid-run lines
  if (progress > 0 && progress < total - 1) {
    lines.push({ speaker:'Witness', cue:'Current', text:`${progress} hunts behind us. The water tastes different now — iron, and something sweeter.` });
    lines.push({ speaker:'Sovereign', cue:sovereign, text:`${nodeName} is next. I can feel the pressure of it in my gills.` });
  }

  // Near-boss
  if (progress === total - 1) {
    lines.push({ speaker:'Witness', cue:'Warning', text:`The leviathan breathes on the far side of this glyph. Every brood that marched this close was remembered only in bone.` });
    lines.push({ speaker:'Sovereign', cue:sovereign, text:'Let them add my shape to the ossuary, then. I will not turn.' });
  }

  // Objective-flavored line
  if (node) {
    const pools = {
      exterminate: [
        { speaker:'Witness', cue:'Hunt', text:`${nodeName}. Leave nothing that might remember us.` },
      ],
      eliminate_leader: [
        { speaker:'Witness', cue:'Decapitation', text:`Find the crowned one at ${nodeName}. The court dissolves when the head sinks.` },
      ],
      escort: [
        { speaker:'Witness', cue:'Charge', text:`A fragile thing walks with us at ${nodeName}. Thy body is its shell.` },
      ],
      retrieve: [
        { speaker:'Witness', cue:'Harvest', text:`The veins at ${nodeName} bleed silt worth a brood. Strip them before the tide does.` },
      ],
      seize: [
        { speaker:'Witness', cue:'Hold', text:`Stand upon ${nodeName} and do not move. The sea will test whether thou art rooted.` },
      ],
      advance: [
        { speaker:'Witness', cue:'March', text:`Carry the Sovereign's shape to the far mark. The rest are noise.` },
      ],
      purge: [
        { speaker:'Witness', cue:'Judgment', text:`No words remain for this one. Only the verb.` , whisper:true},
      ],
    };
    const pool = pools[node.obj];
    if (pool) lines.push(...pool);
  }

  // Whispers — rare flavor
  lines.push({ speaker:'???', cue:'Whisper', text:'…come down. come farther. we have been waiting in the exact shape of thee.', whisper:true });

  // Ensure at least one line
  if (lines.length === 0) {
    lines.push({ speaker:sovereign, cue:sovereign, text:'The map watches me back.' });
  }
  return lines;
}

// Painterly portrait for the companion plate — class-adaptive silhouette
const CompanionPortrait = ({ cls, accent }) => {
  const glyph = cls?.glyph || '♛';
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <svg viewBox="0 0 108 160" preserveAspectRatio="xMidYMid slice"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        <defs>
          <radialGradient id="cpBg" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor={accent || 'oklch(0.45 0.12 200)'} stopOpacity="0.55"/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <linearGradient id="cpBody" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.14 0.03 210)"/>
            <stop offset="100%" stopColor="oklch(0.05 0.02 220)"/>
          </linearGradient>
        </defs>
        <rect width="108" height="160" fill="url(#cpBg)"/>
        {/* water particles */}
        {[...Array(14)].map((_,i)=>(
          <circle key={i} cx={(i*23)%108} cy={(i*37)%160} r="0.8"
            fill="var(--bio)" opacity={0.3 + (i%3)*0.15}/>
        ))}
        {/* hood silhouette */}
        <path d="M 20 160 L 20 95 Q 22 60 54 42 Q 86 60 88 95 L 88 160 Z"
          fill="url(#cpBody)"/>
        {/* hood fold */}
        <path d="M 54 42 Q 38 55 34 80 Q 44 75 54 78 Q 64 75 74 80 Q 70 55 54 42 Z"
          fill="oklch(0.08 0.02 220)" opacity="0.9"/>
        {/* face shadow */}
        <ellipse cx="54" cy="76" rx="13" ry="16" fill="oklch(0.03 0.01 220)" opacity="0.9"/>
        {/* glowing eyes */}
        <circle cx="49" cy="74" r="1.3" fill={accent || 'var(--bio)'}>
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="59" cy="74" r="1.3" fill={accent || 'var(--bio)'}>
          <animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite"/>
        </circle>
        {/* brass pauldron rim */}
        <path d="M 18 112 Q 30 98 54 98 Q 78 98 90 112"
          stroke="var(--brass-deep)" strokeWidth="1.2" fill="none" opacity="0.85"/>
        {/* class glyph on chest */}
        <text x="54" y="128" textAnchor="middle"
          fontFamily="Cinzel, serif" fontSize="22"
          fill="var(--brass)" opacity="0.9">{glyph}</text>
        {/* subtle scan line */}
        <rect width="108" height="160" fill="url(#cpBg)" opacity="0"/>
      </svg>
      {/* grain overlay */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='f'><feTurbulence baseFrequency='0.02' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.35 0 0 0 0 0.4 0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>")`,
        mixBlendMode:'overlay', opacity:0.7, pointerEvents:'none',
      }}/>
    </div>
  );
};


// =============== LINEUP MODAL ===============
// Shows exactly what the chosen Assignment deploys: the lineup picked in the
// Command Chamber (run.activeLineupId at run.lineupWidth) and that lineup's
// single carry relic. No other relics, no grafted-augment listing.
const LineupModal = ({ run, setRun, onClose, onConfirm }) => {
  const FA = window.FOLLOWER_ARCHETYPES || {};
  const OP_RELICS = window.OP_RELICS || [];
  const roster = run.roster || [];

  const width   = run.lineupWidth || 6;
  const pool    = (run.lineups || {})[width] || [];
  const lineup  = pool.find(l => l.id === run.activeLineupId) || null;
  const board   = lineup?.board || {};
  const entries = Object.entries(board);
  const carryRelic = lineup?.carryRelicId
    ? OP_RELICS.find(r => r.id === lineup.carryRelicId) : null;

  return (
    <div onClick={onClose} style={{
      position:'absolute', inset:0, zIndex:50,
      background:'rgba(2,6,12,0.82)', backdropFilter:'blur(6px)',
      display:'grid', placeItems:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(1220px, 94vw)', height:'min(780px, 92vh)',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        border:'1px solid var(--brass-deep)',
        boxShadow:'0 20px 80px rgba(0,0,0,0.8), 0 0 60px oklch(0.3 0.08 195 / 0.15)',
        display:'grid', gridTemplateRows:'auto 1fr auto', position:'relative',
      }}>
        <div style={{ padding:'18px 26px', borderBottom:'1px solid var(--abyss-4)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'linear-gradient(180deg, var(--abyss-2), transparent)' }}>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)', letterSpacing:'0.28em' }}>
              ◆ DEPLOYMENT LINEUP
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:22, color:'var(--bone)', letterSpacing:'0.04em', marginTop:2 }}>
              {lineup ? `${lineup.name} · W${width}` : 'No Lineup Chosen'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} className="btn ghost sm">✕ CLOSE</button>
          </div>
        </div>

        {!lineup ? (
          /* ---------- NO LINEUP FALLBACK ---------- */
          <div style={{ display:'grid', placeItems:'center', padding:40, textAlign:'center' }}>
            <div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:40, color:'var(--brass-deep)' }}>◈</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic',
                color:'var(--bone-dim)', lineHeight:1.6, marginTop:10, maxWidth:440 }}>
                No lineup was bound to this assignment. Return to the Command Chamber
                and undertake it with a W{width} lineup arrayed.
              </div>
            </div>
          </div>
        ) : (
          /* ---------- DEPLOYMENT VIEW — the chosen lineup only ---------- */
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr 1fr', gap:0, minHeight:0 }}>
            {/* On Field — exactly what stands on this plan */}
            <div style={{ borderRight:'1px solid var(--abyss-4)', padding:'16px 16px 8px', display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div className="caps">On Field</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)' }}>{entries.length} DEPLOYED</div>
              </div>
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4, paddingRight:4 }}>
                {entries.length === 0 && (
                  <div style={{ padding:16, border:'1px dashed var(--abyss-4)', textAlign:'center', color:'var(--bone-dim)', fontStyle:'italic', fontSize:11 }}>Nothing arrayed on this plan.</div>
                )}
                {entries.map(([sqId, instId]) => {
                  const f = roster.find(x => x.instanceId === instId);
                  if (!f) return null;
                  const a = FA[f.archetype] || { glyph:'?', color:'var(--bone)' };
                  const m = sqId.match(/r(\d+)c(\d+)/);
                  const rank = m ? (m[1] === '0' ? 'BACK' : 'FRONT') : '';
                  const col = m ? `C${parseInt(m[2],10)+1}` : '';
                  return (
                    <div key={sqId} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
                      background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                      borderLeft:`3px solid ${a.color}`,
                    }}>
                      <div style={{ fontSize:16, color:a.color, fontFamily:'Cinzel, serif', width:20, textAlign:'center' }}>{a.glyph}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)', letterSpacing:'0.18em' }}>{rank} · {col}</div>
                      </div>
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)' }}>E{f.evoTier}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:10, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', fontSize:11, color:'var(--bone-dim)', textAlign:'center' }}>
                Arrayed in the Command Chamber · fixed for this assignment
              </div>
            </div>

            {/* Battle Formation — the plan's true squares */}
            <div style={{ padding:'18px 14px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              background:'radial-gradient(ellipse at center, var(--abyss-1), var(--abyss-0))' }}>
              <div className="caps" style={{ marginBottom:12 }}>Battle Formation</div>
              <LineupBoard board={board} width={width} roster={roster}/>
              <div style={{ marginTop:14, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', fontSize:12, color:'var(--bone-dim)', textAlign:'center', maxWidth:320 }}>
                Exactly as arrayed on &ldquo;{lineup.name}&rdquo;. Empty squares are drawn from reserves.
              </div>
            </div>

            {/* Carry Relic — this lineup's single relic, nothing else */}
            <div style={{ borderLeft:'1px solid var(--abyss-4)', padding:'16px 16px 8px', display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div className="caps">Carry Relic</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)' }}>{carryRelic ? '1/1' : '0/1'}</div>
              </div>
              {carryRelic ? (
                <div style={{ padding:'14px 14px', background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                  border:'1px solid var(--brass)', borderLeft:'3px solid var(--brass)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:30, fontFamily:'Cinzel, serif', color:'var(--brass)',
                      textShadow:'0 0 14px var(--brass)', width:36, textAlign:'center' }}>{carryRelic.glyph}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', letterSpacing:'0.04em' }}>{carryRelic.name}</div>
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:3 }}>
                        T{carryRelic.tier} · {carryRelic.rarity}
                      </div>
                    </div>
                  </div>
                  {carryRelic.desc && (
                    <div style={{ marginTop:10, fontFamily:'Cormorant Garamond, serif', fontSize:12.5, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.5 }}>
                      {carryRelic.desc}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding:'22px 14px', border:'1px dashed var(--abyss-4)', textAlign:'center',
                  color:'var(--bone-dim)', fontStyle:'italic', fontSize:12, fontFamily:'Cormorant Garamond, serif', lineHeight:1.5 }}>
                  This lineup carries no relic.<br/>One may be chosen on its plan in the Lineup tab.
                </div>
              )}
              <div style={{ marginTop:10, fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bio-dim)', letterSpacing:'0.15em', textAlign:'center' }}>
                ‣ ONE RELIC PER LINEUP
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:'14px 26px', borderTop:'1px solid var(--abyss-4)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'linear-gradient(0deg, var(--abyss-2), transparent)' }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic', color:'var(--bone-dim)' }}>
            {!lineup
              ? 'No lineup bound to this assignment.'
              : `Deploying ${entries.length} follower${entries.length===1?'':'s'} · relic: ${carryRelic ? carryRelic.name : 'none'}.`}
          </div>
          <button className="btn primary" disabled={!lineup || entries.length===0} onClick={onConfirm}
            style={{ padding:'12px 28px', fontSize:13 }}>◈ CONFIRM LINEUP</button>
        </div>
      </div>
    </div>
  );
};

// Formation preview — the chosen lineup's TRUE board: width × 2 ranks, with
// every follower on the exact square it was arrayed on in the Command Chamber.
const LineupBoard = ({ board, width, roster }) => {
  const FA = window.FOLLOWER_ARCHETYPES || {};
  const cell = width <= 4 ? 60 : width <= 6 ? 52 : width <= 8 ? 44 : 38;
  const cells = [];
  for (let r=0; r<2; r++) for (let c=0; c<width; c++) cells.push({ r, c, id:`r${r}c${c}` });
  return (
    <div style={{
      display:'grid', gridTemplateColumns:`repeat(${width}, ${cell}px)`, gridTemplateRows:`repeat(2, ${cell}px)`,
      border:'1px solid var(--brass-deep)', boxShadow:'0 8px 30px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.5)',
    }}>
      {cells.map(sq => {
        const dark = (sq.r + sq.c) % 2 === 1;
        const f = board[sq.id] ? roster.find(x => x.instanceId === board[sq.id]) : null;
        const a = f ? (FA[f.archetype] || {}) : null;
        return (
          <div key={sq.id}
            title={f ? f.name : `${sq.r === 0 ? 'BACK' : 'FRONT'} · C${sq.c+1}`}
            style={{
              width:cell, height:cell,
              background: dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)',
              display:'grid', placeItems:'center', position:'relative',
              borderRight: sq.c===width-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              borderBottom: sq.r===1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
            }}>
            {a && (
              <div style={{ fontFamily:'Cinzel, serif', fontSize: f.archetype==='larva' ? cell*0.42 : cell*0.55,
                color: a.color, textShadow:`0 0 8px ${a.color}` }}>
                {a.glyph}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AugmentEditor = ({ follower, AUG_SLOTS, AUGMENTATIONS, FA, augInventory, installedElsewhere, pickSlot, setPickSlot, onInstall, onRemove }) => {
  const a = FA[follower.archetype] || { glyph:'?', color:'var(--bone)', name:follower.archetype };
  const tierColor = (t) => t===3?'oklch(0.72 0.16 30)':t===2?'oklch(0.72 0.13 195)':'oklch(0.65 0.08 145)';

  return (
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:0, minHeight:0 }}>
      {/* LEFT: follower portrait + info */}
      <div style={{ borderRight:'1px solid var(--abyss-4)', padding:'22px 20px',
        background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-0))',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{
          width:160, height:180, border:`1px solid ${a.color}`,
          background:`radial-gradient(ellipse at center, var(--abyss-2), var(--abyss-0))`,
          display:'grid', placeItems:'center', position:'relative',
          boxShadow:`0 0 30px ${a.color}33, inset 0 0 40px rgba(0,0,0,0.6)`,
        }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:96, color:a.color,
            textShadow:`0 0 20px ${a.color}` }}>{a.glyph}</div>
          <div style={{ position:'absolute', bottom:6, right:8, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--brass)', letterSpacing:'0.2em' }}>E{follower.evoTier}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:18, color:'var(--bone)', letterSpacing:'0.04em' }}>{follower.name}</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:a.color, letterSpacing:'0.2em', textTransform:'uppercase', marginTop:4 }}>{a.name} · {a.role}</div>
        </div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)', fontStyle:'italic', textAlign:'center', lineHeight:1.55 }}>
          {a.desc}
        </div>
      </div>

      {/* RIGHT: 5 slot rows */}
      <div style={{ padding:'18px 22px', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
        <div className="caps" style={{ marginBottom:4 }}>Graft Slots</div>
        {AUG_SLOTS.map(slot => {
          const installedId = follower.augments?.[slot.id] || null;
          const installed = installedId ? AUGMENTATIONS.find(a => a.id === installedId) : null;
          const isOpen = pickSlot === slot.id;
          // Candidates: augs of this slot. Must be in inventory or currently installed, not on another follower.
          const candidates = AUGMENTATIONS.filter(aug =>
            aug.slot === slot.id &&
            (augInventory.includes(aug.id) || aug.id === installedId) &&
            !installedElsewhere.has(aug.id)
          );
          return (
            <div key={slot.id} style={{
              border:'1px solid', borderColor: isOpen ? slot.color : 'var(--abyss-3)',
              background: isOpen ? 'var(--abyss-2)' : 'var(--abyss-1)',
              transition:'border-color 0.15s',
            }}>
              {/* Slot header */}
              <div onClick={()=>setPickSlot(isOpen ? null : slot.id)} style={{
                padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12,
                borderLeft:`3px solid ${slot.color}`,
              }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:22, color:slot.color, width:26, textAlign:'center' }}>{slot.glyph}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:slot.color, letterSpacing:'0.25em', textTransform:'uppercase' }}>{slot.label}</div>
                    {installed && (
                      <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)' }}>· {installed.name}</div>
                    )}
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.35, marginTop:2 }}>
                    {installed ? installed.effect : slot.desc}
                  </div>
                </div>
                {installed ? (
                  <>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:tierColor(installed.tier), letterSpacing:'0.2em', border:`1px solid ${tierColor(installed.tier)}`, padding:'2px 6px' }}>T{installed.tier}</div>
                    <button onClick={(e)=>{ e.stopPropagation(); onRemove(slot.id); }}
                      className="btn ghost sm" style={{ padding:'4px 10px', fontSize:10 }}>REMOVE</button>
                  </>
                ) : (
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.2em', fontStyle:'italic' }}>— EMPTY —</div>
                )}
                <div style={{ color:slot.color, fontFamily:'JetBrains Mono, monospace', fontSize:12, marginLeft:4 }}>{isOpen?'▾':'▸'}</div>
              </div>

              {/* Picker expanded */}
              {isOpen && (
                <div style={{ padding:'4px 14px 14px', borderTop:'1px solid var(--abyss-3)' }}>
                  {candidates.length === 0 ? (
                    <div style={{ padding:'14px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                      color:'var(--bone-dim)', fontStyle:'italic', fontFamily:'Cormorant Garamond, serif', fontSize:12 }}>
                      No {slot.label.toLowerCase()} augments in inventory. Trade for them at the Reef Trader.
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:10 }}>
                      {candidates.map(aug => {
                        const selected = aug.id === installedId;
                        return (
                          <div key={aug.id} onClick={()=>selected ? onRemove(slot.id) : onInstall(aug.id, slot.id)} style={{
                            padding:'9px 11px', cursor:'pointer',
                            border:'1px solid', borderColor: selected ? slot.color : 'var(--abyss-3)',
                            background: selected ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                            transition:'all 0.15s',
                          }}
                          onMouseEnter={e=>{ if (!selected) e.currentTarget.style.borderColor = slot.color; }}
                          onMouseLeave={e=>{ if (!selected) e.currentTarget.style.borderColor = 'var(--abyss-3)'; }}>
                            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:3 }}>
                              <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{aug.name}</div>
                              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:tierColor(aug.tier), letterSpacing:'0.15em', border:`1px solid ${tierColor(aug.tier)}`, padding:'1px 5px' }}>T{aug.tier}</div>
                            </div>
                            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.4 }}>
                              {aug.effect}
                            </div>
                            {selected && (
                              <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8, color:slot.color, letterSpacing:'0.2em' }}>◈ INSTALLED — CLICK TO REMOVE</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============== RECOVERED MODAL ===============
const RecoveredModal = ({ run, onClose }) => {
  const FA = window.FOLLOWER_ARCHETYPES || {};
  const OP_RELICS = window.OP_RELICS || [];
  const AUGMENTATIONS = window.AUGMENTATIONS || [];
  const rec = run.recovered || { followers:[], relics:[], augments:[] };
  const total = (rec.followers?.length||0) + (rec.relics?.length||0) + (rec.augments?.length||0);

  const Section = ({ title, items, render }) => (
    <div style={{ marginBottom:18 }}>
      <div className="caps" style={{ marginBottom:8 }}>{title} · {items.length}</div>
      {items.length === 0 ? (
        <div style={{ padding:12, border:'1px dashed var(--abyss-4)', textAlign:'center', color:'var(--bone-dim)', fontStyle:'italic', fontSize:11 }}>— Nothing yet —</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6 }}>{items.map(render)}</div>
      )}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position:'absolute', inset:0, zIndex:50,
      background:'rgba(2,6,12,0.82)', backdropFilter:'blur(6px)',
      display:'grid', placeItems:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(720px, 92vw)', maxHeight:'86vh',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        border:'1px solid var(--brass-deep)', boxShadow:'0 20px 80px rgba(0,0,0,0.8)',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--abyss-4)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'linear-gradient(180deg, var(--abyss-2), transparent)' }}>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)', letterSpacing:'0.28em' }}>
              ⚑ RECOVERED THIS TIDE
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:20, color:'var(--bone)', marginTop:2 }}>
              Salvage · {total}
            </div>
          </div>
          <button onClick={onClose} className="btn ghost sm">✕ CLOSE</button>
        </div>
        <div style={{ padding:'18px 24px', overflowY:'auto' }}>
          <Section title="Followers Recruited" items={rec.followers||[]} render={(f,i)=>{
            const a = FA[f.archetype] || {};
            return (
              <div key={i} style={{ padding:'8px 10px', border:'1px solid var(--abyss-3)', background:'var(--abyss-1)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:18, color:a.color, width:20, textAlign:'center' }}>{a.glyph||'?'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)' }}>{f.name}</div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:10, color:'var(--bone-dim)', fontStyle:'italic' }}>{a.name||f.archetype}</div>
                </div>
              </div>
            );
          }}/>
          <Section title="Relics Unearthed" items={rec.relics||[]} render={(id,i)=>{
            const rel = OP_RELICS.find(r => r.id === id);
            if (!rel) return null;
            return (
              <div key={i} style={{ padding:'8px 10px', border:'1px solid var(--abyss-3)', background:'var(--abyss-1)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--brass)', width:20, textAlign:'center' }}>{rel.glyph}</div>
                <div style={{ flex:1, minWidth:0, fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)' }}>{rel.name}</div>
              </div>
            );
          }}/>
          <Section title="Augments Harvested" items={rec.augments||[]} render={(id,i)=>{
            const aug = AUGMENTATIONS.find(a => a.id === id);
            if (!aug) return null;
            return (
              <div key={i} style={{ padding:'8px 10px', border:'1px solid var(--abyss-3)', background:'var(--abyss-1)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bio-dim)', letterSpacing:'0.15em', textTransform:'uppercase', width:44 }}>{aug.slot}</div>
                <div style={{ flex:1, minWidth:0, fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)' }}>{aug.name}</div>
              </div>
            );
          }}/>
        </div>
      </div>
    </div>
  );
};
