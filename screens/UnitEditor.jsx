// Unit Editor — author custom units from the main menu.
// Every unit starts from an existing archetype TEMPLATE (FOLLOWER_ARCHETYPES);
// the author then customises: name · facet (temperament) · evolution level
// (1–4, mapping to evoTier 0–3) · augmentations across the 5 graft ports.
//
// Persists to localStorage('gok.customUnits'), independent of any run. Schema:
//   unit = { id, name, archetype, evoTier:0-3, facet:facetId|null,
//            augments: { optic, neural, blood, fin, chassis } }  (augId | null)

const unitEditorDefault = () => {
  const archetype = 'larva';
  // Born under one opposed pair, committed to a random side of it.
  const pair = facetPairById(rollFacetPair());
  const sides = facetsOfPair(pair);
  return {
    id: `u-${Math.random().toString(36).slice(2,8)}`,
    name: generateFollowerName(archetype, Math.floor(Math.random() * 1000)),
    archetype,
    evoTier: 0,
    facetPair: pair.id,
    facet: sides[Math.floor(Math.random() * sides.length)].id,
    augments: { optic:null, neural:null, blood:null, fin:null, chassis:null },
  };
};

const UnitEditor = ({ go }) => {
  const [units, setUnits] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('gok.customUnits')) || []; }
    catch(e) { return []; }
  });
  const [selId, setSelId] = React.useState(units[0]?.id || null);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [facetOpen, setFacetOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('gok.customUnits', JSON.stringify(units));
  }, [units]);

  // Edits land on a DRAFT copy; “✓ Save Unit” commits it back to the list.
  const saved = units.find(u => u.id === selId) || null;
  const [draft, setDraft] = React.useState(null);
  React.useEffect(() => {
    setDraft(saved ? JSON.parse(JSON.stringify(saved)) : null);
    setFacetOpen(false);
  // eslint-disable-next-line
  }, [selId, units]);

  const sel = draft; // everything below reads/writes the draft
  const dirty = !!(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));
  const arch = sel ? FOLLOWER_ARCHETYPES[sel.archetype] : null;
  const chain = sel ? (EVOLUTION[sel.archetype] || []) : [];
  const facet = sel ? facetById(sel.facet) : null;
  const cls = sel ? classificationById(classificationFor(sel.archetype)) : null;

  const newUnit = () => {
    const u = unitEditorDefault();
    setUnits(us => [...us, u]);
    setSelId(u.id);
  };
  const patch = (p) => setDraft(d => d ? { ...d, ...p } : d);
  const saveUnit = () => { if (draft && dirty) setUnits(us => us.map(u => u.id === draft.id ? draft : u)); };
  const revert = () => setDraft(saved ? JSON.parse(JSON.stringify(saved)) : null);
  const deleteUnit = () => {
    if (!selId) return;
    setUnits(us => us.filter(u => u.id !== selId));
    setSelId(null);
  };

  const setAug = (slotId, augId) =>
    patch({ augments: { ...sel.augments, [slotId]: augId || null } });

  const selStyle = {
    width:'100%', padding:'6px 8px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.06em', outline:'none',
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)',
      display:'flex', flexDirection:'column' }}>

      {/* top bar */}
      <div style={{ height:60, flexShrink:0, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'0 24px',
        background:'linear-gradient(180deg, rgba(8,12,16,0.92), rgba(0,0,0,0.6))',
        borderBottom:'1px solid var(--abyss-4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <button className="btn ghost sm" onClick={()=>go('menu')}>← Menu</button>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
              color:'var(--brass-dim)', textTransform:'uppercase' }}>
              Flesh-Wright&rsquo;s Bench
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              UNIT EDITOR
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {units.length} UNIT{units.length===1?'':'S'} FORGED
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'280px 1fr 340px', gap:0 }}>

        {/* LEFT — saved units */}
        <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          display:'flex', flexDirection:'column', gap:10 }}>
          <div className="caps">Custom Units</div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            {units.length === 0 && (
              <div style={{ padding:'22px 12px', border:'1px dashed var(--abyss-4)', textAlign:'center',
                fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic',
                color:'var(--bone-dim)', lineHeight:1.5 }}>
                No units forged yet.<br/>Shape one from a template.
              </div>
            )}
            {units.map(u => {
              const a = FOLLOWER_ARCHETYPES[u.archetype];
              const f = facetById(u.facet);
              const isSel = u.id === selId;
              const augCount = Object.values(u.augments || {}).filter(Boolean).length;
              return (
                <div key={u.id} className="hoverable" onClick={()=>setSelId(u.id)}
                  style={{
                    padding:'10px 12px', cursor:'pointer', display:'flex', gap:10, alignItems:'center',
                    background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid', borderColor: isSel ? 'var(--brass)' : 'var(--abyss-3)',
                    borderLeft:`3px solid ${a.color}`,
                  }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:20, color:a.color, width:24,
                    textAlign:'center' }}>{a.glyph}</span>
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {u.name}{isSel && dirty && <span style={{ color:'var(--brass)' }}> ●</span>}
                    </span>
                    <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:8,
                      color:'var(--bone-dim)', letterSpacing:'0.14em', marginTop:2, textTransform:'uppercase' }}>
                      {a.role} · E{(u.evoTier||0)+1}{f ? ` · ${f.name}` : ''} · AUG {augCount}/5
                    </span>
                  </span>
                </div>
              );
            })}
            <button onClick={newUnit}
              style={{ padding:'9px 12px', background:'transparent', border:'1px dashed var(--abyss-4)',
                color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.06em' }}>
              + Forge New Unit
            </button>
          </div>
          {sel && (
            <button className="btn ghost sm" onClick={()=>setConfirmDel(true)}
              style={{ color:'oklch(0.7 0.15 25)', justifyContent:'center' }}>
              ✕ Delete Unit
            </button>
          )}
        </div>

        {/* CENTER — template picker + preview */}
        {!sel ? (
          <div style={{ display:'grid', placeItems:'center', textAlign:'center', padding:40 }}>
            <div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:44, color:'var(--brass-deep)' }}>☥</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic',
                color:'var(--bone-dim)', lineHeight:1.6, margin:'12px 0 18px' }}>
                Take an existing species as the mould,<br/>then name it, temper it, evolve it, graft it.
              </div>
              <button className="btn primary" onClick={newUnit} style={{ padding:'12px 28px' }}>
                + Forge New Unit
              </button>
            </div>
          </div>
        ) : (
          <div style={{ minHeight:0, overflowY:'auto', padding:'20px 26px' }}>
            {/* template picker */}
            <div className="caps" style={{ marginBottom:8 }}>Template · Existing Species</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:20 }}>
              {Object.values(FOLLOWER_ARCHETYPES).map(a => {
                const isSel = sel.archetype === a.key;
                return (
                  <button key={a.key} onClick={()=>patch({ archetype:a.key, evoTier: Math.min(sel.evoTier, (EVOLUTION[a.key]||[]).length-1) })}
                    title={`${a.name} — ${a.desc}`}
                    style={{
                      padding:'10px 8px', textAlign:'center',
                      background: isSel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                      border:`1px solid ${isSel ? a.color : 'var(--abyss-4)'}`,
                      borderTop:`3px solid ${isSel ? a.color : 'var(--abyss-4)'}`,
                      color: isSel ? a.color : 'var(--bone-dim)',
                    }}>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:22, lineHeight:1, color:a.color }}>{a.glyph}</div>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:10, marginTop:5,
                      color: isSel ? 'var(--bone)' : 'var(--bone-dim)', whiteSpace:'nowrap',
                      overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5, letterSpacing:'0.15em',
                      marginTop:2, textTransform:'uppercase' }}>{a.role}</div>
                  </button>
                );
              })}
            </div>

            {/* preview */}
            <div className="caps" style={{ marginBottom:8 }}>Specimen Preview</div>
            <div className="panel ornate" style={{ padding:'18px 20px', display:'flex', gap:20 }}>
              <div style={{ width:140, height:175, flexShrink:0, position:'relative',
                background:'linear-gradient(180deg, var(--abyss-3), var(--abyss-0))',
                border:`1px solid ${arch.color}`, overflow:'hidden',
                boxShadow:`0 0 24px ${arch.color}33, inset 0 0 30px rgba(0,0,0,0.6)` }}>
                <FollowerPortrait arch={arch} evoTier={sel.evoTier}/>
                <div style={{ position:'absolute', bottom:6, right:8, fontFamily:'JetBrains Mono, monospace',
                  fontSize:10, color:'var(--brass)', background:'rgba(0,0,0,0.6)', padding:'2px 6px',
                  letterSpacing:'0.15em' }}>E{sel.evoTier + 1}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:22, color:'var(--bone)', letterSpacing:'0.04em' }}>
                  {sel.name}
                </div>
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontStyle:'italic',
                  color:'var(--bone-dim)', marginTop:2 }}>
                  &ldquo;{chain[sel.evoTier]?.name || arch.name}&rdquo; · {arch.role}
                </div>

                <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
                  <Stat2 label="Vigor"          value={`${arch.baseHp + sel.evoTier} ♥`}/>
                  <Stat2 label="Evolution"      value={`Lv ${sel.evoTier + 1} / ${chain.length}`}/>
                  <Stat2 label="Classification" value={`${cls.glyph} ${cls.name} · ${cls.stat} ${classValueAt(cls, sel.evoTier)}`}/>
                  <Stat2 label="Facet"          value={facet ? `${facet.glyph} ${facet.name}` : '— None —'}/>
                </div>

                <div style={{ marginTop:12, padding:'8px 12px', background:'var(--abyss-1)',
                  border:'1px solid var(--abyss-3)', fontFamily:'Cormorant Garamond, serif',
                  fontSize:12.5, fontStyle:'italic', color:'var(--bone)', lineHeight:1.5 }}>
                  {chain[sel.evoTier]?.effect || arch.desc}
                  {facet && <span style={{ display:'block', color:'var(--bio-dim)', marginTop:4 }}>
                    {facet.glyph} {facet.desc(sel.evoTier)}
                  </span>}
                </div>

                {/* grafted augs summary */}
                <div style={{ display:'flex', gap:5, marginTop:12, flexWrap:'wrap' }}>
                  {AUG_SLOTS.map(s => {
                    const augId = sel.augments?.[s.id];
                    const aug = augId ? AUGMENTATIONS.find(a => a.id === augId) : null;
                    return (
                      <span key={s.id} title={aug ? `${aug.name} — ${aug.effect}` : `${s.label} port · empty`}
                        style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 9px',
                          background: aug ? s.color.replace(')',' / 0.14)') : 'var(--abyss-1)',
                          border:`1px solid ${aug ? s.color : 'var(--abyss-4)'}`,
                          fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.1em',
                          color: aug ? s.color : 'var(--bone-dim)' }}>
                        {s.glyph} {aug ? aug.name.toUpperCase() : `${s.label.toUpperCase()} · —`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT — properties */}
        {sel && (
          <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
            background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
            display:'flex', flexDirection:'column', gap:16 }}>

            {/* name */}
            <div>
              <div className="caps" style={{ marginBottom:6 }}>Name</div>
              <div style={{ display:'flex', gap:6 }}>
                <input value={sel.name} title="Unit name"
                  onChange={e=>patch({ name: e.target.value })}
                  style={{ flex:1, padding:'8px 10px', background:'var(--abyss-0)',
                    border:'1px solid var(--abyss-4)', color:'var(--bone)',
                    fontFamily:'Cinzel, serif', fontSize:13, outline:'none' }}/>
                <button className="btn ghost sm" title="Random name"
                  onClick={()=>patch({ name: generateFollowerName(sel.archetype, Math.floor(Math.random()*1000)) })}>
                  ↺
                </button>
              </div>
            </div>

            {/* evolution level 1-4 */}
            <div>
              <div className="caps" style={{ marginBottom:6 }}>Evolution · Lv 1–{chain.length}</div>
              <div style={{ display:'flex', gap:5 }}>
                {chain.map((node, t) => {
                  const isSel = sel.evoTier === t;
                  return (
                    <button key={t} onClick={()=>patch({ evoTier: t })} title={`${node.name} — ${node.effect}`}
                      style={{
                        flex:1, padding:'8px 4px', textAlign:'center',
                        background: isSel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                        border:`1px solid ${isSel ? arch.color : 'var(--abyss-4)'}`,
                        borderTop:`3px solid ${isSel ? arch.color : 'var(--abyss-4)'}`,
                        color: isSel ? arch.color : 'var(--bone-dim)',
                      }}>
                      <div style={{ fontFamily:'Cinzel, serif', fontSize:15 }}>{t + 1}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop:6, fontFamily:'Cormorant Garamond, serif', fontSize:12,
                fontStyle:'italic', color:'var(--bone-dim)', lineHeight:1.4 }}>
                {chain[sel.evoTier]?.name} — {chain[sel.evoTier]?.effect}
              </div>
            </div>

            {/* facet — single bar; click SELECT to drop the list open */}
            <div>
              <div className="caps" style={{ marginBottom:6 }}>Facet · Temperament</div>
              <button onClick={()=>setFacetOpen(v=>!v)} title="Select facet"
                style={{
                  width:'100%', padding:'8px 10px', textAlign:'left',
                  background:'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))',
                  border:`1px solid ${facet ? facet.color : 'var(--abyss-4)'}`,
                  borderLeft:`3px solid ${facet ? facet.color : 'var(--abyss-4)'}`,
                  color:'var(--bone)', display:'flex', gap:8, alignItems:'center',
                }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:15, width:18,
                  color: facet ? facet.color : 'var(--bone-dim)' }}>{facet ? facet.glyph : '∅'}</span>
                <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, letterSpacing:'0.04em' }}>
                  {facet ? facet.name : 'None'}
                </span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
                  letterSpacing:'0.15em' }}>SELECT {facetOpen ? '▴' : '▾'}</span>
              </button>
              {facetOpen && (
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4,
                  padding:6, background:'var(--abyss-0)', border:'1px solid var(--abyss-4)' }}>
                  {FACETS.map(f => {
                    const on = sel.facet === f.id;
                    return (
                      <button key={f.id}
                        onClick={()=>{ patch({ facet: f.id, facetPair: f.pair }); setFacetOpen(false); }}
                        style={{
                          padding:'6px 9px', textAlign:'left',
                          background: on ? 'var(--abyss-3)' : 'transparent',
                          border:'1px solid', borderColor: on ? f.color : 'transparent',
                          color:'var(--bone)', display:'flex', gap:8, alignItems:'baseline',
                        }}>
                        <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color:f.color, width:18 }}>{f.glyph}</span>
                        <span style={{ flex:1 }}>
                          <span style={{ fontFamily:'Cinzel, serif', fontSize:11.5, letterSpacing:'0.04em' }}>{f.name}</span>
                          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8,
                            color:'var(--bone-dim)', letterSpacing:'0.15em', marginLeft:6, textTransform:'uppercase' }}>
                            {facetPairById(f.pair)?.name}
                          </span>
                          <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:10.5,
                            fontStyle:'italic', color:'var(--bone-dim)', marginTop:1 }}>{f.blurb}</span>
                        </span>
                        {on && <span style={{ color:f.color, fontSize:10 }}>◆</span>}
                      </button>
                    );
                  })}
                  <button onClick={()=>{ patch({ facet: null }); setFacetOpen(false); }}
                    style={{ padding:'6px 9px', textAlign:'left', background:'transparent',
                      border:'1px solid transparent', color:'var(--bone-dim)',
                      fontFamily:'Cinzel, serif', fontSize:11.5, display:'flex', gap:8 }}>
                    <span style={{ width:18 }}>∅</span> None — no temperament
                  </button>
                </div>
              )}
              {facet && !facetOpen && (
                <div style={{ marginTop:6, fontFamily:'Cormorant Garamond, serif', fontSize:12,
                  fontStyle:'italic', color:'var(--bone-dim)', lineHeight:1.4 }}>
                  {facet.desc(sel.evoTier)}
                </div>
              )}
            </div>

            {/* augmentations per slot */}
            <div>
              <div className="caps" style={{ marginBottom:6 }}>Augmentations · 5 Ports</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {AUG_SLOTS.map(s => {
                  const options = AUGMENTATIONS.filter(a => a.slot === s.id);
                  const augId = sel.augments?.[s.id] || '';
                  const aug = augId ? AUGMENTATIONS.find(a => a.id === augId) : null;
                  return (
                    <div key={s.id} style={{ padding:'8px 9px', background:'var(--abyss-1)',
                      border:'1px solid var(--abyss-3)', borderLeft:`3px solid ${s.color}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:s.color }}>{s.glyph}</span>
                        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                          color:s.color, letterSpacing:'0.2em', textTransform:'uppercase' }}>{s.label} Port</span>
                      </div>
                      <select value={augId} title={`${s.label} augmentation`}
                        onChange={e=>setAug(s.id, e.target.value)} style={selStyle}>
                        <option value="">— empty port —</option>
                        {options.map(a => (
                          <option key={a.id} value={a.id}>{a.name} · T{a.tier}</option>
                        ))}
                      </select>
                      {aug && (
                        <div style={{ marginTop:5, fontFamily:'Cormorant Garamond, serif', fontSize:11.5,
                          fontStyle:'italic', color:'var(--bone-dim)', lineHeight:1.4 }}>
                          {aug.effect}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* save — edits persist only when committed */}
            <div style={{ position:'sticky', bottom:0, marginTop:'auto',
              background:'var(--abyss-0)', borderTop:'1px solid var(--abyss-3)',
              padding:'10px 0 2px', display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                letterSpacing:'0.18em', textAlign:'center',
                color: dirty ? 'var(--brass)' : 'var(--bone-dim)' }}>
                {dirty ? '● UNSAVED CHANGES' : '◇ ALL CHANGES SAVED'}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn ghost sm" onClick={revert} disabled={!dirty}>↺ Revert</button>
                <button className="btn primary sm" onClick={saveUnit} disabled={!dirty}
                  style={{ flex:1, justifyContent:'center' }}>
                  ✓ Save Unit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* delete confirmation */}
      {confirmDel && sel && (
        <ConfirmDialog
          danger
          title={`Delete “${sel.name}”?`}
          message="This custom unit will be unmade. This cannot be undone."
          confirmLabel="✕ Delete Unit"
          onConfirm={deleteUnit}
          onClose={()=>setConfirmDel(false)}/>
      )}
    </div>
  );
};

window.UnitEditor = UnitEditor;
