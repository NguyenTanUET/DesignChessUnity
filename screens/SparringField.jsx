// Sparring Field — the loaded-lineup view for the Training Ground.
// Mirrors the Lineup scene's board, but WITHOUT Loadout / Bench: a full W×W
// board with the bottom half = side A (Player / AI-1) and the top half = side B
// (Enemy AI / AI-2). Two "On Field" panels flank the board, one per side, and a
// single carry-relic bar sits below the player half and above the enemy half.
//
// Interactions on a piece (in either the On Field list or on the board):
//   • Left-click  — select it, then click an empty square within that side's two
//                   deployment ranks to move it there.
//   • Right-click — open the Unit Info / augmentation popup (the Follower panel).
//
// Reads run.trainingConfig = { mode, width, sideA, sideB, aiSkill } produced by
// the Training Ground panel, and resolves both lineups from run.lineups[width].

const SparringField = ({ run, setRun, go }) => {
  const cfg    = run.trainingConfig || {};
  const width  = cfg.width || 8;
  const height = width + 2;   // board is W wide × (W+2) tall
  const roster = run.roster || [];
  const pool   = (run.lineups || {})[width] || [];

  const lineupA = pool.find(l => l.id === cfg.sideA) || null;
  const lineupB = pool.find(l => l.id === cfg.sideB) || null;

  const isAIvAI = cfg.mode === 'aivai';

  // Side framing — A is the bottom (home) side, B is the top side.
  const sideA = isAIvAI
    ? { title:'AI · Sovereign I', glyph:'◐', color:'var(--bio)',   colorDim:'var(--bio-dim)' }
    : { title:'Player',           glyph:'◈', color:'var(--bio)',   colorDim:'var(--bio-dim)' };
  const sideB = isAIvAI
    ? { title:'AI · Sovereign II', glyph:'◑', color:'var(--coral)', colorDim:'var(--coral-dim)' }
    : { title:'Enemy AI',          glyph:'◣', color:'var(--coral)', colorDim:'var(--coral-dim)' };

  // --- transient UI state ---
  const [dragInfo,    setDragInfo]    = React.useState(null); // { instanceId, side } while dragging a piece
  const [infoId,      setInfoId]      = React.useState(null);  // instanceId for the Unit Info popup
  const [relicPicker, setRelicPicker] = React.useState(null);  // 'A' | 'B' — which side's relic to choose
  window.useEscClose(() => { setInfoId(null); setRelicPicker(null); setDragInfo(null); });

  // Map a lineup's 2-rank board (r0=back, r1=front) onto absolute rows of the
  // full W×W board. 'bottom' anchors the back rank to the last row; 'top'
  // anchors the back rank to row 0.
  const placeSide = (board, anchor) => {
    const out = {};
    for (const [k, iid] of Object.entries(board || {})) {
      const m = k.match(/r(\d+)c(\d+)/);
      if (!m) continue;
      const rank = +m[1], col = +m[2];
      const row = anchor === 'bottom' ? (height - 1 - rank) : rank;
      out[`${row}-${col}`] = iid;
    }
    return out;
  };
  const cellsA = placeSide(lineupA?.board, 'bottom');
  const cellsB = placeSide(lineupB?.board, 'top');

  // A square belongs to a side's deployment zone (its original two ranks).
  const inZone = (side, row) => side === 'A'
    ? (row === height - 1 || row === height - 2)
    : (row === 0 || row === 1);

  // Convert an absolute (row,col) back to the lineup's own rank/col key.
  const sqKey = (side, row, col) => {
    const rank = side === 'A' ? (height - 1 - row) : row;
    return `r${rank}c${col}`;
  };

  // --- mutations on the underlying lineup ---
  const editLineup = (side, mutate) => {
    const lineupId = side === 'A' ? cfg.sideA : cfg.sideB;
    setRun(r => {
      const lns = { ...(r.lineups || {}) };
      const arr = [...(lns[width] || [])];
      const idx = arr.findIndex(l => l.id === lineupId);
      if (idx < 0) return r;
      arr[idx] = { ...arr[idx], ...mutate(arr[idx]) };
      lns[width] = arr;
      return { ...r, lineups: lns };
    });
  };

  // Drag-drop: place a piece onto a square in its own side's zone. If an ally
  // already stands there, the two swap squares.
  const placePiece = (side, instanceId, row, col) => {
    if (!inZone(side, row)) return;
    const targetKey = sqKey(side, row, col);
    editLineup(side, cur => {
      const b = { ...cur.board };
      let fromKey = null;
      for (const k of Object.keys(b)) if (b[k] === instanceId) fromKey = k;
      if (fromKey === targetKey) return {}; // dropped onto itself
      const occupant = b[targetKey];        // ally standing on the target → swap
      if (fromKey) delete b[fromKey];
      if (occupant && occupant !== instanceId && fromKey) b[fromKey] = occupant;
      b[targetKey] = instanceId;
      return { board: b };
    });
    setDragInfo(null);
  };

  const setSideRelic = (side, relicId) => editLineup(side, () => ({ carryRelicId: relicId || null }));

  const onDropAt = (row, col) => {
    if (!dragInfo) return;
    placePiece(dragInfo.side, dragInfo.instanceId, row, col);
  };

  // UI scaffolding — the live sparring engine is not yet wired to the board.
  const proceed = () => {
    if (!lineupA || !lineupB) return;
    setRun(r => ({ ...r, trainingConfig: { ...(r.trainingConfig || {}), ready: true } }));
  };

  const modeLabel = isAIvAI ? 'AI vs AI' : (cfg.mode === 'pvai' ? 'P vs AI' : 'Sparring');
  const infoFollower = infoId ? roster.find(f => f.instanceId === infoId) : null;
  const relicSide = relicPicker === 'A' ? sideA : relicPicker === 'B' ? sideB : null;

  // Board cell size — also used to width-match the relic bars to the board.
  const cell = width <= 4 ? 64 : width <= 6 ? 54 : width <= 8 ? 46 : 38;
  const boardW = cell * width;

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)',
      display:'flex', flexDirection:'column' }}>

      {/* Slim top bar */}
      <div style={{ height:60, flexShrink:0, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 24px',
        background:'linear-gradient(180deg, rgba(8,12,16,0.92), rgba(0,0,0,0.6))',
        borderBottom:'1px solid var(--abyss-4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button className="btn ghost sm"
            onClick={()=>{ setRun(r => ({ ...r, commandSubTab:'training' })); go('op-command'); }}>
            ← Back
          </button>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
              color:'var(--brass-dim)', textTransform:'uppercase' }}>
              Training Ground · Sparring Field
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              {modeLabel} · W{width}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {cfg.aiSkill ? `AI · ${cfg.aiSkill}` : '◇ Loaded'}
          <span style={{ marginLeft:14, color:'var(--bio-dim)' }}>
            ◈ L-CLICK MOVE · R-CLICK INFO
          </span>
        </div>
      </div>

      {/* Body: On Field (A) | Board | On Field (B) */}
      {(!lineupA || !lineupB) ? (
        <div style={{ flex:1, display:'grid', placeItems:'center', textAlign:'center', padding:40 }}>
          <div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:18, fontStyle:'italic',
              color:'var(--bone-dim)', lineHeight:1.6, marginBottom:18 }}>
              No lineups were loaded for this bout.<br/>Return and array both sides first.
            </div>
            <button className="btn primary"
              onClick={()=>{ setRun(r => ({ ...r, commandSubTab:'training' })); go('op-command'); }}
              style={{ padding:'12px 28px' }}>
              ← Back to Training Ground
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, minHeight:0, display:'grid',
          gridTemplateColumns:'300px 1fr 300px', gap:14, padding:'24px 28px', overflow:'hidden' }}>

          {/* On Field — side A (Player / AI-1) */}
          <OnFieldList side={sideA} sideKey="A" lineup={lineupA} roster={roster}
            draggingId={dragInfo?.instanceId}
            onDragStart={(id)=>setDragInfo({ instanceId:id, side:'A' })}
            onDragEnd={()=>setDragInfo(null)} onInfo={setInfoId}/>

          {/* Center — enemy relic bar · board · player relic bar */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minHeight:0, overflow:'auto', gap:10 }}>

            {/* enemy relic bar — above the enemy (top) half */}
            <RelicBar side={sideB} barWidth={boardW}
              relic={lineupB.carryRelicId ? OP_RELICS.find(r=>r.id===lineupB.carryRelicId) : null}
              onChoose={()=>setRelicPicker('B')} onClear={()=>setSideRelic('B', null)}/>

            <SparringBoard
              width={width} height={height} cell={cell} roster={roster}
              cellsA={cellsA} cellsB={cellsB}
              colorA={sideA.color} colorB={sideB.color}
              dragInfo={dragInfo}
              onDragStartPiece={(id, side)=>setDragInfo({ instanceId:id, side })}
              onDragEndPiece={()=>setDragInfo(null)}
              onDropSquare={onDropAt}
              onPieceContext={setInfoId}/>

            {/* player relic bar — below the player (bottom) half */}
            <RelicBar side={sideA} barWidth={boardW}
              relic={lineupA.carryRelicId ? OP_RELICS.find(r=>r.id===lineupA.carryRelicId) : null}
              onChoose={()=>setRelicPicker('A')} onClear={()=>setSideRelic('A', null)}/>

            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
              color:'var(--bone-dim)', letterSpacing:'0.25em', textAlign:'center' }}>
              ◣ {sideB.title.toUpperCase()} (TOP) · {sideA.title.toUpperCase()} (BOTTOM) ◈
            </div>
          </div>

          {/* On Field — side B (Enemy AI / AI-2) */}
          <OnFieldList side={sideB} sideKey="B" lineup={lineupB} roster={roster}
            draggingId={dragInfo?.instanceId}
            onDragStart={(id)=>setDragInfo({ instanceId:id, side:'B' })}
            onDragEnd={()=>setDragInfo(null)} onInfo={setInfoId}/>
        </div>
      )}

      {/* Footer — proceed to the bout */}
      <div style={{ flexShrink:0, borderTop:'1px solid var(--abyss-4)', padding:'12px 24px',
        display:'flex', alignItems:'center', gap:16,
        background:'linear-gradient(0deg, rgba(8,12,16,0.92), rgba(0,0,0,0.4))' }}>
        <div style={{ flex:1, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.15em', textTransform:'uppercase' }}>
          ‣ Drag to reposition or swap · right-click a piece for info
        </div>
        <button className="btn primary" disabled={!lineupA || !lineupB}
          onClick={proceed} style={{ padding:'12px 30px', fontSize:14 }}>
          ▷ Proceed to Training
        </button>
      </div>

      {/* === UNIT INFO / AUGMENTATION POPUP (right-click) === */}
      {infoFollower && (
        <div className="modal-backdrop" onClick={()=>setInfoId(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:'var(--abyss-1)', border:'1px solid var(--brass-deep)',
            width:'min(980px, 94vw)', maxHeight:'90vh', overflowY:'auto', position:'relative',
            boxShadow:'0 24px 80px rgba(0,0,0,0.7)' }}>
            <button onClick={()=>setInfoId(null)} title="Close"
              style={{ position:'absolute', top:10, right:12, zIndex:2, background:'transparent',
                border:'1px solid var(--abyss-4)', color:'var(--bone-dim)', cursor:'pointer',
                fontFamily:'JetBrains Mono, monospace', fontSize:14, padding:'2px 9px' }}>✕</button>
            <UnitInfoTab run={run} setRun={setRun} sel={infoFollower}
              arch={FOLLOWER_ARCHETYPES[infoFollower.archetype]} go={go}
              togglePool={()=>{}} setSubTab={()=>{}}/>
          </div>
        </div>
      )}

      {/* === CARRY-RELIC PICKER === */}
      {relicSide && (
        <div className="modal-backdrop" onClick={()=>setRelicPicker(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:520 }}>
            <div className="eyebrow" style={{ color:relicSide.color }}>⚑ · {relicSide.title}</div>
            <h2 style={{ margin:'6px 0 4px', fontSize:24, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>
              Carry Relic
            </h2>
            <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:14,
              fontFamily:'Cormorant Garamond, serif' }}>
              One relic rides into the bout with this lineup. Pick one, or clear it.
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:420, overflowY:'auto' }}>
              {/* clear option */}
              <div className="hoverable" onClick={()=>{ setSideRelic(relicPicker, null); setRelicPicker(null); }}
                style={{ padding:'10px 12px', cursor:'pointer', background:'var(--abyss-1)',
                  border:'1px solid var(--abyss-3)', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, textAlign:'center', color:'var(--bone-dim)', fontSize:18 }}>∅</div>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone-dim)' }}>
                  None — carry no relic
                </div>
              </div>

              {(run.relicsOwned || []).length === 0 && (
                <div style={{ padding:'24px 16px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                  fontFamily:'Cormorant Garamond, serif', fontStyle:'italic',
                  color:'var(--bone-dim)', fontSize:13 }}>
                  No relics owned to carry.
                </div>
              )}

              {(run.relicsOwned || [])
                .map(id => OP_RELICS.find(r => r.id === id))
                .filter(Boolean)
                .map(rel => {
                  const lineup = relicPicker === 'A' ? lineupA : lineupB;
                  const isOn = lineup.carryRelicId === rel.id;
                  return (
                    <div key={rel.id} className="hoverable"
                      onClick={()=>{ setSideRelic(relicPicker, rel.id); setRelicPicker(null); }}
                      style={{
                        padding:'10px 12px', cursor:'pointer',
                        background: isOn ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                        border:'1px solid', borderColor: isOn ? 'var(--brass)' : 'var(--abyss-3)',
                        display:'flex', alignItems:'center', gap:10,
                      }}>
                      <div style={{ width:28, textAlign:'center', fontFamily:'Cinzel, serif',
                        fontSize:20, color:'var(--brass)', textShadow:'0 0 8px var(--brass)' }}>
                        {rel.glyph}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
                          letterSpacing:'0.04em' }}>{rel.name}</div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                          color:'var(--bone-dim)', letterSpacing:'0.15em', marginTop:3, textTransform:'uppercase' }}>
                          T{rel.tier} · {rel.rarity}
                        </div>
                        {rel.desc && (
                          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11,
                            color:'var(--bone-dim)', fontStyle:'italic', marginTop:4, lineHeight:1.4 }}>
                            {rel.desc}
                          </div>
                        )}
                      </div>
                      {isOn && <span style={{ color:'var(--brass)', fontSize:12 }}>◆</span>}
                    </div>
                  );
                })}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn ghost sm" onClick={()=>setRelicPicker(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- The W×W board. Side A occupies the bottom two ranks, side B the top two.
// Left-click selects/moves; right-click opens the info popup. Each piece keeps
// its archetype glyph/colour with a thin side-coloured accent.
const SparringBoard = ({ width, height, cell, roster, cellsA, cellsB, colorA, colorB,
  dragInfo, onDragStartPiece, onDragEndPiece, onDropSquare, onPieceContext }) => {
  const lookup = id => roster.find(f => f.instanceId === id);

  const rows = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) rows.push({ r, c });
  }

  return (
    <div style={{
      display:'inline-grid',
      gridTemplateColumns:`repeat(${width}, ${cell}px)`,
      gridTemplateRows:`repeat(${height}, ${cell}px)`,
      border:'1px solid var(--brass-deep)',
      boxShadow:'0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6)',
      background:'var(--abyss-1)', position:'relative',
    }}>
      {rows.map(({ r, c }) => {
        const dark = (r + c) % 2 === 1;
        const key = `${r}-${c}`;
        const aId = cellsA[key];
        const bId = cellsB[key];
        const occId = aId || bId;
        const side = aId ? 'A' : bId ? 'B' : null;
        const sideColor = aId ? colorA : bId ? colorB : null;
        const occ = occId ? lookup(occId) : null;
        const a = occ ? FOLLOWER_ARCHETYPES[occ.archetype] : null;

        const isPlayerRegion = r >= height - 2;
        const isAIRegion = r <= 1;
        const regionTint = isPlayerRegion ? `${colorA}14` : isAIRegion ? `${colorB}14` : 'transparent';

        // Drag feedback: a square is a valid drop target when it lies in the
        // dragged piece's own zone (empty → move, ally → swap).
        const inDragZone = dragInfo && (dragInfo.side === 'A' ? isPlayerRegion : isAIRegion);
        const isDropTarget = inDragZone && occId !== dragInfo.instanceId;
        const isDragSource = dragInfo && occId === dragInfo.instanceId;
        const dragColor = dragInfo ? (dragInfo.side === 'A' ? colorA : colorB) : null;

        return (
          <div key={key}
            onDragOver={(e)=>{ if (inDragZone) e.preventDefault(); }}
            onDrop={(e)=>{ e.preventDefault(); onDropSquare(r, c); }}
            onContextMenu={(e)=>{ e.preventDefault(); if (occId) onPieceContext(occId); }}
            title={occ ? `${occ.name} — drag to move/swap · right-click for info` : `row ${r+1} · col ${c+1}`}
            style={{
              width:cell, height:cell, position:'relative',
              background: dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)',
              display:'grid', placeItems:'center',
              borderRight: c === width-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              borderBottom: r === height-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
            }}>
            {/* faint home/enemy region wash */}
            <div style={{ position:'absolute', inset:0, background:regionTint, pointerEvents:'none' }}/>

            {/* valid drop-target highlight while dragging */}
            {isDropTarget && (
              <div style={{ position:'absolute', inset:2, border:`1px dashed ${dragColor}`,
                background:`${dragColor}10`, pointerEvents:'none' }}/>
            )}

            {a && occ && (
              <div draggable
                onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', occId);
                  e.dataTransfer.effectAllowed = 'move'; onDragStartPiece(occId, side); }}
                onDragEnd={onDragEndPiece}
                style={{ position:'relative', width:'100%', height:'100%',
                  display:'grid', placeItems:'center', cursor:'grab',
                  opacity: isDragSource ? 0.35 : 1 }}>
                <div style={{ fontFamily:'Cinzel, serif',
                  fontSize: occ.archetype === 'larva' ? cell*0.5 : cell*0.6,
                  color:a.color, textShadow:`0 0 10px ${a.color}, 0 2px 4px rgba(0,0,0,0.8)`,
                  pointerEvents:'none' }}>
                  {a.glyph}
                </div>
                {/* side accent bar — bottom for A, top for B */}
                <div style={{ position:'absolute', left:'18%', right:'18%', height:2,
                  bottom: aId ? 3 : 'auto', top: bId ? 3 : 'auto',
                  background:sideColor, boxShadow:`0 0 6px ${sideColor}`, pointerEvents:'none' }}/>
                {occ.evoTier > 0 && (
                  <div style={{ position:'absolute', top:2, right:3, pointerEvents:'none',
                    fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--brass)' }}>
                    +{occ.evoTier}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* mid-line between the two halves */}
      <div style={{ position:'absolute', left:0, right:0, top:'50%', height:1,
        background:'linear-gradient(90deg, transparent, var(--brass), transparent)', pointerEvents:'none' }}/>
    </div>
  );
};

// --- Carry-relic bar for one side. Add / change / clear the single relic the
// lineup carries into the bout.
const relicIconBtn = {
  background:'transparent', border:'1px solid var(--abyss-4)', color:'var(--bone-dim)',
  cursor:'pointer', fontFamily:'JetBrains Mono, monospace', fontSize:11, lineHeight:1,
  padding:'3px 7px', flexShrink:0,
};

const RelicBar = ({ side, relic, onChoose, onClear, barWidth }) => (
  <div style={{
    width: barWidth ? `${barWidth}px` : '100%', maxWidth:'100%', padding:'5px 10px',
    display:'flex', alignItems:'center', gap:8,
    background:'linear-gradient(90deg, var(--abyss-1), var(--abyss-0))',
    border:`1px solid ${relic ? side.color : 'var(--abyss-3)'}`,
    borderLeft:`3px solid ${side.color}`,
  }}>
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8,
      color:'var(--bone-dim)', letterSpacing:'0.2em', textTransform:'uppercase',
      whiteSpace:'nowrap', flexShrink:0 }}>
      ⚑ {side.title}
    </span>

    {relic ? (
      <>
        <span style={{ fontSize:18, fontFamily:'Cinzel, serif', color:'var(--brass)',
          textShadow:'0 0 8px var(--brass)', flexShrink:0 }}>{relic.glyph}</span>
        <span style={{ flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          <span style={{ fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)' }}>{relic.name}</span>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
            letterSpacing:'0.15em', marginLeft:8 }}>T{relic.tier} · {relic.rarity.toUpperCase()}</span>
        </span>
        <button onClick={onChoose} title="Change relic" style={relicIconBtn}>⇄</button>
        <button onClick={onClear} title="Remove relic" style={relicIconBtn}>×</button>
      </>
    ) : (
      <>
        <span style={{ flex:1, fontFamily:'Cormorant Garamond, serif', fontSize:12,
          color:'var(--bone-dim)', fontStyle:'italic' }}>
          No relic carried.
        </span>
        <button onClick={onChoose} title="Add relic"
          style={{ ...relicIconBtn, border:`1px dashed ${side.color}`, color:side.color,
            letterSpacing:'0.18em', textTransform:'uppercase', fontSize:9, padding:'4px 10px' }}>
          + Relic
        </button>
      </>
    )}
  </div>
);

// --- "On Field" roster list for one side. Drag an entry onto the board to move
// or swap it; right-click for the Unit Info popup.
const OnFieldList = ({ side, sideKey, lineup, roster, draggingId, onDragStart, onDragEnd, onInfo }) => {
  const entries = Object.entries(lineup?.board || {});
  return (
    <div style={{
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      border:`1px solid ${side.colorDim}`, borderTop:`3px solid ${side.color}`,
      padding:'14px 12px', display:'flex', flexDirection:'column', gap:10,
      overflow:'hidden', minHeight:0,
    }}>
      <div>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:15, color:side.color, letterSpacing:'0.06em',
          display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>{side.glyph}</span>{side.title}
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', marginTop:3 }}>
          ON FIELD · {entries.length} DEPLOYED
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5,
        padding:6, border:'1px dashed var(--abyss-4)', minHeight:80 }}>
        {entries.length === 0 && (
          <div style={{ padding:'14px 8px', textAlign:'center', color:'var(--bone-dim)',
            fontStyle:'italic', fontSize:11, fontFamily:'Cormorant Garamond, serif' }}>
            No followers deployed.
          </div>
        )}
        {entries.map(([sqId, instId]) => {
          const f = roster.find(x => x.instanceId === instId);
          if (!f) return null;
          const a = FOLLOWER_ARCHETYPES[f.archetype];
          const m = sqId.match(/r(\d+)c(\d+)/);
          const rank = m ? (m[1] === '0' ? 'BACK' : 'FRONT') : '';
          const col = m ? `C${parseInt(m[2],10)+1}` : '';
          return (
            <div key={sqId} className="hoverable"
              draggable
              onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', instId);
                e.dataTransfer.effectAllowed = 'move'; onDragStart(instId); }}
              onDragEnd={onDragEnd}
              onContextMenu={(e)=>{ e.preventDefault(); onInfo(instId); }}
              title="Drag onto the board to move/swap · right-click for info"
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'7px 9px', cursor:'grab',
                background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                borderLeft:`3px solid ${a.color}`,
                opacity: draggingId === instId ? 0.4 : 1,
              }}>
              <div style={{ fontSize:18, fontFamily:'Cinzel, serif', color:a.color,
                width:22, textAlign:'center' }}>{a.glyph}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'var(--bone)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
                  letterSpacing:'0.18em' }}>
                  {rank} · {col}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

window.SparringField = SparringField;
