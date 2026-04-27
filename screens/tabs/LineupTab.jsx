// Tab 4 — Lineup: 4 formations (W4 / W6 / W8 / W10)
// Each formation can hold MULTIPLE named lineups (variants).
// Schema: run.lineups = { [width]: [{id, name, board:{[squareId]:instanceId}}, ...] }
const LineupTab = ({ run, setRun, togglePool, initialWidth }) => {
  const [width, setWidth] = React.useState(initialWidth || run.lineupWidth || 6);
  const roster = run.roster || [];

  const allLineups = run.lineups || {};
  const lineupsForWidth = allLineups[width] || [];

  // Selected lineup index within current width
  const [selIdx, setSelIdx] = React.useState(0);
  // Renaming state
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameDraft, setRenameDraft] = React.useState('');

  // Reset index if out-of-range when switching width
  React.useEffect(() => {
    if (selIdx >= lineupsForWidth.length) setSelIdx(0);
  }, [width, lineupsForWidth.length]);

  const current = lineupsForWidth[selIdx] || null;
  const board = current?.board || {};

  // Each formation: real board = w × fullH; player places on bottom 2 rows only.
  // Display: w × (fullH/2) — own half-court.
  const formations = [
    { w:4,  fullH:6,  label:'W4',  title:'Skirmish',  cap:8,  desc:'Tight 4×6 court. Place across 2 ranks of 4.',   color:'oklch(0.7 0.12 35)' },
    { w:6,  fullH:8,  label:'W6',  title:'Vanguard',  cap:12, desc:'Six-wide 6×8 board. Standard reef-tide.',         color:'oklch(0.7 0.13 195)' },
    { w:8,  fullH:10, label:'W8',  title:'Standard',  cap:16, desc:'Classical 8×10 court. Even rhythms.',             color:'var(--brass)' },
    { w:10, fullH:12, label:'W10', title:'Tide-Wall', cap:20, desc:'Wide 10×12 siege. Maximum brood deployed.',       color:'oklch(0.65 0.15 290)' },
  ];
  const active = formations.find(f => f.w === width);

  // === MUTATION HELPERS ===
  const updateCurrent = (mutator) => {
    setRun(r => {
      const ln = { ...(r.lineups || {}) };
      const arr = [...(ln[width] || [])];
      if (!arr[selIdx]) return r;
      arr[selIdx] = { ...arr[selIdx], ...mutator(arr[selIdx]) };
      ln[width] = arr;
      return { ...r, lineups: ln };
    });
  };

  const setSquare = (sqId, instanceId) => {
    updateCurrent(cur => {
      const b = { ...cur.board };
      // Remove this instance from any other square in this lineup
      for (const k of Object.keys(b)) {
        if (b[k] === instanceId) delete b[k];
      }
      if (instanceId) b[sqId] = instanceId;
      else delete b[sqId];
      return { board: b };
    });
  };

  const newLineup = () => {
    setRun(r => {
      const ln = { ...(r.lineups || {}) };
      const arr = [...(ln[width] || [])];
      const newId = `ln-${width}-${Math.random().toString(36).slice(2,7)}`;
      const used = new Set(arr.map(x => x.name));
      let n = arr.length + 1;
      let candidate = `Lineup ${n}`;
      while (used.has(candidate)) { n++; candidate = `Lineup ${n}`; }
      arr.push({ id: newId, name: candidate, board: {} });
      ln[width] = arr;
      return { ...r, lineups: ln };
    });
    // Select the newly added lineup (it's last)
    setSelIdx(lineupsForWidth.length);
  };

  const duplicateLineup = () => {
    if (!current) return;
    setRun(r => {
      const ln = { ...(r.lineups || {}) };
      const arr = [...(ln[width] || [])];
      const newId = `ln-${width}-${Math.random().toString(36).slice(2,7)}`;
      arr.push({ id: newId, name: `${current.name} (copy)`, board: { ...current.board } });
      ln[width] = arr;
      return { ...r, lineups: ln };
    });
    setSelIdx(lineupsForWidth.length);
  };

  const deleteLineup = () => {
    if (!current) return;
    if (lineupsForWidth.length <= 1) {
      // Don't fully delete the last one — clear it instead
      updateCurrent(() => ({ board: {} }));
      return;
    }
    setRun(r => {
      const ln = { ...(r.lineups || {}) };
      const arr = [...(ln[width] || [])];
      arr.splice(selIdx, 1);
      ln[width] = arr;
      return { ...r, lineups: ln };
    });
    setSelIdx(Math.max(0, selIdx - 1));
  };

  const commitRename = () => {
    if (renameDraft.trim()) {
      updateCurrent(() => ({ name: renameDraft.trim() }));
    }
    setRenamingId(null);
  };

  // === BENCH / DRAG ===
  const placedIds = new Set(Object.values(board));
  const unplaced = roster.filter(f => !placedIds.has(f.instanceId));
  const [dragId, setDragId] = React.useState(null);

  const autoFill = () => {
    if (!current) return;
    // Player places only on top 2 rows of the half-court (back rank + front rank)
    const backRow  = 0;
    const frontRow = 1;
    const majors = roster.filter(f => f.archetype !== 'larva').slice(0, width);
    const larvae = roster.filter(f => f.archetype === 'larva').slice(0, width);
    const b = {};
    majors.forEach((f, i) => { b[`r${backRow}c${i}`] = f.instanceId; });
    larvae.forEach((f, i) => { b[`r${frontRow}c${i}`] = f.instanceId; });
    updateCurrent(() => ({ board: b }));
  };
  const clearBoard = () => updateCurrent(() => ({ board: {} }));

  // Persist current width
  React.useEffect(() => {
    setRun(r => r.lineupWidth === width ? r : { ...r, lineupWidth: width });
  }, [width]);

  const placedCount = Object.keys(board).length;

  return (
    <div style={{ position:'relative', minHeight:'100%',
      background:`
        radial-gradient(ellipse at 50% 80%, oklch(0.18 0.05 220 / 0.5), transparent 65%),
        linear-gradient(180deg, var(--abyss-1), var(--abyss-0))` }}>

      {/* TOP: Formation selector tabs */}
      <div style={{ display:'flex', gap:0, padding:'18px 28px 0', borderBottom:'1px solid var(--abyss-3)' }}>
        {formations.map(f => {
          const isActive = f.w === width;
          const count = (allLineups[f.w] || []).length;
          return (
            <button key={f.w} onClick={()=>{ setWidth(f.w); setSelIdx(0); }}
              style={{
                flex:1, padding:'14px 18px', cursor:'pointer',
                background: isActive ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))` : 'transparent',
                border:'1px solid', borderColor: isActive ? f.color : 'transparent',
                borderBottom: isActive ? `1px solid ${f.color}` : '1px solid var(--abyss-3)',
                color:'var(--bone)', textAlign:'left', position:'relative',
                marginBottom: -1,
              }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:22, color:isActive?f.color:'var(--bone-dim)',
                  letterSpacing:'0.05em', textShadow: isActive ? `0 0 12px ${f.color}` : 'none' }}>{f.label}</span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.2em' }}>
                  · {f.w}×2 · {count} {count===1?'PLAN':'PLANS'}
                </span>
              </div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color: isActive?f.color:'var(--bone)',
                marginTop:3, letterSpacing:'0.08em' }}>{f.title}</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, color:'var(--bone-dim)',
                fontStyle:'italic', marginTop:3 }}>{f.desc}</div>
              {isActive && (
                <span style={{ position:'absolute', bottom:-1, left:0, right:0, height:2,
                  background:`linear-gradient(90deg, transparent, ${f.color}, transparent)` }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* === LINEUP VARIANT TABS (within current width) === */}
      <div style={{ display:'flex', alignItems:'stretch', padding:'10px 28px 0',
        borderBottom:'1px solid var(--abyss-3)', gap:6, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px 8px 0',
          borderRight:'1px solid var(--abyss-3)', marginRight:8 }}>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
            color:'var(--bone-dim)', letterSpacing:'0.25em', textTransform:'uppercase' }}>
            ◈ Plans · {active.label}
          </span>
        </div>

        {lineupsForWidth.map((ln, i) => {
          const isSel = i === selIdx;
          const ct = Object.keys(ln.board || {}).length;
          const isRenaming = renamingId === ln.id;
          return (
            <button key={ln.id}
              onClick={()=>{ if(!isRenaming) setSelIdx(i); }}
              onDoubleClick={()=>{
                setRenamingId(ln.id);
                setRenameDraft(ln.name);
                setSelIdx(i);
              }}
              style={{
                padding:'8px 14px', cursor: isRenaming?'text':'pointer',
                background: isSel ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))` : 'var(--abyss-1)',
                border:'1px solid', borderColor: isSel ? active.color : 'var(--abyss-3)',
                borderBottom: isSel ? '1px solid var(--abyss-0)' : `1px solid var(--abyss-3)`,
                color: isSel ? 'var(--bone)' : 'var(--bone-dim)',
                marginBottom:-1, position:'relative',
                display:'flex', alignItems:'center', gap:8,
              }}>
              <span style={{ fontFamily:'Cinzel, serif', fontSize:11,
                color: isSel ? active.color : 'var(--bone-dim)' }}>◈</span>
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={e=>setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e=>{
                    if (e.key==='Enter') commitRename();
                    if (e.key==='Escape') { setRenamingId(null); }
                  }}
                  onClick={e=>e.stopPropagation()}
                  style={{
                    background:'var(--abyss-0)', border:`1px solid ${active.color}`,
                    color:'var(--bone)', fontFamily:'Cinzel, serif', fontSize:12,
                    padding:'2px 6px', minWidth:120, outline:'none',
                  }}/>
              ) : (
                <span style={{ fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.05em' }}>
                  {ln.name}
                </span>
              )}
              <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                color:'var(--bone-dim)', letterSpacing:'0.18em' }}>· {ct}</span>
            </button>
          );
        })}

        <button onClick={newLineup}
          title="Create a new lineup at this width"
          style={{
            padding:'8px 14px', cursor:'pointer',
            background:'transparent', border:'1px dashed var(--abyss-4)',
            color: active.color, fontFamily:'Cinzel, serif', fontSize:12,
            letterSpacing:'0.05em', marginBottom:-1,
          }}>
          + New Lineup
        </button>

        <div style={{ flex:1 }}/>

        {current && (
          <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 0' }}>
            <button className="btn ghost sm" onClick={()=>{
              setRenamingId(current.id);
              setRenameDraft(current.name);
            }} title="Rename">✎ Rename</button>
            <button className="btn ghost sm" onClick={duplicateLineup} title="Duplicate">⧉ Duplicate</button>
            <button className="btn ghost sm" onClick={deleteLineup}
              title={lineupsForWidth.length<=1?'Clear board (last lineup)':'Delete this lineup'}
              style={{ color: lineupsForWidth.length<=1 ? 'var(--bone-dim)' : 'oklch(0.7 0.15 25)' }}>
              {lineupsForWidth.length<=1 ? '✕ Clear' : '✕ Delete'}
            </button>
          </div>
        )}
      </div>

      {/* BODY: Board (left) + Bench (right) */}
      {!current ? (
        <div style={{ padding:'80px 40px', textAlign:'center' }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:18, fontStyle:'italic',
            color:'var(--bone-dim)', marginBottom:20, lineHeight:1.6 }}>
            No {active.label} plan has been arrayed.<br/>
            Forge a fresh formation for this width.
          </div>
          <button className="btn primary" onClick={newLineup} style={{ padding:'12px 28px' }}>
            + Forge {active.label} Lineup
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, padding:'24px 28px' }}>
          {/* === BOARD === */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', width:'100%', marginBottom:14 }}>
              <div>
                <div className="eyebrow" style={{ color:active.color }}>{active.title} · {current.name}</div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:20, color:'var(--bone)', letterSpacing:'0.05em', marginTop:2 }}>
                  {active.label} · Width {width} Squares
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn ghost sm" onClick={autoFill}>⚡ Auto-Fill</button>
                <button className="btn ghost sm" onClick={clearBoard}>✕ Clear</button>
              </div>
            </div>

            <BoardGrid
              width={width} fullH={active.fullH} lineup={board}
              roster={roster} onSetSquare={setSquare}
              dragId={dragId} setDragId={setDragId}
              color={active.color}
            />

            <div style={{ marginTop:14, fontFamily:'JetBrains Mono, monospace', fontSize:10,
              color:'var(--bio-dim)', letterSpacing:'0.2em' }}>
              {placedCount}/{active.cap} DEPLOYED · {unplaced.length} ON BENCH
            </div>
            <div style={{ marginTop:8, fontFamily:'Cormorant Garamond, serif', fontSize:13,
              color:'var(--bone-dim)', fontStyle:'italic', textAlign:'center', maxWidth:480, lineHeight:1.5 }}>
              Drag a follower from the bench onto a square. Empty squares are drawn from reserves when the tide begins.
            </div>
          </div>

          {/* === BENCH === */}
          <div style={{
            background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
            border:'1px solid var(--abyss-3)', padding:'14px',
            maxHeight:'70vh', display:'flex', flexDirection:'column',
          }}>
            <div className="caps" style={{ marginBottom:6 }}>Bench · Available</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.2em', marginBottom:10 }}>
              {unplaced.length} REMAIN
            </div>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5,
              padding:6, border:'1px dashed var(--abyss-4)', minHeight:120,
            }}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') || dragId;
                if (id) {
                  updateCurrent(cur => {
                    const b = { ...cur.board };
                    for (const k of Object.keys(b)) {
                      if (b[k] === id) delete b[k];
                    }
                    return { board: b };
                  });
                }
                setDragId(null);
              }}
            >
              {unplaced.length === 0 && (
                <div style={{ padding:'24px 12px', textAlign:'center', color:'var(--bone-dim)',
                  fontStyle:'italic', fontSize:12 }}>All followers deployed.</div>
              )}
              {unplaced.map(f => {
                const a = FOLLOWER_ARCHETYPES[f.archetype];
                return (
                  <div key={f.instanceId}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', f.instanceId);
                      setDragId(f.instanceId);
                    }}
                    onDragEnd={()=>setDragId(null)}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                      background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                      borderLeft:`3px solid ${a.color}`,
                      cursor:'grab',
                      opacity: dragId === f.instanceId ? 0.4 : 1,
                    }}>
                    <div style={{ fontSize:20, fontFamily:'Cinzel, serif', color:a.color,
                      width:24, textAlign:'center' }}>{a.glyph}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
                        {a.role} · E{f.evoTier}
                      </div>
                    </div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:14, color:'var(--bone-dim)' }}>⋮⋮</div>
                  </div>
                );
              })}
            </div>

            <div className="divider fancy"><span>◈</span></div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)',
              fontStyle:'italic', lineHeight:1.5 }}>
              Each plan remembers its own arrangement. Switch tabs without losing layouts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Board Grid: shows player's half-court (W × H/2). Top 2 rows are placeable (back rank + front rank). ---
const BoardGrid = ({ width, fullH, lineup, roster, onSetSquare, dragId, setDragId, color }) => {
  const halfRows = fullH / 2;            // visible rows
  const backRow  = 0;                    // top row — major pieces
  const frontRow = 1;                    // second row — pawns / larvae
  const cell = width <= 4 ? 72 : width <= 6 ? 60 : width <= 8 ? 50 : 42;
  const lookup = id => roster.find(f => f.instanceId === id);

  const handleDrop = (sqId, isPlaceable) => (e) => {
    e.preventDefault();
    if (!isPlaceable) return;
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (!id) return;
    onSetSquare(sqId, id);
    setDragId(null);
  };

  const squares = [];
  for (let r=0; r<halfRows; r++) {
    for (let c=0; c<width; c++) {
      squares.push({ r, c, id:`r${r}c${c}` });
    }
  }

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      {/* "Enemy half" header — reminds player this is the home half */}
      <div style={{ position:'absolute', bottom:-22, left:0, right:0, textAlign:'center',
        fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'oklch(0.55 0.13 25)',
        letterSpacing:'0.3em', textTransform:'uppercase' }}>
        ◣ ◣ ◣  Enemy Half (Hidden)  ◣ ◣ ◣
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(${width}, ${cell}px)`,
        gridTemplateRows:`repeat(${halfRows}, ${cell}px)`,
        border:`1px solid ${color}`,
        boxShadow:`0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6), 0 0 30px ${color}33`,
        background:'var(--abyss-1)',
        position:'relative',
      }}>
        {squares.map(sq => {
          const dark = (sq.r + sq.c) % 2 === 1;
          const isPlaceable = sq.r === backRow || sq.r === frontRow;
          const isNoMans = !isPlaceable;
          const occId = lineup[sq.id];
          const occ = (occId && isPlaceable) ? lookup(occId) : null;
          const a = occ ? FOLLOWER_ARCHETYPES[occ.archetype] : null;
          const rowLabel = sq.r === backRow ? 'BACK' : sq.r === frontRow ? 'FRONT' : '';

          return (
            <div key={sq.id}
              onDragOver={e => { if (isPlaceable) e.preventDefault(); }}
              onDrop={handleDrop(sq.id, isPlaceable)}
              style={{
                width:cell, height:cell, position:'relative',
                background: isNoMans
                  ? `repeating-linear-gradient(45deg,
                      oklch(0.09 0.015 220) 0 6px,
                      oklch(0.12 0.02 220) 6px 12px)`
                  : (dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)'),
                display:'grid', placeItems:'center',
                borderRight: sq.c===width-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
                borderBottom: sq.r===halfRows-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
                opacity: isNoMans ? 0.4 : 1,
                transition:'background 0.15s',
                cursor: isPlaceable && !occ ? 'default' : (occ ? 'pointer' : 'not-allowed'),
              }}
              onClick={()=> occ && onSetSquare(sq.id, null)}
              title={occ ? `${occ.name} — click to clear` : (isPlaceable ? `${rowLabel} rank · row ${sq.r+1}` : 'Mid-field — not deployable')}
            >
              {/* Rank label (left edge) */}
              {sq.c === 0 && rowLabel && (
                <div style={{ position:'absolute', left:-30, top:'50%', transform:'translateY(-50%)',
                  fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
                  letterSpacing:'0.2em' }}>
                  {rowLabel}
                </div>
              )}

              {/* Mid-line marker between placeable and no-mans */}
              {sq.r === frontRow && sq.c === 0 && (
                <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:1,
                  background:`linear-gradient(90deg, transparent, ${color}, transparent)`,
                  width:`${width*cell}px`, pointerEvents:'none' }}/>
              )}

              {/* No-mans cell glyph */}
              {isNoMans && (
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10,
                  color:'oklch(0.4 0.05 220)', opacity:0.5 }}>·</div>
              )}

              {/* Placeable empty cell */}
              {isPlaceable && !occ && (
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                  color:'var(--abyss-4)', opacity:0.6, letterSpacing:'0.2em' }}>+</div>
              )}

              {/* Occupied */}
              {a && occ && (
                <div draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', occ.instanceId);
                    setDragId(occ.instanceId);
                  }}
                  onDragEnd={()=>setDragId(null)}
                  style={{
                    width:'100%', height:'100%', display:'grid', placeItems:'center',
                    cursor:'grab', position:'relative',
                    opacity: dragId === occ.instanceId ? 0.4 : 1,
                  }}>
                  <div style={{ fontFamily:'Cinzel, serif',
                    fontSize: occ.archetype==='larva' ? cell*0.5 : cell*0.6,
                    color:a.color, textShadow:`0 0 10px ${a.color}, 0 2px 4px rgba(0,0,0,0.8)` }}>
                    {a.glyph}
                  </div>
                  {occ.evoTier > 0 && (
                    <div style={{ position:'absolute', top:2, right:3,
                      fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--brass)',
                      letterSpacing:'0.1em' }}>+{occ.evoTier}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — court size hint */}
      <div style={{ marginTop:6, textAlign:'center',
        fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
        letterSpacing:'0.25em' }}>
        ◈ Showing your half · Full court {width}×{fullH} · Place on the back two ranks ◈
      </div>
    </div>
  );
};

window.LineupTab = LineupTab;
