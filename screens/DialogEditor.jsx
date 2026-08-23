// Dialog Editor — author turn-based mission dialogue beside the Level and Unit
// editors. A line is PLACED (which assignment / which stage, or between two
// assignments at base) and TRIGGERED (anchored to a mission event), then spoken
// by a character.
//
// Persists to localStorage('gok.customDialogs'). Schema:
//   dlg = { id, missionId, location:'assignment'|'base',
//           assignmentId, fromAssignmentId, toAssignmentId,   (ids of authored levels)
//           stageKey ('briefing' | '' = any | levelId:stageId), priority, objective,
//           anchor:{ type, param }, maxVisit, character, content }

// Objectives mirror the Level Editor's list, read lazily so script order can't bite.
const dlgObjectives = () => (typeof FORGE_OBJECTIVES !== 'undefined' ? FORGE_OBJECTIVES : []);

// Every anchor a line can hang on. `param` says what extra value it needs;
// `objective` restricts it to one objective type; `scope` says whether it can be
// heard inside a mission, at base between assignments, or both.
const DLG_ANCHORS = [
  { id:'returned-to-base',   label:'Returned to Base',        param:null,     scope:'base' },
  { id:'briefing-start',     label:'Briefing Start',          param:null,     scope:'briefing' },
  { id:'follow-dialog',      label:'Follow up from dialog ?', param:'dialog', scope:'both' },
  { id:'mission-start',      label:'Mission Start',           param:null },
  { id:'stage-start',        label:'Stage ? Start',           param:'stage' },
  { id:'stage-complete',     label:'After Stage ? Complete',  param:'stage' },
  { id:'turn-start',         label:'Turn ? Start',            param:'number', unit:'turn' },
  { id:'unit-captured',      label:'Unit ? Captured',         param:'unit' },
  { id:'enemy-below',        label:'Enemy count below ?',     param:'number', unit:'enemies' },
  { id:'ally-below',         label:'Ally count below ?',      param:'number', unit:'allies' },
  { id:'ally-cmdr-life',     label:'Ally Commander Life below ?',  param:'number', unit:'hp' },
  { id:'enemy-cmdr-life',    label:'Enemy Commander Life below ?', param:'number', unit:'hp' },
  { id:'objective-complete', label:'Objective Complete',      param:null },
  { id:'escort-turn',        label:'Escort turn ?',           param:'number', unit:'turn', objective:'escort' },
  { id:'resource-retrieved', label:'Resource ? Retrieved',    param:'mark',   objective:'retrieve' },
  { id:'seize-turn',         label:'Seize Control turn ?',    param:'number', unit:'turn', objective:'seize' },
  { id:'position-reached',   label:'Position ? Reached',      param:'mark',   objective:'advance' },
];
const dlgAnchorById = (id) => DLG_ANCHORS.find(a => a.id === id) || null;

// The pre-mission briefing — the default "stage" of an assignment. No board is
// played there, so it carries no objective.
const DLG_BRIEFING = 'briefing';
const dlgIsBriefing = (dlg) => dlg.location === 'assignment' && dlg.stageKey === DLG_BRIEFING;
// True only where a board is actually played — the one place an objective and a
// visit count mean anything. Base and briefing lines have neither.
const dlgIsPlayed = (dlg) => dlg.location === 'assignment' && dlg.stageKey !== DLG_BRIEFING;

// Base and briefing lines both play in a straight line, so only two anchors
// make sense in either.
const dlgAnchorsFor = (dlg) => DLG_ANCHORS.filter(a => {
  const scope = a.scope || 'mission';
  if (dlg.location === 'base') return scope === 'base' || scope === 'both';
  if (dlgIsBriefing(dlg)) return scope === 'briefing' || scope === 'both';
  if (scope === 'base' || scope === 'briefing') return false;
  return !a.objective || a.objective === dlg.objective;
});

// Every voice the game can speak with.
const DLG_CHARACTERS = [
  'Leoric', 'Naia', 'Vesper', 'Fin', 'Ivy', 'Sandro', 'Elowen', 'Malgast',
  'Ulbert', 'Hark', 'Inias', 'Roland', 'Selah', 'Dirge', 'Nercrylla', 'Perch',
  'Roc', 'Beholder', 'Vulkan', 'The Outcast', 'Sarine', 'The Unamed', 'Garoth',
  'Legder', 'Cress', 'Keiran', 'Luther', 'Tasha', 'Camilla', 'Paul',
];

const dlgDefault = (assignments = []) => ({
  id: `dlg-${Math.random().toString(36).slice(2,8)}`,
  missionId: '',
  location: 'assignment',
  assignmentId: assignments[0]?.id || '',
  fromAssignmentId: assignments[0]?.id || '',
  toAssignmentId: assignments[1]?.id || assignments[0]?.id || '',
  stageKey: DLG_BRIEFING,
  priority: 0,
  objective: 'exterminate',
  anchor: { type:'briefing-start', param:'' },
  maxVisit: 1,
  character: '',
  content: '',
});

// An ASSIGNMENT is a level authored in the Level Editor (Tide 1, Tide 2 …), and
// its STAGES are that level's stages — a stage is a sub-unit of one assignment.
const dlgAssignments = () => {
  let levels = [];
  try { levels = JSON.parse(localStorage.getItem('gok.customLevels')) || []; } catch(e) {}
  return levels.map(lvl => ({ id: lvl.id, name: lvl.name, stages: lvl.stages || [] }));
};

// Every stage across every assignment, tagged with the one it belongs to.
const dlgAllStages = (assignments) => {
  const out = [];
  assignments.forEach(a => a.stages.forEach(st => {
    out.push({ key:`${a.id}:${st.id}`, label:st.label, assignmentId:a.id, stage:st });
  }));
  return out;
};

const DialogEditor = ({ go }) => {
  const ASSIGNMENTS = React.useMemo(dlgAssignments, []);
  const [dialogs, setDialogs] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('gok.customDialogs')) || []; }
    catch(e) { return []; }
  });
  const [selId, setSelId] = React.useState(null);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const stages = React.useMemo(() => dlgAllStages(ASSIGNMENTS), [ASSIGNMENTS]);

  // Debounced persistence, flushed on the way out (same as the Level Editor).
  const ref = React.useRef(dialogs); ref.current = dialogs;
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      try { localStorage.setItem('gok.customDialogs', JSON.stringify(ref.current)); } catch(e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [dialogs]);
  React.useEffect(() => () => {
    try { localStorage.setItem('gok.customDialogs', JSON.stringify(ref.current)); } catch(e) {}
  }, []);

  const sel = dialogs.find(d => d.id === selId) || null;
  const patch = (p) => setDialogs(ds => ds.map(d => d.id === selId ? { ...d, ...p } : d));
  const setAnchor = (p) => sel && patch({ anchor: { ...sel.anchor, ...p } });
  // Only the chosen assignment's stages are ever offered — a stage lives inside one.
  const stagesHere = sel && sel.location === 'assignment'
    ? stages.filter(s => s.assignmentId === sel.assignmentId) : [];
  // Any move between base / briefing / a played stage can strand an anchor that
  // doesn't exist on the other side. Re-validate against the destination.
  const reanchor = (next) => {
    const anc = dlgAnchorById(sel.anchor?.type);
    if (dlgAnchorsFor(next).some(a => a.id === anc?.id)) {
      // Same anchor survives, but a stage/mark value may now point elsewhere.
      const stale = anc?.param === 'stage' || anc?.param === 'mark';
      return { ...next, anchor: stale ? { ...sel.anchor, param:'' } : sel.anchor };
    }
    const fallback = next.location === 'base' ? 'returned-to-base'
      : dlgIsBriefing(next) ? 'briefing-start' : 'mission-start';
    return { ...next, anchor: { type:fallback, param:'' } };
  };
  const setAssignment = (id) => sel && patch(reanchor({ ...sel, assignmentId:id, stageKey:DLG_BRIEFING }));
  const setStage = (key) => sel && patch(reanchor({ ...sel, stageKey:key }));
  const setLocation = (loc) => sel && patch(reanchor({ ...sel, location:loc }));

  const newDialog = () => {
    const d = dlgDefault(ASSIGNMENTS);
    d.missionId = `d-${String(dialogs.length + 1).padStart(2,'0')}`;
    setDialogs(ds => [...ds, d]);
    setSelId(d.id);
  };
  const deleteDialog = () => { setDialogs(ds => ds.filter(d => d.id !== selId)); setSelId(null); };

  const assignmentName = (id) => ASSIGNMENTS.find(a => a.id === id)?.name || '—';
  // Lines sharing this line's placement — the scope its mission-ID must be unique in.
  const sameScope = (d) => sel && d.id !== sel.id && d.location === sel.location && (
    sel.location === 'assignment'
      ? d.assignmentId === sel.assignmentId
      : d.fromAssignmentId === sel.fromAssignmentId && d.toAssignmentId === sel.toAssignmentId);

  const inp = {
    width:'100%', padding:'7px 10px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:11, letterSpacing:'0.05em', outline:'none',
  };
  const Field = ({ label, hint, children }) => (
    <div>
      <div className="caps" style={{ marginBottom:5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, fontStyle:'italic',
        color:'var(--bone-dim)', marginTop:3 }}>{hint}</div>}
    </div>
  );

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
              color:'var(--brass-dim)', textTransform:'uppercase' }}>Chorus of the Deep</div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              DIALOG EDITOR
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {dialogs.length} LINE{dialogs.length===1?'':'S'}
        </div>
      </div>

      <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'290px 1fr 300px', gap:0 }}>

        {/* LEFT — the script */}
        <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          display:'flex', flexDirection:'column', gap:10 }}>
          <div className="caps">Script</div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            {dialogs.length === 0 && (
              <div style={{ padding:'22px 12px', border:'1px dashed var(--abyss-4)', textAlign:'center',
                fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic',
                color:'var(--bone-dim)', lineHeight:1.5 }}>
                Nothing spoken yet.<br/>Write the first line.
              </div>
            )}
            {dialogs.map(d => {
              const isSel = d.id === selId;
              const where = d.location === 'assignment'
                ? `${assignmentName(d.assignmentId)}${dlgIsBriefing(d) ? ' ❧ briefing' : ''}`
                : `${assignmentName(d.fromAssignmentId)} → ${assignmentName(d.toAssignmentId)}`;
              const anc = dlgAnchorById(d.anchor?.type);
              return (
                <div key={d.id} className="hoverable" onClick={()=>setSelId(d.id)}
                  style={{
                    padding:'9px 11px', cursor:'pointer',
                    background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid', borderColor: isSel ? 'var(--brass)' : 'var(--abyss-3)',
                    borderLeft:`3px solid ${d.location === 'base' ? 'var(--bio)' : 'var(--brass)'}`,
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6 }}>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)',
                      letterSpacing:'0.12em' }}>{d.missionId || '(no id)'}</span>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8,
                      color:'var(--bone-dim)', letterSpacing:'0.15em' }}>P{d.priority ?? 0}</span>
                  </div>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)', marginTop:3,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {d.character || '— unattributed —'}
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, fontStyle:'italic',
                    color:'var(--bone-dim)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden',
                    textOverflow:'ellipsis' }}>
                    {d.content || '(silence)'}
                  </div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5, color:'var(--bio-dim)',
                    letterSpacing:'0.12em', marginTop:4, textTransform:'uppercase',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {d.location === 'base' ? '⌂ base' : '✠ mission'} · {where} · {anc?.label || '—'}
                  </div>
                </div>
              );
            })}
            <button onClick={newDialog}
              style={{ padding:'9px 12px', background:'transparent', border:'1px dashed var(--abyss-4)',
                color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.06em' }}>
              + New Line
            </button>
          </div>
          {sel && (
            <button className="btn ghost sm" onClick={()=>setConfirmDel(true)}
              style={{ color:'oklch(0.7 0.15 25)', justifyContent:'center' }}>
              ✕ Delete Line
            </button>
          )}
        </div>

        {/* CENTER — placement & trigger */}
        {!sel ? (
          <div style={{ display:'grid', placeItems:'center', textAlign:'center', padding:40 }}>
            <div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:44, color:'var(--brass-deep)' }}>❝</div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic',
                color:'var(--bone-dim)', lineHeight:1.6, margin:'12px 0 18px', maxWidth:420 }}>
                Say where the line is heard, what must happen before it is spoken,<br/>
                and whose mouth it comes out of.
              </div>
              <button className="btn primary" onClick={newDialog} style={{ padding:'12px 28px' }}>
                + New Line
              </button>
            </div>
          </div>
        ) : (
          <div style={{ minHeight:0, overflowY:'auto', padding:'18px 22px',
            display:'flex', flexDirection:'column', gap:16 }}>

            {/* ── PLACEMENT ── */}
            <div className="panel ornate" style={{ padding:'14px 16px', display:'flex',
              flexDirection:'column', gap:12 }}>
              <div className="eyebrow" style={{ color:'var(--brass-dim)' }}>◆ Placement</div>

              <Field label="Location">
                <div style={{ display:'flex', gap:8 }}>
                  {[{ id:'assignment', glyph:'✠', label:'On Assignment', sub:'Spoken inside a mission' },
                    { id:'base', glyph:'⌂', label:'Between Assignments', sub:'Spoken at base' }].map(o => {
                    const on = sel.location === o.id;
                    return (
                      <button key={o.id} onClick={()=>setLocation(o.id)}
                        style={{
                          flex:1, padding:'10px 12px', textAlign:'left', cursor:'pointer',
                          background: on ? 'linear-gradient(180deg, oklch(0.35 0.08 188), oklch(0.22 0.05 192))' : 'var(--abyss-1)',
                          border:`1px solid ${on ? 'var(--brass)' : 'var(--abyss-4)'}`,
                          borderLeft:`3px solid ${on ? 'var(--brass)' : 'var(--abyss-4)'}`, color:'var(--bone)',
                        }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontFamily:'Cinzel, serif', fontSize:17,
                            color: on ? 'var(--brass)' : 'var(--bone-dim)' }}>{o.glyph}</span>
                          <span style={{ fontFamily:'Cinzel, serif', fontSize:12.5, letterSpacing:'0.04em' }}>{o.label}</span>
                        </div>
                        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, fontStyle:'italic',
                          color:'var(--bone-dim)', marginTop:3 }}>{o.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {sel.location === 'assignment' ? (
                <>
                  <Field label="Assignment">
                    <select value={sel.assignmentId} title="Assignment"
                      onChange={e=>setAssignment(e.target.value)} style={inp}>
                      <option value="">— choose assignment —</option>
                      {ASSIGNMENTS.map(a => (
                        <option key={a.id} value={a.id}>✠ {a.name}</option>
                      ))}
                    </select>
                    {ASSIGNMENTS.length === 0 && (
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                        color:'var(--bone-dim)', letterSpacing:'0.12em', marginTop:4 }}>
                        ‣ NO ASSIGNMENTS YET — BUILD ONE IN THE LEVEL EDITOR
                      </div>
                    )}
                  </Field>
                  <Field label="Stage" hint="Briefing is spoken before the first board — no objective there.">
                    <select value={sel.stageKey} title="Stage"
                      onChange={e=>setStage(e.target.value)} style={inp}>
                      <option value={DLG_BRIEFING}>❧ Briefing</option>
                      <option value="">◇ Any stage</option>
                      {stagesHere.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {sel.assignmentId && stagesHere.length === 0 && (
                      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                        color:'var(--bone-dim)', letterSpacing:'0.12em', marginTop:4 }}>
                        ‣ {assignmentName(sel.assignmentId).toUpperCase()} HAS NO STAGES YET
                      </div>
                    )}
                  </Field>
                </>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap:8, alignItems:'end' }}>
                  <Field label="After">
                    <select value={sel.fromAssignmentId} title="After assignment"
                      onChange={e=>patch({ fromAssignmentId:e.target.value })} style={inp}>
                      <option value="">— choose —</option>
                      {ASSIGNMENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                  <div style={{ textAlign:'center', fontFamily:'Cinzel, serif', fontSize:16,
                    color:'var(--brass)', paddingBottom:6 }}>→</div>
                  <Field label="Before">
                    <select value={sel.toAssignmentId} title="Before assignment"
                      onChange={e=>patch({ toAssignmentId:e.target.value })} style={inp}>
                      <option value="">— choose —</option>
                      {ASSIGNMENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {/* A briefing plays once, in order — revisiting it is not a thing. */}
              <div style={{ display:'grid',
                gridTemplateColumns: dlgIsPlayed(sel) ? '1.2fr 1fr 1fr' : '1.2fr 1fr', gap:10 }}>
                <Field label="ID in Mission">
                  <input value={sel.missionId} placeholder="d-01" title="Dialogue id"
                    onChange={e=>patch({ missionId:e.target.value })} style={inp}/>
                </Field>
                <Field label="Priority">
                  <input type="number" value={sel.priority} title="Priority"
                    onChange={e=>patch({ priority:Number(e.target.value) || 0 })} style={inp}/>
                </Field>
                {dlgIsPlayed(sel) && (
                  <Field label="Max Visit">
                    <input type="number" min={0} value={sel.maxVisit} title="Max visit"
                      onChange={e=>patch({ maxVisit:Math.max(0, Number(e.target.value) || 0) })} style={inp}/>
                  </Field>
                )}
              </div>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11, fontStyle:'italic',
                color:'var(--bone-dim)', marginTop:-6 }}>
                Higher priority is spoken first when several lines qualify at once
                {dlgIsPlayed(sel) && ' · Max Visit 0 = unlimited'}.
              </div>
            </div>

            {/* ── TRIGGER ── */}
            <div className="panel ornate" style={{ padding:'14px 16px', display:'flex',
              flexDirection:'column', gap:12 }}>
              <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Trigger</div>

              {!dlgIsPlayed(sel) ? (
                <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11.5, fontStyle:'italic',
                  color:'var(--bone-dim)', marginTop:-4 }}>
                  {sel.location === 'base'
                    ? 'At base the script runs in a straight line — no objective, spoken once.'
                    : 'No board is played at the briefing — the script runs straight through, with no objective.'}
                </div>
              ) : (
                <Field label="Objective" hint="Some anchors only exist for a particular objective.">
                  <select value={sel.objective} title="Objective"
                    onChange={e=>patch({ objective:e.target.value })} style={inp}>
                    {dlgObjectives().map(o => (
                      <option key={o.id} value={o.id}>{o.glyph} {o.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Anchor To">
                <select value={sel.anchor?.type || 'mission-start'} title="Anchor"
                  onChange={e=>setAnchor({ type:e.target.value, param:'' })} style={inp}>
                  {dlgAnchorsFor(sel).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </Field>

              <DialogAnchorParam dlg={sel} stages={stagesHere} dialogs={dialogs}
                onChange={(v)=>setAnchor({ param:v })} inp={inp}/>
            </div>
          </div>
        )}

        {/* RIGHT — the line itself */}
        {sel && (
          <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'18px 16px',
            background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
            display:'flex', flexDirection:'column', gap:14 }}>

            <Field label="Character">
              <DialogSpeaker value={sel.character} onChange={(v)=>patch({ character:v })} inp={inp}/>
            </Field>

            <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div className="caps" style={{ marginBottom:5 }}>Content</div>
              <textarea value={sel.content} title="Dialogue content"
                onChange={e=>patch({ content:e.target.value })}
                placeholder="What is said…"
                style={{ ...inp, flex:1, minHeight:180, resize:'vertical', lineHeight:1.6,
                  fontFamily:'Cormorant Garamond, serif', fontSize:14, letterSpacing:'0' }}/>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
                letterSpacing:'0.15em', marginTop:4, textAlign:'right' }}>
                {(sel.content || '').length} CHARS
              </div>
            </div>

            <DialogWarnings dlg={sel} dialogs={dialogs} sameScope={sameScope} stagesHere={stagesHere}/>
          </div>
        )}
      </div>

      {confirmDel && sel && (
        <ConfirmDialog
          danger
          title={`Delete “${sel.missionId || 'this line'}”?`}
          message="This line and its trigger will be unwritten. This cannot be undone."
          confirmLabel="✕ Delete Line"
          onConfirm={deleteDialog}
          onClose={()=>setConfirmDel(false)}/>
      )}
    </div>
  );
};

// The extra value an anchor needs — shape depends on the anchor kind.
const DialogAnchorParam = ({ dlg, stages, dialogs, onChange, inp }) => {
  const anc = dlgAnchorById(dlg.anchor?.type);
  if (!anc || !anc.param) return null;
  const val = dlg.anchor?.param ?? '';

  if (anc.param === 'number') {
    return (
      <div>
        <div className="caps" style={{ marginBottom:5 }}>{anc.label.replace('?', '').trim()} · value</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <input type="number" min={0} value={val} title="Anchor value"
            onChange={e=>onChange(e.target.value)} style={{ ...inp, width:120 }}/>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
            letterSpacing:'0.18em', textTransform:'uppercase' }}>{anc.unit}</span>
        </div>
      </div>
    );
  }

  if (anc.param === 'stage') {
    return (
      <div>
        <div className="caps" style={{ marginBottom:5 }}>Which stage</div>
        <select value={val} title="Anchor stage" onChange={e=>onChange(e.target.value)} style={inp}>
          <option value="">— choose stage —</option>
          {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {stages.length === 0 && (
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:'var(--bone-dim)', letterSpacing:'0.12em', marginTop:4 }}>
            ‣ THIS ASSIGNMENT HAS NO STAGES YET
          </div>
        )}
      </div>
    );
  }

  if (anc.param === 'dialog') {
    const others = dialogs.filter(d => d.id !== dlg.id);
    return (
      <div>
        <div className="caps" style={{ marginBottom:5 }}>Which dialogue</div>
        <select value={val} title="Anchor dialogue" onChange={e=>onChange(e.target.value)} style={inp}>
          <option value="">— choose dialogue —</option>
          {others.map(d => (
            <option key={d.id} value={d.missionId || d.id}>
              {d.missionId || d.id} · {d.character || 'unattributed'}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (anc.param === 'unit') {
    let custom = [];
    try { custom = JSON.parse(localStorage.getItem('gok.customUnits')) || []; } catch(e) {}
    return (
      <div>
        <div className="caps" style={{ marginBottom:5 }}>Which unit</div>
        <select value={val} title="Anchor unit" onChange={e=>onChange(e.target.value)} style={inp}>
          <option value="">— choose unit —</option>
          <optgroup label="Species">
            {Object.values(FOLLOWER_ARCHETYPES).map(a =>
              <option key={a.key} value={a.key}>{a.glyph} {a.name}</option>)}
          </optgroup>
          {custom.length > 0 && (
            <optgroup label="Custom units">
              {custom.map(u => <option key={u.id} value={u.id}>◈ {u.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>
    );
  }

  // 'mark' — objective marks of the chosen stage, or free text when none is bound
  const st = stages.find(s => s.key === dlg.stageKey)?.stage;
  const marks = (st?.objCells || []).map((c, i) => ({ v:String.fromCharCode(65+i), cell:c }));
  return (
    <div>
      <div className="caps" style={{ marginBottom:5 }}>
        {dlg.anchor?.type === 'position-reached' ? 'Which position' : 'Which resource mark'}
      </div>
      {marks.length > 0 ? (
        <select value={val} title="Anchor mark" onChange={e=>onChange(e.target.value)} style={inp}>
          <option value="">— choose mark —</option>
          {marks.map(m => <option key={m.v} value={m.v}>⚑ Mark {m.v} ({m.cell})</option>)}
        </select>
      ) : (
        <>
          <input value={val} placeholder="A" title="Anchor mark"
            onChange={e=>onChange(e.target.value)} style={inp}/>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
            letterSpacing:'0.12em', marginTop:4 }}>
            ‣ BIND A STAGE ABOVE TO PICK FROM ITS ⚑ MARKS
          </div>
        </>
      )}
    </div>
  );
};

// Speaker — one of the cast.
const DialogSpeaker = ({ value, onChange, inp }) => (
  <select value={DLG_CHARACTERS.includes(value) ? value : ''} title="Character"
    onChange={e=>onChange(e.target.value)} style={inp}>
    <option value="">— choose speaker —</option>
    {DLG_CHARACTERS.map(n => <option key={n} value={n}>{n}</option>)}
  </select>
);

// Soft validation — same tone as the Level Editor's warnings.
const DialogWarnings = ({ dlg, dialogs, sameScope, stagesHere = [] }) => {
  const anc = dlgAnchorById(dlg.anchor?.type);
  const w = [];
  if (dlg.location === 'assignment' && !dlg.assignmentId)
    w.push('No assignment chosen for this line.');
  if (dlg.location === 'assignment' && dlg.stageKey && dlg.stageKey !== DLG_BRIEFING
      && !stagesHere.some(s => s.key === dlg.stageKey))
    w.push('Bound stage no longer belongs to this assignment.');
  if (!dlg.missionId.trim()) w.push('This line has no ID in mission.');
  else if (dialogs.some(d => sameScope(d) && d.missionId === dlg.missionId))
    w.push(`ID “${dlg.missionId}” is already used at this placement.`);
  if (anc?.param && !String(dlg.anchor?.param || '').trim())
    w.push(`Anchor “${anc.label}” still needs its value.`);
  if (dlgIsPlayed(dlg) && anc?.objective && anc.objective !== dlg.objective)
    w.push('Anchor belongs to another objective — pick a new anchor.');
  if (!dlg.character) w.push('No one is speaking this line.');
  if (dlg.location === 'base' && (!dlg.fromAssignmentId || !dlg.toAssignmentId))
    w.push('Base lines need both assignments chosen.');
  else if (dlg.location === 'base' && dlg.fromAssignmentId === dlg.toAssignmentId)
    w.push('Base lines should sit between two different assignments.');
  if (!dlg.content.trim()) w.push('Nothing is said yet.');

  if (w.length === 0) {
    return (
      <div style={{ padding:'8px 12px', border:'1px solid var(--bio-dim)',
        fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio)',
        letterSpacing:'0.15em', textTransform:'uppercase' }}>
        ◆ Line is complete
      </div>
    );
  }
  return (
    <div style={{ padding:'10px 12px', background:'oklch(0.18 0.05 30 / 0.4)',
      border:'1px solid oklch(0.4 0.1 30 / 0.5)' }}>
      {w.map((line,i) => (
        <div key={i} style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
          color:'oklch(0.75 0.1 30)', letterSpacing:'0.08em', lineHeight:1.7 }}>⚠ {line}</div>
      ))}
    </div>
  );
};

window.DialogEditor = DialogEditor;
