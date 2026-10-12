// Board Editor — author the boards themselves from the main menu: shape,
// blocked squares, deploy and max zones, objective marks, creatures, formations,
// props, the objective and the spoils for clearing it. A board stands on its
// own; the Level Editor strings boards into missions as stages.
//
// Every board also carries:
//   • a SIZE CLASS (S/M/L/XL) — fixes its starting and largest dimensions;
//   • a MAX LINEUP WIDTH — the widest formation the player may field on it;
//   • APPEAR ON BOARD LIST — whether a random board draw may land on it;
//   • APPEAR ON CAMPAIGN — whether the Level Editor offers it to a stage.
// Schema and storage live in ForgeLibrary.jsx.

const FORGE_TOOLS = [
  { id:'blocked',   glyph:'⛔', label:'Blocked',  hint:'Squares no creature may enter.',                  color:'oklch(0.6 0.05 30)' },
  { id:'deploy',    glyph:'◈', label:'Deploy',   hint:'Initial zone the player may act in.',             color:'var(--bio)' },
  { id:'max',       glyph:'◇', label:'Max Zone', hint:'Furthest zone reachable during play.',            color:'var(--bio-dim)' },
  { id:'objective', glyph:'⚑', label:'Mark',     hint:'Objective marks (auto-lettered A, B, C…).',       color:'var(--brass)' },
  { id:'enemy',     glyph:'♛', label:'Enemy',    hint:'Place an enemy creature from the bestiary.',      color:'var(--coral)' },
  { id:'ally',      glyph:'♕', label:'Ally',     hint:'Place an allied creature from the bestiary.',     color:'var(--bio)' },
  { id:'terrain',   glyph:'❄', label:'Formation',hint:'Choose a side, then a formation feature to lay on the square.',color:'oklch(0.75 0.1 210)' },
  { id:'props',     glyph:'⚓', label:'Props',    hint:'Environment scenery — rocks, kelp, wrecks…',      color:'oklch(0.68 0.06 80)' },
  { id:'erase',     glyph:'⌫', label:'Erase',    hint:'Clear everything from a square.',                 color:'var(--bone-dim)' },
];

// Resize to w×h, pruning anything that falls off the edge. A lineup wider than
// the new board drops to the widest formation that still fits.
const forgeResizeBoard = (cur, w, h) => {
  const fits = (key) => { const [r,c] = key.split('-').map(Number); return r < h && c < w; };
  const fitMap = (m) => Object.fromEntries(Object.entries(m || {}).filter(([k]) => fits(k)));
  return {
    w, h,
    lineupW: cur.lineupW > w ? formationFitting(w) : cur.lineupW,
    blocked: cur.blocked.filter(fits), deploy: cur.deploy.filter(fits),
    maxZone: cur.maxZone.filter(fits), objCells: cur.objCells.filter(fits),
    enemies: fitMap(cur.enemies), allies: fitMap(cur.allies), terrain: fitMap(cur.terrain),
    props: fitMap(cur.props),
  };
};

// Which mission stages play each board: { boardId: [{ levelName, stageLabel }] }.
const forgeBoardUsage = (levels) => {
  const out = {};
  levels.forEach(l => (l.stages || []).forEach(s => {
    if (s.boardId) (out[s.boardId] = out[s.boardId] || []).push({ levelName:l.name, stageLabel:s.label });
  }));
  return out;
};

const BoardEditor = ({ go }) => {
  // Levels are read only to show where each board is used.
  const [lib] = React.useState(forgeLoadLibrary);
  const [boards, setBoards] = React.useState(lib.boards);
  const [openId, setOpenId] = React.useState(null);
  const usage = React.useMemo(() => forgeBoardUsage(lib.levels), [lib]);
  useForgePersist('gok.customBoards', boards);

  const open = boards.find(b => b.id === openId) || null;

  const newBoard = (sizeId) => {
    const b = forgeNewBoard(sizeId, `Board ${boards.length + 1}`);
    setBoards(bs => [...bs, b]);
    setOpenId(b.id);
  };

  const updateBoard = (id, mutator) =>
    setBoards(bs => bs.map(b => b.id === id ? { ...b, ...mutator(b) } : b));

  // Stages that played a deleted board are left without one; the Level Editor flags them.
  const deleteBoard = (id) => {
    setBoards(bs => bs.filter(b => b.id !== id));
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
            ← {open ? 'All Boards' : 'Menu'}
          </button>
          <div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
              color:'var(--brass-dim)', textTransform:'uppercase' }}>
              Surveyor&rsquo;s Slate
            </div>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
              BOARD EDITOR {open ? `· ${open.name}` : ''}
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em', textTransform:'uppercase' }}>
          {open ? `${open.size} · ${open.w}×${open.h}` : `${boards.length} BOARD${boards.length===1?'':'S'}`}
        </div>
      </div>

      {open
        ? <ForgeBoardEditor key={open.id} board={open} uses={usage[open.id] || []}
            onChange={(mut)=>updateBoard(open.id, mut)}
            onDelete={()=>deleteBoard(open.id)}/>
        : <ForgeBoardList boards={boards} usage={usage} onOpen={setOpenId} onNew={newBoard} onDelete={deleteBoard}/>}
    </div>
  );
};

// Deleting a board that stages still play asks twice — they would be left without a map.
const ForgeBoardDelete = ({ uses, onDelete, label = '✕ Delete', style }) => {
  const [armed, setArmed] = React.useState(false);
  return (
    <button className="btn ghost sm" style={{ color:'oklch(0.7 0.15 25)', ...style }}
      onMouseLeave={()=>setArmed(false)}
      onClick={(e)=>{ e.stopPropagation(); if (uses > 0 && !armed) setArmed(true); else onDelete(); }}>
      {armed ? `✕ Confirm · used in ${uses} stage${uses===1?'':'s'}` : label}
    </button>
  );
};

// A lit / unlit tag for the two campaign switches.
const ForgeTag = ({ on, glyph, label }) => (
  <span style={{ padding:'2px 6px', fontFamily:'JetBrains Mono, monospace', fontSize:8,
    letterSpacing:'0.14em', border:'1px solid', borderColor: on ? 'var(--brass-deep)' : 'var(--abyss-3)',
    color: on ? 'var(--brass)' : 'var(--bone-dim)', opacity: on ? 1 : 0.55,
    textDecoration: on ? 'none' : 'line-through' }}>
    {glyph} {label}
  </span>
);

// =============================================================================
// BOARD LIST
// =============================================================================
const ForgeBoardList = ({ boards, usage, onOpen, onNew, onDelete }) => (
  <div style={{ flex:1, overflowY:'auto', padding:'28px 36px' }}>
    <div style={{ marginBottom:20, maxWidth:760 }}>
      <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Survey the Seabed</div>
      <h1 style={{ fontFamily:'Cinzel, serif', fontSize:30, margin:'4px 0 6px', letterSpacing:'0.08em' }}>
        CREATE A BOARD
      </h1>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, color:'var(--bone-dim)',
        fontStyle:'italic', lineHeight:1.6 }}>
        A board is one stretch of seabed — its shape, its obstacles, its creatures, its demand.
        Tag it for the random draw, for the campaign, or both; the Level Editor strings campaign boards into missions.
      </div>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, maxWidth:1100 }}>
      {boards.map(b => {
        const obj = FORGE_OBJECTIVES.find(o => o.id === b.objective);
        const uses = (usage[b.id] || []).length;
        return (
          <div key={b.id} className="panel ornate hoverable" style={{ padding:'16px 16px', cursor:'pointer',
            display:'flex', gap:14 }}
            onClick={()=>onOpen(b.id)}>
            <div style={{ width:88, height:88, display:'grid', placeItems:'center', flexShrink:0 }}>
              <ForgeBoardThumb board={b} box={88}/>
            </div>
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                <div style={{ fontFamily:'Cinzel, serif', fontSize:15, color:'var(--bone)', letterSpacing:'0.05em',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {b.name}
                </div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--brass)',
                  letterSpacing:'0.14em', flexShrink:0 }}>
                  {b.size} · {b.w}×{b.h}
                </div>
              </div>
              <div style={{ marginTop:5, fontFamily:'JetBrains Mono, monospace', fontSize:9,
                color:'var(--bio-dim)', letterSpacing:'0.12em' }}>
                {obj?.glyph} {obj?.name.toUpperCase()} · W{b.lineupW}
              </div>
              <div style={{ marginTop:6, display:'flex', gap:5, flexWrap:'wrap' }}>
                <ForgeTag on={b.inBoardList} glyph="⟳" label="BOARD LIST"/>
                <ForgeTag on={b.inCampaign}  glyph="✠" label="CAMPAIGN"/>
              </div>
              <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                color:'var(--bone-dim)', letterSpacing:'0.12em' }}>
                {uses ? `USED IN ${uses} STAGE${uses===1?'':'S'}` : <span style={{ opacity:0.6 }}>NOT IN ANY MISSION</span>}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:'auto', paddingTop:10 }}>
                <button className="btn ghost sm" onClick={(e)=>{ e.stopPropagation(); onOpen(b.id); }}>✎ Edit</button>
                <ForgeBoardDelete uses={uses} onDelete={()=>onDelete(b.id)}/>
              </div>
            </div>
          </div>
        );
      })}

      {/* new board — pick the size class up front */}
      <div style={{ minHeight:130, border:'1px dashed var(--abyss-4)', padding:'14px 14px',
        display:'flex', flexDirection:'column', justifyContent:'center', gap:10 }}>
        <div style={{ textAlign:'center', color:'var(--brass)', fontFamily:'Cinzel, serif', fontSize:15,
          letterSpacing:'0.08em' }}>
          + New Board
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
          {FORGE_SIZES.map(s => (
            <button key={s.id} onClick={()=>onNew(s.id)} title={`${s.label} — starts ${s.w}×${s.h}, grows to ${s.maxW}×${s.maxH}`}
              style={{ padding:'7px 2px', background:'var(--abyss-1)', border:'1px solid var(--abyss-4)',
                color:'var(--bone)', textAlign:'center' }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--brass)' }}>{s.id}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5, color:'var(--bone-dim)',
                letterSpacing:'0.08em', marginTop:2 }}>{s.w}×{s.h}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// =============================================================================
// EDITOR — left: board identity & tags · center: painter · right: objective & spoils
// =============================================================================
const ForgeBoardEditor = ({ board, uses, onChange, onDelete }) => {
  const [tool, setTool] = React.useState('blocked');
  const [enemyType, setEnemyType] = React.useState(Object.keys(FOLLOWER_ARCHETYPES)[0]);
  const [allyType,  setAllyType]  = React.useState(Object.keys(FOLLOWER_ARCHETYPES)[0]);
  const [terrainType, setTerrainType] = React.useState(FORGE_TERRAINS[0].id);
  const [terrainSide, setTerrainSide] = React.useState('ally');
  const [propType,    setPropType]    = React.useState(FORGE_PROPS[0].id);

  return (
    <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'300px 1fr 320px', gap:0 }}>
      <ForgeBoardMeta board={board} uses={uses} onChange={onChange} onDelete={onDelete}/>

      {/* CENTER — tools + painter */}
      <div style={{ minHeight:0, overflow:'auto', padding:'16px 20px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <ForgeToolbar tool={tool} setTool={setTool}
          enemyType={enemyType} setEnemyType={setEnemyType}
          allyType={allyType} setAllyType={setAllyType}
          terrainType={terrainType} setTerrainType={setTerrainType}
          terrainSide={terrainSide} setTerrainSide={setTerrainSide}
          propType={propType} setPropType={setPropType}/>
        <ForgeBoard board={board} tool={tool}
          enemyType={enemyType} allyType={allyType}
          terrainType={terrainType} terrainSide={terrainSide}
          propType={propType}
          onEdit={onChange}/>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.18em', textAlign:'center' }}>
          ‣ CLICK / DRAG TO PAINT · SAME TOOL AGAIN TO REMOVE · WHEEL ZOOM · SCROLLBARS PAN
        </div>
      </div>

      <ForgeBoardSettings board={board} onEdit={onChange}/>
    </div>
  );
};

const ForgeStepper = ({ label, value, range, onMinus, onPlus }) => (
  <div style={{ flex:1 }}>
    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
      letterSpacing:'0.2em', marginBottom:4, textTransform:'uppercase' }}>
      {label}{range && <span style={{ opacity:0.7 }}> · {range}</span>}
    </div>
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

// A row of mutually exclusive buttons. options = [{ value, label, sub?, disabled?, title? }]
const ForgeSegments = ({ value, options, onChange }) => (
  <div style={{ display:'flex', gap:5 }}>
    {options.map(o => {
      const isSel = value === o.value;
      return (
        <button key={String(o.value)} disabled={o.disabled} title={o.title}
          onClick={()=>onChange(o.value)}
          style={{
            flex:1, padding:'6px 2px', textAlign:'center',
            background: isSel ? 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
            border:`1px solid ${isSel ? 'var(--brass)' : 'var(--abyss-4)'}`,
            borderTop:`2px solid ${isSel ? 'var(--brass)' : 'var(--abyss-4)'}`,
            color: o.disabled ? 'var(--abyss-4)' : isSel ? 'var(--brass)' : 'var(--bone-dim)',
            cursor: o.disabled ? 'not-allowed' : 'pointer',
          }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:13, lineHeight:1.1 }}>{o.label}</div>
          {o.sub && <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5, letterSpacing:'0.06em',
            marginTop:2, opacity:0.8 }}>{o.sub}</div>}
        </button>
      );
    })}
  </div>
);

// =============================================================================
// BOARD META — left rail (name, size class, dimensions, lineup, tags, usage)
// =============================================================================
const ForgeBoardMeta = ({ board, uses, onChange, onDelete }) => {
  const sz = forgeSizeById(board.size);

  // A new class keeps as much of the board as its range allows and takes that
  // class's default lineup width.
  const setSize = (id) => onChange(cur => {
    const s = forgeSizeById(id);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return { ...forgeResizeBoard(cur, clamp(cur.w, s.w, s.maxW), clamp(cur.h, s.h, s.maxH)),
             size: s.id, lineupW: s.lineupW };
  });

  // Stay inside the class. A board from before size classes that sits under its
  // class's floor keeps that size, but cannot shrink further.
  const resize = (dw, dh) => onChange(cur => {
    const s = forgeSizeById(cur.size);
    const step = (v, d, lo, hi) => Math.max(Math.min(lo, v), Math.min(hi, v + d));
    return forgeResizeBoard(cur, step(cur.w, dw, s.w, s.maxW), step(cur.h, dh, s.h, s.maxH));
  });

  const hint = { fontFamily:'Cormorant Garamond, serif', fontSize:11.5, fontStyle:'italic',
    color:'var(--bone-dim)', marginTop:5, lineHeight:1.45 };

  return (
    <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      display:'flex', flexDirection:'column', gap:16 }}>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Board Name</div>
        <input value={board.name} title="Board name"
          onChange={e=>onChange(()=>({ name: e.target.value }))}
          style={{ width:'100%', padding:'8px 10px', background:'var(--abyss-0)',
            border:'1px solid var(--abyss-4)', color:'var(--bone)',
            fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.04em', outline:'none' }}/>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Size</div>
        <ForgeSegments value={board.size} onChange={setSize}
          options={FORGE_SIZES.map(s => ({ value:s.id, label:s.id, sub:`${s.w}×${s.h}`,
            title:`${s.label} — starts ${s.w}×${s.h}, grows to ${s.maxW}×${s.maxH}` }))}/>
        <div style={{ marginTop:6, fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
          color:'var(--bio-dim)', letterSpacing:'0.12em' }}>
          {sz.label.toUpperCase()} · START {sz.w}×{sz.h} · MAX {sz.maxW}×{sz.maxH}
        </div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Dimensions</div>
        <div style={{ display:'flex', gap:14 }}>
          <ForgeStepper label="Width"  value={board.w} range={`${sz.w}–${sz.maxW}`}
            onMinus={()=>resize(-1,0)} onPlus={()=>resize(1,0)}/>
          <ForgeStepper label="Height" value={board.h} range={`${sz.h}–${sz.maxH}`}
            onMinus={()=>resize(0,-1)} onPlus={()=>resize(0,1)}/>
        </div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Max Lineup Width</div>
        <ForgeSegments value={board.lineupW} onChange={(w)=>onChange(()=>({ lineupW:w }))}
          options={FORMATION_WIDTHS.map(w => ({ value:w, label:`W${w}`,
            sub: w === sz.lineupW ? 'default' : '',
            disabled: w > board.w,
            title: w > board.w ? `A ${w}-wide lineup does not fit a ${board.w}-wide board` : formationByW(w)?.desc }))}/>
        <div style={hint}>The widest formation the player may field on this board.</div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Appear on Board List</div>
        <ForgeSegments value={board.inBoardList} onChange={(v)=>onChange(()=>({ inBoardList:v }))}
          options={[{ value:true, label:'Yes' }, { value:false, label:'No' }]}/>
        <div style={hint}>Joins the pool a board is drawn from at random.</div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Appear on Campaign</div>
        <ForgeSegments value={board.inCampaign} onChange={(v)=>onChange(()=>({ inCampaign:v }))}
          options={[{ value:true, label:'Yes' }, { value:false, label:'No' }]}/>
        <div style={hint}>Offered to mission stages in the Level Editor.</div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Used In</div>
        {uses.length === 0 ? (
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
            letterSpacing:'0.12em' }}>‣ NO MISSION STAGE PLAYS THIS BOARD</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {uses.map((u, i) => (
              <div key={i} style={{ padding:'5px 9px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
                fontFamily:'Cinzel, serif', fontSize:12, color:'var(--bone)', display:'flex', gap:8 }}>
                <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.levelName}</span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)' }}>{u.stageLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex:1 }}/>
      <ForgeBoardDelete uses={uses.length} onDelete={onDelete} label="✕ Delete This Board"
        style={{ justifyContent:'center' }}/>
    </div>
  );
};

// =============================================================================
// TOOLBAR — with bestiary strip (enemy) and terrain strip
// =============================================================================
const ForgeToolbar = ({ tool, setTool, enemyType, setEnemyType, allyType, setAllyType, terrainType, setTerrainType, terrainSide, setTerrainSide, propType, setPropType }) => {
  const active = FORGE_TOOLS.find(t => t.id === tool);
  const creatures = Object.values(FOLLOWER_ARCHETYPES);
  // Enemy and Ally share the bestiary strip — only the accent and target state differ.
  const isCreatureTool = tool === 'enemy' || tool === 'ally';
  const creatureVal    = tool === 'ally' ? allyType : enemyType;
  const setCreatureVal = tool === 'ally' ? setAllyType : setEnemyType;
  const creatureAccent = tool === 'ally' ? 'var(--bio)' : 'var(--coral)';

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
      {isCreatureTool ? (
        <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
          {creatures.map(a => {
            const isSel = creatureVal === a.key;
            return (
              <button key={a.key} onClick={()=>setCreatureVal(a.key)} title={`${a.name} — ${a.role}`}
                style={{
                  flex:'1 1 96px', padding:'6px 6px', display:'flex', alignItems:'center', gap:7,
                  background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                  border:`1px solid ${isSel ? creatureAccent : 'var(--abyss-4)'}`,
                  color: isSel ? creatureAccent : 'var(--bone-dim)', textAlign:'left',
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
      ) : tool === 'props' ? (
        <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
          {FORGE_PROPS.map(p => {
            const isSel = propType === p.id;
            return (
              <button key={p.id} onClick={()=>setPropType(p.id)} title={p.desc}
                style={{
                  flex:'1 1 110px', padding:'6px 6px', display:'flex', alignItems:'center', gap:7,
                  background: isSel ? 'var(--abyss-3)' : 'var(--abyss-1)',
                  border:`1px solid ${isSel ? p.color : 'var(--abyss-4)'}`,
                  color: isSel ? p.color : 'var(--bone-dim)', textAlign:'left',
                }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:17, lineHeight:1, color:p.color }}>{p.glyph}</span>
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:10.5,
                    color: isSel ? 'var(--bone)' : 'var(--bone-dim)' }}>{p.name}</span>
                  <span style={{ display:'block', fontFamily:'Cormorant Garamond, serif', fontSize:9.5,
                    fontStyle:'italic', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.desc}</span>
                </span>
              </button>
            );
          })}
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
const ForgeBoard = ({ board, tool, enemyType, allyType, terrainType, terrainSide, propType, onEdit }) => {
  const { w, h } = board;

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

  const blocked = new Set(board.blocked);
  const deploy  = new Set(board.deploy);
  const maxZone = new Set(board.maxZone);
  const objSet  = new Set(board.objCells);

  // The live paint config lives in a ref so the two cell callbacks below can keep
  // a STABLE identity. Stable callbacks + primitive props = React.memo actually
  // holds, so painting one square re-renders one square instead of all w×h.
  const cfg = React.useRef();
  cfg.current = { tool, enemyType, allyType, terrainType, terrainSide, propType, board, onEdit };

  const applyTo = React.useCallback((key, mode) => {
    const { tool, enemyType, allyType, terrainType, terrainSide, propType, onEdit } = cfg.current;
    onEdit(cur => {
      const has = (arr) => arr.includes(key);
      const add = (arr) => has(arr) ? arr : [...arr, key];
      const rem = (arr) => arr.filter(k => k !== key);
      const dropKey = (m) => { const { [key]:_x, ...rest } = m; return rest; };
      if (tool === 'erase') {
        return { blocked:rem(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies:dropKey(cur.enemies),
                 allies:dropKey(cur.allies || {}), terrain:dropKey(cur.terrain),
                 props:dropKey(cur.props || {}) };
      }
      if (tool === 'blocked') {
        if (mode === 'rem') return { blocked: rem(cur.blocked) };
        // blocking a square sweeps everything else off it
        return { blocked:add(cur.blocked), deploy:rem(cur.deploy), maxZone:rem(cur.maxZone),
                 objCells:rem(cur.objCells), enemies:dropKey(cur.enemies),
                 allies:dropKey(cur.allies || {}), terrain:dropKey(cur.terrain),
                 props:dropKey(cur.props || {}) };
      }
      if (cur.blocked.includes(key)) return {};          // can't paint onto blocked
      if (tool === 'deploy')    return { deploy:    mode==='add' ? add(cur.deploy)   : rem(cur.deploy) };
      if (tool === 'max')       return { maxZone:   mode==='add' ? add(cur.maxZone)  : rem(cur.maxZone) };
      if (tool === 'objective') return { objCells:  mode==='add' ? add(cur.objCells) : rem(cur.objCells) };
      if (tool === 'enemy') {
        if (mode === 'rem') return { enemies: dropKey(cur.enemies) };
        // one occupant per square — placing an enemy evicts any ally
        return { enemies: { ...cur.enemies, [key]: enemyType }, allies: dropKey(cur.allies || {}) };
      }
      if (tool === 'ally') {
        if (mode === 'rem') return { allies: dropKey(cur.allies || {}) };
        return { allies: { ...(cur.allies || {}), [key]: allyType }, enemies: dropKey(cur.enemies) };
      }
      if (tool === 'terrain') {
        if (mode === 'rem') return { terrain: dropKey(cur.terrain) };
        return { terrain: { ...cur.terrain, [key]: { type: terrainType, side: terrainSide } } };
      }
      if (tool === 'props') {
        if (mode === 'rem') return { props: dropKey(cur.props || {}) };
        return { props: { ...(cur.props || {}), [key]: propType } };
      }
      return {};
    });
  }, []);

  // Decide add vs remove from the first cell pressed.
  const modeFor = React.useCallback((key) => {
    const { tool, enemyType, allyType, terrainType, terrainSide, propType, board } = cfg.current;
    if (tool === 'blocked')   return board.blocked.includes(key)  ? 'rem' : 'add';
    if (tool === 'deploy')    return board.deploy.includes(key)   ? 'rem' : 'add';
    if (tool === 'max')       return board.maxZone.includes(key)  ? 'rem' : 'add';
    if (tool === 'objective') return board.objCells.includes(key) ? 'rem' : 'add';
    if (tool === 'enemy')     return board.enemies[key] === enemyType   ? 'rem' : 'add';
    if (tool === 'ally')      return (board.allies || {})[key] === allyType ? 'rem' : 'add';
    if (tool === 'terrain')   { const t = forgeFormationVal(board.terrain[key]); return (t && t.type === terrainType && t.side === terrainSide) ? 'rem' : 'add'; }
    if (tool === 'props')     return (board.props || {})[key] === propType ? 'rem' : 'add';
    return 'add';
  }, []);

  const onDown = React.useCallback((key, e) => {
    e.preventDefault();
    paint.current = { active:true, mode: modeFor(key) };
    applyTo(key, paint.current.mode);
  }, [applyTo, modeFor]);
  const onEnter = React.useCallback((key) => {
    if (paint.current.active) applyTo(key, paint.current.mode);
  }, [applyTo]);

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
        // Only PRIMITIVES cross this boundary, so React.memo on ForgeCell can
        // bail out for every square the stroke did not touch.
        const fmVal = board.terrain[key] ? forgeFormationVal(board.terrain[key]) : null;
        return (
          <ForgeCell key={key} ck={key} cell={cell} w={w} h={h}
            isBlocked={blocked.has(key)}
            inDeploy={deploy.has(key)}
            inMax={maxZone.has(key)}
            mark={objSet.has(key) ? forgeMarkLetter(board, key) : null}
            enemyKey={board.enemies[key] || null}
            allyKey={(board.allies || {})[key] || null}
            propId={(board.props || {})[key] || null}
            terrType={fmVal ? fmVal.type : null}
            terrSide={fmVal ? fmVal.side : null}
            onDown={onDown} onEnter={onEnter}/>
        );
      })}
          </div>
        </div>
      </div>
    </div>
  );
};

// One square. Memoised on primitive props — a stroke re-renders only the squares
// it actually changed, instead of every square on the board.
const ForgeCell = React.memo(({ ck, cell, w, h, isBlocked, inDeploy, inMax, mark,
  enemyKey, allyKey, propId, terrType, terrSide, onDown, onEnter }) => {
  const [r, c] = ck.split('-').map(Number);
  const dark = (r + c) % 2 === 1;
  const enemyArch = enemyKey ? FOLLOWER_ARCHETYPES[enemyKey] : null;
  const allyArch  = allyKey  ? FOLLOWER_ARCHETYPES[allyKey]  : null;
  const creature  = enemyArch || allyArch;
  const prop   = propId   ? FORGE_PROPS.find(p => p.id === propId)   : null;
  const terr   = terrType ? FORGE_TERRAINS.find(t => t.id === terrType) : null;
  const fmSide = terrSide ? FORGE_SIDES.find(s => s.id === terrSide) : null;
  const badge = Math.max(13, Math.round(cell*0.36));
  const badgeFont = Math.max(9, Math.round(cell*0.24));

  return (
    <div
      onMouseDown={(e)=>onDown(ck, e)}
      onMouseEnter={()=>onEnter(ck)}
      title={[
        ck,
        isBlocked && 'blocked', inDeploy && 'deploy', inMax && 'max zone',
        mark && `mark ${mark}`,
        enemyArch && `${enemyArch.name} · enemy`,
        allyArch && `${allyArch.name} · ally`,
        terr && `${fmSide?.label || ''} ${terr.name} — ${terr.effect}`,
        prop && `${prop.name} — ${prop.desc}`,
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
      {/* formation — wash · top-right ribbon = SIDE · bottom-right badge = TYPE */}
      {!isBlocked && terr && (
        <>
          <div style={{ position:'absolute', inset:0, pointerEvents:'none',
            background:`${terr.color.replace(')',' / 0.16)')}` }}/>
          {fmSide && (
            <div style={{ position:'absolute', top:0, right:0, width:0, height:0, pointerEvents:'none',
              borderTop:`${Math.max(9, Math.round(cell*0.32))}px solid ${fmSide.color}`,
              borderLeft:`${Math.max(9, Math.round(cell*0.32))}px solid transparent`, opacity:0.95 }}/>
          )}
          <div style={{ position:'absolute', bottom:1, right:1, pointerEvents:'none',
            minWidth:badge, height:badge, display:'grid', placeItems:'center', padding:'0 1px',
            background:'rgba(0,8,12,0.75)', border:`1px solid ${terr.color}`,
            fontFamily:'Cinzel, serif', fontSize:badgeFont, lineHeight:1,
            color:terr.color }}>{terr.glyph}</div>
        </>
      )}
      {!isBlocked && inMax && (
        <div style={{ position:'absolute', inset:2, border:'1px dashed var(--bio-dim)',
          opacity:0.55, pointerEvents:'none' }}/>
      )}
      {!isBlocked && inDeploy && (
        <div style={{ position:'absolute', inset:0, background:'oklch(0.82 0.16 188 / 0.14)',
          pointerEvents:'none' }}/>
      )}
      {!isBlocked && mark && (
        <div style={{ position:'absolute', top:1, left:1, pointerEvents:'none',
          padding:'1px 3px', background:'rgba(0,8,12,0.75)', border:'1px solid var(--brass-deep)',
          fontFamily:'JetBrains Mono, monospace', fontSize:Math.max(9, Math.round(cell*0.22)),
          lineHeight:1, color:'var(--brass)' }}>
          ⚑{mark}
        </div>
      )}
      {/* prop — centred when the square is free, corner badge when occupied */}
      {!isBlocked && prop && (
        creature ? (
          <div style={{ position:'absolute', bottom:1, left:1, pointerEvents:'none',
            minWidth:badge, height:badge, display:'grid', placeItems:'center', padding:'0 1px',
            background:'rgba(0,8,12,0.75)', border:`1px solid ${prop.color}`,
            fontFamily:'Cinzel, serif', fontSize:badgeFont, lineHeight:1,
            color:prop.color }}>{prop.glyph}</div>
        ) : (
          <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center',
            pointerEvents:'none' }}>
            <span style={{ fontFamily:'Cinzel, serif', fontSize:cell*0.46, lineHeight:1,
              color:prop.color, opacity:0.8 }}>{prop.glyph}</span>
          </div>
        )
      )}
      {/* creature — archetype colour = identity · underline = side */}
      {!isBlocked && creature && (
        <div style={{ position:'relative', pointerEvents:'none', textAlign:'center', lineHeight:1 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:cell*0.58, color:creature.color,
            textShadow:`0 2px 4px rgba(0,0,0,0.85)` }}>
            {creature.glyph}
          </div>
          <div style={{ height:Math.max(2, Math.round(cell*0.05)), margin:'1px auto 0', width:'68%',
            background: enemyArch ? 'var(--coral)' : 'var(--bio)' }}/>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// BOARD SETTINGS — right rail (objective, spoils, census)
// =============================================================================
const ForgeBoardSettings = ({ board, onEdit }) => {
  const obj = FORGE_OBJECTIVES.find(o => o.id === board.objective);
  const [objOpen, setObjOpen] = React.useState(false);

  // --- rewards ---
  const rewards = { ...forgeEmptyRewards(), ...(board.rewards || {}) };
  const setReward = (k, v) => onEdit(cur => ({
    rewards: { ...forgeEmptyRewards(), ...(cur.rewards || {}), [k]: v },
  }));
  const addDrop = (k, id) => { if (id) setReward(k, [...rewards[k], id]); };
  const removeDrop = (k, idx) => setReward(k, rewards[k].filter((_, i) => i !== idx));
  const dropCount = rewards.relics.length + rewards.augs.length + rewards.units.length + rewards.quest.length;

  const warnings = [];
  if (obj?.needsCells && board.objCells.length === 0) warnings.push('Objective needs ⚑ marks painted.');
  if (obj?.needsEnemies && Object.keys(board.enemies).length === 0) warnings.push(`${obj.name} needs enemy creatures placed.`);
  const deployOutsideMax = board.deploy.filter(k => !board.maxZone.includes(k)).length;
  if (board.maxZone.length > 0 && deployOutsideMax > 0) warnings.push(`${deployOutsideMax} deploy cell(s) outside the max zone.`);
  if (!board.inBoardList && !board.inCampaign) warnings.push('Off the board list and the campaign — nothing will play it.');

  const selStyle = {
    width:'100%', padding:'6px 8px', background:'var(--abyss-0)',
    border:'1px solid var(--abyss-4)', color:'var(--bone)',
    fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.06em', outline:'none',
  };

  return (
    <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
      background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
      display:'flex', flexDirection:'column', gap:14 }}>

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
              const isSel = board.objective === o.id;
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
            <input type="range" min={5} max={60} step={5} value={board.turns} title="Turns to hold"
              onChange={e=>onEdit(()=>({ turns:Number(e.target.value) }))}
              style={{ flex:1, accentColor:'var(--bio)' }}/>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--brass)',
              minWidth:64, textAlign:'right' }}>HOLD {board.turns}</span>
          </div>
        )}
      </div>

      {/* === REWARDS · ON CLEAR === */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <div className="caps">Rewards · On Clear</div>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
            color:'var(--bio-dim)', letterSpacing:'0.15em' }}>{dropCount} DROP{dropCount===1?'':'S'}</span>
        </div>

        {/* resources */}
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:8 }}>
          {[
            { k:'coral', glyph:'◎', label:'Refined Coral', color:'oklch(0.72 0.12 35)' },
            { k:'dna',   glyph:'✧', label:'DNA',           color:'oklch(0.72 0.14 150)' },
            { k:'lumin', glyph:'◆', label:'Lumin',         color:'oklch(0.75 0.13 195)' },
          ].map(res => (
            <div key={res.k} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:'Cinzel, serif', fontSize:14, color:res.color, width:16,
                textAlign:'center' }}>{res.glyph}</span>
              <span style={{ flex:1, fontFamily:'JetBrains Mono, monospace', fontSize:9,
                letterSpacing:'0.16em', color:'var(--bone-dim)', textTransform:'uppercase' }}>{res.label}</span>
              <input type="number" min={0} step={5} value={rewards[res.k]}
                title={`${res.label} reward`}
                onChange={e=>setReward(res.k, Math.max(0, Number(e.target.value) || 0))}
                style={{ ...selStyle, width:72, flex:'0 0 72px', textAlign:'right',
                  color: rewards[res.k] > 0 ? 'var(--bone)' : 'var(--bone-dim)' }}/>
            </div>
          ))}
        </div>

        {/* item drops — chips with remove */}
        {dropCount > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {rewards.relics.map((id, i) => {
              const r = OP_RELICS.find(x => x.id === id);
              return (
                <span key={`r${i}`} title={r?.desc}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 7px',
                    background:'var(--abyss-1)', border:'1px solid var(--brass-deep)',
                    fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--brass)',
                    letterSpacing:'0.08em' }}>
                  {r?.glyph} {r?.name || id}
                  <button onClick={()=>removeDrop('relics', i)} title="Remove"
                    style={{ background:'transparent', border:'none', color:'var(--bone-dim)',
                      cursor:'pointer', fontSize:10, padding:'0 1px', lineHeight:1 }}>×</button>
                </span>
              );
            })}
            {rewards.augs.map((id, i) => {
              const a = AUGMENTATIONS.find(x => x.id === id);
              const slot = a ? AUG_SLOTS.find(s => s.id === a.slot) : null;
              return (
                <span key={`a${i}`} title={a?.effect}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 7px',
                    background:'var(--abyss-1)', border:`1px solid ${slot?.color || 'var(--abyss-4)'}`,
                    fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:slot?.color || 'var(--bone)',
                    letterSpacing:'0.08em' }}>
                  {slot?.glyph} {a?.name || id}
                  <button onClick={()=>removeDrop('augs', i)} title="Remove"
                    style={{ background:'transparent', border:'none', color:'var(--bone-dim)',
                      cursor:'pointer', fontSize:10, padding:'0 1px', lineHeight:1 }}>×</button>
                </span>
              );
            })}
            {rewards.units.map((k, i) => {
              const a = FOLLOWER_ARCHETYPES[k];
              return (
                <span key={`u${i}`} title={a?.desc}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 7px',
                    background:'var(--abyss-1)', border:`1px solid ${a?.color || 'var(--abyss-4)'}`,
                    fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:a?.color || 'var(--bone)',
                    letterSpacing:'0.08em' }}>
                  {a?.glyph} {a?.name || k}
                  <button onClick={()=>removeDrop('units', i)} title="Remove"
                    style={{ background:'transparent', border:'none', color:'var(--bone-dim)',
                      cursor:'pointer', fontSize:10, padding:'0 1px', lineHeight:1 }}>×</button>
                </span>
              );
            })}
            {rewards.quest.map((id, i) => {
              const q = QUEST_ITEMS.find(x => x.id === id);
              return (
                <span key={`q${i}`} title={q?.desc}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 7px',
                    background:'var(--abyss-1)', border:'1px solid oklch(0.4 0.1 290 / 0.6)',
                    fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'oklch(0.7 0.13 290)',
                    letterSpacing:'0.08em' }}>
                  {q?.glyph || '◇'} {q?.name || id}
                  <button onClick={()=>removeDrop('quest', i)} title="Remove"
                    style={{ background:'transparent', border:'none', color:'var(--bone-dim)',
                      cursor:'pointer', fontSize:10, padding:'0 1px', lineHeight:1 }}>×</button>
                </span>
              );
            })}
          </div>
        )}

        {/* add drops — pick from the game's pools (selects reset after adding) */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <select value="" title="Add relic reward" style={selStyle}
            onChange={e=>addDrop('relics', e.target.value)}>
            <option value="">✠ + Relic reward…</option>
            {OP_RELICS.map(r => <option key={r.id} value={r.id}>{r.glyph} {r.name} · T{r.tier}</option>)}
          </select>
          <select value="" title="Add augmentation reward" style={selStyle}
            onChange={e=>addDrop('augs', e.target.value)}>
            <option value="">⊕ + Augmentation reward…</option>
            {AUGMENTATIONS.map(a => {
              const slot = AUG_SLOTS.find(s => s.id === a.slot);
              return <option key={a.id} value={a.id}>{slot?.glyph} {a.name} · {slot?.label} T{a.tier}</option>;
            })}
          </select>
          <select value="" title="Add creature recruit reward" style={selStyle}
            onChange={e=>addDrop('units', e.target.value)}>
            <option value="">♙ + Creature recruit…</option>
            {Object.values(FOLLOWER_ARCHETYPES).map(a =>
              <option key={a.key} value={a.key}>{a.glyph} {a.name} · {a.role}</option>)}
          </select>
          <select value="" title="Add quest item reward" style={selStyle}
            onChange={e=>addDrop('quest', e.target.value)}>
            <option value="">◇ + Quest item…</option>
            {QUEST_ITEMS.map(q => <option key={q.id} value={q.id}>{q.glyph} {q.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="caps" style={{ marginBottom:6 }}>Census</div>
        {[
          ['Blocked',  board.blocked.length],
          ['Deploy',   board.deploy.length],
          ['Max Zone', board.maxZone.length],
          ['Marks',    board.objCells.length],
          ['Enemies',  Object.keys(board.enemies).length],
          ['Allies',   Object.keys(board.allies || {}).length],
          ['Formation', Object.keys(board.terrain).length],
          ['Props',    Object.keys(board.props || {}).length],
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
        ✓ Save Board
      </button>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bone-dim)',
        letterSpacing:'0.18em', textAlign:'center', marginTop:-8 }}>
        ‣ AUTOSAVED TO LOCAL HOLD
      </div>
    </div>
  );
};

window.BoardEditor = BoardEditor;
