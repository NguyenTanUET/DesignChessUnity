// Level Forge — author custom levels from the main menu.
// A level is a set of STAGES wired into a flow graph. Each stage is one board:
// custom width/height, blocked squares, objective, enemy creatures, terrain
// modifiers, the initial deploy zone and the maximum expansion zone.
//
// BRANCH ROUTES: every stage routes by CONDITION — e.g. an Advance stage may
// send the player to 1c when they exit at mark A, but to 1d at mark B. Routes
// can also fire on plain objective completion or a custom-written condition.
//
// Persists to localStorage('gok.customLevels'), independent of any run. Schema:
//   level = { id, name, stages:[stage] }            (stages[0] = entry)
//   stage = { id, label, w, h, blocked:[], deploy:[], maxZone:[], objCells:[],
//             enemies:{cell:archetypeKey}, terrain:{cell:terrainId},
//             objective:objectiveId, turns,
//             routes:[{ id, when:'complete'|'custom'|cellKey, cond, target }] }
// Cells are keyed "r-c". Objective cells are auto-lettered A, B, C… in paint
// order, so routes can bind to a specific mark.

const FORGE_OBJECTIVES = [
  { id:'exterminate', glyph:'✕', name:'Exterminate',       desc:'Leave no enemy creature standing.',            needsCells:false, needsEnemies:true },
  { id:'leader',      glyph:'♛', name:'Eliminate Leader',  desc:'Slay the creature that leads the host.',       needsCells:false, needsEnemies:true },
  { id:'boss',        glyph:'✠', name:'Boss Fight · Purge',desc:'Bring down the abyssal horror.',               needsCells:false, needsEnemies:true },
  { id:'escort',      glyph:'☥', name:'Escort',            desc:'Walk the ward alive to a marked square.',      needsCells:true  },
  { id:'retrieve',    glyph:'◎', name:'Retrieve Resource', desc:'Recover the prize at the mark and hold it.',   needsCells:true  },
  { id:'seize',       glyph:'⚙', name:'Seize Control',     desc:'Hold the marked squares for N turns.',         needsCells:true, turns:true },
  { id:'advance',     glyph:'⚑', name:'Advance',           desc:'Push any unit through a marked exit.',         needsCells:true  },
];

// Terrain — cell modifiers painted onto the board (a creature may stand on one).
const FORGE_TERRAINS = [
  { id:'ice',     glyph:'❄', name:'Glacial Floe',  effect:'Creatures entering are slowed next turn.',        color:'oklch(0.8 0.07 230)' },
  { id:'current', glyph:'≋', name:'Rip Current',   effect:'Sweeps the creature one square along the flow.',  color:'oklch(0.72 0.12 195)' },
  { id:'thorn',   glyph:'✶', name:'Coral Thorns',  effect:'Entering wounds the creature.',                   color:'oklch(0.66 0.15 25)' },
  { id:'silt',    glyph:'▒', name:'Silt Bed',      effect:'Sliding moves stop dead on this square.',         color:'oklch(0.6 0.06 80)' },
  { id:'kelp',    glyph:'❦', name:'Kelp Veil',     effect:'Conceals whoever stands here.',                   color:'oklch(0.65 0.12 150)' },
  { id:'vent',    glyph:'♨', name:'Thermal Vent',  effect:'Erupts on a cadence, scalding the square.',       color:'oklch(0.7 0.14 50)' },
];

// A formation belongs to a side. Stored on each cell as { type, side }.
const FORGE_SIDES = [
  { id:'ally',  label:'Ally',  glyph:'◈', color:'var(--bio)',   colorDim:'var(--bio-dim)' },
  { id:'enemy', label:'Enemy', glyph:'◣', color:'var(--coral)', colorDim:'var(--coral-dim)' },
];
// Normalise legacy terrain values (plain string id) into { type, side }.
const forgeFormationVal = (v) => (typeof v === 'string' ? { type:v, side:'ally' } : v);

const FORGE_TOOLS = [
  { id:'blocked',   glyph:'⛔', label:'Blocked',  hint:'Squares no creature may enter.',                  color:'oklch(0.6 0.05 30)' },
  { id:'deploy',    glyph:'◈', label:'Deploy',   hint:'Initial zone the player may act in.',             color:'var(--bio)' },
  { id:'max',       glyph:'◇', label:'Max Zone', hint:'Furthest zone reachable during play.',            color:'var(--bio-dim)' },
  { id:'objective', glyph:'⚑', label:'Mark',     hint:'Objective marks (auto-lettered A, B, C…).',       color:'var(--brass)' },
  { id:'enemy',     glyph:'♛', label:'Enemy',    hint:'Place an enemy creature from the bestiary.',      color:'var(--coral)' },
  { id:'terrain',   glyph:'❄', label:'Formation',hint:'Choose a side, then a formation feature to lay on the square.',color:'oklch(0.75 0.1 210)' },
  { id:'erase',     glyph:'⌫', label:'Erase',    hint:'Clear everything from a square.',                 color:'var(--bone-dim)' },
];

const forgeRouteId = () => `rt-${Math.random().toString(36).slice(2,8)}`;

const forgeDefaultStage = (label) => ({
  id: `st-${Math.random().toString(36).slice(2,8)}`,
  label, w:8, h:8,
  blocked:[], deploy:[], maxZone:[], objCells:[],
  enemies:{}, terrain:{},
  objective:'exterminate', turns:20,
  routes:[],
});

// Best-effort migration for levels saved by earlier Forge versions.
const forgeMigrate = (levels) => (levels || []).map(lvl => ({
  ...lvl,
  supportSquad: lvl.supportSquad !== false,
  stages: (lvl.stages || []).map(s => {
    const objMap = { reach:'advance', regicide:'leader', annihilate:'exterminate', survive:'seize' };
    const legacyPiece = { P:'larva', N:'outrider', B:'prelate', R:'colossus', Q:'matriarch', K:'witch' };
    const enemies = Object.fromEntries(Object.entries(s.enemies || {})
      .map(([k,v]) => [k, FOLLOWER_ARCHETYPES[v] ? v : (legacyPiece[v] || 'larva')]));
    return {
      ...s,
      objective: FORGE_OBJECTIVES.find(o => o.id === s.objective) ? s.objective : (objMap[s.objective] || 'exterminate'),
      enemies,
      terrain: Object.fromEntries(Object.entries(s.terrain || {}).map(([k,v]) => [k, forgeFormationVal(v)])),
      turns: s.turns || 20,
      routes: s.routes || (s.next || []).map(t => ({ id:forgeRouteId(), when:'complete', cond:'', target:t })),
    };
  }),
}));

const forgeMarkLetter = (stage, key) => {
  const i = stage.objCells.indexOf(key);
  return i < 0 ? '?' : String.fromCharCode(65 + i);
};

const forgeRouteBadge = (stage, rt) =>
  rt.when === 'complete' ? '✓' : rt.when === 'custom' ? '✎' : forgeMarkLetter(stage, rt.when);

const LevelForge = ({ go }) => {
  const [levels, setLevels] = React.useState(() => {
    try { return forgeMigrate(JSON.parse(localStorage.getItem('gok.customLevels')) || []); }
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
      supportSquad: true,   // player may bring a support squad into this level
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
              LEVEL EDITOR {open ? `· ${open.name}` : ''}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {open ? `${open.stages.length} STAGE${open.stages.length===1?'':'S'}` : `${levels.length} LEVEL${levels.length===1?'':'S'}`}
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
    lvl.stages.forEach(s => s.routes.forEach(rt => {
      const t = lvl.stages.find(x => x.id === rt.target);
      if (t) edges.push(`${s.label}→${t.label}·${forgeRouteBadge(s, rt)}`);
    }));
    if (!edges.length) return 'no flow wired';
    return edges.slice(0,4).join('  ') + (edges.length > 4 ? `  +${edges.length-4}` : '');
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'28px 36px' }}>
      <div style={{ marginBottom:20, maxWidth:760 }}>
        <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Chart Unwritten Tides</div>
        <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
          CREATE A LEVEL
        </h1>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
          fontStyle:'italic', lineHeight:1.6 }}>
          A level is a chain of stages — each stage a board of its own shape, its own
          obstacles, its own demand. Branch the flow on conditions and the tide will follow your chart.
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
            <div style={{ marginTop:4, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
              color: lvl.supportSquad !== false ? 'var(--bio-dim)' : 'var(--bone-dim)', letterSpacing:'0.15em' }}>
              SUPPORT SQUAD · {lvl.supportSquad !== false ? 'ON' : 'OFF'}
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
          + New Level
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
  const [enemyType, setEnemyType] = React.useState(Object.keys(FOLLOWER_ARCHETYPES)[0]);
  const [terrainType, setTerrainType] = React.useState(FORGE_TERRAINS[0].id);
  const [terrainSide, setTerrainSide] = React.useState('ally');
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
        .map(s => ({ ...s, routes: s.routes.filter(rt => rt.target !== stageId) })),
    }));
    if (selId === stageId) setSelId(stages.find(s => s.id !== stageId)?.id || null);
  };

  return (
    <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'300px 1fr 320px', gap:0 }}>

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

        {/* level-wide options */}
        <div>
          <div className="caps" style={{ marginBottom:6 }}>Level Options</div>
          {(() => {
            const squadOn = level.supportSquad !== false;
            return (
              <button onClick={()=>onChange(()=>({ supportSquad: !squadOn }))}
                title="Whether the player may bring a support squad into this level"
                style={{
                  width:'100%', padding:'8px 10px', textAlign:'left',
                  display:'flex', alignItems:'center', gap:10,
                  background:'var(--abyss-1)',
                  border:`1px solid ${squadOn ? 'var(--bio-dim)' : 'var(--abyss-4)'}`,
                  borderLeft:`3px solid ${squadOn ? 'var(--bio)' : 'var(--abyss-4)'}`,
                  color:'var(--bone)',
                }}>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.05em' }}>
                    Support Squad
                  </span>
                  <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:10.5,
                    fontStyle:'italic', color:'var(--bone-dim)', marginTop:1 }}>
                    Player may bring a support squad along.
                  </span>
                </span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.18em',
                  color: squadOn ? 'var(--bio)' : 'var(--bone-dim)' }}>
                  {squadOn ? '◉ ON' : '○ OFF'}
                </span>
              </button>
            );
          })()}
        </div>

        <div>
          <div className="caps" style={{ marginBottom:6 }}>Stage Flow</div>
          <ForgeFlowGraph stages={stages} selId={selId} onSelect={setSelId}/>
          <div style={{ marginTop:4, fontFamily:'JetBrains Mono, monospace', fontSize:8,
            color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
            EDGE TAGS · ✓ COMPLETE · A/B/C MARK · ✎ CUSTOM
          </div>
        </div>

        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
          <div className="caps" style={{ marginBottom:6 }}>Stages</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {stages.map((s, i) => {
              const isSel = s.id === selId;
              const leads = s.routes
                .map(rt => { const t = stages.find(x=>x.id===rt.target); return t ? `${t.label}·${forgeRouteBadge(s, rt)}` : null; })
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

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <button className="btn ghost sm" disabled={stages.length <= 1}
            onClick={()=>deleteStage(stage?.id)}
            style={{ color: stages.length<=1 ? 'var(--bone-dim)' : 'oklch(0.7 0.15 25)', justifyContent:'center' }}>
            ✕ Delete Stage{stage ? ` · ${stage.label}` : ''}
          </button>
          <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)', justifyContent:'center' }}
            onClick={onDelete}>
            ✕ Delete This Level
          </button>
        </div>
      </div>

      {/* CENTER — tools + painter */}
      {stage && (
        <div style={{ minHeight:0, overflow:'auto', padding:'16px 20px',
          display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <ForgeToolbar tool={tool} setTool={setTool}
            enemyType={enemyType} setEnemyType={setEnemyType}
            terrainType={terrainType} setTerrainType={setTerrainType}
            terrainSide={terrainSide} setTerrainSide={setTerrainSide}/>
          <ForgeBoard key={stage.id} stage={stage} tool={tool}
            enemyType={enemyType} terrainType={terrainType} terrainSide={terrainSide}
            onEdit={(mut)=>updateStage(stage.id, mut)}/>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
            letterSpacing:'0.18em', textAlign:'center' }}>
            ‣ CLICK / DRAG TO PAINT · SAME TOOL AGAIN TO REMOVE · WHEEL ZOOM · SCROLLBARS PAN
          </div>
        </div>
      )}

      {/* RIGHT — stage settings */}
      {stage && (
        <ForgeStageSettings key={stage.id} stage={stage} stages={stages}
          onEdit={(mut)=>updateStage(stage.id, mut)}/>
      )}
    </div>
  );
};

// =============================================================================
// FLOW GRAPH — BFS-tiered mini map; edges carry their route condition tag
// =============================================================================
const ForgeFlowGraph = ({ stages, selId, onSelect }) => {
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
      {/* edges + condition tags */}
      {stages.map(s => s.routes.map(rt => {
        const a = pos[s.id], b = pos[rt.target];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        // cubic midpoint for the tag
        const tx = ((a.x+14) + 6*mx + (b.x-14)) / 8;
        const ty = (a.y + b.y) / 2;
        return (
          <g key={rt.id}>
            <path d={`M ${a.x+14} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x-14} ${b.y}`}
              fill="none" stroke="var(--brass-dim)" strokeWidth="1" opacity="0.8"/>
            <circle cx={tx} cy={ty} r="7" fill="var(--abyss-0)" stroke="var(--abyss-4)" strokeWidth="0.6"/>
            <text x={tx} y={ty+2.5} textAnchor="middle" fontFamily="JetBrains Mono, monospace"
              fontSize="7" fill="var(--brass)">{forgeRouteBadge(s, rt)}</text>
          </g>
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
// TOOLBAR — with bestiary strip (enemy) and terrain strip
// =============================================================================
const ForgeToolbar = ({ tool, setTool, enemyType, setEnemyType, terrainType, setTerrainType, terrainSide, setTerrainSide }) => {
  const active = FORGE_TOOLS.find(t => t.id === tool);
  const creatures = Object.values(FOLLOWER_ARCHETYPES);

  return (
    <div style={{ width:'100%', maxWidth:780 }}>
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

      {/* hint / sub-palette row */}
      {tool === 'enemy' ? (
        <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
          {creatures.map(a => {
            const isSel = enemyType === a.key;
            return (
              <button key={a.key} onClick={()=>setEnemyType(a.key)} title={`${a.name} — ${a.role}`}
                style={{
                  flex:'1 1 96px', padding:'6px 6px', display:'flex', alignItems:'center', gap:7,
                  background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                  border:`1px solid ${isSel ? 'var(--coral)' : 'var(--abyss-4)'}`,
                  color: isSel ? 'var(--coral)' : 'var(--bone-dim)', textAlign:'left',
                }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:18, lineHeight:1, color:a.color }}>{a.glyph}</span>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:10.5,
                    color: isSel ? 'var(--bone)' : 'var(--bone-dim)', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</span>
                  <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:7.5,
                    letterSpacing:'0.15em', textTransform:'uppercase' }}>{a.role}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : tool === 'terrain' ? (
        <div style={{ marginTop:8 }}>
          {/* pick the side first */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
              letterSpacing:'0.2em', textTransform:'uppercase' }}>Side</span>
            <div style={{ display:'flex', gap:5 }}>
              {FORGE_SIDES.map(sd => {
                const isSel = terrainSide === sd.id;
                return (
                  <button key={sd.id} onClick={()=>setTerrainSide(sd.id)} title={`${sd.label} formation`}
                    style={{
                      padding:'4px 14px', display:'flex', alignItems:'center', gap:6,
                      background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                      border:`1px solid ${isSel ? sd.color : 'var(--abyss-4)'}`,
                      borderLeft:`3px solid ${isSel ? sd.color : 'var(--abyss-4)'}`,
                      color: isSel ? sd.color : 'var(--bone-dim)',
                      fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.06em',
                    }}>
                    <span>{sd.glyph}</span>{sd.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* then the formation feature */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {FORGE_TERRAINS.map(t => {
              const isSel = terrainType === t.id;
              const sideColor = FORGE_SIDES.find(s=>s.id===terrainSide)?.color || t.color;
              return (
                <button key={t.id} onClick={()=>setTerrainType(t.id)} title={t.effect}
                  style={{
                    flex:'1 1 110px', padding:'6px 6px', display:'flex', alignItems:'center', gap:7,
                    background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                    border:`1px solid ${isSel ? sideColor : 'var(--abyss-4)'}`,
                    color: isSel ? t.color : 'var(--bone-dim)', textAlign:'left',
                  }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:17, lineHeight:1, color:t.color }}>{t.glyph}</span>
                  <span style={{ minWidth:0 }}>
                    <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:10.5,
                      color: isSel ? 'var(--bone)' : 'var(--bone-dim)' }}>{t.name}</span>
                    <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:9.5,
                      fontStyle:'italic', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.effect}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop:8, minHeight:20, fontFamily:'Cormorant Garamond, serif', fontSize:12.5,
          fontStyle:'italic', color:'var(--bone-dim)' }}>
          {active?.hint}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BOARD PAINTER — click / drag paints with the active tool
// =============================================================================
const ForgeBoard = ({ stage, tool, enemyType, terrainType, terrainSide, onEdit }) => {
  const { w, h } = stage;

  // Fixed viewport: a 16×16-cell frame regardless of board size. Boards larger
  // than the frame are reached by (1) wheel-zooming until they fit or
  // (2) dragging the scrollbars that appear when the board overflows.
  const FRAME_CELLS = 16, BASE_CELL = 34, FRAME_PX = FRAME_CELLS * BASE_CELL; // 544px
  const [zoom, setZoom] = React.useState(1);
  const frameRef = React.useRef(null);
  const cell = Math.max(10, Math.round(BASE_CELL * zoom));
  const clampZoom = (z) => Math.min(2, Math.max(0.3, z));
  const fitZoom = () => setZoom(clampZoom(Math.min(1, FRAME_CELLS / w, FRAME_CELLS / h)));

  // Wheel zoom — native listener so preventDefault works (React wheel is passive).
  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom(z => clampZoom(+(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)).toFixed(3)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
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
      const dropKey = (m) => { const { [key]:_x, ...rest } = m; return rest; };
      if (tool === 'erase') {
        return { blocked:rem(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies:dropKey(cur.enemies), terrain:dropKey(cur.terrain) };
      }
      if (tool === 'blocked') {
        if (mode === 'rem') return { blocked: rem(cur.blocked) };
        // blocking a square sweeps everything else off it
        return { blocked:add(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies:dropKey(cur.enemies), terrain:dropKey(cur.terrain) };
      }
      if (cur.blocked.includes(key)) return {};          // can't paint onto blocked
      if (tool === 'deploy')    return { deploy:    mode==='add' ? add(cur.deploy)   : rem(cur.deploy) };
      if (tool === 'max')       return { maxZone:   mode==='add' ? add(cur.maxZone)  : rem(cur.maxZone) };
      if (tool === 'objective') return { objCells:  mode==='add' ? add(cur.objCells) : rem(cur.objCells) };
      if (tool === 'enemy') {
        if (mode === 'rem') return { enemies: dropKey(cur.enemies) };
        return { enemies: { ...cur.enemies, [key]: enemyType } };
      }
      if (tool === 'terrain') {
        if (mode === 'rem') return { terrain: dropKey(cur.terrain) };
        return { terrain: { ...cur.terrain, [key]: { type: terrainType, side: terrainSide } } };
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
    if (tool === 'enemy')     return stage.enemies[key] === enemyType   ? 'rem' : 'add';
    if (tool === 'terrain')   { const t = forgeFormationVal(stage.terrain[key]); return (t && t.type === terrainType && t.side === terrainSide) ? 'rem' : 'add'; }
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

  const zoomBtn = {
    width:26, height:26, padding:0, background:'var(--abyss-1)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:13, lineHeight:1,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      {/* zoom bar */}
      <div style={{ width: FRAME_PX + 20, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.15em' }}>
          BOARD {w}×{h} · VIEW {FRAME_CELLS}×{FRAME_CELLS}
        </span>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setZoom(z=>clampZoom(+(z / 1.1).toFixed(3)))} title="Zoom out" style={zoomBtn}>−</button>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)',
          minWidth:44, textAlign:'center', letterSpacing:'0.05em' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={()=>setZoom(z=>clampZoom(+(z * 1.1).toFixed(3)))} title="Zoom in" style={zoomBtn}>+</button>
        <button onClick={fitZoom} title="Fit the whole board into the frame"
          style={{ ...zoomBtn, width:'auto', padding:'0 10px', fontSize:10, letterSpacing:'0.12em' }}>
          ⊡ FIT
        </button>
      </div>

      {/* fixed 16×16-cell viewport — wheel zooms, scrollbars pan */}
      <div ref={frameRef}
        title="Wheel · zoom in/out — scrollbars · pan"
        style={{
          width: FRAME_PX + 20, height: FRAME_PX + 20, overflow:'auto', display:'flex',
          border:'1px solid var(--brass-deep)', background:'var(--abyss-0)',
          boxShadow:'0 12px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.6)',
        }}>
        <div style={{ margin:'auto', padding:10 }}>
          <div style={{
            display:'inline-grid',
            gridTemplateColumns:`repeat(${w}, ${cell}px)`,
            gridTemplateRows:`repeat(${h}, ${cell}px)`,
            border:'1px solid var(--brass-deep)',
            background:'var(--abyss-1)', userSelect:'none',
          }}>
      {cells.map(key => {
        const [r, c] = key.split('-').map(Number);
        const dark = (r + c) % 2 === 1;
        const isBlocked = blocked.has(key);
        const inDeploy  = deploy.has(key);
        const inMax     = maxZone.has(key);
        const isObj     = objSet.has(key);
        const enemyArch = stage.enemies[key] ? FOLLOWER_ARCHETYPES[stage.enemies[key]] : null;
        const fmVal = stage.terrain[key] ? forgeFormationVal(stage.terrain[key]) : null;
        const terr = fmVal ? FORGE_TERRAINS.find(t => t.id === fmVal.type) : null;
        const fmSide = fmVal ? FORGE_SIDES.find(s => s.id === fmVal.side) : null;

        return (
          <div key={key}
            onMouseDown={down(key)}
            onMouseEnter={enter(key)}
            title={[
              key,
              isBlocked && 'blocked', inDeploy && 'deploy', inMax && 'max zone',
              isObj && `mark ${forgeMarkLetter(stage, key)}`,
              enemyArch && enemyArch.name, terr && `${fmSide?.label || ''} ${terr.name} — ${terr.effect}`,
            ].filter(Boolean).join(' · ')}
            style={{
              width:cell, height:cell, position:'relative', cursor:'crosshair',
              background: isBlocked
                ? `repeating-linear-gradient(45deg, oklch(0.09 0.015 220) 0 6px, oklch(0.13 0.03 30) 6px 12px)`
                : (dark ? 'oklch(0.14 0.02 220)' : 'oklch(0.22 0.03 220)'),
              borderRight: c === w-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              borderBottom: r === h-1 ? 'none' : '1px solid oklch(0.08 0.01 220 / 0.5)',
              display:'grid', placeItems:'center',
            }}>
            {/* formation: terrain wash + corner glyph + side-tinted frame */}
            {!isBlocked && terr && (
              <>
                <div style={{ position:'absolute', inset:0, pointerEvents:'none',
                  background:`${terr.color.replace(')',' / 0.16)')}` }}/>
                {fmSide && (
                  <div style={{ position:'absolute', inset:1, pointerEvents:'none',
                    border:`1px solid ${fmSide.color}`, opacity:0.7 }}/>
                )}
                <div style={{ position:'absolute', bottom:1, right:3, fontFamily:'Cinzel, serif',
                  fontSize:Math.max(10, cell*0.3), lineHeight:1, color:terr.color,
                  textShadow:`0 0 6px ${terr.color}`, pointerEvents:'none' }}>{terr.glyph}</div>
                {fmSide && (
                  <div style={{ position:'absolute', top:1, left:3, fontFamily:'Cinzel, serif',
                    fontSize:Math.max(8, cell*0.22), lineHeight:1, color:fmSide.color,
                    textShadow:`0 0 5px ${fmSide.color}`, pointerEvents:'none' }}>{fmSide.glyph}</div>
                )}
              </>
            )}
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
            {/* objective mark + letter */}
            {!isBlocked && isObj && (
              <div style={{ position:'absolute', top:1, left:3, fontFamily:'JetBrains Mono, monospace',
                fontSize:Math.max(9, cell*0.24), color:'var(--brass)',
                textShadow:'0 0 8px var(--brass)', pointerEvents:'none' }}>
                ⚑{forgeMarkLetter(stage, key)}
              </div>
            )}
            {/* enemy creature */}
            {!isBlocked && enemyArch && (
              <div style={{ position:'relative', fontFamily:'Cinzel, serif', fontSize:cell*0.6, lineHeight:1,
                color:'var(--coral)', textShadow:'0 0 10px var(--coral), 0 2px 4px rgba(0,0,0,0.8)',
                pointerEvents:'none' }}>
                {enemyArch.glyph}
              </div>
            )}
          </div>
        );
      })}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// STAGE SETTINGS — right rail (label, size, objective, branch routes, census)
// =============================================================================
const ForgeStageSettings = ({ stage, stages, onEdit }) => {
  const obj = FORGE_OBJECTIVES.find(o => o.id === stage.objective);
  const others = stages.filter(s => s.id !== stage.id);
  const [objOpen, setObjOpen] = React.useState(false);

  // prune out-of-range cells when the board shrinks
  const resize = (dw, dh) => {
    const w = Math.max(4, Math.min(24, stage.w + dw));
    const h = Math.max(4, Math.min(24, stage.h + dh));
    const fits = (key) => { const [r,c] = key.split('-').map(Number); return r < h && c < w; };
    const fitMap = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => fits(k)));
    onEdit(cur => ({
      w, h,
      blocked: cur.blocked.filter(fits), deploy: cur.deploy.filter(fits),
      maxZone: cur.maxZone.filter(fits), objCells: cur.objCells.filter(fits),
      enemies: fitMap(cur.enemies), terrain: fitMap(cur.terrain),
    }));
  };

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
    ...stage.objCells.map((k, i) => ({ value:k, label:`⚑ At mark ${String.fromCharCode(65+i)} (${k})` })),
    { value:'custom', label:'✎ Custom condition…' },
  ];

  const warnings = [];
  if (obj?.needsCells && stage.objCells.length === 0) warnings.push('Objective needs ⚑ marks painted.');
  if (obj?.needsEnemies && Object.keys(stage.enemies).length === 0) warnings.push(`${obj.name} needs enemy creatures placed.`);
  const deployOutsideMax = stage.deploy.filter(k => !stage.maxZone.includes(k)).length;
  if (stage.maxZone.length > 0 && deployOutsideMax > 0) warnings.push(`${deployOutsideMax} deploy cell(s) outside the max zone.`);
  const routesNoTarget = stage.routes.filter(rt => !rt.target || !stages.find(s=>s.id===rt.target)).length;
  if (routesNoTarget > 0) warnings.push(`${routesNoTarget} route(s) missing a target stage.`);
  const routesStaleMark = stage.routes.filter(rt => rt.when !== 'complete' && rt.when !== 'custom' && !stage.objCells.includes(rt.when)).length;
  if (routesStaleMark > 0) warnings.push(`${routesStaleMark} route(s) bound to an erased mark.`);

  const selStyle = {
    width:'100%', padding:'6px 8px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.06em', outline:'none',
  };

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
        {/* single bar — click to drop the full list open */}
        <button onClick={()=>setObjOpen(v=>!v)} title="Choose objective"
          style={{
            width:'100%', padding:'8px 10px', textAlign:'left',
            background:'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))',
            border:'1px solid var(--brass)', borderLeft:'3px solid var(--brass)',
            color:'var(--bone)', display:'flex', gap:8, alignItems:'center',
          }}>
          <span style={{ fontFamily:'Cinzel, serif', fontSize:15, color:'var(--brass)', width:18 }}>{obj?.glyph}</span>
          <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, letterSpacing:'0.04em' }}>{obj?.name}</span>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)' }}>
            {objOpen ? '▴' : '▾'}
          </span>
        </button>
        {objOpen && (
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:4,
            padding:6, background:'var(--abyss-0)', border:'1px solid var(--abyss-4)' }}>
            {FORGE_OBJECTIVES.map(o => {
              const isSel = stage.objective === o.id;
              return (
                <button key={o.id} onClick={()=>{ onEdit(()=>({ objective:o.id })); setObjOpen(false); }}
                  style={{
                    padding:'6px 9px', textAlign:'left',
                    background: isSel ? 'var(--abyss-3)' : 'transparent',
                    border:'1px solid', borderColor: isSel ? 'var(--brass)' : 'transparent',
                    color:'var(--bone)', display:'flex', gap:8, alignItems:'baseline',
                  }}>
                  <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color: isSel ? 'var(--brass)' : 'var(--bone-dim)', width:18 }}>{o.glyph}</span>
                  <span style={{ flex:1 }}>
                    <span style={{ fontFamily:'Cinzel, serif', fontSize:11.5, letterSpacing:'0.04em' }}>{o.name}</span>
                    <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:10.5,
                      fontStyle:'italic', color:'var(--bone-dim)', marginTop:1 }}>{o.desc}</span>
                  </span>
                  {isSel && <span style={{ color:'var(--brass)', fontSize:10 }}>◆</span>}
                </button>
              );
            })}
          </div>
        )}
        {obj?.turns && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
            <input type="range" min={5} max={60} step={5} value={stage.turns} title="Turns to hold"
              onChange={e=>onEdit(()=>({ turns:Number(e.target.value) }))}
              style={{ flex:1, accentColor:'var(--bio)' }}/>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--brass)',
              minWidth:64, textAlign:'right' }}>HOLD {stage.turns}</span>
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
            const staleMark = rt.when !== 'complete' && rt.when !== 'custom' && !stage.objCells.includes(rt.when);
            return (
              <div key={rt.id} style={{ padding:'8px 9px', background:'var(--abyss-1)',
                border:`1px solid ${staleMark ? 'oklch(0.5 0.12 30)' : 'var(--abyss-3)'}`,
                display:'flex', flexDirection:'column', gap:6 }}>
                <select value={rt.when} title="Route condition"
                  onChange={e=>editRoute(rt.id, { when:e.target.value })}
                  style={selStyle}>
                  {staleMark && <option value={rt.when}>⚠ erased mark ({rt.when})</option>}
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
                    {others.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Census</div>
        {[
          ['Blocked',  stage.blocked.length],
          ['Deploy',   stage.deploy.length],
          ['Max Zone', stage.maxZone.length],
          ['Marks',    stage.objCells.length],
          ['Enemies',  Object.keys(stage.enemies).length],
          ['Formation', Object.keys(stage.terrain).length],
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
      {/* placeholder — authoring autosaves; explicit save is not wired yet */}
      <button className="btn primary sm" style={{ justifyContent:'center' }}>
        ✓ Save Level
      </button>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
        letterSpacing:'0.18em', textAlign:'center', marginTop:-8 }}>
        ‣ AUTOSAVED TO LOCAL HOLD
      </div>
    </div>
  );
};

window.LevelForge = LevelForge;
