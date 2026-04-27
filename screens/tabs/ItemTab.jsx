// Tab 3 — Item: Augmentation (grafted + held), Relics, Quest Items
const ItemTab = ({ run, setRun, sel, arch }) => {
  const [section, setSection] = React.useState('augmentation'); // augmentation | relic | quest

  const sections = [
    { id:'augmentation', label:'Augmentation', glyph:'⊕', color:'oklch(0.7 0.13 195)',
      desc:'Grafted into flesh · 5 ports per follower' },
    { id:'relic',        label:'Relic',        glyph:'✠', color:'var(--brass)',
      desc:'Carried into battle · cap 3 per assignment' },
    { id:'quest',        label:'Quest Item',   glyph:'⌘', color:'oklch(0.68 0.14 290)',
      desc:'Story-bound · cannot be discarded' },
  ];

  return (
    <div style={{ padding:'20px 28px' }}>
      {/* Section pills */}
      <div style={{ display:'flex', gap:8, marginBottom:18 }}>
        {sections.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} onClick={()=>setSection(s.id)}
              style={{
                flex:1, padding:'12px 16px', cursor:'pointer',
                background: active ? `linear-gradient(180deg, var(--abyss-3), var(--abyss-2))` : 'var(--abyss-1)',
                border:'1px solid', borderColor: active ? s.color : 'var(--abyss-3)',
                borderLeft: active ? `3px solid ${s.color}` : '3px solid transparent',
                color:'var(--bone)', textAlign:'left', transition:'all 0.15s',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18, color:s.color, fontFamily:'Cinzel, serif',
                  textShadow: active ? `0 0 12px ${s.color}` : 'none' }}>{s.glyph}</span>
                <div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:13, letterSpacing:'0.12em', textTransform:'uppercase',
                    color: active ? s.color : 'var(--bone)' }}>{s.label}</div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.15em', marginTop:2 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {section === 'augmentation' && <AugmentationSection run={run} setRun={setRun} sel={sel} arch={arch}/>}
      {section === 'relic'        && <RelicSection        run={run} setRun={setRun}/>}
      {section === 'quest'        && <QuestSection        run={run}/>}
    </div>
  );
};

// --- Augmentation Section ---
const AugmentationSection = ({ run, setRun, sel, arch }) => {
  const [augPickerSlot, setAugPickerSlot] = React.useState(null);
  const augInventory = run.augInventory || [];
  const augLoadout   = run.augLoadout   || [];
  const augLoadoutCap = 5;
  const roster = run.roster || [];

  const installAug = (slot, augId) => {
    setRun(r => ({
      ...r,
      roster: r.roster.map(f => f.instanceId === sel.instanceId
        ? { ...f, augments: {...f.augments, [slot]: augId} } : f),
      augInventory: (r.augInventory || []).filter((id, i, arr) => {
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
      roster: r.roster.map(f => f.instanceId === sel.instanceId
        ? { ...f, augments: {...f.augments, [slot]: null} } : f),
      augInventory: [...(r.augInventory || []), current],
    }));
  };

  const augStatus = (augId) => {
    for (const f of roster) {
      for (const [slot, id] of Object.entries(f.augments || {})) {
        if (id === augId) return { state:'grafted', follower:f, slot };
      }
    }
    if (augLoadout.includes(augId)) return { state:'loadout' };
    return { state:'inventory' };
  };
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

  if (!sel) {
    return <div style={{ padding:40, color:'var(--bone-dim)', textAlign:'center', fontStyle:'italic' }}>Select a follower first.</div>;
  }

  const augsOfSlot = (slot) => augInventory
    .map(id => AUGMENTATIONS.find(a => a.id === id))
    .filter(a => a && a.slot === slot);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:18 }}>
      {/* Left: 5 slot grid for selected follower */}
      <div>
        <div className="caps" style={{ marginBottom:10 }}>{sel.name} · 5 Graft Ports</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10 }}>
          {AUG_SLOTS.map(slot => {
            const installedId = sel.augments?.[slot.id];
            const aug = installedId ? AUGMENTATIONS.find(a=>a.id===installedId) : null;
            return (
              <div key={slot.id} style={{
                background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
                border:`1px solid ${aug ? slot.color : 'var(--abyss-3)'}`,
                padding:'12px 10px', position:'relative', minHeight:150,
                boxShadow: aug ? `inset 0 0 20px ${slot.color.replace(')', ' / 0.15)')}` : 'none',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <span style={{ fontSize:16, color:slot.color, fontFamily:'Cinzel, serif' }}>{slot.glyph}</span>
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
                      style={{ position:'absolute', right:4, top:4, border:'none', background:'transparent',
                        color:'var(--bone-dim)', cursor:'pointer', fontSize:12, padding:'2px 6px' }}
                      title="Remove">×</button>
                  </>
                ) : (
                  <button onClick={()=>setAugPickerSlot(slot.id)}
                    style={{
                      position:'absolute', inset:36, border:`1px dashed var(--abyss-4)`,
                      background:'transparent', color:'var(--bone-dim)',
                      fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em',
                      cursor:'pointer', display:'grid', placeItems:'center',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=slot.color; e.currentTarget.style.color=slot.color;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--abyss-4)'; e.currentTarget.style.color='var(--bone-dim)';}}>
                    + INSTALL
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Aug hold (carried + inventory) */}
      <div>
        <div className="caps" style={{ marginBottom:8 }}>Augmentation Hold</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em', marginBottom:10 }}>
          {augLoadout.length}/{augLoadoutCap} CARRIED · {augInventory.length} IN HOLD
        </div>
        {(() => {
          const allIds = new Set([
            ...augInventory, ...augLoadout,
            ...roster.flatMap(f => Object.values(f.augments || {}).filter(Boolean)),
          ]);
          const list = [...allIds]
            .map(id => ({ id, aug: AUGMENTATIONS.find(a=>a.id===id) }))
            .filter(x => x.aug);
          if (list.length === 0) {
            return (
              <div style={{ padding:'14px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                color:'var(--bone-dim)', fontStyle:'italic', fontSize:11, fontFamily:'Cormorant Garamond, serif' }}>
                No grafts yet. The Trader may have flesh to sell.
              </div>
            );
          }
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:480, overflowY:'auto' }}>
              {list.map(({ id, aug }) => {
                const slot = AUG_SLOTS.find(s => s.id === aug.slot);
                const st = augStatus(id);
                const isGrafted = st.state === 'grafted';
                const isCarried = st.state === 'loadout';
                const borderColor = isGrafted ? slot.color : isCarried ? 'var(--brass)' : 'var(--abyss-3)';
                const bg = isGrafted ? `linear-gradient(90deg, ${slot.color.replace(')',' / 0.15)')}, var(--abyss-1))`
                  : isCarried ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))'
                  : 'var(--abyss-1)';
                return (
                  <div key={id} onClick={()=>toggleAugLoadout(id)}
                    title={isGrafted ? `Grafted to ${st.follower.name}` : isCarried ? 'Click to uncarry' : 'Click to carry'}
                    style={{
                      padding:'8px 10px', cursor: isGrafted ? 'default' : 'pointer',
                      background:bg, border:'1px solid', borderColor,
                      display:'flex', gap:9, alignItems:'flex-start',
                      opacity: isGrafted ? 0.85 : 1,
                    }}>
                    <div style={{ fontSize:18, fontFamily:'Cinzel, serif', color:slot.color,
                      textShadow:(isGrafted||isCarried)?`0 0 8px ${slot.color}`:'none', lineHeight:1, paddingTop:2 }}>
                      {slot.glyph}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:6, justifyContent:'space-between' }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)',
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{aug.name}</div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:slot.color, letterSpacing:'0.15em' }}>T{aug.tier}</div>
                      </div>
                      <div style={{ fontSize:9.5, color:'var(--bone-dim)', marginTop:2, lineHeight:1.35, fontStyle:'italic' }}>
                        {aug.effect}
                      </div>
                      <div style={{ marginTop:4, fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em' }}>
                        {isGrafted && <span style={{ color:slot.color }}>⊕ GRAFTED · {st.follower.name.toUpperCase()}</span>}
                        {isCarried && <span style={{ color:'var(--brass)' }}>◆ CARRIED</span>}
                        {!isGrafted && !isCarried && <span style={{ color:'var(--bone-dim)' }}>— IN HOLD</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Picker modal */}
      {augPickerSlot && (
        <div className="modal-backdrop" onClick={()=>setAugPickerSlot(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            {(() => {
              const slot = AUG_SLOTS.find(s => s.id === augPickerSlot);
              const available = augsOfSlot(augPickerSlot);
              return (
                <>
                  <div className="eyebrow" style={{ color:slot.color }}>{slot.glyph} · {slot.label} Port</div>
                  <h2 style={{ margin:'6px 0 4px', fontSize:24, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>Select Augmentation</h2>
                  <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:16 }}>{slot.desc}</div>
                  {available.length === 0 ? (
                    <div style={{ padding:'24px', textAlign:'center', border:'1px dashed var(--abyss-4)',
                      color:'var(--bone-dim)', fontSize:13, fontStyle:'italic' }}>
                      No {slot.label.toLowerCase()} augmentations in inventory.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:320, overflowY:'auto' }}>
                      {available.map(a => (
                        <div key={a.id} onClick={()=>installAug(slot.id, a.id)}
                          style={{ padding:'12px 14px', cursor:'pointer',
                            background:'var(--abyss-2)', border:'1px solid var(--abyss-3)',
                            display:'flex', gap:10, alignItems:'center' }}
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

// --- Relic Section ---
const RelicSection = ({ run, setRun }) => {
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

  return (
    <div>
      <div className="caps" style={{ marginBottom:8 }}>Reliquary</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em', marginBottom:14 }}>
        {relicsLoadout.length}/{relicCap} CARRIED · {relicsOwned.length} OWNED
      </div>
      {relicsOwned.length === 0 && (
        <div style={{ padding:'24px', textAlign:'center', border:'1px dashed var(--abyss-4)',
          color:'var(--bone-dim)', fontStyle:'italic', fontSize:13, fontFamily:'Cormorant Garamond, serif' }}>
          The reliquary is empty. Visit the Trader to bring flesh into the hold.
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
        {relicsOwned.map(id => {
          const rel = OP_RELICS.find(r => r.id === id);
          if (!rel) return null;
          const carried = relicsLoadout.includes(id);
          return (
            <div key={id} onClick={()=>toggleRelic(id)}
              style={{
                padding:'12px 14px', cursor:'pointer',
                background: carried ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                border:'1px solid', borderColor: carried ? 'var(--brass)' : 'var(--abyss-3)',
                display:'flex', gap:12, alignItems:'center',
              }}>
              <div style={{ fontSize:26, fontFamily:'Cinzel, serif',
                color: carried?'var(--brass)':'var(--bone-dim)',
                textShadow: carried ? '0 0 12px var(--brass)' : 'none' }}>{rel.glyph}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', letterSpacing:'0.05em' }}>{rel.name}</div>
                <div style={{ fontSize:10, color:'var(--bone-dim)', marginTop:3, lineHeight:1.4, fontStyle:'italic' }}>{rel.desc}</div>
              </div>
              <div style={{ width:18, height:18, border:`1px solid ${carried?'var(--brass)':'var(--abyss-4)'}`,
                background: carried?'var(--brass-deep)':'transparent',
                display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', fontSize:11,
                color: carried?'var(--abyss-0)':'transparent' }}>✓</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Quest Section ---
const QuestSection = ({ run }) => {
  const quest = run.questItems || [];
  // mock examples if none
  const items = quest.length ? quest : [
    { id:'q-tide-shard',  name:'Tide-Shard of the First Drowning', glyph:'⌘',
      desc:'Drips brine that never dries. Whispers of an unfound reef.',
      origin:'Recovered from the Wraith of Floor 2.' },
    { id:'q-sealed-letter', name:'Sealed Letter to the Brood-Mother', glyph:'✉',
      desc:'A wax seal pressed with a tooth-mark. Cannot be opened yet.',
      origin:'Found in the Trader\'s false floor.' },
  ];
  return (
    <div>
      <div className="caps" style={{ marginBottom:8 }}>Quest Inventory</div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em', marginBottom:14 }}>
        {items.length} BOUND ITEMS · CANNOT BE DISCARDED
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map(it => (
          <div key={it.id} style={{
            padding:'14px 16px', background:'linear-gradient(90deg, oklch(0.18 0.06 290 / 0.4), var(--abyss-1))',
            border:'1px solid oklch(0.4 0.1 290 / 0.4)', display:'flex', gap:14, alignItems:'flex-start',
          }}>
            <div style={{ fontSize:32, fontFamily:'Cinzel, serif', color:'oklch(0.7 0.13 290)',
              textShadow:'0 0 12px oklch(0.6 0.18 290)', flexShrink:0, width:40, textAlign:'center' }}>{it.glyph}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', letterSpacing:'0.05em' }}>{it.name}</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)',
                fontStyle:'italic', marginTop:5, lineHeight:1.5 }}>{it.desc}</div>
              <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:9,
                color:'oklch(0.6 0.13 290)', letterSpacing:'0.2em', textTransform:'uppercase' }}>
                ‣ {it.origin}
              </div>
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'oklch(0.7 0.13 290)',
              letterSpacing:'0.2em', flexShrink:0 }}>BOUND</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.ItemTab = ItemTab;
