// Manage Followers — roster, deployment pool, augmentation slots, relics picker
const ManageFollower = ({ run, setRun, go }) => {
  const roster = run.roster || [];
  const [selId, setSelId] = React.useState(roster[0]?.instanceId || null);
  const sel = roster.find(f => f.instanceId === selId) || roster[0];
  const [tab, setTab] = React.useState('augments'); // augments | relics
  const [augPickerSlot, setAugPickerSlot] = React.useState(null);

  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;
  const evoData = sel ? EVOLUTION[sel.archetype][sel.evoTier] : null;

  // Deployment
  const inPool = roster.filter(f => f.inPool);
  const poolCap = 20;
  const togglePool = (id) => {
    setRun(r => ({
      ...r,
      roster: r.roster.map(f => f.instanceId === id ? {...f, inPool: !f.inPool && (r.roster.filter(x=>x.inPool).length < poolCap || f.inPool) } : f)
    }));
  };

  // Augmentation install/remove
  const installAug = (slot, augId) => {
    setRun(r => ({
      ...r,
      roster: r.roster.map(f =>
        f.instanceId === selId
          ? { ...f, augments: {...f.augments, [slot]: augId} }
          : f
      ),
      // Remove from inventory
      augInventory: (r.augInventory || []).filter((_, i, arr) => {
        const idx = arr.findIndex(a => a === augId);
        return i !== idx;
      }),
    }));
    setAugPickerSlot(null);
  };
  const removeAug = (slot) => {
    const current = sel?.augments?.[slot];
    if (!current) return;
    setRun(r => ({
      ...r,
      roster: r.roster.map(f =>
        f.instanceId === selId
          ? { ...f, augments: {...f.augments, [slot]: null} }
          : f
      ),
      augInventory: [...(r.augInventory || []), current],
    }));
  };

  // Relics loadout
  const relicsOwned = run.relicsOwned || [];
  const relicsLoadout = run.relicsLoadout || [];
  const relicCap = 3;
  const toggleRelic = (id) => {
    setRun(r => {
      const load = r.relicsLoadout || [];
      if (load.includes(id)) return { ...r, relicsLoadout: load.filter(x => x !== id) };
      if (load.length >= relicCap) return r;
      return { ...r, relicsLoadout: [...load, id] };
    });
  };

  // Augmentation inventory (available to install)
  const augInventory = run.augInventory || [];
  const augLoadout = run.augLoadout || [];
  const augLoadoutCap = 5;
  const augsOfSlot = (slot) => augInventory
    .map(id => AUGMENTATIONS.find(a => a.id === id))
    .filter(a => a && a.slot === slot);

  // Check where each aug-id currently is: 'grafted' (+ which follower), 'loadout', 'inventory'
  const augStatus = (augId) => {
    for (const f of roster) {
      for (const [slot, id] of Object.entries(f.augments || {})) {
        if (id === augId) return { state:'grafted', follower:f, slot };
      }
    }
    if (augLoadout.includes(augId)) return { state:'loadout' };
    return { state:'inventory' };
  };

  // Toggle an aug into/out of the carry-loadout (only allowed if it's in inventory, not grafted)
  const toggleAugLoadout = (augId) => {
    const st = augStatus(augId);
    if (st.state === 'grafted') return;
    setRun(r => {
      const load = r.augLoadout || [];
      if (load.includes(augId)) return { ...r, augLoadout: load.filter(x => x !== augId) };
      if (load.length >= augLoadoutCap) return r;
      return { ...r, augLoadout: [...load, augId] };
    });
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-follower" subtitle="Medical Bay · Vivisection Theatre"/>

      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0,
        display:'grid', gridTemplateColumns:'320px 1fr 340px', gap:0 }}>

        {/* === LEFT: Roster list === */}
        <div style={{
          borderRight:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          overflowY:'auto', padding:'16px 12px',
        }}>
          <div style={{ padding:'4px 8px 10px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div className="caps">Brood Roster</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)' }}>
              {roster.length} souls
            </div>
          </div>
          <div style={{ padding:'0 8px 10px', fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em' }}>
            DEPLOYED · {inPool.length}/{poolCap}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {roster.map(f => {
              const a = FOLLOWER_ARCHETYPES[f.archetype];
              const evo = EVOLUTION[f.archetype][f.evoTier];
              const isSel = f.instanceId === selId;
              const auged = Object.values(f.augments).filter(Boolean).length;
              return (
                <div key={f.instanceId}
                  onClick={()=>setSelId(f.instanceId)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 12px', cursor:'pointer',
                    background: isSel
                      ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))'
                      : 'var(--abyss-1)',
                    border:'1px solid',
                    borderColor: isSel ? a.color : 'var(--abyss-3)',
                    borderLeft: isSel ? `3px solid ${a.color}` : '3px solid transparent',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ fontSize:24, fontFamily:'Cinzel, serif', width:32, textAlign:'center',
                    color: a.color,
                    textShadow: isSel ? `0 0 12px ${a.color}` : 'none' }}>{a.glyph}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', letterSpacing:'0.05em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {f.name}
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:3, fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.1em' }}>
                      <span>EVO·{f.evoTier}</span>
                      <span>AUG·{auged}/5</span>
                      <span>{a.role.slice(0,4).toUpperCase()}</span>
                    </div>
                  </div>
                  {/* deployment checkbox */}
                  <div onClick={(e)=>{e.stopPropagation(); togglePool(f.instanceId);}}
                    title="Toggle deployment"
                    style={{
                      width:22, height:22, flexShrink:0,
                      border:`1px solid ${f.inPool ? 'var(--brass)' : 'var(--abyss-4)'}`,
                      background: f.inPool ? 'var(--brass-deep)' : 'transparent',
                      display:'grid', placeItems:'center',
                      fontFamily:'Cinzel, serif', fontSize:14,
                      color: f.inPool ? 'var(--abyss-0)' : 'transparent',
                      cursor:'pointer',
                    }}>
                    ✓
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === CENTER: Selected follower detail === */}
        <div style={{ padding:'24px 32px', overflowY:'auto' }}>
          {!sel && <div style={{ color:'var(--bone-dim)', textAlign:'center', paddingTop:60 }}>No follower selected.</div>}
          {sel && arch && (
            <>
              {/* header */}
              <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20 }}>
                {/* portrait */}
                <div style={{
                  width:160, height:200, flexShrink:0, position:'relative',
                  background:`linear-gradient(180deg, var(--abyss-3), var(--abyss-0))`,
                  border:'1px solid var(--brass-deep)',
                }}>
                  <FollowerPortrait arch={arch} evoTier={sel.evoTier}/>
                  <div style={{ position:'absolute', top:6, left:6, right:6,
                    fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bio-dim)',
                    letterSpacing:'0.2em', textTransform:'uppercase',
                    background:'rgba(0,0,0,0.6)', padding:'2px 5px', textAlign:'center' }}>
                    Specimen · {sel.instanceId}
                  </div>
                </div>
                {/* info */}
                <div style={{ flex:1 }}>
                  <div className="eyebrow" style={{ color: arch.color }}>{arch.role} · Evolution {sel.evoTier}</div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:32, color:'var(--bone)', letterSpacing:'0.04em', marginTop:4 }}>
                    {sel.name}
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic', color:'var(--bone-dim)', marginTop:4 }}>
                    &ldquo;{evoData.name}&rdquo;
                  </div>
                  <div style={{ display:'flex', gap:18, marginTop:14, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>
                    <Stat2 label="Vigor" value={`${arch.baseHp + sel.evoTier} ♥`}/>
                    <Stat2 label="Pattern" value={arch.baseMove}/>
                    <Stat2 label="Deploy" value={sel.inPool ? '◆ Assigned' : '— Held ashore'}/>
                  </div>
                  <div style={{ marginTop:14, padding:'10px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                    fontSize:13, color:'var(--bone)', lineHeight:1.5, fontStyle:'italic' }}>
                    {evoData.effect}
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:14 }}>
                    <button className="btn sm" onClick={()=>go('op-evolve')}>⇒ Evolution Chamber</button>
                    <button className="btn sm ghost" onClick={()=>togglePool(sel.instanceId)}>
                      {sel.inPool ? 'Withdraw from Deployment' : 'Assign to Deployment'}
                    </button>
                  </div>
                </div>
              </div>

              {/* tab switcher */}
              <div style={{ display:'flex', gap:0, marginBottom:14, borderBottom:'1px solid var(--abyss-3)' }}>
                {[{id:'augments',label:'Augmentations · 5 Ports'},{id:'bio',label:'Biography & Patterns'}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    style={{
                      padding:'10px 18px', background:'transparent',
                      border:'none', borderBottom:`2px solid ${tab===t.id?'var(--brass)':'transparent'}`,
                      color: tab===t.id?'var(--brass)':'var(--bone-dim)', cursor:'pointer',
                      fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase',
                    }}>{t.label}</button>
                ))}
              </div>

              {tab==='augments' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
                    {AUG_SLOTS.map(slot => {
                      const installedId = sel.augments[slot.id];
                      const aug = installedId ? AUGMENTATIONS.find(a=>a.id===installedId) : null;
                      return (
                        <div key={slot.id}
                          style={{
                            background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                            border:`1px solid ${aug ? slot.color : 'var(--abyss-3)'}`,
                            padding:'12px 10px', position:'relative',
                            minHeight:140,
                            boxShadow: aug ? `inset 0 0 20px ${slot.color.replace(')', ' / 0.15)')}` : 'none',
                          }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                            <span style={{ fontSize:16, color: slot.color, fontFamily:'Cinzel, serif' }}>{slot.glyph}</span>
                            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:slot.color, letterSpacing:'0.2em', textTransform:'uppercase' }}>
                              {slot.label}
                            </div>
                          </div>
                          {aug ? (
                            <>
                              <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', letterSpacing:'0.04em', lineHeight:1.2 }}>
                                {aug.name}
                              </div>
                              <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:3, fontFamily:'JetBrains Mono, monospace' }}>
                                Tier {aug.tier}
                              </div>
                              <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:6, lineHeight:1.4, fontStyle:'italic' }}>
                                {aug.effect}
                              </div>
                              <button onClick={()=>removeAug(slot.id)}
                                style={{
                                  position:'absolute', right:4, top:4, border:'none', background:'transparent',
                                  color:'var(--bone-dim)', cursor:'pointer', fontSize:12, padding:'2px 6px',
                                }} title="Remove">×</button>
                            </>
                          ) : (
                            <button
                              onClick={()=>setAugPickerSlot(slot.id)}
                              style={{
                                position:'absolute', inset:36, border:`1px dashed var(--abyss-4)`,
                                background:'transparent', color:'var(--bone-dim)',
                                fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em',
                                cursor:'pointer',
                                display:'grid', placeItems:'center',
                              }}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor=slot.color; e.currentTarget.style.color=slot.color;}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--abyss-4)'; e.currentTarget.style.color='var(--bone-dim)';}}
                            >
                              + INSTALL
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop:14, padding:'10px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                    fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
                    ‣ SURGICAL NOTE: Each port of bone accepts only its own category. A Fin-graft cannot be bolted to the Chassis. Do not ask why.
                  </div>
                </div>
              )}

              {tab==='bio' && (
                <div style={{ padding:'14px 18px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
                  <div className="caps" style={{ marginBottom:8 }}>Archetype</div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic', color:'var(--bone-dim)', lineHeight:1.6 }}>
                    {arch.desc}
                  </div>
                  <div className="divider fancy"><span>◈</span></div>
                  <div className="caps" style={{ marginBottom:8 }}>Linear Evolution</div>
                  <div style={{ display:'flex', gap:0 }}>
                    {EVOLUTION[sel.archetype].map((e,i)=>(
                      <div key={i} style={{ flex:1, padding:'10px 12px',
                        border:'1px solid',
                        borderColor: i<=sel.evoTier ? arch.color : 'var(--abyss-3)',
                        background: i===sel.evoTier ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))` : 'var(--abyss-1)',
                        opacity: i>sel.evoTier ? 0.5 : 1,
                      }}>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color: i<=sel.evoTier?arch.color:'var(--bone-dim)', letterSpacing:'0.2em' }}>
                          TIER {i}
                        </div>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', marginTop:2 }}>{e.name}</div>
                        <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:4, lineHeight:1.4 }}>{e.effect}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* === RIGHT: Relics loadout === */}
        <div style={{
          borderLeft:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          padding:'16px', overflowY:'auto',
        }}>
          <div className="caps" style={{ marginBottom:8 }}>Relics Loadout</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em', marginBottom:12 }}>
            {relicsLoadout.length}/{relicCap} CARRIED INTO ASSIGNMENT
          </div>

          {relicsOwned.length === 0 && (
            <div style={{ padding:'20px', textAlign:'center', border:'1px dashed var(--abyss-4)',
              color:'var(--bone-dim)', fontStyle:'italic', fontSize:12, fontFamily:'Cormorant Garamond, serif' }}>
              The reliquary is empty. Visit the Trader to bring flesh into the hold.
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {relicsOwned.map(id => {
              const rel = OP_RELICS.find(r => r.id === id);
              if (!rel) return null;
              const carried = relicsLoadout.includes(id);
              return (
                <div key={id} onClick={()=>toggleRelic(id)}
                  style={{
                    padding:'10px 12px', cursor:'pointer',
                    background: carried ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid',
                    borderColor: carried ? 'var(--brass)' : 'var(--abyss-3)',
                    display:'flex', gap:10, alignItems:'center',
                  }}>
                  <div style={{ fontSize:22, fontFamily:'Cinzel, serif', color: carried?'var(--brass)':'var(--bone-dim)',
                    textShadow: carried ? '0 0 10px var(--brass)':'none' }}>{rel.glyph}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', letterSpacing:'0.05em' }}>{rel.name}</div>
                    <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:3, lineHeight:1.4, fontStyle:'italic' }}>{rel.desc}</div>
                  </div>
                  <div style={{
                    width:18, height:18, border:`1px solid ${carried?'var(--brass)':'var(--abyss-4)'}`,
                    background: carried?'var(--brass-deep)':'transparent',
                    display:'grid', placeItems:'center',
                    fontFamily:'Cinzel, serif', fontSize:11, color: carried?'var(--abyss-0)':'transparent',
                  }}>✓</div>
                </div>
              );
            })}
          </div>

          <div className="divider fancy"><span>◈</span></div>
          {/* === AUGMENTATIONS (carry or grafted) === */}
          <div className="caps" style={{ marginBottom:8 }}>Augmentation Hold</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em', marginBottom:12 }}>
            {augLoadout.length}/{augLoadoutCap} CARRIED · REST IN FLESH
          </div>
          {(() => {
            const allIds = new Set([
              ...augInventory,
              ...augLoadout,
              ...roster.flatMap(f => Object.values(f.augments || {}).filter(Boolean)),
            ]);
            const list = [...allIds]
              .map(id => ({ id, aug: AUGMENTATIONS.find(a=>a.id===id) }))
              .filter(x => x.aug);
            if (list.length === 0) {
              return (
                <div style={{ padding:'16px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                  color:'var(--bone-dim)', fontStyle:'italic', fontSize:12, fontFamily:'Cormorant Garamond, serif' }}>
                  No grafts yet. The Trader may have flesh to sell.
                </div>
              );
            }
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {list.map(({ id, aug }) => {
                  const slot = AUG_SLOTS.find(s => s.id === aug.slot);
                  const st = augStatus(id);
                  const isGrafted = st.state === 'grafted';
                  const isCarried = st.state === 'loadout';
                  const borderColor =
                    isGrafted ? slot.color :
                    isCarried ? 'var(--brass)' :
                    'var(--abyss-3)';
                  const bg =
                    isGrafted ? `linear-gradient(90deg, ${slot.color.replace(')',' / 0.15)')}, var(--abyss-1))` :
                    isCarried ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' :
                    'var(--abyss-1)';
                  const cursor = isGrafted ? 'default' : 'pointer';
                  const title = isGrafted
                    ? `Grafted to ${st.follower.name}. Remove from their port to free it.`
                    : isCarried ? 'Click to uncarry.' : 'Click to carry into next assignment.';
                  return (
                    <div key={id}
                      onClick={()=>toggleAugLoadout(id)}
                      title={title}
                      style={{
                        padding:'8px 10px', cursor,
                        background: bg, border:'1px solid', borderColor,
                        display:'flex', gap:9, alignItems:'flex-start',
                        opacity: isGrafted ? 0.85 : 1,
                      }}>
                      <div style={{ fontSize:18, fontFamily:'Cinzel, serif', color: slot.color,
                        textShadow: (isGrafted||isCarried) ? `0 0 8px ${slot.color}` : 'none',
                        lineHeight:1, paddingTop:2 }}>
                        {slot.glyph}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:6, justifyContent:'space-between' }}>
                          <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)', letterSpacing:'0.03em',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {aug.name}
                          </div>
                          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:slot.color, letterSpacing:'0.15em', flexShrink:0 }}>
                            T{aug.tier}
                          </div>
                        </div>
                        <div style={{ fontSize:9.5, color:'var(--bone-dim)', marginTop:2, lineHeight:1.35, fontStyle:'italic' }}>
                          {aug.effect}
                        </div>
                        <div style={{ marginTop:5, fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em' }}>
                          {isGrafted && (
                            <span style={{ color: slot.color }}>
                              ⊕ GRAFTED · {st.follower.name.toUpperCase()}
                            </span>
                          )}
                          {isCarried && (
                            <span style={{ color:'var(--brass)' }}>◆ CARRIED · NEXT ASSIGNMENT</span>
                          )}
                          {!isGrafted && !isCarried && (
                            <span style={{ color:'var(--bone-dim)' }}>— IN HOLD</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="divider fancy"><span>◈</span></div>
          <button className="btn ghost sm" style={{ width:'100%', justifyContent:'center' }}
            onClick={()=>go('op-command')}>
            ⇒ Command Chamber
          </button>
        </div>
      </div>

      {/* Augmentation picker modal */}
      {augPickerSlot && (
        <div className="modal-backdrop" onClick={()=>setAugPickerSlot(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            {(() => {
              const slot = AUG_SLOTS.find(s => s.id === augPickerSlot);
              const available = augsOfSlot(augPickerSlot);
              return (
                <>
                  <div className="eyebrow" style={{ color: slot.color }}>{slot.glyph} · {slot.label} Port</div>
                  <h2 style={{ margin:'6px 0 4px', fontSize:24, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>Select Augmentation</h2>
                  <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:16 }}>{slot.desc}</div>
                  {available.length === 0 ? (
                    <div style={{ padding:'24px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                      color:'var(--bone-dim)', fontSize:13, fontStyle:'italic' }}>
                      No {slot.label.toLowerCase()} augmentations in inventory. The Trader may have some.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:320, overflowY:'auto' }}>
                      {available.map(a => (
                        <div key={a.id} onClick={()=>installAug(slot.id, a.id)}
                          style={{ padding:'12px 14px', cursor:'pointer',
                            background:'var(--abyss-2)', border:'1px solid var(--abyss-3)',
                            display:'flex', gap:10, alignItems:'center',
                          }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=slot.color}
                          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--abyss-3)'}>
                          <div style={{ fontSize:18, color:slot.color }}>{slot.glyph}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)' }}>{a.name}</div>
                            <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:3 }}>Tier {a.tier} · {a.effect}</div>
                          </div>
                          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bio)' }}>INSTALL ▸</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                    <button className="btn ghost sm" onClick={()=>setAugPickerSlot(null)}>Cancel</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat2 = ({label, value}) => (
  <div>
    <div style={{ color:'var(--brass-dim)', textTransform:'uppercase', fontSize:8, letterSpacing:'0.2em' }}>{label}</div>
    <div style={{ color:'var(--bone)', fontSize:12, marginTop:2 }}>{value}</div>
  </div>
);

// Simple painterly follower portrait (class-adaptive)
const FollowerPortrait = ({ arch, evoTier }) => (
  <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice"
    style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id={`fp-${arch.key}`} cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor={arch.color} stopOpacity="0.5"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
    </defs>
    <rect width="160" height="200" fill={`url(#fp-${arch.key})`}/>
    {/* silhouette */}
    <ellipse cx="80" cy="110" rx="50" ry="65" fill="oklch(0.1 0.025 220)"/>
    <path d="M 30 200 L 30 140 Q 30 80 80 70 Q 130 80 130 140 L 130 200 Z" fill="oklch(0.13 0.03 215)"/>
    {/* class-specific silhouette hint */}
    <text x="80" y="130" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="60" fill={arch.color} opacity="0.55">{arch.glyph}</text>
    {/* evo rings around head */}
    {[...Array(evoTier)].map((_,i)=>(
      <circle key={i} cx="80" cy="85" r={25+i*6} fill="none" stroke={arch.color} strokeWidth="0.8" opacity={0.6-i*0.12}/>
    ))}
    {/* glowing eye */}
    <circle cx="80" cy="80" r="2.5" fill={arch.color}>
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite"/>
    </circle>
    {/* particles */}
    {[...Array(14)].map((_,i)=>(
      <circle key={i} cx={(i*23)%160} cy={(i*37)%200} r="0.8" fill={arch.color} opacity={0.3+(i%3)*0.15}/>
    ))}
  </svg>
);

window.ManageFollower = ManageFollower;
window.Stat2 = Stat2;
window.FollowerPortrait = FollowerPortrait;
