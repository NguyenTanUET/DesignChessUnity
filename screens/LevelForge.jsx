// Level Forge — author custom levels from the main menu.
// A level is a set of STAGES wired into a flow graph (1a → 1b, 1c → 1d …).
// Each stage is one board: custom width/height, blocked squares, objective,
// enemy placement, pre-placed allied formation, the initial deploy zone and
// the maximum zone the player may expand into during play.
//
// Authoring data persists to localStorage('gok.customLevels'), independent of
// any run. Schema:
//   level = { id, name, stages:[stage] }            (stages[0] = entry)
//   stage = { id, label, w, h, blocked:[], deploy:[], maxZone:[], objCells:[],
//             enemies:{cell:type}, allies:{cell:type},
//             objective:'reach'|'escort'|'regicide'|'annihilate'|'survive',
//             turns, next:[stageId] }
// Cells are keyed "r-c".

const FORGE_PIECES = ['P','N','B','R','Q','K'];
const FORGE_GLYPH_ALLY  = { P:'♙', N:'♘', B:'♗', R:'♖', Q:'♕', K:'♔' };
const FORGE_GLYPH_ENEMY = { P:'♟', N:'♞', B:'♝', R:'♜', Q:'♛', K:'♚' };

const FORGE_OBJECTIVES = [
  { id:'reach',      glyph:'⚑', name:'Reach the Mark', desc:'Bring any unit to a marked square.',        needsCells:true  },
  { id:'escort',     glyph:'☥', name:'Escort',         desc:'Walk a chosen ward to a marked square.',    needsCells:true  },
  { id:'regicide',   glyph:'♚', name:'Regicide',       desc:'Slay the enemy sovereign.',                 needsCells:false },
  { id:'annihilate', glyph:'✕', name:'Annihilate',     desc:'Leave no enemy standing.',                  needsCells:false },
  { id:'survive',    glyph:'⏳', name:'Survive',        desc:'Endure the tide for N turns.',              needsCells:false, turns:true },
];

const FORGE_TOOLS = [
  { id:'blocked',   glyph:'⛔', label:'Blocked',   hint:'Squares no piece may enter.',                    color:'oklch(0.6 0.05 30)' },
  { id:'deploy',    glyph:'◈', label:'Deploy',    hint:'Initial zone the player may act in.',            color:'var(--bio)' },
  { id:'max',       glyph:'◇', label:'Max Zone',  hint:'Furthest zone reachable during play.',           color:'var(--bio-dim)' },
  { id:'objective', glyph:'⚑', label:'Obj. Cell', hint:'Target squares for reach / escort.',             color:'var(--brass)' },
  { id:'enemy',     glyph:'♟', label:'Enemy',     hint:'Place an enemy piece.',                          color:'var(--coral)' },
  { id:'ally',      glyph:'♙', label:'Formation', hint:'Pre-placed allied piece, set before play.',      color:'var(--bio)' },
  { id:'erase',     glyph:'⌫', label:'Erase',     hint:'Clear everything from a square.',                color:'var(--bone-dim)' },
];

const forgeDefaultStage = (label) => ({
  id: `st-${Math.random().toString(36).slice(2,8)}`,
  label, w:8, h:8,
  blocked:[], deploy:[], maxZone:[], objCells:[],
  enemies:{}, allies:{},
  objective:'regicide', turns:30,
  next:[],
});

const LevelForge = ({ go }) => {
  const [levels, setLevels] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('gok.customLevels')) || []; }
    catch(e) { return []; }
  });
  const [openId, setOpenId] = React.useState(null);

  React.useEffect(() => {
    localStorage.setItem('gok.customLevels', JSON.stringify(levels));
  }, [levels]);

  const open = levels.find(l => l.id === openId) || null;

  const newLevel = () => {
    const lvl = {
      id:`lvl-${Math.random().toString(36).slice(2,8)}`,
      name:`Tide ${levels.length + 1}`,
      stages:[forgeDefaultStage('1a')],
    };
    setLevels(ls => [...ls, lvl]);
    setOpenId(lvl.id);
  };

  const updateLevel = (id, mutator) =>
    setLevels(ls => ls.map(l => l.id === id ? { ...l, ...mutator(l) } : l));

  const deleteLevel = (id) => {
    setLevels(ls => ls.filter(l => l.id !== id));
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
            ← {open ? 'All Levels' : 'Menu'}
          </button>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
              color:'var(--brass-dim)', textTransform:'uppercase' }}>
              Cartographer&rsquo;s Table
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              LEVEL FORGE {open ? `· ${open.name}` : ''}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {open ? `${open.stages.length} STAGE${open.stages.length===1?'':'S'}` : `${levels.length} LEVEL${levels.length===1?'':'S'} FORGED`}
        </div>
      </div>

      {open
        ? <ForgeEditor key={open.id} level={open}
            onChange={(mut)=>updateLevel(open.id, mut)}
            onDelete={()=>deleteLevel(open.id)}/>
        : <ForgeLevelList levels={levels} onOpen={setOpenId} onNew={newLevel} onDelete={deleteLevel}/>}
    </div>
  );
};

// =============================================================================
// LEVEL LIST
// =============================================================================
const ForgeLevelList = ({ levels, onOpen, onNew, onDelete }) => {
  const flowSummary = (lvl) => {
    const edges = [];
    lvl.stages.forEach(s => s.next.forEach(nId => {
      const t = lvl.stages.find(x => x.id === nId);
      if (t) edges.push(`${s.label}→${t.label}`);
    }));
    if (!edges.length) return 'no flow wired';
    return edges.slice(0,4).join(' · ') + (edges.length > 4 ? `  +${edges.length-4}` : '');
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 36px' }}>
      <div style={{ marginBottom:20, maxWidth:760 }}>
        <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Chart Unwritten Tides</div>
        <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
          FORGE A LEVEL
        </h1>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
          fontStyle:'italic', lineHeight:1.6 }}>
          A level is a chain of stages — each stage a board of its own shape, its own
          obstacles, its own demand. Wire stage into stage and the tide will follow your chart.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, maxWidth:1100 }}>
        {levels.map(lvl => (
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
            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <button className="btn ghost sm" onClick={(e)=>{ e.stopPropagation(); onOpen(lvl.id); }}>✎ Edit</button>
              <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)' }}
                onClick={(e)=>{ e.stopPropagation(); onDelete(lvl.id); }}>✕ Delete</button>
            </div>
          </div>
        ))}

        <button onClick={onNew}
          style={{ minHeight:130, background:'transparent', border:'1px dashed var(--abyss-4)',
            color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:15, letterSpacing:'0.08em',
            display:'grid', placeItems:'center' }}>
          + Forge New Level
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// EDITOR — left: flow + stages · center: painter · right: stage settings
// =============================================================================
const ForgeEditor = ({ level, onChange, onDelete }) => {
  const stages = level.stages;
  const [selId, setSelId] = React.useState(stages[0]?.id || null);
  const [tool, setTool] = React.useState('blocked');
  const [pieceType, setPieceType] = React.useState('P');
  const stage = stages.find(s => s.id === selId) || stages[0] || null;

  const updateStage = (stageId, mutator) =>
    onChange(lvl => ({ stages: lvl.stages.map(s => s.id === stageId ? { ...s, ...mutator(s) } : s) }));

  const addStage = () => {
    const label = `1${String.fromCharCode(97 + (stages.length % 26))}`;
    const st = forgeDefaultStage(label);
    onChange(lvl => ({ stages: [...lvl.stages, st] }));
    setSelId(st.id);
  };

  const deleteStage = (stageId) => {
    if (stages.length <= 1) return; // a level keeps at least its entry stage
    onChange(lvl => ({
      stages: lvl.stages
        .filter(s => s.id !== stageId)
        .map(s => ({ ...s, next: s.next.filter(n => n !== stageId) })),
    }));
    if (selId === stageId) setSelId(stages.find(s => s.id !== stageId)?.id || null);
  };

  return (
    <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'300px 1fr 300px', gap:0 }}>

      {/* LEFT — name, flow graph, stage list */}
      <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        display:'flex', flexDirection:'column', gap:14 }}>

        <div>
          <div className="caps" style={{ marginBottom:6 }}>Level Name</div>
          <input value={level.name} title="Level name"
            onChange={e=>onChange(()=>({ name: e.target.value }))}
            style={{ width:'100%', padding:'8px 10px', background:'var(--abyss-0)',
              border:'1px solid var(--abyss-4)', color:'var(--bone)',
              fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.04em', outline:'none' }}/>
        </div>

        <div>
          <div className="caps" style={{ marginBottom:6 }}>Stage Flow</div>
          <ForgeFlowGraph stages={stages} selId={selId} onSelect={setSelId}/>
        </div>

        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
          <div className="caps" style={{ marginBottom:6 }}>Stages</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {stages.map((s, i) => {
              const isSel = s.id === selId;
              const leads = s.next.map(nId => stages.find(x=>x.id===nId)?.label).filter(Boolean);
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
                      letterSpacing:'0.12em' }}>{s.w}×{s.h}</span>
                  </div>
                  <div style={{ marginTop:4, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                    color:'var(--bio-dim)', letterSpacing:'0.12em' }}>
                    {FORGE_OBJECTIVES.find(o=>o.id===s.objective)?.name.toUpperCase()}
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

        <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)', justifyContent:'center' }}
          onClick={onDelete}>
          ✕ Delete This Level
        </button>
      </div>

      {/* CENTER — tools + painter */}
      {stage && (
        <div style={{ minHeight:0, overflow:'auto', padding:'16px 20px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <ForgeToolbar tool={tool} setTool={setTool} pieceType={pieceType} setPieceType={setPieceType}/>
          <ForgeBoard key={stage.id} stage={stage} tool={tool} pieceType={pieceType}
            onEdit={(mut)=>updateStage(stage.id, mut)}/>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
            letterSpacing:'0.18em', textAlign:'center' }}>
            ‣ CLICK / DRAG TO PAINT · SAME TOOL AGAIN TO REMOVE
          </div>
        </div>
      )}

      {/* RIGHT — stage settings */}
      {stage && (
        <ForgeStageSettings key={stage.id} stage={stage} stages={stages}
          onEdit={(mut)=>updateStage(stage.id, mut)}
          onDeleteStage={()=>deleteStage(stage.id)}/>
      )}
    </div>
  );
};

// =============================================================================
// FLOW GRAPH — BFS-tiered mini map of stage connections
// =============================================================================
const ForgeFlowGraph = ({ stages, selId, onSelect }) => {
  if (!stages.length) return null;
  // tier each stage by BFS depth from the entry; orphans appended afterwards
  const depth = { [stages[0].id]: 0 };
  const queue = [stages[0].id];
  while (queue.length) {
    const id = queue.shift();
    const s = stages.find(x => x.id === id);
    (s?.next || []).forEach(nId => {
      if (depth[nId] === undefined && stages.find(x=>x.id===nId)) {
        depth[nId] = depth[id] + 1;
        queue.push(nId);
      }
    });
  }
  let extraTier = Math.max(0, ...Object.values(depth)) + 1;
  stages.forEach(s => { if (depth[s.id] === undefined) depth[s.id] = extraTier; });

  const tiers = {};
  stages.forEach(s => { (tiers[depth[s.id]] = tiers[depth[s.id]] || []).push(s); });
  const tierKeys = Object.keys(tiers).map(Number).sort((a,b)=>a-b);
  const maxRows = Math.max(...tierKeys.map(t => tiers[t].length));

  const W = 268, rowH = 44, H = Math.max(70, maxRows * rowH + 16);
  const tierX = (t) => tierKeys.length === 1 ? W/2 : 28 + (W-56) * (tierKeys.indexOf(t) / (tierKeys.length-1));
  const pos = {};
  tierKeys.forEach(t => tiers[t].forEach((s, i) => {
    pos[s.id] = { x: tierX(t), y: 26 + i*rowH + (maxRows - tiers[t].length) * rowH/2 };
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, background:'var(--abyss-0)',
      border:'1px solid var(--abyss-3)' }}>
      {/* edges */}
      {stages.map(s => s.next.map(nId => {
        const a = pos[s.id], b = pos[nId];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        return (
          <path key={`${s.id}-${nId}`} d={`M ${a.x+14} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x-14} ${b.y}`}
            fill="none" stroke="var(--brass-dim)" strokeWidth="1" opacity="0.8"/>
        );
      }))}
      {/* nodes */}
      {stages.map((s, i) => {
        const p = pos[s.id];
        const isSel = s.id === selId;
        return (
          <g key={s.id} transform={`translate(${p.x} ${p.y})`} style={{ cursor:'pointer' }}
            onClick={()=>onSelect(s.id)}>
            <circle r="14" fill={isSel ? 'oklch(0.3 0.06 188)' : 'var(--abyss-2)'}
              stroke={isSel ? 'var(--brass)' : i===0 ? 'var(--bio-dim)' : 'var(--abyss-4)'} strokeWidth="1.2"/>
            <text y="3.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9"
              fill={isSel ? 'var(--brass)' : 'var(--bone)'}>{s.label}</text>
            {i === 0 && <text y="-19" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
              fontSize="6.5" fill="var(--bio-dim)" letterSpacing="0.2em">ENTRY</text>}
          </g>
        );
      })}
    </svg>
  );
};

// =============================================================================
// TOOLBAR
// =============================================================================
const ForgeToolbar = ({ tool, setTool, pieceType, setPieceType }) => {
  const active = FORGE_TOOLS.find(t => t.id === tool);
  const needsPiece = tool === 'enemy' || tool === 'ally';
  return (
    <div style={{ width:'100%', maxWidth:760 }}>
      <div style={{ display:'flex', gap:6 }}>
        {FORGE_TOOLS.map(t => {
          const isSel = tool === t.id;
          return (
            <button key={t.id} onClick={()=>setTool(t.id)} title={t.hint}
              style={{
                flex:1, padding:'8px 4px',
                background: isSel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                border:`1px solid ${isSel ? t.color : 'var(--abyss-4)'}`,
                borderTop:`3px solid ${isSel ? t.color : 'var(--abyss-4)'}`,
                color: isSel ? t.color : 'var(--bone-dim)', textAlign:'center',
              }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:17, lineHeight:1 }}>{t.glyph}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.12em',
                marginTop:4, textTransform:'uppercase' }}>{t.label}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, minHeight:34 }}>
        <div style={{ flex:1, fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
          color:'var(--bone-dim)' }}>
          {active?.hint}
        </div>
        {needsPiece && (
          <div style={{ display:'flex', gap:4 }}>
            {FORGE_PIECES.map(p => {
              const isSel = pieceType === p;
              const glyph = tool === 'enemy' ? FORGE_GLYPH_ENEMY[p] : FORGE_GLYPH_ALLY[p];
              const color = tool === 'enemy' ? 'var(--coral)' : 'var(--bio)';
              return (
                <button key={p} onClick={()=>setPieceType(p)} title={p}
                  style={{
                    width:32, height:32, padding:0,
                    background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                    border:`1px solid ${isSel ? color : 'var(--abyss-4)'}`,
                    color, fontFamily:'Cinzel, serif', fontSize:18, lineHeight:1,
                  }}>
                  {glyph}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// BOARD PAINTER — click / drag paints with the active tool
// =============================================================================
const ForgeBoard = ({ stage, tool, pieceType, onEdit }) => {
  const { w, h } = stage;
  const cell = Math.max(26, Math.min(56, Math.floor(720 / w), Math.floor(560 / h)));
  // While the mouse is held, every entered cell receives the same add/remove
  // mode that the first cell decided — prevents flicker while drag-painting.
  const paint = React.useRef({ active:false, mode:'add' });

  React.useEffect(() => {
    const up = () => { paint.current.active = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const blocked = new Set(stage.blocked);
  const deploy  = new Set(stage.deploy);
  const maxZone = new Set(stage.maxZone);
  const objSet  = new Set(stage.objCells);

  const applyTo = (key, mode) => {
    onEdit(cur => {
      const has = (arr) => arr.includes(key);
      const add = (arr) => has(arr) ? arr : [...arr, key];
      const rem = (arr) => arr.filter(k => k !== key);
      if (tool === 'erase') {
        const { [key]:_e, ...enemies } = cur.enemies;
        const { [key]:_a, ...allies }  = cur.allies;
        return { blocked:rem(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies, allies };
      }
      if (tool === 'blocked') {
        if (mode === 'rem') return { blocked: rem(cur.blocked) };
        // blocking a square sweeps everything else off it
        const { [key]:_e, ...enemies } = cur.enemies;
        const { [key]:_a, ...allies }  = cur.allies;
        return { blocked:add(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies, allies };
      }
      if (cur.blocked.includes(key)) return {};          // can't paint onto blocked
      if (tool === 'deploy')    return { deploy:    mode==='add' ? add(cur.deploy)   : rem(cur.deploy) };
      if (tool === 'max')       return { maxZone:   mode==='add' ? add(cur.maxZone)  : rem(cur.maxZone) };
      if (tool === 'objective') return { objCells:  mode==='add' ? add(cur.objCells) : rem(cur.objCells) };
      if (tool === 'enemy') {
        if (mode === 'rem') { const { [key]:_x, ...enemies } = cur.enemies; return { enemies }; }
        const { [key]:_a, ...allies } = cur.allies;     // a square holds one piece
        return { enemies: { ...cur.enemies, [key]: pieceType }, allies };
      }
      if (tool === 'ally') {
        if (mode === 'rem') { const { [key]:_x, ...allies } = cur.allies; return { allies }; }
        const { [key]:_e, ...enemies } = cur.enemies;
        return { allies: { ...cur.allies, [key]: pieceType }, enemies };
      }
      return {};
    });
  };

  // Decide add vs remove from the first cell pressed.
  const modeFor = (key) => {
    if (tool === 'blocked')   return blocked.has(key) ? 'rem' : 'add';
    if (tool === 'deploy')    return deploy.has(key)  ? 'rem' : 'add';
    if (tool === 'max')       return maxZone.has(key) ? 'rem' : 'add';
    if (tool === 'objective') return objSet.has(key)  ? 'rem' : 'add';
    if (tool === 'enemy')     return stage.enemies[key] === pieceType ? 'rem' : 'add';
    if (tool === 'ally')      return stage.allies[key]  === pieceType ? 'rem' : 'add';
    return 'add';
  };

  const down = (key) => (e) => {
    e.preventDefault();
    paint.current = { active:true, mode: modeFor(key) };
    applyTo(key, paint.current.mode);
  };
  const enter = (key) => () => {
    if (paint.current.active) applyTo(key, paint.current.mode);
  };

  const cells = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells.push(`${r}-${c}`);

  return (
    <div style={{
      display:'inline-grid',
      gridTemplateColumns:`repeat(${w}, ${cell}px)`,
      gridTemplateRows:`repeat(${h}, ${cell}px)`,
      border:'1px solid var(--brass-deep)',
      boxShadow:'0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6)',
      background:'var(--abyss-1)', userSelect:'none',
    }}>
      {cells.map(key => {
        const [r, c] = key.split('-').map(Number);
        const dark = (r + c) % 2 === 1;
        const isBlocked = blocked.has(key);
        const inDeploy  = deploy.has(key);
        const inMax     = maxZone.has(key);
        const isObj     = objSet.has(key);
        const enemy = stage.enemies[key];
        const ally  = stage.allies[key];

        return (
          <div key={key}
            onMouseDown={down(key)}
            onMouseEnter={enter(key)}
            title={`${key}${isBlocked?' · blocked':''}${inDeploy?' · deploy':''}${inMax?' · max zone':''}${isObj?' · objective':''}`}
            style={{
              width:cell, height:cell, position:'relative', cursor:'crosshair',
              background: isBlocked
                ? `repeating-linear-gradient(45deg, oklch(0.09 0.015 220) 0 6px, oklch(0.13 0.03 30) 6px 12px)`
                : (dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)'),
              borderRight: c === w-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              borderBottom: r === h-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              display:'grid', placeItems:'center',
            }}>
            {/* max-zone outline */}
            {!isBlocked && inMax && (
              <div style={{ position:'absolute', inset:2, border:'1px dashed var(--bio-dim)',
                opacity:0.55, pointerEvents:'none' }}/>
            )}
            {/* deploy wash */}
            {!isBlocked && inDeploy && (
              <div style={{ position:'absolute', inset:0, background:'oklch(0.82 0.16 188 / 0.14)',
                pointerEvents:'none' }}/>
            )}
            {/* objective marker */}
            {!isBlocked && isObj && (
              <div style={{ position:'absolute', top:1, left:3, fontFamily:'Cinzel, serif',
                fontSize:Math.max(10, cell*0.26), color:'var(--brass)',
                textShadow:'0 0 8px var(--brass)', pointerEvents:'none' }}>⚑</div>
            )}
            {/* piece */}
            {!isBlocked && (enemy || ally) && (
              <div style={{ fontFamily:'Cinzel, serif', fontSize:cell*0.62, lineHeight:1,
                color: enemy ? 'var(--coral)' : 'var(--bio)',
                textShadow:`0 0 10px ${enemy ? 'var(--coral)' : 'var(--bio)'}, 0 2px 4px rgba(0,0,0,0.8)`,
                pointerEvents:'none' }}>
                {enemy ? FORGE_GLYPH_ENEMY[enemy] : FORGE_GLYPH_ALLY[ally]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// STAGE SETTINGS — right rail
// =============================================================================
const ForgeStageSettings = ({ stage, stages, onEdit, onDeleteStage }) => {
  const obj = FORGE_OBJECTIVES.find(o => o.id === stage.objective);
  const others = stages.filter(s => s.id !== stage.id);

  // prune out-of-range cells when the board shrinks
  const resize = (dw, dh) => {
    const w = Math.max(4, Math.min(14, stage.w + dw));
    const h = Math.max(4, Math.min(14, stage.h + dh));
    const fits = (key) => { const [r,c] = key.split('-').map(Number); return r < h && c < w; };
    const fitMap = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => fits(k)));
    onEdit(cur => ({
      w, h,
      blocked: cur.blocked.filter(fits), deploy: cur.deploy.filter(fits),
      maxZone: cur.maxZone.filter(fits), objCells: cur.objCells.filter(fits),
      enemies: fitMap(cur.enemies), allies: fitMap(cur.allies),
    }));
  };

  const toggleNext = (id) =>
    onEdit(cur => ({ next: cur.next.includes(id) ? cur.next.filter(x=>x!==id) : [...cur.next, id] }));

  const warnings = [];
  if (obj?.needsCells && stage.objCells.length === 0) warnings.push('Objective needs ⚑ cells painted.');
  if (stage.objective === 'regicide' && !Object.values(stage.enemies).includes('K')) warnings.push('Regicide needs an enemy ♚ placed.');
  if (stage.objective === 'escort' && Object.keys(stage.allies).length === 0) warnings.push('Escort needs a pre-placed formation piece.');
  if (stage.objective === 'annihilate' && Object.keys(stage.enemies).length === 0) warnings.push('Annihilate needs at least one enemy.');
  const deployOutsideMax = stage.deploy.filter(k => !stage.maxZone.includes(k)).length;
  if (stage.maxZone.length > 0 && deployOutsideMax > 0) warnings.push(`${deployOutsideMax} deploy cell(s) outside the max zone.`);

  const Stepper = ({ label, value, onMinus, onPlus }) => (
    <div style={{ flex:1 }}>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
        letterSpacing:'0.2em', marginBottom:4, textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={onMinus} style={{ width:26, height:26, padding:0, background:'var(--abyss-1)',
          border:'1px solid var(--abyss-4)', color:'var(--bone)', fontFamily:'JetBrains Mono, monospace' }}>−</button>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:18, color:'var(--brass)', minWidth:26,
          textAlign:'center' }}>{value}</span>
        <button onClick={onPlus} style={{ width:26, height:26, padding:0, background:'var(--abyss-1)',
          border:'1px solid var(--abyss-4)', color:'var(--bone)', fontFamily:'JetBrains Mono, monospace' }}>+</button>
      </div>
    </div>
  );

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
        <div className="caps" style={{ marginBottom:6 }}>Board Size</div>
        <div style={{ display:'flex', gap:14 }}>
          <Stepper label="Width"  value={stage.w} onMinus={()=>resize(-1,0)} onPlus={()=>resize(1,0)}/>
          <Stepper label="Height" value={stage.h} onMinus={()=>resize(0,-1)} onPlus={()=>resize(0,1)}/>
        </div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Objective</div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {FORGE_OBJECTIVES.map(o => {
            const isSel = stage.objective === o.id;
            return (
              <button key={o.id} onClick={()=>onEdit(()=>({ objective:o.id }))}
                style={{
                  padding:'8px 10px', textAlign:'left',
                  background: isSel ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                  border:'1px solid', borderColor: isSel ? 'var(--brass)' : 'var(--abyss-3)',
                  borderLeft: isSel ? '3px solid var(--brass)' : '3px solid transparent',
                  color:'var(--bone)', display:'flex', gap:8, alignItems:'baseline',
                }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color: isSel ? 'var(--brass)' : 'var(--bone-dim)', width:18 }}>{o.glyph}</span>
                <span style={{ flex:1 }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.04em' }}>{o.name}</span>
                  <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:11,
                    fontStyle:'italic', color:'var(--bone-dim)', marginTop:1 }}>{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {obj?.turns && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
            <input type="range" min={10} max={80} step={5} value={stage.turns} title="Turns to survive"
              onChange={e=>onEdit(()=>({ turns:Number(e.target.value) }))}
              style={{ flex:1, accentColor:'var(--bio)' }}/>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--brass)',
              minWidth:56, textAlign:'right' }}>{stage.turns} TURNS</span>
          </div>
        )}
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Leads To</div>
        {others.length === 0 ? (
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
            color:'var(--bone-dim)' }}>
            No other stages yet — add one to wire the flow.
          </div>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {others.map(s => {
              const on = stage.next.includes(s.id);
              return (
                <button key={s.id} onClick={()=>toggleNext(s.id)}
                  style={{
                    padding:'5px 12px',
                    background: on ? 'oklch(0.3 0.06 188)' : 'var(--abyss-1)',
                    border:`1px solid ${on ? 'var(--bio)' : 'var(--abyss-4)'}`,
                    color: on ? 'var(--bio)' : 'var(--bone-dim)',
                    fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.12em',
                  }}>
                  → {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Census</div>
        {[
          ['Blocked',   stage.blocked.length],
          ['Deploy',    stage.deploy.length],
          ['Max Zone',  stage.maxZone.length],
          ['Obj. Cells',stage.objCells.length],
          ['Enemies',   Object.keys(stage.enemies).length],
          ['Formation', Object.keys(stage.allies).length],
        ].map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 2px',
            borderBottom:'1px dashed var(--abyss-3)', fontFamily:'JetBrains Mono, monospace', fontSize:9.5 }}>
            <span style={{ color:'var(--bone-dim)', letterSpacing:'0.15em', textTransform:'uppercase' }}>{k}</span>
            <span style={{ color: v>0 ? 'var(--bone)' : 'var(--bone-dim)' }}>{v}</span>
          </div>
        ))}
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
      <button className="btn ghost sm" onClick={onDeleteStage}
        disabled={stages.length <= 1}
        style={{ color: stages.length<=1 ? 'var(--bone-dim)' : 'oklch(0.7 0.15 25)', justifyContent:'center' }}>
        ✕ Delete Stage
      </button>
    </div>
  );
};

window.LevelForge = LevelForge;
