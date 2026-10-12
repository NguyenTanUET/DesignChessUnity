// Level Editor — wire the campaign from the main menu. Nothing about a board is
// authored here (that is the Board Editor's job); this table only decides which
// mission follows which, and inside a mission which stage leads to which.
//
// A MISSION (stored as a level) is a set of STAGES wired into a flow graph. Each
// stage plays one board, picked from the boards tagged "Appear on Campaign".
//
// MISSION LINKS: `next` chains missions into a campaign. A mission that leads to
// two or more others is a fork: the missions it leads to become DECISION
// assignments, and undertaking one forsakes its siblings.
//
// BRANCH ROUTES: every stage routes by CONDITION — e.g. an Advance stage may
// send the player to 1c when they exit at mark A, but to 1d at mark B. Routes
// can also fire on plain objective completion or a custom-written condition.
// Marks belong to the stage's board, so editing or swapping that board can
// strand a route; the stage panel flags it.
//
// Schema and storage live in ForgeLibrary.jsx.

const forgeRouteId = () => `rt-${Math.random().toString(36).slice(2,8)}`;

const forgeDefaultStage = (label) => ({
  id: `st-${Math.random().toString(36).slice(2,8)}`,
  label, boardId:null, routes:[],
});

const forgeRouteBadge = (board, rt) =>
  rt.when === 'complete' ? '✓' : rt.when === 'custom' ? '✎' : forgeMarkLetter(board, rt.when);

// =============================================================================
// CAMPAIGN — missions chained by `next`. Shared with the Command Chamber, which
// lists these missions as assignments.
// =============================================================================

// Can `from` reach `to` by following links? Used to refuse links that loop.
const forgeReaches = (levels, from, to) => {
  const byId = Object.fromEntries(levels.map(l => [l.id, l]));
  const seen = new Set();
  const stack = [from];
  while (stack.length) {
    const id = stack.pop();
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    (byId[id]?.next || []).forEach(n => stack.push(n));
  }
  return false;
};

// Derive the campaign graph:
//   { [levelId]: { prev, next, depth, decision, locksOut, forkFrom } }
// A mission reached from a fork (a mission with 2+ links) is a decision; it
// locks out every other mission that same fork leads to.
const forgeCampaign = (levels) => {
  const ids = new Set(levels.map(l => l.id));
  const node = {};
  levels.forEach(l => {
    node[l.id] = { prev:[], next:(l.next || []).filter(id => ids.has(id) && id !== l.id),
      depth:0, decision:false, locksOut:[], forkFrom:[] };
  });
  levels.forEach(l => node[l.id].next.forEach(t => node[t].prev.push(l.id)));

  // Forks: each sibling forsakes the rest.
  levels.forEach(l => {
    const kids = node[l.id].next;
    if (kids.length < 2) return;
    kids.forEach(k => {
      node[k].decision = true;
      node[k].forkFrom.push(l.id);
      kids.forEach(o => { if (o !== k && !node[k].locksOut.includes(o)) node[k].locksOut.push(o); });
    });
  });

  // Depth = longest path from any opening mission, so a merge sits after both arms.
  const order = [];
  const indeg = Object.fromEntries(levels.map(l => [l.id, node[l.id].prev.length]));
  const queue = levels.filter(l => indeg[l.id] === 0).map(l => l.id);
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    node[id].next.forEach(t => {
      node[t].depth = Math.max(node[t].depth, node[id].depth + 1);
      if (--indeg[t] === 0) queue.push(t);
    });
  }
  return node;
};

// A mission dressed as an assignment, so the Command Chamber can list it beside
// the authored ones. `cnode` is that mission's entry from forgeCampaign();
// `boardsById` resolves each stage's board.
const forgeLevelAsAssignment = (level, cnode, boardsById) => {
  const stages = level.stages || [];
  const boards = stages.map(st => boardsById[st.boardId]).filter(Boolean);
  const entry = boardsById[stages[0]?.boardId] || {};
  const obj = FORGE_OBJECTIVES.find(o => o.id === entry.objective) || FORGE_OBJECTIVES[0];
  const sum = (k) => boards.reduce((n, b) => n + (b.rewards?.[k] || 0), 0);
  const relic = boards.flatMap(b => b.rewards?.relics || [])[0] || null;
  let h = 0;
  for (let i = 0; i < level.id.length; i++) h = (h * 31 + level.id.charCodeAt(i)) >>> 0;
  const hue = [190, 270, 25, 150, 75, 300, 220][h % 7];
  return {
    id: level.id, kind:'campaign', name: level.name,
    type: obj.name.toUpperCase(),
    location: `${stages.length} stage${stages.length === 1 ? '' : 's'} · entry board ${entry.w || 8}×${entry.h || 8}`,
    weather: level.weather || 'Uncharted water — authored at the Cartographer’s Table.',
    description: level.description || `${obj.desc} An authored tide of ${stages.length} stage${stages.length === 1 ? '' : 's'}.`,
    overseer: null,
    rewards: { coral: sum('coral'), dna: sum('dna'), lumin: sum('lumin'), relic },
    palette: { top:`oklch(0.24 0.06 ${hue})`, bottom:`oklch(0.09 0.025 ${hue})`, accent:`oklch(0.72 0.14 ${hue})` },
    map: 0,
    width: entry.lineupW || formationFitting(entry.w || 8),
    depth: cnode?.depth || 0,
    prev: cnode?.prev || [],
    decision: !!cnode?.decision,
    locksOut: cnode?.locksOut || [],
  };
};

const LevelForge = ({ go }) => {
  // Boards are read only — they are authored in the Board Editor.
  const [lib] = React.useState(forgeLoadLibrary);
  const [levels, setLevels] = React.useState(lib.levels);
  const [openId, setOpenId] = React.useState(null);
  const boardsById = React.useMemo(() => Object.fromEntries(lib.boards.map(b => [b.id, b])), [lib]);
  const campaignBoards = React.useMemo(() => lib.boards.filter(b => b.inCampaign), [lib]);
  useForgePersist('gok.customLevels', levels);

  const open = levels.find(l => l.id === openId) || null;

  const newLevel = () => {
    const lvl = {
      id:`lvl-${Math.random().toString(36).slice(2,8)}`,
      name:`Mission ${levels.length + 1}`,
      next:[],
      stages:[forgeDefaultStage('1a')],
    };
    setLevels(ls => [...ls, lvl]);
    setOpenId(lvl.id);
  };

  const updateLevel = (id, mutator) =>
    setLevels(ls => ls.map(l => l.id === id ? { ...l, ...mutator(l) } : l));

  // Deleting a mission also cuts every link that pointed at it.
  const deleteLevel = (id) => {
    setLevels(ls => ls
      .filter(l => l.id !== id)
      .map(l => (l.next || []).includes(id) ? { ...l, next: l.next.filter(x => x !== id) } : l));
    if (openId === id) setOpenId(null);
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
          <button className="btn ghost sm" onClick={()=> open ? setOpenId(null) : go('menu')}>
            ← {open ? 'All Missions' : 'Menu'}
          </button>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
              color:'var(--brass-dim)', textTransform:'uppercase' }}>
              Cartographer&rsquo;s Table
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              LEVEL EDITOR {open ? `· ${open.name}` : ''}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {open ? `${open.stages.length} STAGE${open.stages.length===1?'':'S'}` : `${levels.length} MISSION${levels.length===1?'':'S'}`}
          {' · '}{campaignBoards.length} CAMPAIGN BOARD{campaignBoards.length===1?'':'S'}
        </div>
      </div>

      {open
        ? <ForgeMissionEditor key={open.id} level={open} levels={levels}
            boardsById={boardsById} campaignBoards={campaignBoards}
            onChange={(mut)=>updateLevel(open.id, mut)}
            onDelete={()=>deleteLevel(open.id)}/>
        : <ForgeLevelList levels={levels} boardsById={boardsById}
            onOpen={setOpenId} onNew={newLevel} onDelete={deleteLevel}/>}
    </div>
  );
};

// =============================================================================
// MISSION LIST
// =============================================================================
const ForgeLevelList = ({ levels, boardsById, onOpen, onNew, onDelete }) => {
  const campaign = React.useMemo(() => forgeCampaign(levels), [levels]);
  const nameOf = (id) => levels.find(l => l.id === id)?.name || '?';
  const flowSummary = (lvl) => {
    const edges = [];
    lvl.stages.forEach(s => s.routes.forEach(rt => {
      const t = lvl.stages.find(x => x.id === rt.target);
      if (t) edges.push(`${s.label}→${t.label}·${forgeRouteBadge(boardsById[s.boardId], rt)}`);
    }));
    if (!edges.length) return 'no flow wired';
    return edges.slice(0,4).join('  ') + (edges.length > 4 ? `  +${edges.length-4}` : '');
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 36px' }}>
      <div style={{ marginBottom:20, maxWidth:760 }}>
        <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Chart Unwritten Tides</div>
        <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
          CHART THE CAMPAIGN
        </h1>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
          fontStyle:'italic', lineHeight:1.6 }}>
          A mission is a chain of stages, each played on a board from the Board Editor.
          Link missions into a campaign, branch the stages on conditions, and the tide will follow your chart.
        </div>
      </div>

      <ForgeCampaignGraph levels={levels} campaign={campaign} onOpen={onOpen}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, maxWidth:1100 }}>
        {levels.map(lvl => {
          const unboarded = lvl.stages.filter(s => !boardsById[s.boardId]).length;
          return (
            <div key={lvl.id} className="panel ornate hoverable" style={{ padding:'18px 18px', cursor:'pointer' }}
              onClick={()=>onOpen(lvl.id)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:17, color:'var(--bone)', letterSpacing:'0.05em' }}>
                  {lvl.name}
                </div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--brass)',
                  letterSpacing:'0.18em' }}>
                  {lvl.stages.length} STAGE{lvl.stages.length===1?'':'S'}
                </div>
              </div>
              <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:9.5,
                color:'var(--bio-dim)', letterSpacing:'0.12em' }}>
                {flowSummary(lvl)}
              </div>
              <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:9,
                letterSpacing:'0.12em', color:'var(--bone-dim)', display:'flex', gap:8, flexWrap:'wrap' }}>
                {campaign[lvl.id]?.next.length
                  ? <span>→ {campaign[lvl.id].next.map(nameOf).join(' · ')}</span>
                  : <span style={{ opacity:0.6 }}>→ campaign ends here</span>}
                {campaign[lvl.id]?.decision && (
                  <span style={{ color:'var(--coral)' }}>◣ DECISION</span>
                )}
              </div>
              {unboarded > 0 && (
                <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                  color:'oklch(0.75 0.1 30)', letterSpacing:'0.12em' }}>
                  ⚠ {unboarded} STAGE{unboarded===1?'':'S'} WITHOUT A BOARD
                </div>
              )}
              <div style={{ display:'flex', gap:6, marginTop:14 }}>
                <button className="btn ghost sm" onClick={(e)=>{ e.stopPropagation(); onOpen(lvl.id); }}>✎ Edit</button>
                <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)' }}
                  onClick={(e)=>{ e.stopPropagation(); onDelete(lvl.id); }}>✕ Delete</button>
              </div>
            </div>
          );
        })}

        <button onClick={onNew}
          style={{ minHeight:130, background:'transparent', border:'1px dashed var(--abyss-4)',
            color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:15, letterSpacing:'0.08em',
            display:'grid', placeItems:'center' }}>
          + New Mission
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// MISSION EDITOR — left: name, links, stages · center: stage flow + board ·
// right: the selected stage's board and routes
// =============================================================================
const ForgeMissionEditor = ({ level, levels, boardsById, campaignBoards, onChange, onDelete }) => {
  const stages = level.stages;
  const [selId, setSelId] = React.useState(stages[0]?.id || null);
  const stage = stages.find(s => s.id === selId) || stages[0] || null;
  const board = stage ? boardsById[stage.boardId] || null : null;

  const updateStage = (stageId, mutator) =>
    onChange(lvl => ({ stages: lvl.stages.map(s => s.id === stageId ? { ...s, ...mutator(s) } : s) }));

  const addStage = () => {
    const label = `1${String.fromCharCode(97 + (stages.length % 26))}`;
    const st = forgeDefaultStage(label);
    onChange(lvl => ({ stages: [...lvl.stages, st] }));
    setSelId(st.id);
  };

  const deleteStage = (stageId) => {
    if (stages.length <= 1) return; // a mission keeps at least its entry stage
    onChange(lvl => ({
      stages: lvl.stages
        .filter(s => s.id !== stageId)
        .map(s => ({ ...s, routes: s.routes.filter(rt => rt.target !== stageId) })),
    }));
    if (selId === stageId) setSelId(stages.find(s => s.id !== stageId)?.id || null);
  };

  return (
    <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'300px 1fr 320px', gap:0 }}>

      {/* LEFT — name, mission links, stage list */}
      <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        display:'flex', flexDirection:'column', gap:14 }}>

        <div>
          <div className="caps" style={{ marginBottom:6 }}>Mission Name</div>
          <input value={level.name} title="Mission name"
            onChange={e=>onChange(()=>({ name: e.target.value }))}
            style={{ width:'100%', padding:'8px 10px', background:'var(--abyss-0)',
              border:'1px solid var(--abyss-4)', color:'var(--bone)',
              fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.04em', outline:'none' }}/>
        </div>

        <ForgeLinkPanel level={level} levels={levels} onChange={onChange}/>

        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
          <div className="caps" style={{ marginBottom:6 }}>Stages</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {stages.map((s, i) => {
              const isSel = s.id === selId;
              const b = boardsById[s.boardId];
              const leads = s.routes
                .map(rt => { const t = stages.find(x=>x.id===rt.target); return t ? `${t.label}·${forgeRouteBadge(b, rt)}` : null; })
                .filter(Boolean);
              return (
                <div key={s.id} className="hoverable" onClick={()=>setSelId(s.id)}
                  style={{
                    padding:'10px 12px', cursor:'pointer',
                    background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                    border:'1px solid', borderColor: isSel ? 'var(--brass)' : 'var(--abyss-3)',
                    borderLeft: isSel ? '3px solid var(--brass)' : '3px solid transparent',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', letterSpacing:'0.06em' }}>
                      {s.label}
                      {i === 0 && <span style={{ marginLeft:8, fontFamily:'JetBrains Mono, monospace',
                        fontSize:8, color:'var(--bio)', letterSpacing:'0.2em' }}>◈ ENTRY</span>}
                    </span>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
                      letterSpacing:'0.12em' }}>{b ? `${b.size} · ${b.w}×${b.h}` : ''}</span>
                  </div>
                  <div style={{ marginTop:4, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                    color: b ? 'var(--bio-dim)' : 'oklch(0.75 0.1 30)', letterSpacing:'0.12em',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {b ? b.name.toUpperCase() : '⚠ NO BOARD'}
                    {leads.length > 0 && <span style={{ color:'var(--bone-dim)' }}> · → {leads.join(', ')}</span>}
                  </div>
                </div>
              );
            })}
            <button onClick={addStage}
              style={{ padding:'9px 12px', background:'transparent', border:'1px dashed var(--abyss-4)',
                color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.06em' }}>
              + Add Stage
            </button>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <button className="btn ghost sm" disabled={stages.length <= 1}
            onClick={()=>deleteStage(stage?.id)}
            style={{ color: stages.length<=1 ? 'var(--bone-dim)' : 'oklch(0.7 0.15 25)', justifyContent:'center' }}>
            ✕ Delete Stage{stage ? ` · ${stage.label}` : ''}
          </button>
          <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)', justifyContent:'center' }}
            onClick={onDelete}>
            ✕ Delete This Mission
          </button>
        </div>
      </div>

      {/* CENTER — stage flow + the selected stage's board */}
      <div style={{ minHeight:0, overflow:'auto', padding:'16px 20px',
        display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
            <div className="caps">Stage Flow</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
              letterSpacing:'0.15em' }}>
              EDGE TAGS · ✓ COMPLETE · A/B/C MARK · ✎ CUSTOM · CLICK A STAGE TO SELECT
            </div>
          </div>
          <ForgeStageGraph stages={stages} boardsById={boardsById} selId={stage?.id} onSelect={setSelId}/>
        </div>
        {stage && <ForgeStageBoardPreview stage={stage} board={board}/>}
      </div>

      {/* RIGHT — stage settings */}
      {stage && (
        <ForgeStagePanel key={stage.id} stage={stage} stages={stages} board={board}
          boardsById={boardsById} campaignBoards={campaignBoards}
          onEdit={(mut)=>updateStage(stage.id, mut)}/>
      )}
    </div>
  );
};

// =============================================================================
// LINK PANEL — which missions this one leads to. Two or more links make a fork.
// =============================================================================
const ForgeLinkPanel = ({ level, levels, onChange }) => {
  const campaign = React.useMemo(() => forgeCampaign(levels), [levels]);
  const me = campaign[level.id] || { next:[], prev:[] };
  const nameOf = (id) => levels.find(l => l.id === id)?.name || '?';

  const link = (id) => id && onChange(l => ({ next: [...(l.next || []), id] }));
  const unlink = (id) => onChange(l => ({ next: (l.next || []).filter(x => x !== id) }));

  // Everything not already linked; a mission that can already reach this one
  // would close a loop, so it is offered but disabled.
  const options = levels
    .filter(l => l.id !== level.id && !me.next.includes(l.id))
    .map(l => ({ id:l.id, name:l.name, loops: forgeReaches(levels, l.id, level.id) }));

  const inp = { width:'100%', padding:'7px 10px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:11, outline:'none' };

  return (
    <div>
      <div className="caps" style={{ marginBottom:6 }}>Leads To</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:6 }}>
        {me.next.map(id => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 9px',
            background:'var(--abyss-1)',
            border:`1px solid ${me.next.length > 1 ? 'oklch(0.55 0.13 25 / 0.6)' : 'var(--abyss-3)'}` }}>
            <span style={{ color: me.next.length > 1 ? 'var(--coral)' : 'var(--brass)',
              fontFamily:'Cinzel, serif', fontSize:13 }}>{me.next.length > 1 ? '◣' : '→'}</span>
            <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nameOf(id)}</span>
            <button onClick={()=>unlink(id)} title="Remove link"
              style={{ background:'transparent', border:'none', color:'var(--bone-dim)', cursor:'pointer',
                fontFamily:'JetBrains Mono, monospace', fontSize:12, padding:'0 2px' }}>×</button>
          </div>
        ))}
      </div>

      {options.length > 0 ? (
        <select value="" title="Link a mission" onChange={e=>link(e.target.value)} style={inp}>
          <option value="">+ Link a mission…</option>
          {options.map(o => (
            <option key={o.id} value={o.id} disabled={o.loops}>
              {o.name}{o.loops ? '  — would loop back' : ''}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
          letterSpacing:'0.12em' }}>
          ‣ {levels.length < 2 ? 'CREATE ANOTHER MISSION TO LINK TO' : 'LINKED TO EVERY OTHER MISSION'}
        </div>
      )}

      {me.next.length > 1 && (
        <div style={{ marginTop:8, padding:'8px 10px', background:'oklch(0.18 0.05 25 / 0.35)',
          border:'1px solid oklch(0.45 0.12 25 / 0.5)' }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--coral)',
            letterSpacing:'0.2em' }}>◣ FORK · DECISION</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
            color:'var(--bone-dim)', marginTop:3, lineHeight:1.45 }}>
            {me.next.map(nameOf).join(' and ')} become decision assignments.
            Undertaking one forsakes the other{me.next.length > 2 ? 's' : ''}.
          </div>
        </div>
      )}

      {me.prev.length > 0 && (
        <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
          color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
          ← REACHED FROM {me.prev.map(nameOf).join(' · ').toUpperCase()}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CAMPAIGN GRAPH — every mission, tiered by depth; fork edges drawn in coral
// =============================================================================
const ForgeCampaignGraph = ({ levels, campaign, onOpen }) => {
  if (levels.length === 0) return null;
  const linked = levels.some(l => (campaign[l.id]?.next || []).length > 0);

  const tiers = {};
  levels.forEach(l => { const d = campaign[l.id]?.depth || 0; (tiers[d] = tiers[d] || []).push(l); });
  const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  const maxRows = Math.max(...tierKeys.map(t => tiers[t].length));

  const NW = 132, NH = 34, colW = 190, rowH = 52;
  const W = Math.max(760, tierKeys.length * colW + 40);
  const H = maxRows * rowH + 30;
  const pos = {};
  tierKeys.forEach((t, ti) => tiers[t].forEach((l, i) => {
    pos[l.id] = { x: 20 + ti * colW + (colW - NW) / 2,
                  y: 15 + i * rowH + (maxRows - tiers[t].length) * rowH / 2 };
  }));

  return (
    <div style={{ maxWidth:1100, marginBottom:22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
        <div className="caps">Campaign</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
          letterSpacing:'0.18em' }}>
          → LINK · <span style={{ color:'var(--coral)' }}>◣ FORK = DECISION</span> · CLICK A MISSION TO EDIT
        </div>
      </div>
      <div style={{ overflowX:'auto', background:'var(--abyss-0)', border:'1px solid var(--abyss-3)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:W, height:H, display:'block' }}>
          {levels.map(l => (campaign[l.id]?.next || []).map(t => {
            const a = pos[l.id], b = pos[t];
            if (!a || !b) return null;
            const fork = campaign[l.id].next.length > 1;
            const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2;
            const mx = (x1 + x2) / 2;
            return (
              <g key={`${l.id}-${t}`}>
                <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 6} ${y2}`} fill="none"
                  stroke={fork ? 'var(--coral)' : 'var(--brass-dim)'} strokeWidth="1.2"
                  strokeDasharray={fork ? '4 3' : 'none'} opacity="0.85"/>
                <path d={`M ${x2 - 7} ${y2 - 4} L ${x2} ${y2} L ${x2 - 7} ${y2 + 4} Z`}
                  fill={fork ? 'var(--coral)' : 'var(--brass-dim)'}/>
              </g>
            );
          }))}
          {levels.map(l => {
            const p = pos[l.id];
            const c = campaign[l.id] || {};
            return (
              <g key={l.id} transform={`translate(${p.x} ${p.y})`} style={{ cursor:'pointer' }}
                onClick={()=>onOpen(l.id)}>
                <rect width={NW} height={NH} fill="var(--abyss-2)"
                  stroke={c.decision ? 'var(--coral)' : c.prev?.length ? 'var(--abyss-4)' : 'var(--bio-dim)'}
                  strokeWidth="1.2"/>
                <text x={NW / 2} y={NH / 2 + 4} textAnchor="middle" fontFamily="Cinzel, serif"
                  fontSize="12" fill="var(--bone)">
                  {l.name.length > 16 ? l.name.slice(0, 15) + '…' : l.name}
                </text>
                {c.decision && <text x={NW - 6} y="10" textAnchor="end" fontFamily="JetBrains Mono, monospace"
                  fontSize="7" fill="var(--coral)" letterSpacing="0.15em">◣ DECISION</text>}
                {!c.prev?.length && <text x="6" y="10" fontFamily="JetBrains Mono, monospace"
                  fontSize="7" fill="var(--bio-dim)" letterSpacing="0.15em">OPENING</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {!linked && levels.length > 1 && (
        <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
          color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
          ‣ NOTHING LINKED YET — OPEN A MISSION AND USE “LEADS TO” TO CHAIN THE CAMPAIGN
        </div>
      )}
    </div>
  );
};

// =============================================================================
// STAGE GRAPH — BFS-tiered from the entry stage; each node names its board and
// each edge carries its route condition tag. Routes that point back to an
// earlier tier dip under the nodes.
// =============================================================================
const ForgeStageGraph = ({ stages, boardsById, selId, onSelect }) => {
  if (!stages.length) return null;
  const depth = { [stages[0].id]: 0 };
  const queue = [stages[0].id];
  while (queue.length) {
    const id = queue.shift();
    const s = stages.find(x => x.id === id);
    (s?.routes || []).forEach(rt => {
      if (rt.target && depth[rt.target] === undefined && stages.find(x=>x.id===rt.target)) {
        depth[rt.target] = depth[id] + 1;
        queue.push(rt.target);
      }
    });
  }
  const extraTier = Math.max(0, ...Object.values(depth)) + 1;
  stages.forEach(s => { if (depth[s.id] === undefined) depth[s.id] = extraTier; });

  const tiers = {};
  stages.forEach(s => { (tiers[depth[s.id]] = tiers[depth[s.id]] || []).push(s); });
  const tierKeys = Object.keys(tiers).map(Number).sort((a,b)=>a-b);
  const maxRows = Math.max(...tierKeys.map(t => tiers[t].length));

  const NW = 150, NH = 52, colW = 230, rowH = 74, DIP = 46;
  const W = Math.max(740, tierKeys.length * colW + 40);
  const H = maxRows * rowH + 30 + DIP;
  const x0 = (W - tierKeys.length * colW) / 2;
  const pos = {};
  tierKeys.forEach((t, ti) => tiers[t].forEach((s, i) => {
    pos[s.id] = { x: x0 + ti * colW + (colW - NW) / 2,
                  y: 22 + i * rowH + (maxRows - tiers[t].length) * rowH / 2 };
  }));
  const clip = (str, n) => str.length > n ? str.slice(0, n - 1) + '…' : str;

  return (
    <div style={{ overflowX:'auto', background:'var(--abyss-0)', border:'1px solid var(--abyss-3)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:W, height:H, display:'block' }}>
        {/* edges + condition tags */}
        {stages.map(s => s.routes.map(rt => {
          const a = pos[s.id], b = pos[rt.target];
          if (!a || !b) return null;
          const forward = b.x > a.x;
          // cubic P0 → P3 with handles P1, P2. Forward: right side → left side.
          // Same tier: loops out past the right sides. Backward: left side →
          // right side, sagging under the forward edges that share the gap.
          const yA = a.y + NH * 0.75, yB = b.y + NH * 0.75, mx = (a.x + b.x + NW) / 2;
          const [p0, p1, p2, p3] = forward
            ? [[a.x + NW, a.y + NH/2], [(a.x + NW + b.x)/2, a.y + NH/2], [(a.x + NW + b.x)/2, b.y + NH/2], [b.x, b.y + NH/2]]
            : b.x === a.x
            ? [[a.x + NW, a.y + NH/2], [a.x + NW + 40, a.y + NH/2], [b.x + NW + 40, b.y + NH/2], [b.x + NW, b.y + NH/2]]
            : [[a.x, yA], [mx, yA + DIP], [mx, yB + DIP], [b.x + NW, yB]];
          // Tag at the curve's middle; a backward edge tags near its target so it
          // stays clear of the forward tags sharing the same gap.
          const t = forward || b.x === a.x ? 0.5 : 0.8;
          const bez = (i) => (1-t)**3 * p0[i] + 3*(1-t)**2*t * p1[i] + 3*(1-t)*t*t * p2[i] + t**3 * p3[i];
          const tx = bez(0), ty = bez(1);
          const ang = Math.atan2(p3[1] - p2[1], p3[0] - p2[0]) * 180 / Math.PI;
          return (
            <g key={rt.id}>
              <path d={`M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`}
                fill="none" stroke="var(--brass-dim)" strokeWidth="1.2" opacity="0.85"
                strokeDasharray={forward ? 'none' : '4 3'}/>
              <path d="M -7 -4 L 0 0 L -7 4 Z" fill="var(--brass-dim)"
                transform={`translate(${p3[0]} ${p3[1]}) rotate(${ang})`}/>
              <circle cx={tx} cy={ty} r="8" fill="var(--abyss-0)" stroke="var(--abyss-4)" strokeWidth="0.8"/>
              <text x={tx} y={ty + 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace"
                fontSize="8.5" fill="var(--brass)">{forgeRouteBadge(boardsById[s.boardId], rt)}</text>
            </g>
          );
        }))}
        {/* nodes */}
        {stages.map((s, i) => {
          const p = pos[s.id];
          const isSel = s.id === selId;
          const b = boardsById[s.boardId];
          const obj = b ? FORGE_OBJECTIVES.find(o => o.id === b.objective) : null;
          return (
            <g key={s.id} transform={`translate(${p.x} ${p.y})`} style={{ cursor:'pointer' }}
              onClick={()=>onSelect(s.id)}>
              <rect width={NW} height={NH} fill={isSel ? 'oklch(0.26 0.05 188)' : 'var(--abyss-2)'}
                stroke={isSel ? 'var(--brass)' : !b ? 'oklch(0.6 0.12 30)' : i === 0 ? 'var(--bio-dim)' : 'var(--abyss-4)'}
                strokeWidth="1.2"/>
              <text x="10" y="18" fontFamily="Cinzel, serif" fontSize="13"
                fill={isSel ? 'var(--brass)' : 'var(--bone)'}>{clip(s.label, 14)}</text>
              {obj && <text x={NW - 9} y="18" textAnchor="end" fontFamily="Cinzel, serif" fontSize="12"
                fill="var(--brass)">{obj.glyph}</text>}
              <text x="10" y="33" fontFamily="JetBrains Mono, monospace" fontSize="8.5"
                fill={b ? 'var(--bone-dim)' : 'oklch(0.75 0.1 30)'}>
                {b ? clip(b.name, 24) : '⚠ NO BOARD'}
              </text>
              {b && <text x="10" y="45" fontFamily="JetBrains Mono, monospace" fontSize="7.5"
                fill="var(--bio-dim)" letterSpacing="0.1em">{b.size} · {b.w}×{b.h} · W{b.lineupW}</text>}
              {i === 0 && <text x="0" y="-6" fontFamily="JetBrains Mono, monospace"
                fontSize="7" fill="var(--bio-dim)" letterSpacing="0.2em">◈ ENTRY</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// =============================================================================
// STAGE BOARD PREVIEW — the selected stage's board, read-only, marks lettered
// =============================================================================
const ForgeStageBoardPreview = ({ stage, board }) => {
  if (!board) {
    return (
      <div style={{ padding:'28px 16px', border:'1px dashed var(--abyss-4)', textAlign:'center',
        fontFamily:'Cormorant Garamond, serif', fontSize:13.5, fontStyle:'italic', color:'var(--bone-dim)' }}>
        Stage {stage.label} has no board yet — pick one from the campaign boards on the right.
      </div>
    );
  }
  const obj = FORGE_OBJECTIVES.find(o => o.id === board.objective);
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <div className="caps">Board · {board.name}</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
          letterSpacing:'0.15em' }}>
          {obj?.glyph} {obj?.name.toUpperCase()} · {board.size} {board.w}×{board.h} · LINEUP W{board.lineupW}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', padding:14, background:'var(--abyss-0)',
        border:'1px solid var(--abyss-3)' }}>
        <ForgeBoardThumb board={board} box={420} maxCell={34}/>
      </div>
      <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
        letterSpacing:'0.15em', textAlign:'center' }}>
        <span style={{ color:'var(--bio)' }}>▪ DEPLOY</span> · <span style={{ color:'var(--brass)' }}>⚑ MARK</span> ·
        {' '}<span style={{ color:'var(--coral)' }}>▁ ENEMY</span> · <span style={{ color:'var(--bio)' }}>▁ ALLY</span> ·
        {' '}EDIT THE BOARD ITSELF IN THE BOARD EDITOR
      </div>
    </div>
  );
};

// =============================================================================
// STAGE PANEL — right rail (label, board, branch routes)
// =============================================================================
const ForgeStagePanel = ({ stage, stages, board, boardsById, campaignBoards, onEdit }) => {
  const others = stages.filter(s => s.id !== stage.id);
  const marks = board?.objCells || [];

  // --- branch routes ---
  const addRoute = () => onEdit(cur => ({
    routes: [...cur.routes, { id:forgeRouteId(), when:'complete', cond:'', target: others[0]?.id || null }],
  }));
  const editRoute = (id, patch) => onEdit(cur => ({
    routes: cur.routes.map(rt => rt.id === id ? { ...rt, ...patch } : rt),
  }));
  const removeRoute = (id) => onEdit(cur => ({ routes: cur.routes.filter(rt => rt.id !== id) }));

  const whenOptions = [
    { value:'complete', label:'✓ Objective complete' },
    ...marks.map((k, i) => ({ value:k, label:`⚑ At mark ${String.fromCharCode(65+i)} (${k})` })),
    { value:'custom', label:'✎ Custom condition…' },
  ];
  const isStale = (rt) => rt.when !== 'complete' && rt.when !== 'custom' && !marks.includes(rt.when);

  const warnings = [];
  if (!stage.boardId) warnings.push('No board chosen for this stage.');
  else if (!board) warnings.push('Its board was deleted in the Board Editor.');
  else if (!board.inCampaign) warnings.push('Its board is no longer tagged “Appear on Campaign”.');
  const routesNoTarget = stage.routes.filter(rt => !rt.target || !stages.find(s=>s.id===rt.target)).length;
  if (routesNoTarget > 0) warnings.push(`${routesNoTarget} route(s) missing a target stage.`);
  const routesStaleMark = stage.routes.filter(isStale).length;
  if (routesStaleMark > 0) warnings.push(`${routesStaleMark} route(s) bound to a mark this board does not have.`);

  const selStyle = {
    width:'100%', padding:'6px 8px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.06em', outline:'none',
  };
  const boardOption = (b) => {
    const obj = FORGE_OBJECTIVES.find(o => o.id === b.objective);
    return `${obj?.glyph || ''} ${b.name} · ${b.size} ${b.w}×${b.h}`;
  };
  // The current board stays listed even when it has left the campaign list.
  const offList = stage.boardId && !campaignBoards.some(b => b.id === stage.boardId);

  return (
    <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      display:'flex', flexDirection:'column', gap:14 }}>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Stage Label</div>
        <input value={stage.label} title="Stage label"
          onChange={e=>onEdit(()=>({ label: e.target.value }))}
          style={{ width:'100%', padding:'7px 10px', background:'var(--abyss-0)',
            border:'1px solid var(--abyss-4)', color:'var(--bone)',
            fontFamily:'Cinzel, serif', fontSize:13, outline:'none' }}/>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Board</div>
        <select value={stage.boardId || ''} title="Board this stage plays on"
          onChange={e=>onEdit(()=>({ boardId: e.target.value || null }))}
          style={{ ...selStyle, fontSize:10.5, padding:'7px 8px' }}>
          <option value="">— choose board —</option>
          {offList && (
            <option value={stage.boardId}>
              ⚠ {board ? `${board.name} (off campaign)` : 'deleted board'}
            </option>
          )}
          {campaignBoards.map(b => <option key={b.id} value={b.id}>{boardOption(b)}</option>)}
        </select>
        {campaignBoards.length === 0 && (
          <div style={{ marginTop:5, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:'var(--bone-dim)', letterSpacing:'0.12em', lineHeight:1.6 }}>
            ‣ NO BOARD IS TAGGED FOR THE CAMPAIGN — SET “APPEAR ON CAMPAIGN” IN THE BOARD EDITOR
          </div>
        )}
        {board && (
          <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
            {[
              ['Size',    `${forgeSizeById(board.size).label} · ${board.w}×${board.h}`],
              ['Lineup',  `W${board.lineupW}`],
              ['Objective', FORGE_OBJECTIVES.find(o => o.id === board.objective)?.name],
              ['Marks',   marks.length ? marks.map((_, i) => String.fromCharCode(65 + i)).join(' ') : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 2px',
                borderBottom:'1px dashed var(--abyss-3)', fontFamily:'JetBrains Mono, monospace', fontSize:9.5 }}>
                <span style={{ color:'var(--bone-dim)', letterSpacing:'0.15em', textTransform:'uppercase' }}>{k}</span>
                <span style={{ color:'var(--bone)' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === BRANCH ROUTES === */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <div className="caps">Branch Routes</div>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:'var(--bio-dim)', letterSpacing:'0.15em' }}>{stage.routes.length} WIRED</span>
        </div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11.5, fontStyle:'italic',
          color:'var(--bone-dim)', marginBottom:8, lineHeight:1.5 }}>
          Where the tide flows next, by condition — e.g. exit at mark A → one stage, mark B → another.
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {stage.routes.map(rt => {
            const staleMark = isStale(rt);
            return (
              <div key={rt.id} style={{ padding:'8px 9px', background:'var(--abyss-1)',
                border:`1px solid ${staleMark ? 'oklch(0.5 0.12 30)' : 'var(--abyss-3)'}`,
                display:'flex', flexDirection:'column', gap:6 }}>
                <select value={rt.when} title="Route condition"
                  onChange={e=>editRoute(rt.id, { when:e.target.value })}
                  style={selStyle}>
                  {staleMark && <option value={rt.when}>⚠ missing mark ({rt.when})</option>}
                  {whenOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {rt.when === 'custom' && (
                  <input value={rt.cond} placeholder="Describe the condition…" title="Custom condition"
                    onChange={e=>editRoute(rt.id, { cond:e.target.value })}
                    style={{ ...selStyle, fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic' }}/>
                )}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)' }}>→</span>
                  <select value={rt.target || ''} title="Target stage"
                    onChange={e=>editRoute(rt.id, { target:e.target.value || null })}
                    style={{ ...selStyle, flex:1 }}>
                    <option value="">— choose stage —</option>
                    {others.map(s => {
                      const tb = boardsById[s.boardId];
                      return <option key={s.id} value={s.id}>{s.label}{tb ? ` · ${tb.name}` : ''}</option>;
                    })}
                  </select>
                  <button onClick={()=>removeRoute(rt.id)} title="Remove route"
                    style={{ width:24, height:24, padding:0, background:'transparent',
                      border:'1px solid var(--abyss-4)', color:'var(--bone-dim)',
                      fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>×</button>
                </div>
              </div>
            );
          })}
          <button onClick={addRoute} disabled={others.length === 0}
            style={{ padding:'7px 10px', background:'transparent', border:'1px dashed var(--abyss-4)',
              color: others.length === 0 ? 'var(--bone-dim)' : 'var(--brass)',
              fontFamily:'Cinzel, serif', fontSize:11.5, letterSpacing:'0.06em' }}>
            + Add Route{others.length === 0 ? ' (add another stage first)' : ''}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{ padding:'10px 12px', background:'oklch(0.18 0.05 30 / 0.4)',
          border:'1px solid oklch(0.4 0.1 30 / 0.5)' }}>
          {warnings.map((wn,i) => (
            <div key={i} style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
              color:'oklch(0.75 0.1 30)', letterSpacing:'0.08em', lineHeight:1.7 }}>⚠ {wn}</div>
          ))}
        </div>
      )}

      <div style={{ flex:1 }}/>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
        letterSpacing:'0.18em', textAlign:'center' }}>
        ‣ AUTOSAVED TO LOCAL HOLD
      </div>
    </div>
  );
};

window.LevelForge = LevelForge;
window.forgeCampaign = forgeCampaign;
window.forgeLevelAsAssignment = forgeLevelAsAssignment;
