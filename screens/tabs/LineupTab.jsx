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

  // Each formation has a square footprint (w × w) and is rendered at its own size.
  // Player places on the back 2 ranks only; remaining rows are hatched as out-of-bounds.
  const formations = [
    { w:4,  fullH:4,  label:'W4',  title:'Skirmish',  cap:8,  desc:'Tight 4×4 grid. Two ranks of 4 deploy.',     color:'oklch(0.7 0.12 35)' },
    { w:6,  fullH:6,  label:'W6',  title:'Vanguard',  cap:12, desc:'Six-wide 6×6 grid. Two ranks of 6 deploy.',  color:'oklch(0.7 0.13 195)' },
    { w:8,  fullH:8,  label:'W8',  title:'Standard',  cap:16, desc:'Classical 8×8 grid. Two ranks of 8 deploy.', color:'var(--brass)' },
    { w:10, fullH:10, label:'W10', title:'Tide-Wall', cap:20, desc:'Wide 10×10 siege. Two ranks of 10 deploy.',  color:'oklch(0.65 0.15 290)' },
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
  // Bench is now CURATED per-lineup — player explicitly selects which followers,
  // augmentations, and relics ride along with this plan.
  const benchFollowerIds = current?.benchFollowers || [];
  const benchAugIds      = current?.benchAugments  || [];
  const benchRelicIds    = current?.benchRelics    || [];
  // Carry Relic — separate single-relic slot taken into the match (independent of loadout).
  const carryRelicId     = current?.carryRelicId   || null;

  // Available pools (everything the player owns — what the picker draws from)
  const augInventory  = run.augInventory  || [];
  const relicsOwned   = run.relicsOwned   || [];
  // All augs the player has access to (unequipped + equipped, like ItemTab does)
  const allOwnedAugIds = React.useMemo(() => {
    const ids = new Set([
      ...augInventory,
      ...roster.flatMap(f => Object.values(f.augments || {}).filter(Boolean)),
    ]);
    return [...ids];
  }, [augInventory, roster]);

  // Followers actually on the bench (explicit selection, minus those deployed on board)
  const placedIds = new Set(Object.values(board));
  const benchFollowers = roster.filter(f =>
    benchFollowerIds.includes(f.instanceId) && !placedIds.has(f.instanceId)
  );
  const benchAugs   = benchAugIds.map(id => AUGMENTATIONS.find(a => a.id === id)).filter(Boolean);
  const benchRelics = benchRelicIds.map(id => OP_RELICS.find(r => r.id === id)).filter(Boolean);
  const carryRelic  = carryRelicId ? OP_RELICS.find(r => r.id === carryRelicId) : null;
  const setCarryRelic = (id) => updateCurrent(() => ({ carryRelicId: id || null }));

  const [dragId, setDragId] = React.useState(null);
  // Picker modal state — which kind ('follower'|'augment'|'relic'|null)
  const [pickerKind, setPickerKind] = React.useState(null);

  const setBenchKey = (key, ids) => updateCurrent(() => ({ [key]: ids }));

  const removeFromBench = (kind, id) => {
    if (kind === 'follower') {
      // Also yank off the board if deployed
      updateCurrent(cur => {
        const b = { ...cur.board };
        for (const k of Object.keys(b)) if (b[k] === id) delete b[k];
        return {
          board: b,
          benchFollowers: (cur.benchFollowers || []).filter(x => x !== id),
        };
      });
    } else if (kind === 'augment') {
      setBenchKey('benchAugments', benchAugIds.filter(x => x !== id));
    } else if (kind === 'relic') {
      setBenchKey('benchRelics', benchRelicIds.filter(x => x !== id));
    }
  };

  const autoFill = () => {
    if (!current) return;
    // Auto-fill respects the bench: only deploys from curated bench followers.
    const backRow  = 0;
    const frontRow = 1;
    const pool = roster.filter(f => benchFollowerIds.includes(f.instanceId));
    const majors = pool.filter(f => f.archetype !== 'larva').slice(0, width);
    const larvae = pool.filter(f => f.archetype === 'larva').slice(0, width);
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
    <div style={{ position:'relative', height:'100%',
      display:'flex', flexDirection:'column', overflow:'hidden',
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
        <div style={{ flex:1, minHeight:0, padding:'80px 40px', textAlign:'center', overflowY:'auto' }}>
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
        <div key={`${width}-${selIdx}`} className="tab-in" style={{ flex:1, minHeight:0, display:'grid',
          gridTemplateColumns:'260px 1fr 540px', gap:14, padding:'24px 28px',
          overflow:'hidden' }}>
          {/* === DEPLOYED ROSTER (left of board) === */}
          <div style={{
            background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
            border:'1px solid var(--abyss-3)', padding:'12px',
            display:'flex', flexDirection:'column', gap:10,
            overflow:'hidden', minHeight:0,
          }}>
            <div>
              <div className="caps" style={{ marginBottom:4 }}>On Field</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                letterSpacing:'0.2em' }}>
                {placedCount}/{active.cap} DEPLOYED
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5,
              padding:6, border:'1px dashed var(--abyss-4)', minHeight:80 }}>
              {placedCount === 0 && (
                <div style={{ padding:'14px 8px', textAlign:'center', color:'var(--bone-dim)',
                  fontStyle:'italic', fontSize:11, fontFamily:'Cormorant Garamond, serif' }}>
                  No followers deployed yet.
                </div>
              )}
              {Object.entries(board).map(([sqId, instId]) => {
                const f = roster.find(x => x.instanceId === instId);
                if (!f) return null;
                const a = FOLLOWER_ARCHETYPES[f.archetype];
                // Parse rank/col from "rNcM"
                const m = sqId.match(/r(\d+)c(\d+)/);
                const rank = m ? (m[1] === '0' ? 'BACK' : 'FRONT') : '';
                const col = m ? `C${parseInt(m[2],10)+1}` : '';
                return (
                  <div key={sqId}
                    style={{
                      display:'flex', alignItems:'center', gap:8, padding:'7px 9px',
                      background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                      borderLeft:`3px solid ${a.color}`,
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
                    <button onClick={()=>removeFromBench('follower', instId)}
                      title="Remove from this lineup"
                      style={{ background:'transparent', border:'none', cursor:'pointer',
                        color:'var(--bone-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:13,
                        padding:'2px 4px' }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === BOARD (center) === */}
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

            {/* === CARRY RELIC SLOT — single relic carried into the match,
                separate from the loadout's relic list. === */}
            <CarryRelicSlot
              relic={carryRelic}
              onChoose={()=>setPickerKind('carry-relic')}
              onClear={()=>setCarryRelic(null)}
            />

            <BoardGrid
              width={width} fullH={active.fullH} lineup={board}
              roster={roster} onSetSquare={setSquare}
              dragId={dragId} setDragId={setDragId}
              color={active.color}
            />

            <div style={{ marginTop:14, fontFamily:'JetBrains Mono, monospace', fontSize:10,
              color:'var(--bio-dim)', letterSpacing:'0.2em' }}>
              {placedCount}/{active.cap} DEPLOYED · {benchFollowers.length} ON BENCH · {benchAugs.length} AUG · {benchRelics.length} RELIC
            </div>
            <div style={{ marginTop:8, fontFamily:'Cormorant Garamond, serif', fontSize:13,
              color:'var(--bone-dim)', fontStyle:'italic', textAlign:'center', maxWidth:480, lineHeight:1.5 }}>
              Drag a follower from the bench onto a square. Empty squares are drawn from reserves when the tide begins.
            </div>
          </div>

          {/* === SUPPORT SQUAD (right) — followers + augments + relics, one group
              riding along with this plan === */}
          <div style={{
            display:'flex', flexDirection:'column', gap:10,
            background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
            border:'1px solid var(--abyss-3)', padding:'12px',
            overflow:'hidden', minHeight:0,
          }}>
            <div>
              <div className="caps" style={{ marginBottom:4 }}>Support Squad</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                letterSpacing:'0.2em' }}>
                FOLLOWERS · AUG · RELIC — RIDES WITH THIS PLAN
              </div>
            </div>

            <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {/* Augments + Relics */}
              <div style={{ display:'flex', flexDirection:'column', gap:12, overflowY:'auto', minHeight:0 }}>
                <BenchPanelSide
                  inline
                  sections={[
                    { kind:'augment', title:'Augmentations', glyph:'⊕',
                      accent:'oklch(0.7 0.13 195)', items:benchAugs,
                      onAdd:()=>setPickerKind('augment'),
                      emptyHint:'No augmentations in the squad.' },
                    { kind:'relic', title:'Relics', glyph:'✠',
                      accent:'var(--brass)', items:benchRelics,
                      onAdd:()=>setPickerKind('relic'),
                      emptyHint:'No relics in the squad.' },
                  ]}
                  onRemove={removeFromBench}
                />
              </div>

              {/* Followers (drag to deploy) */}
              <div style={{ display:'flex', flexDirection:'column', gap:10,
                borderLeft:'1px solid var(--abyss-3)', paddingLeft:10, minHeight:0 }}>
                <BenchPanelFollowers
                inline
                color={active.color}
                benchFollowers={benchFollowers}
                dragId={dragId} setDragId={setDragId}
                onAdd={()=>setPickerKind('follower')}
                onRemove={(id)=>removeFromBench('follower', id)}
                onUnplaceDrop={(id) => {
                  updateCurrent(cur => {
                    const b = { ...cur.board };
                    for (const k of Object.keys(b)) if (b[k] === id) delete b[k];
                    return { board: b };
                  });
                  setDragId(null);
                }}
              />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === BENCH PICKER MODAL === */}
      {pickerKind && current && (
        <BenchPicker
          kind={pickerKind}
          color={active.color}
          roster={roster}
          allOwnedAugIds={allOwnedAugIds}
          relicsOwned={relicsOwned}
          augStatus={(augId) => {
            for (const f of roster) {
              for (const [slot, id] of Object.entries(f.augments || {})) {
                if (id === augId) return { state:'grafted', follower:f, slot };
              }
            }
            return { state:'inventory' };
          }}
          initialSelected={
            pickerKind === 'follower'    ? benchFollowerIds :
            pickerKind === 'augment'     ? benchAugIds      :
            pickerKind === 'relic'       ? benchRelicIds    :
            pickerKind === 'carry-relic' ? (carryRelicId ? [carryRelicId] : []) :
                                           []
          }
          single={pickerKind === 'carry-relic'}
          onCancel={()=>setPickerKind(null)}
          onAccept={(ids) => {
            if (pickerKind === 'follower') {
              // Drop board placements for any followers no longer on bench
              updateCurrent(cur => {
                const b = { ...cur.board };
                for (const k of Object.keys(b)) {
                  if (!ids.includes(b[k])) delete b[k];
                }
                return { board: b, benchFollowers: ids };
              });
            } else if (pickerKind === 'augment') {
              setBenchKey('benchAugments', ids);
            } else if (pickerKind === 'relic') {
              setBenchKey('benchRelics', ids);
            } else if (pickerKind === 'carry-relic') {
              setCarryRelic(ids[0] || null);
            }
            setPickerKind(null);
          }}
        />
      )}
    </div>
  );
};

// --- Carry Relic slot: a single-relic chooser that sits between the title bar
// and the board. The relic stored here is INDEPENDENT of the loadout's relics —
// it represents a single artifact carried into the next match.
const CarryRelicSlot = ({ relic, onChoose, onClear }) => {
  const accent = 'var(--brass)';
  return (
    <div style={{
      width:'100%', marginBottom:14, padding:'8px 12px',
      display:'flex', alignItems:'center', gap:12,
      background:'linear-gradient(90deg, var(--abyss-1), var(--abyss-0))',
      border:`1px solid ${relic ? accent : 'var(--abyss-3)'}`,
      borderLeft:`3px solid ${accent}`,
    }}>
      <div style={{ display:'flex', flexDirection:'column', gap:1, minWidth:90 }}>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
          color:'var(--bone-dim)', letterSpacing:'0.25em', textTransform:'uppercase' }}>
          ⚑ Carry Relic
        </span>
        <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:10,
          color:'var(--bone-dim)', fontStyle:'italic' }}>
          1 relic into the match
        </span>
      </div>

      {relic ? (
        <>
          <div style={{ fontSize:22, fontFamily:'Cinzel, serif', color:accent,
            textShadow:`0 0 10px ${accent}`, width:28, textAlign:'center' }}>
            {relic.glyph}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {relic.name}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
              color:'var(--bone-dim)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              T{relic.tier} · {relic.rarity}
            </div>
          </div>
          <button className="btn ghost sm" onClick={onChoose} title="Change carry relic">
            ⇄ Change
          </button>
          <button onClick={onClear} title="Clear carry relic"
            style={{ background:'transparent', border:'none', cursor:'pointer',
              color:'var(--bone-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:14,
              padding:'2px 6px' }}>×</button>
        </>
      ) : (
        <>
          <div style={{ flex:1, fontFamily:'Cormorant Garamond, serif', fontSize:13,
            color:'var(--bone-dim)', fontStyle:'italic' }}>
            None chosen — march in unburdened, or pick one to bring.
          </div>
          <button onClick={onChoose}
            style={{
              padding:'5px 12px', cursor:'pointer',
              background:'transparent', border:`1px dashed ${accent}`,
              color:accent, fontFamily:'JetBrains Mono, monospace', fontSize:9,
              letterSpacing:'0.22em', textTransform:'uppercase',
            }}>
            + Choose Relic
          </button>
        </>
      )}
    </div>
  );
};

// --- Board Grid: renders just the two placement ranks (back + front) for the
// active formation — width × 2 cells. There are no hatched / out-of-bounds rows,
// since the player can only deploy onto these two ranks anyway.
const BoardGrid = ({ width, fullH, lineup, roster, onSetSquare, dragId, setDragId, color }) => {
  const rows = 2;                                      // back rank + front rank only
  const backRow  = 0;
  const frontRow = 1;
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

  const cells = [];
  for (let r=0; r<rows; r++) {
    for (let c=0; c<width; c++) {
      const isPlaceable = r === backRow || r === frontRow;
      cells.push({ r, c, isPlaceable, id:`r${r}c${c}` });
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
        display:'inline-grid',
        gridTemplateColumns:`repeat(${width}, ${cell}px)`,
        gridTemplateRows:`repeat(${rows}, ${cell}px)`,
        border:`1px solid ${color}`,
        boxShadow:`0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6), 0 0 30px ${color}33`,
        background:'var(--abyss-1)',
        position:'relative',
      }}>
        {cells.map(sq => {
          const dark = (sq.r + sq.c) % 2 === 1;
          const isPlaceable = sq.isPlaceable;
          const isOutOfBounds = !isPlaceable;
          const occId = isPlaceable ? lineup[sq.id] : null;
          const occ = occId ? lookup(occId) : null;
          const a = occ ? FOLLOWER_ARCHETYPES[occ.archetype] : null;
          const rowLabel = sq.r === backRow ? 'BACK' : sq.r === frontRow ? 'FRONT' : '';
          const isFirstCol = sq.c === 0;
          const isMidLineAnchor = isPlaceable && sq.r === frontRow && sq.c === 0;

          return (
            <div key={sq.id}
              onDragOver={e => { if (isPlaceable) e.preventDefault(); }}
              onDrop={handleDrop(sq.id, isPlaceable)}
              style={{
                width:cell, height:cell, position:'relative',
                background: isOutOfBounds
                  ? `repeating-linear-gradient(45deg,
                      oklch(0.09 0.015 220) 0 6px,
                      oklch(0.12 0.02 220) 6px 12px)`
                  : (dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)'),
                display:'grid', placeItems:'center',
                borderRight: sq.c===width-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
                borderBottom: sq.r===rows-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
                opacity: isOutOfBounds ? 0.4 : 1,
                transition:'background 0.15s',
                cursor: isPlaceable && !occ ? 'default' : (occ ? 'pointer' : 'not-allowed'),
              }}
              onClick={()=> occ && onSetSquare(sq.id, null)}
              title={occ ? `${occ.name} — click to clear` : (isPlaceable ? `${rowLabel} rank · column ${sq.c+1}` : 'Out of bounds — not deployable')}
            >
              {/* Rank label at the leftmost column of placement rows */}
              {isFirstCol && isPlaceable && rowLabel && (
                <div style={{ position:'absolute', left:-30, top:'50%', transform:'translateY(-50%)',
                  fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
                  letterSpacing:'0.2em' }}>
                  {rowLabel}
                </div>
              )}

              {/* Mid-line marker below the front rank, spanning the placement width */}
              {isMidLineAnchor && (
                <div style={{ position:'absolute', bottom:-1, left:0, height:1,
                  background:`linear-gradient(90deg, transparent, ${color}, transparent)`,
                  width:`${width*cell}px`, pointerEvents:'none' }}/>
              )}

              {/* Out-of-bounds cell glyph */}
              {isOutOfBounds && (
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

      {/* Footer — formation hint */}
      <div style={{ marginTop:6, textAlign:'center',
        fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
        letterSpacing:'0.25em' }}>
        ◈ {width}×{fullH} formation · Deploy 2 ranks of {width} ◈
      </div>
    </div>
  );
};

window.LineupTab = LineupTab;

// =============================================================================
// BENCH PANELS — Followers on the right, Augmentations + Relics on the left.
// Both share the same chrome via <BenchSection>.
// =============================================================================
const BenchPanelFollowers = ({
  color, benchFollowers, dragId, setDragId, onAdd, onRemove, onUnplaceDrop, inline,
}) => {
  const body = (
    <BenchSection
      title="Bench" glyph="♟" accent={color}
      count={benchFollowers.length}
      onAdd={onAdd}
      emptyHint="No followers benched. Tap + Add to choose."
      grow
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain') || dragId;
        if (id) onUnplaceDrop(id);
      }}
    >
      {benchFollowers.map(f => {
        const a = FOLLOWER_ARCHETYPES[f.archetype];
        return (
          <div key={f.instanceId} className="hoverable"
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
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
                {a.role} · E{f.evoTier}
              </div>
            </div>
            <button onClick={()=>onRemove(f.instanceId)}
              title="Remove from bench"
              style={{ background:'transparent', border:'none', cursor:'pointer',
                color:'var(--bone-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:14,
                padding:'2px 4px' }}>×</button>
          </div>
        );
      })}
    </BenchSection>
  );

  if (inline) return body;

  return (
    <div style={{
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      border:'1px solid var(--abyss-3)', padding:'14px',
      maxHeight:'70vh', display:'flex', flexDirection:'column', gap:12,
      overflowY:'auto',
    }}>
      <div>
        <div className="caps" style={{ marginBottom:4 }}>Bench · Followers</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em' }}>
          DRAG ONTO THE BOARD TO DEPLOY
        </div>
      </div>
      {body}
    </div>
  );
};

const BenchPanelSide = ({ sections, onRemove, inline }) => {
  const body = sections.map(sec => (
      <BenchSection key={sec.kind}
        title={sec.title} glyph={sec.glyph} accent={sec.accent}
        count={sec.items.length} onAdd={sec.onAdd}
        emptyHint={sec.emptyHint}>
        {sec.items.map(item => {
          if (sec.kind === 'augment') {
            const slot = AUG_SLOTS.find(s => s.id === item.slot);
            return (
              <div key={item.id}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                  background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                  borderLeft:`3px solid ${slot?.color || 'var(--bone-dim)'}`,
                }}>
                <div style={{ fontSize:18, fontFamily:'Cinzel, serif',
                  color: slot?.color || 'var(--bone-dim)',
                  width:24, textAlign:'center' }}>{slot?.glyph || '⊕'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                    color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
                    {slot?.label || item.slot} · T{item.tier}
                  </div>
                </div>
                <button onClick={()=>onRemove('augment', item.id)}
                  title="Remove from bench"
                  style={{ background:'transparent', border:'none', cursor:'pointer',
                    color:'var(--bone-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:14,
                    padding:'2px 4px' }}>×</button>
              </div>
            );
          }
          // relic
          return (
            <div key={item.id}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                borderLeft:`3px solid var(--brass)`,
              }}>
              <div style={{ fontSize:20, fontFamily:'Cinzel, serif', color:'var(--brass)',
                width:24, textAlign:'center' }}>{item.glyph}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                  color:'var(--bone-dim)', letterSpacing:'0.15em', textTransform:'uppercase' }}>
                  T{item.tier} · {item.rarity}
                </div>
              </div>
              <button onClick={()=>onRemove('relic', item.id)}
                title="Remove from bench"
                style={{ background:'transparent', border:'none', cursor:'pointer',
                  color:'var(--bone-dim)', fontFamily:'JetBrains Mono, monospace', fontSize:14,
                  padding:'2px 4px' }}>×</button>
            </div>
          );
        })}
      </BenchSection>
    ));

  if (inline) return <>{body}</>;

  return (
    <div style={{
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      border:'1px solid var(--abyss-3)', padding:'14px',
      maxHeight:'70vh', display:'flex', flexDirection:'column', gap:14,
      overflowY:'auto',
    }}>
      <div>
        <div className="caps" style={{ marginBottom:4 }}>Bench · Loadout</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em' }}>
          ITEMS RIDING ALONG WITH THIS PLAN
        </div>
      </div>
      {body}
    </div>
  );
};

const BenchSection = ({ title, glyph, accent, count, onAdd, children, emptyHint, onDrop, grow }) => (
  <div style={grow ? { flex:1, display:'flex', flexDirection:'column', minHeight:0 } : undefined}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      marginBottom:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:accent,
          textShadow:`0 0 8px ${accent}` }}>{glyph}</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color:'var(--bone)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>{title}</span>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
          color:'var(--bone-dim)', letterSpacing:'0.18em' }}>· {count}</span>
      </div>
      <button onClick={onAdd}
        style={{
          padding:'4px 10px', cursor:'pointer',
          background:'transparent', border:`1px dashed ${accent}`,
          color:accent, fontFamily:'JetBrains Mono, monospace', fontSize:9,
          letterSpacing:'0.22em', textTransform:'uppercase',
        }}>
        + Add
      </button>
    </div>
    <div
      onDragOver={onDrop ? (e)=>e.preventDefault() : undefined}
      onDrop={onDrop}
      style={{ display:'flex', flexDirection:'column', gap:5,
        padding:6, border:'1px dashed var(--abyss-4)', minHeight:60,
        flex: onDrop ? 1 : 'initial', overflowY: onDrop ? 'auto' : 'visible' }}>
      {React.Children.count(children) === 0 ? (
        <div style={{ padding:'14px 8px', textAlign:'center', color:'var(--bone-dim)',
          fontStyle:'italic', fontSize:11, fontFamily:'Cormorant Garamond, serif' }}>
          {emptyHint}
        </div>
      ) : children}
    </div>
  </div>
);

// =============================================================================
// BENCH PICKER MODAL — checkbox list, Accept commits, Cancel discards
// =============================================================================
const BenchPicker = ({
  kind, color, roster, allOwnedAugIds, relicsOwned, augStatus,
  initialSelected, onAccept, onCancel, single,
}) => {
  const [selected, setSelected] = React.useState(new Set(initialSelected));
  window.useEscClose(onCancel);
  const toggle = (id) => {
    setSelected(prev => {
      // Single-select: clicking an item replaces the selection (or clears it if already selected).
      if (single) {
        if (prev.has(id)) return new Set();
        return new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const meta = {
    follower:      { title:'Choose Followers', accent: color,                glyph:'♟',
      hint:'Tick the followers you want available on this plan’s bench.' },
    augment:       { title:'Choose Augmentations', accent:'oklch(0.7 0.13 195)', glyph:'⊕',
      hint:'Tick the augmentations to ride along with this plan.' },
    relic:         { title:'Choose Relics',    accent:'var(--brass)',         glyph:'✠',
      hint:'Tick the relics to carry on this plan.' },
    'carry-relic': { title:'Carry Relic',      accent:'var(--brass)',         glyph:'⚑',
      hint:'Pick exactly one relic to take into the match (separate from loadout).' },
  }[kind];

  // Build option rows depending on kind
  let rows = [];
  if (kind === 'follower') {
    rows = roster.map(f => {
      const a = FOLLOWER_ARCHETYPES[f.archetype];
      const auged = Object.values(f.augments || {}).filter(Boolean).length;
      return {
        id: f.instanceId,
        title: f.name,
        sub: `${a.role} · EVO·${f.evoTier} · AUG·${auged}/${f.augSlotCount ?? 5}`,
        glyph: a.glyph, color: a.color,
      };
    });
  } else if (kind === 'augment') {
    rows = allOwnedAugIds
      .map(id => AUGMENTATIONS.find(a => a.id === id))
      .filter(Boolean)
      .map(aug => {
        const slot = AUG_SLOTS.find(s => s.id === aug.slot);
        const st = augStatus(aug.id);
        const tag = st.state === 'grafted'
          ? `${slot?.label || aug.slot} · T${aug.tier} · GRAFTED · ${st.follower.name}`
          : `${slot?.label || aug.slot} · T${aug.tier} · IN HOLD`;
        return {
          id: aug.id, title: aug.name, sub: tag,
          glyph: slot?.glyph || '⊕',
          color: slot?.color || 'var(--brass)',
          desc: aug.effect,
        };
      });
  } else if (kind === 'relic' || kind === 'carry-relic') {
    rows = relicsOwned
      .map(id => OP_RELICS.find(r => r.id === id))
      .filter(Boolean)
      .map(rel => ({
        id: rel.id, title: rel.name,
        sub: `T${rel.tier} · ${rel.rarity.toUpperCase()}`,
        glyph: rel.glyph, color:'var(--brass)',
        desc: rel.desc,
      }));
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:560 }}>
        <div className="eyebrow" style={{ color: meta.accent }}>
          {meta.glyph} · Bench Selection
        </div>
        <h2 style={{ margin:'6px 0 4px', fontSize:24, fontFamily:'Cinzel, serif',
          color:'var(--bone)' }}>
          {meta.title}
        </h2>
        <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:6,
          fontFamily:'Cormorant Garamond, serif' }}>
          {meta.hint}
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)',
          letterSpacing:'0.2em', marginBottom:14 }}>
          ‣ {selected.size} SELECTED · {rows.length} AVAILABLE
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6,
          maxHeight:420, overflowY:'auto', padding:'2px' }}>
          {rows.length === 0 && (
            <div style={{ padding:'30px 16px', textAlign:'center',
              border:'1px dashed var(--abyss-4)',
              fontFamily:'Cormorant Garamond, serif', fontStyle:'italic',
              color:'var(--bone-dim)', fontSize:13 }}>
              {kind === 'follower' ? 'No followers in roster yet.'
                : kind === 'augment' ? 'No augmentations owned yet.'
                : kind === 'carry-relic' ? 'No relics owned to carry.'
                : 'No relics owned yet.'}
            </div>
          )}
          {rows.map(row => {
            const isOn = selected.has(row.id);
            return (
              <div key={row.id} className="hoverable" onClick={()=>toggle(row.id)}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                  background: isOn
                    ? `linear-gradient(90deg, ${meta.accent.replace(')',' / 0.14)')}, var(--abyss-2))`
                    : 'var(--abyss-1)',
                  border:'1px solid', borderColor: isOn ? meta.accent : 'var(--abyss-3)',
                  cursor:'pointer', transition:'all 0.12s',
                }}>
                {/* Checkbox */}
                <div style={{
                  width:18, height:18, flexShrink:0,
                  border:`1px solid ${isOn ? meta.accent : 'var(--abyss-4)'}`,
                  background: isOn ? meta.accent : 'transparent',
                  display:'grid', placeItems:'center',
                  fontFamily:'Cinzel, serif', fontSize:12,
                  color: isOn ? 'var(--abyss-0)' : 'transparent',
                }}>✓</div>
                <div style={{ fontSize:22, fontFamily:'Cinzel, serif', color:row.color,
                  textShadow: isOn ? `0 0 8px ${row.color}` : 'none',
                  width:28, textAlign:'center', flexShrink:0 }}>
                  {row.glyph}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:13,
                    color:'var(--bone)', letterSpacing:'0.04em',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {row.title}
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                    color:'var(--bone-dim)', letterSpacing:'0.15em', marginTop:3,
                    textTransform:'uppercase' }}>
                    {row.sub}
                  </div>
                  {row.desc && (
                    <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11,
                      color:'var(--bone-dim)', fontStyle:'italic', marginTop:4, lineHeight:1.4 }}>
                      {row.desc}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginTop:16, gap:10 }}>
          <div style={{ display:'flex', gap:6 }}>
            {!single && (
              <button className="btn ghost sm"
                onClick={()=>setSelected(new Set(rows.map(r=>r.id)))}
                disabled={rows.length===0}>
                Select All
              </button>
            )}
            <button className="btn ghost sm"
              onClick={()=>setSelected(new Set())}
              disabled={selected.size===0}>
              Clear
            </button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
            <button
              onClick={()=>onAccept([...selected])}
              style={{
                padding:'7px 18px', cursor:'pointer',
                background:`linear-gradient(180deg, ${meta.accent.replace(')',' / 0.22)')}, var(--abyss-2))`,
                border:`1px solid ${meta.accent}`,
                color: meta.accent,
                fontFamily:'JetBrains Mono, monospace', fontSize:10,
                letterSpacing:'0.25em', textTransform:'uppercase',
              }}>
              ✓ Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.LineupTab = LineupTab;