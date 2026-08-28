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

      {section === 'augmentation' && <AugmentationSection run={run} setRun={setRun}/>}
      {section === 'relic'        && <RelicSection        run={run} setRun={setRun}/>}
      {section === 'quest'        && <QuestSection        run={run}/>}
    </div>
  );
};

// --- Augmentation Section ---
// Browse all augmentations (in-hold + grafted). Each aug shows status + equip/unequip action.
const AugmentationSection = ({ run, setRun }) => {
  const [equipPickerAug, setEquipPickerAug] = React.useState(null); // augId being fitted
  window.useEscClose(() => setEquipPickerAug(null));
  const [filter, setFilter] = React.useState('all'); // all | equipped | unequipped
  const augInventory = run.augInventory || [];
  const roster = run.roster || [];

  // Compute grown slot indices for a follower (same hash logic as UnitInfo)
  const computeGrownSlots = (follower) => {
    const slotCount = follower.augSlotCount ?? 5;
    const seedStr = follower.instanceId + follower.archetype;
    let h = 0;
    for (let i=0; i<seedStr.length; i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
    const indices = [...AUG_SLOTS.keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return new Set(indices.slice(0, slotCount).map(i => AUG_SLOTS[i].id));
  };

  const installAug = (followerId, slotId, augId) => {
    setRun(r => ({
      ...r,
      roster: r.roster.map(f => f.instanceId === followerId
        ? { ...f, augments: {...f.augments, [slotId]: augId} } : f),
      augInventory: (r.augInventory || []).filter((id, i, arr) => {
        const idx = arr.findIndex(a => a === augId);
        return i !== idx;
      }),
    }));
    setEquipPickerAug(null);
  };

  const removeAug = (followerId, slotId) => {
    setRun(r => {
      const f = r.roster.find(x => x.instanceId === followerId);
      const augId = f?.augments?.[slotId];
      if (!augId) return r;
      return {
        ...r,
        roster: r.roster.map(x => x.instanceId === followerId
          ? { ...x, augments: {...x.augments, [slotId]: null} } : x),
        augInventory: [...(r.augInventory || []), augId],
      };
    });
  };

  // Status of an aug: 'grafted' (with follower+slot info) | 'inventory'
  const augStatus = (augId) => {
    for (const f of roster) {
      for (const [slot, id] of Object.entries(f.augments || {})) {
        if (id === augId) return { state:'grafted', follower:f, slot };
      }
    }
    return { state:'inventory' };
  };

  // Build list of all augs (inventory + grafted), de-duplicated
  const allAugIds = React.useMemo(() => {
    const ids = new Set([
      ...augInventory,
      ...roster.flatMap(f => Object.values(f.augments || {}).filter(Boolean)),
    ]);
    return [...ids];
  }, [augInventory, roster]);

  const augs = allAugIds
    .map(id => ({ id, aug: AUGMENTATIONS.find(a => a.id === id) }))
    .filter(x => x.aug)
    .filter(({ id }) => {
      if (filter === 'all') return true;
      const st = augStatus(id);
      return filter === 'equipped' ? st.state === 'grafted' : st.state === 'inventory';
    });

  // Group augs by slot for display
  const grouped = AUG_SLOTS.map(slot => ({
    slot,
    items: augs.filter(({ aug }) => aug.slot === slot.id),
  })).filter(g => g.items.length > 0);

  // Eligible followers for fitting an aug: have a grown port matching slot, and that port is empty
  const eligibleFollowers = (aug) => {
    return roster.map(f => {
      const grown = computeGrownSlots(f);
      const portFree = !f.augments?.[aug.slot];
      const portGrown = grown.has(aug.slot);
      return {
        follower: f,
        ok: portGrown && portFree,
        portGrown,
        portFree,
      };
    });
  };

  const totalEquipped = roster.flatMap(f => Object.values(f.augments || {}).filter(Boolean)).length;
  const totalInHold = augInventory.length;

  return (
    <div>
      {/* Header bar with stats and filter */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <div className="caps">Augmentation Catalog</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
            color:'var(--bio-dim)', letterSpacing:'0.2em', marginTop:3 }}>
            {totalEquipped} GRAFTED · {totalInHold} IN HOLD
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[
            { id:'all',         label:'All' },
            { id:'equipped',    label:'Equipped' },
            { id:'unequipped',  label:'In Hold' },
          ].map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={()=>setFilter(f.id)}
                style={{
                  padding:'6px 14px', cursor:'pointer',
                  background: active ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                  border:'1px solid', borderColor: active ? 'var(--brass)' : 'var(--abyss-3)',
                  fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.2em',
                  color: active ? 'var(--brass)' : 'var(--bone-dim)',
                  textTransform:'uppercase',
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {augs.length === 0 && (
        <div style={{ padding:'40px 20px', textAlign:'center', border:'1px dashed var(--abyss-4)',
          color:'var(--bone-dim)', fontStyle:'italic', fontSize:13, fontFamily:'Cormorant Garamond, serif' }}>
          {filter === 'equipped' ? 'No augmentations are currently grafted.' :
           filter === 'unequipped' ? 'The hold is empty. Visit the Trader for fresh flesh.' :
           'No augmentations yet. The Trader may have flesh to sell.'}
        </div>
      )}

      {/* Grouped by slot */}
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {grouped.map(({ slot, items }) => (
          <div key={slot.id}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8,
              paddingBottom:6, borderBottom:`1px solid ${slot.color.replace(')', ' / 0.3)')}` }}>
              <span style={{ fontFamily:'Cinzel, serif', fontSize:18, color:slot.color,
                textShadow:`0 0 10px ${slot.color}` }}>{slot.glyph}</span>
              <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color:slot.color,
                letterSpacing:'0.25em', textTransform:'uppercase', fontWeight:600 }}>
                {slot.label}
              </span>
              <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                color:'var(--bone-dim)', letterSpacing:'0.2em' }}>
                {items.length} GRAFT{items.length === 1 ? '' : 'S'}
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
              {items.map(({ id, aug }) => {
                const st = augStatus(id);
                const isGrafted = st.state === 'grafted';
                return (
                  <div key={id} style={{
                    padding:'12px 14px',
                    background: isGrafted
                      ? `linear-gradient(90deg, ${slot.color.replace(')',' / 0.12)')}, var(--abyss-1))`
                      : 'var(--abyss-1)',
                    border:'1px solid', borderColor: isGrafted ? slot.color : 'var(--abyss-3)',
                    display:'flex', gap:12, alignItems:'flex-start',
                  }}>
                    <div style={{ fontSize:24, fontFamily:'Cinzel, serif', color:slot.color,
                      textShadow:isGrafted?`0 0 10px ${slot.color}`:'none', flexShrink:0, paddingTop:2 }}>
                      {slot.glyph}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:6, justifyContent:'space-between' }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
                          letterSpacing:'0.04em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {aug.name}
                        </div>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                          color:slot.color, letterSpacing:'0.18em', flexShrink:0 }}>T{aug.tier}</div>
                      </div>
                      <div style={{ fontSize:11, color:'var(--bone-dim)', marginTop:4, lineHeight:1.4,
                        fontStyle:'italic', fontFamily:'Cormorant Garamond, serif' }}>
                        {aug.effect}
                      </div>
                      <div style={{ marginTop:8, display:'flex', alignItems:'center',
                        justifyContent:'space-between', gap:8 }}>
                        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
                          letterSpacing:'0.2em' }}>
                          {isGrafted
                            ? <span style={{ color:slot.color }}>⊕ GRAFTED · {st.follower.name.toUpperCase()}</span>
                            : <span style={{ color:'var(--bone-dim)' }}>— IN HOLD</span>}
                        </div>
                        {isGrafted ? (
                          <button onClick={()=>removeAug(st.follower.instanceId, st.slot)}
                            style={{
                              padding:'5px 12px', cursor:'pointer',
                              background:'var(--abyss-2)',
                              border:'1px solid oklch(0.45 0.13 25 / 0.6)',
                              color:'oklch(0.78 0.13 25)',
                              fontFamily:'JetBrains Mono, monospace', fontSize:9.5, letterSpacing:'0.22em',
                              textTransform:'uppercase',
                            }}
                            onMouseEnter={e=>{ e.currentTarget.style.background='oklch(0.22 0.06 25 / 0.4)'; e.currentTarget.style.borderColor='oklch(0.65 0.16 25)'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background='var(--abyss-2)'; e.currentTarget.style.borderColor='oklch(0.45 0.13 25 / 0.6)'; }}>
                            × Unequip
                          </button>
                        ) : (
                          <button onClick={()=>setEquipPickerAug(id)}
                            style={{
                              padding:'5px 12px', cursor:'pointer',
                              background:`linear-gradient(180deg, ${slot.color.replace(')',' / 0.18)')}, var(--abyss-2))`,
                              border:`1px solid ${slot.color.replace(')',' / 0.6)')}`,
                              color:slot.color,
                              fontFamily:'JetBrains Mono, monospace', fontSize:9.5, letterSpacing:'0.22em',
                              textTransform:'uppercase',
                            }}
                            onMouseEnter={e=>{ e.currentTarget.style.borderColor=slot.color; e.currentTarget.style.boxShadow=`0 0 10px ${slot.color.replace(')',' / 0.4)')}`; }}
                            onMouseLeave={e=>{ e.currentTarget.style.borderColor=slot.color.replace(')',' / 0.6)'); e.currentTarget.style.boxShadow='none'; }}>
                            ⊕ Equip ▸
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Equip picker modal: pick a follower to graft this aug onto */}
      {equipPickerAug && (() => {
        const aug = AUGMENTATIONS.find(a => a.id === equipPickerAug);
        if (!aug) return null;
        const slot = AUG_SLOTS.find(s => s.id === aug.slot);
        const candidates = eligibleFollowers(aug);
        return (
          <div className="modal-backdrop" onClick={()=>setEquipPickerAug(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="eyebrow" style={{ color:slot.color }}>{slot.glyph} · {slot.label} Graft</div>
              <h2 style={{ margin:'6px 0 4px', fontSize:24, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>
                Fit {aug.name}
              </h2>
              <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:6,
                fontFamily:'Cormorant Garamond, serif' }}>
                {aug.effect}
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)',
                letterSpacing:'0.2em', marginBottom:14 }}>
                ‣ SELECT A SPECIMEN WITH AN OPEN {slot.label.toUpperCase()} PORT
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
                {candidates.map(({ follower, ok, portGrown, portFree }) => {
                  const a = FOLLOWER_ARCHETYPES[follower.archetype];
                  const reason = !portGrown ? `— No ${slot.label.toLowerCase()} port grown`
                    : !portFree ? `— ${slot.label} port already filled`
                    : null;
                  return (
                    <div key={follower.instanceId}
                      onClick={()=>{ if (ok) installAug(follower.instanceId, slot.id, aug.id); }}
                      style={{
                        padding:'12px 14px', cursor: ok ? 'pointer' : 'not-allowed',
                        background: ok ? 'var(--abyss-2)' : 'var(--abyss-1)',
                        border:'1px solid', borderColor: ok ? 'var(--abyss-3)' : 'var(--abyss-4)',
                        opacity: ok ? 1 : 0.45,
                        display:'flex', gap:12, alignItems:'center', transition:'all 0.15s',
                      }}
                      onMouseEnter={e=>{ if (ok) { e.currentTarget.style.borderColor=slot.color; e.currentTarget.style.background=`linear-gradient(90deg, ${slot.color.replace(')',' / 0.12)')}, var(--abyss-2))`; } }}
                      onMouseLeave={e=>{ if (ok) { e.currentTarget.style.borderColor='var(--abyss-3)'; e.currentTarget.style.background='var(--abyss-2)'; } }}>
                      <div style={{ fontSize:24, fontFamily:'Cinzel, serif', color:a.color,
                        textShadow: ok ? `0 0 10px ${a.color}` : 'none', width:32, textAlign:'center' }}>{a.glyph}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
                          letterSpacing:'0.04em' }}>{follower.name}</div>
                        <div style={{ display:'flex', gap:8, marginTop:3,
                          fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                          letterSpacing:'0.15em' }}>
                          <span>{a.role.toUpperCase()}</span>
                          <span>EVO·{follower.evoTier}</span>
                          <span>{Object.values(follower.augments||{}).filter(Boolean).length}/{follower.augSlotCount ?? 5} PORTS</span>
                        </div>
                      </div>
                      <div style={{ flexShrink:0, fontFamily:'JetBrains Mono, monospace', fontSize:9.5,
                        letterSpacing:'0.2em', textAlign:'right' }}>
                        {ok ? <span style={{ color:slot.color }}>FIT ▸</span>
                            : <span style={{ color:'var(--bone-dim)', fontStyle:'italic',
                                fontFamily:'Cormorant Garamond, serif', fontSize:11 }}>{reason}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', letterSpacing:'0.2em' }}>
                  ‣ {candidates.filter(c => c.ok).length} VIABLE SPECIMEN{candidates.filter(c => c.ok).length === 1 ? '' : 'S'}
                </div>
                <button className="btn ghost sm" onClick={()=>setEquipPickerAug(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// --- Relic Section ---
// A relic does two things from this list: it goes into the loadout, or it climbs.
// Everything about the climb — requirement, progress, and the effects waiting at
// the next level — lives behind the Upgrade button, not on the card.
const RELIC_LEVEL_CAP = 3;

const RelicSection = ({ run, setRun }) => {
  const relicsOwned = run.relicsOwned || [];
  const relicsLoadout = run.relicsLoadout || [];
  const relicCap = 3;
  const [upgrading, setUpgrading] = React.useState(null); // relic id in the upgrade menu
  window.useEscClose(() => setUpgrading(null));

  const toggleRelic = (id) => {
    setRun(r => {
      const load = r.relicsLoadout || [];
      if (load.includes(id)) return { ...r, relicsLoadout: load.filter(x => x !== id) };
      if (load.length >= relicCap) return r;
      return { ...r, relicsLoadout: [...load, id] };
    });
  };

  // Raise a relic one level and spend whatever the climb consumed.
  const ascend = (relic) => {
    setRun(r => {
      const climb = relicClimb(r, relic);
      if (!climb.met) return r;
      const prog = climb.prog;
      // An archived relic spends the item it was filed beside.
      const questId = climb.req.track === 'quest' ? (relic.quests || [])[prog.level - 1] : null;
      return {
        ...r,
        relicProgress: { ...(r.relicProgress || {}), [relic.id]: { ...prog, level: prog.level + 1 } },
        questItems: questId
          ? (r.questItems || []).filter(q => (q.id || q) !== questId)
          : r.questItems,
      };
    });
  };

  // Pour Lumin Deposit into a relic — the whole of the Forged/Sediment climb.
  const forge = (relic, amount) => {
    setRun(r => {
      const have = r.res?.lumin || 0;
      const spend = Math.max(0, Math.min(amount, have));
      if (spend === 0) return r;
      const prog = relicProgressOf(r, relic.id);
      return {
        ...r,
        res: { ...r.res, lumin: have - spend },
        relicProgress: {
          ...(r.relicProgress || {}),
          [relic.id]: { ...prog, lumin: prog.lumin + spend },
        },
      };
    });
  };

  const owned = relicsOwned.map(id => OP_RELICS.find(r => r.id === id)).filter(Boolean);
  const readyCount = owned.filter(rel => relicClimb(run, rel).met).length;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <div className="caps">Reliquary</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
            color:'var(--bio-dim)', letterSpacing:'0.2em', marginTop:3 }}>
            {relicsLoadout.length}/{relicCap} CARRIED · {owned.length} OWNED
            {readyCount > 0 && <span style={{ color:'var(--brass)' }}> · {readyCount} READY</span>}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:'var(--bone-dim)', letterSpacing:'0.22em' }}>LUMIN DEPOSIT</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'oklch(0.8 0.13 195)',
            letterSpacing:'0.06em' }}>◈ {(run.res?.lumin || 0).toLocaleString()}</div>
        </div>
      </div>

      {owned.length === 0 && (
        <div style={{ padding:'24px', textAlign:'center', border:'1px dashed var(--abyss-4)',
          color:'var(--bone-dim)', fontStyle:'italic', fontSize:13, fontFamily:'Cormorant Garamond, serif' }}>
          The reliquary is empty. Visit the Trader to bring flesh into the hold.
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
        {owned.map(rel => (
          <RelicCard key={rel.id} relic={rel} run={run}
            carried={relicsLoadout.includes(rel.id)}
            full={relicsLoadout.length >= relicCap}
            onToggle={()=>toggleRelic(rel.id)}
            onUpgrade={()=>setUpgrading(rel.id)}/>
        ))}
      </div>

      {upgrading && (() => {
        const rel = OP_RELICS.find(r => r.id === upgrading);
        return rel ? <RelicUpgradeModal relic={rel} run={run}
          onForge={(amt)=>forge(rel, amt)} onAscend={()=>ascend(rel)}
          onClose={()=>setUpgrading(null)}/> : null;
      })()}
    </div>
  );
};

// One relic, kept plain: what it is, what it does now, and two buttons.
const RelicCard = ({ relic, run, carried, full, onToggle, onUpgrade }) => {
  const cls = relicClassById(relic.cls);
  const climb = relicClimb(run, relic);
  const level = climb.prog.level;
  const blocked = !carried && full;

  return (
    <div style={{
      padding:'13px 15px',
      background: carried ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
      border:'1px solid', borderColor: carried ? 'var(--brass)' : 'var(--abyss-3)',
      display:'flex', flexDirection:'column', gap:11,
    }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ fontSize:26, fontFamily:'Cinzel, serif', flexShrink:0, width:30, textAlign:'center',
          color: carried ? 'var(--brass)' : 'var(--bone-dim)',
          textShadow: carried ? '0 0 12px var(--brass)' : 'none' }}>{relic.glyph}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)',
              letterSpacing:'0.05em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {relic.name}
            </span>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em',
              color:'var(--brass)', flexShrink:0 }}>LV{level}</span>
          </div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.2em',
            color:cls.color, textTransform:'uppercase', marginTop:3 }}>
            {cls.glyph} {cls.name}
          </div>
          <div style={{ fontSize:11, color:'var(--bone-dim)', marginTop:5, lineHeight:1.45,
            fontStyle:'italic', fontFamily:'Cormorant Garamond, serif' }}>
            {relicEffectAt(relic, level)}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onToggle} disabled={blocked}
          title={blocked ? 'The loadout is full' : undefined}
          style={{ flex:1, padding:'7px 12px', cursor: blocked ? 'not-allowed' : 'pointer',
            background: carried ? 'var(--abyss-2)' : 'linear-gradient(180deg, var(--brass-deep), var(--abyss-2))',
            border:`1px solid ${carried ? 'oklch(0.45 0.13 25 / 0.6)' : 'var(--brass)'}`,
            color: carried ? 'oklch(0.78 0.13 25)' : 'var(--brass)',
            opacity: blocked ? 0.4 : 1,
            fontFamily:'JetBrains Mono, monospace', fontSize:9.5, letterSpacing:'0.2em',
            textTransform:'uppercase' }}>
          {carried ? '× Unequip' : '✓ Equip'}
        </button>
        <button onClick={onUpgrade}
          style={{ flex:1, padding:'7px 12px', cursor:'pointer',
            background: climb.met
              ? `linear-gradient(180deg, ${cls.color.replace(')',' / 0.25)')}, var(--abyss-2))`
              : 'var(--abyss-2)',
            border:`1px solid ${climb.met ? cls.color : 'var(--abyss-4)'}`,
            color: climb.met ? cls.color : 'var(--bone-dim)',
            fontFamily:'JetBrains Mono, monospace', fontSize:9.5, letterSpacing:'0.2em',
            textTransform:'uppercase' }}>
          {climb.maxed ? '◆ Maxed' : climb.met ? '▲ Upgrade ◆' : '▲ Upgrade'}
        </button>
      </div>
    </div>
  );
};

// The upgrade menu — the ladder of effects, the requirement standing in the way,
// and (for a forged climb) the pour itself.
const RelicUpgradeModal = ({ relic, run, onForge, onAscend, onClose }) => {
  const cls = relicClassById(relic.cls);
  const climb = relicClimb(run, relic);
  const level = climb.prog.level;
  const req = climb.req;
  const balance = run.res?.lumin || 0;

  const isForge = !!req?.forge;
  const remaining = isForge ? Math.max(0, climb.goal - climb.have) : 0;
  const ceiling = isForge ? Math.min(balance, remaining) : 0;
  const [amount, setAmount] = React.useState(ceiling);
  // Pouring changes the requirement under us — re-arm the field for what is left.
  React.useEffect(() => { setAmount(ceiling); }, [ceiling]);

  const after = climb.have + amount;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:560 }}>
        <div className="eyebrow" style={{ color:cls.color }}>{cls.glyph} · {cls.name}</div>
        <h2 style={{ margin:'6px 0 3px', fontSize:24, fontFamily:'Cinzel, serif', color:'var(--bone)' }}>
          {relic.glyph} {relic.name}
        </h2>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
          color:'var(--bone-dim)', marginBottom:16 }}>{cls.blurb}</div>

        {/* the ladder of effects */}
        <div className="caps" style={{ marginBottom:7 }}>Effects by level</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
          {[1,2,3].map(lv => {
            const held = lv <= level;
            const next = lv === level + 1;
            return (
              <div key={lv} style={{
                padding:'9px 12px', display:'flex', gap:11, alignItems:'flex-start',
                background: held ? 'var(--abyss-2)' : next ? cls.color.replace(')',' / 0.08)') : 'transparent',
                border:'1px solid', borderColor: held ? 'var(--abyss-3)' : next ? cls.color : 'var(--abyss-4)',
                opacity: held || next ? 1 : 0.45,
              }}>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.15em',
                  flexShrink:0, width:32, paddingTop:2,
                  color: held ? 'var(--brass)' : next ? cls.color : 'var(--bone-dim)' }}>LV{lv}</span>
                <span style={{ flex:1, fontFamily:'Cormorant Garamond, serif', fontSize:13,
                  lineHeight:1.45, color: held || next ? 'var(--bone)' : 'var(--bone-dim)' }}>
                  {relicEffectAt(relic, lv)}
                </span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8,
                  letterSpacing:'0.18em', flexShrink:0, paddingTop:3,
                  color: held ? 'var(--brass)' : next ? cls.color : 'transparent' }}>
                  {held ? '● HELD' : next ? '○ NEXT' : ''}
                </span>
              </div>
            );
          })}
        </div>

        {climb.maxed ? (
          <div style={{ padding:'14px', border:`1px solid ${cls.color}`, textAlign:'center',
            fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.2em',
            color:cls.color, textTransform:'uppercase' }}>
            ◆ Fully wrought — LV{RELIC_LEVEL_CAP}
          </div>
        ) : (
          <>
            <div className="caps" style={{ marginBottom:7 }}>To reach LV{level + 1}</div>
            <div style={{ padding:'12px 14px', background:'var(--abyss-1)',
              border:`1px solid ${climb.met ? 'var(--brass)' : 'var(--abyss-3)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
                <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone)' }}>
                  {req.label}
                </span>
                {req.track !== 'quest' && (
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.12em',
                    color: climb.met ? 'var(--brass)' : 'var(--bone-dim)', flexShrink:0 }}>
                    {req.track === 'commander'
                      ? `LV${climb.cmdLevel} / LV${climb.goal}`
                      : `${climb.have.toLocaleString()} / ${climb.goal.toLocaleString()}`}
                  </span>
                )}
              </div>

              <div style={{ height:5, background:'var(--abyss-0)', border:'1px solid var(--abyss-4)',
                marginTop:9 }}>
                <div style={{ width:`${Math.round((climb.ratio || 0) * 100)}%`, height:'100%',
                  background: climb.met ? 'var(--brass)' : cls.color,
                  boxShadow: climb.met ? '0 0 8px var(--brass)' : 'none', transition:'width 0.25s' }}/>
              </div>

              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.12em',
                color:'var(--bone-dim)', textTransform:'uppercase', lineHeight:1.7, marginTop:8 }}>
                {climb.met
                  ? <div style={{ color:'var(--brass)' }}>◆ Requirement met</div>
                  : <div>‣ {climb.reason}</div>}
                {req.note && <div>‣ {req.note}</div>}
                {req.track === 'commander' && <div>‣ Bound to Commander {relic.commander}</div>}
              </div>
            </div>

            {/* the pour, for a forged climb */}
            {isForge && !climb.met && (
              <div style={{ marginTop:14 }}>
                <div className="caps" style={{ marginBottom:6 }}>
                  Pour Lumin Deposit · {balance.toLocaleString()} in hold
                </div>
                {balance === 0 ? (
                  <div style={{ padding:'12px', border:'1px dashed var(--abyss-4)', textAlign:'center',
                    fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
                    color:'var(--bone-dim)' }}>
                    No Lumin Deposit in the hold. The Trader deals in it.
                  </div>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <input type="range" min={0} max={ceiling} value={amount} title="Amount"
                        onChange={e=>setAmount(Number(e.target.value))}
                        style={{ flex:1, accentColor:cls.color }}/>
                      <input type="number" min={0} max={ceiling} value={amount} title="Amount"
                        onChange={e=>setAmount(Math.max(0, Math.min(ceiling, Number(e.target.value) || 0)))}
                        style={{ width:104, padding:'6px 9px', background:'var(--abyss-0)',
                          border:'1px solid var(--abyss-4)', color:'var(--bone)',
                          fontFamily:'JetBrains Mono, monospace', fontSize:12, outline:'none' }}/>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:9, alignItems:'center' }}>
                      {[100, 500, 1000].filter(v => v <= ceiling).map(v => (
                        <button key={v} className="btn ghost sm" onClick={()=>setAmount(v)}>+{v}</button>
                      ))}
                      <button className="btn ghost sm" onClick={()=>setAmount(ceiling)}>
                        {ceiling === remaining ? 'Finish it' : 'All in hold'}
                      </button>
                      <span style={{ marginLeft:'auto', fontFamily:'JetBrains Mono, monospace',
                        fontSize:8.5, color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
                        {climb.have.toLocaleString()} → {after.toLocaleString()} / {climb.goal.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:18 }}>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
          {isForge && !climb.met && balance > 0 && (
            <button className="btn sm" disabled={amount <= 0} onClick={()=>onForge(amount)}
              style={{ opacity: amount <= 0 ? 0.4 : 1, cursor: amount <= 0 ? 'not-allowed' : 'pointer' }}>
              ⚒ Pour {amount.toLocaleString()}
            </button>
          )}
          {climb.met && (
            <button className="btn primary sm" onClick={onAscend}>
              ▲ Ascend to LV{level + 1}
            </button>
          )}
        </div>
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
