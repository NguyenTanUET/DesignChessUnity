// Forge Library — the data the two authoring tables share.
//
// The BOARD EDITOR authors BOARDS: one map each — its shape, obstacles,
// creatures, formations, objective and spoils. The LEVEL EDITOR authors
// MISSIONS (stored as levels): it only wires which mission follows which and,
// inside a mission, which stage routes to which. Each stage plays one board.
//
// Persists to localStorage, independent of any run:
//   gok.customBoards = [board]
//   gok.customLevels = [level]
//
//   board = { id, name, size:'S'|'M'|'L'|'XL', w, h, lineupW,
//             inBoardList, inCampaign,
//             blocked:[], deploy:[], maxZone:[], objCells:[],
//             enemies:{cell:archetypeKey}, allies:{cell:archetypeKey},
//             terrain:{cell:{type,side}}, props:{cell:propId},
//             objective:objectiveId, turns, rewards }
//   level = { id, name, next:[levelId], stages:[stage] }      (stages[0] = entry)
//   stage = { id, label, boardId,
//             routes:[{ id, when:'complete'|'custom'|cellKey, cond, target }] }
//
// Cells are keyed "r-c". Objective cells are auto-lettered A, B, C… in paint
// order, so a stage's routes can bind to a specific mark on its board.

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

// Environment props — scenery objects laid onto squares (no side, no stats).
const FORGE_PROPS = [
  { id:'rock',  glyph:'▲', name:'Reef Rock',       desc:'A calcified boulder jutting from the silt.',  color:'oklch(0.6 0.04 60)' },
  { id:'kelp',  glyph:'♒', name:'Kelp Cluster',    desc:'Swaying strands of deep-water kelp.',         color:'oklch(0.62 0.11 150)' },
  { id:'coral', glyph:'❈', name:'Coral Bloom',     desc:'A blooming thicket of reef coral.',           color:'oklch(0.68 0.13 25)' },
  { id:'wreck', glyph:'⚓', name:'Sunken Wreck',    desc:'The ribs of a drowned hull.',                 color:'oklch(0.6 0.06 80)' },
  { id:'bones', glyph:'⌇', name:'Leviathan Bones', desc:'Vertebrae of something that should not fit.', color:'oklch(0.75 0.02 85)' },
  { id:'idol',  glyph:'♆', name:'Drowned Idol',    desc:'A statue of the tide-god, face eaten away.',  color:'oklch(0.62 0.1 195)' },
];

// A formation belongs to a side. Stored on each cell as { type, side }.
const FORGE_SIDES = [
  { id:'ally',  label:'Ally',  glyph:'◈', color:'var(--bio)',   colorDim:'var(--bio-dim)' },
  { id:'enemy', label:'Enemy', glyph:'◣', color:'var(--coral)', colorDim:'var(--coral-dim)' },
];
// Normalise legacy terrain values (plain string id) into { type, side }.
const forgeFormationVal = (v) => (typeof v === 'string' ? { type:v, side:'ally' } : v);

// Size classes. A board starts at w×h and may grow to maxW×maxH; the start is
// also the floor, so the class's default lineup always fits across the board.
const FORGE_SIZES = [
  { id:'S',  label:'Small',  w:4,  h:6,  maxW:8,  maxH:8,  lineupW:4  },
  { id:'M',  label:'Medium', w:8,  h:10, maxW:16, maxH:16, lineupW:8  },
  { id:'L',  label:'Large',  w:12, h:12, maxW:24, maxH:24, lineupW:12 },
  { id:'XL', label:'Huge',   w:20, h:20, maxW:40, maxH:40, lineupW:12 },
];
const forgeSizeById = (id) => FORGE_SIZES.find(s => s.id === id) || FORGE_SIZES[1];
// Smallest class that can hold w×h — how boards from before size classes get one.
const forgeSizeFitting = (w, h) =>
  FORGE_SIZES.find(s => w <= s.maxW && h <= s.maxH) || FORGE_SIZES[FORGE_SIZES.length - 1];

const forgeEmptyRewards = () => ({ coral:0, dna:0, lumin:0, relics:[], augs:[], units:[], quest:[] });

const forgeNewBoard = (sizeId, name) => {
  const sz = forgeSizeById(sizeId);
  return {
    id: `bd-${Math.random().toString(36).slice(2,8)}`,
    name, size: sz.id, w: sz.w, h: sz.h, lineupW: sz.lineupW,
    inBoardList: true, inCampaign: true,
    blocked:[], deploy:[], maxZone:[], objCells:[],
    enemies:{}, allies:{}, terrain:{}, props:{},
    objective:'exterminate', turns:20,
    rewards: forgeEmptyRewards(),
  };
};

// Best-effort migration for boards saved by earlier Forge versions — including
// the board half of a legacy stage, which is passed straight in.
const forgeNormBoard = (b) => {
  const objMap = { reach:'advance', regicide:'leader', annihilate:'exterminate', survive:'seize' };
  const legacyPiece = { P:'larva', N:'outrider', B:'prelate', R:'colossus', Q:'matriarch', K:'witch' };
  const normCreature = (m) => Object.fromEntries(Object.entries(m || {})
    .map(([k,v]) => [k, FOLLOWER_ARCHETYPES[v] ? v : (legacyPiece[v] || 'larva')]));
  const w = b.w || 8, h = b.h || 8;
  return {
    id: b.id, name: b.name || 'Untitled Board',
    size: FORGE_SIZES.some(s => s.id === b.size) ? b.size : forgeSizeFitting(w, h).id,
    w, h,
    // Before lineup widths were authored, a board demanded the widest formation it could hold.
    lineupW: b.lineupW || formationFitting(w),
    inBoardList: b.inBoardList !== undefined ? !!b.inBoardList : true,
    inCampaign:  b.inCampaign  !== undefined ? !!b.inCampaign  : true,
    blocked: b.blocked || [], deploy: b.deploy || [], maxZone: b.maxZone || [], objCells: b.objCells || [],
    enemies: normCreature(b.enemies),
    allies: normCreature(b.allies),
    terrain: Object.fromEntries(Object.entries(b.terrain || {}).map(([k,v]) => [k, forgeFormationVal(v)])),
    props: b.props || {},
    objective: FORGE_OBJECTIVES.find(o => o.id === b.objective) ? b.objective : (objMap[b.objective] || 'exterminate'),
    turns: b.turns || 20,
    rewards: { ...forgeEmptyRewards(), ...(b.rewards || {}) },
  };
};

const forgeSave = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
};

// Read both libraries. Levels from before the split carried each stage's board
// inline; those boards are lifted into the board library (tagged for the
// campaign, kept out of the random pool) and the stage keeps only a pointer.
// The split is written back at once so it happens exactly once.
const forgeLoadLibrary = () => {
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch(e) { return []; } };
  const boards = read('gok.customBoards').map(forgeNormBoard);
  let lifted = false;
  const levels = read('gok.customLevels').map(lvl => ({
    ...lvl,
    next: Array.isArray(lvl.next) ? lvl.next : [],
    stages: (lvl.stages || []).map(s => {
      let boardId = s.boardId || null;
      if (!boardId && s.w) {
        const board = forgeNormBoard({ ...s, id:`bd-${Math.random().toString(36).slice(2,8)}`,
          name:`${lvl.name} · ${s.label}`, inCampaign:true, inBoardList:false });
        boards.push(board);
        boardId = board.id;
        lifted = true;
      }
      return {
        id: s.id, label: s.label, boardId,
        routes: s.routes || (s.next || []).map(t => ({
          id:`rt-${Math.random().toString(36).slice(2,8)}`, when:'complete', cond:'', target:t })),
      };
    }),
  }));
  if (lifted) { forgeSave('gok.customBoards', boards); forgeSave('gok.customLevels', levels); }
  return { boards, levels };
};

// Boards a random draw may land on.
const forgeBoardPool = () => forgeLoadLibrary().boards.filter(b => b.inBoardList);

// Persist `value` under `key` — DEBOUNCED. Drag-painting fires one state update
// per square; writing the whole library (JSON.stringify + synchronous
// localStorage I/O) on every one makes an editor feel sluggish. Coalesce into
// one write per idle pause, and flush on the way out so nothing is ever lost.
const useForgePersist = (key, value) => {
  const ref = React.useRef(value);
  ref.current = value;
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // don't rewrite what we just read
    const t = setTimeout(() => forgeSave(key, ref.current), 400);
    return () => clearTimeout(t);
  }, [value]);
  React.useEffect(() => () => forgeSave(key, ref.current), []);
};

const forgeMarkLetter = (board, key) => {
  const i = (board?.objCells || []).indexOf(key);
  return i < 0 ? '?' : String.fromCharCode(65 + i);
};

// =============================================================================
// BOARD THUMB — read-only SVG of a board. Small, it is a card thumbnail; large
// enough, it letters the ⚑ marks and draws creature glyphs so routes can be read.
// =============================================================================
const ForgeBoardThumb = ({ board, box = 120, maxCell = 28 }) => {
  const uid = React.useId().replace(/:/g, '');
  const { w, h } = board;
  const cell = Math.min(maxCell, box / Math.max(w, h));
  const big = cell >= 14;
  const at = (key) => key.split('-').map(Number);  // [r, c]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * cell} height={h * cell}
      style={{ display:'block', flexShrink:0, border:'1px solid var(--brass-deep)' }}>
      <defs>
        <pattern id={`chk${uid}`} width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="oklch(0.22 0.03 220)"/>
          <rect x="1" width="1" height="1" fill="oklch(0.14 0.02 220)"/>
          <rect y="1" width="1" height="1" fill="oklch(0.14 0.02 220)"/>
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#chk${uid})`}/>

      {Object.entries(board.terrain).map(([k, v]) => {
        const t = FORGE_TERRAINS.find(x => x.id === forgeFormationVal(v).type);
        const [r, c] = at(k);
        return t && <rect key={`t${k}`} x={c} y={r} width="1" height="1" fill={t.color} opacity="0.35"/>;
      })}
      {board.deploy.map(k => { const [r, c] = at(k);
        return <rect key={`d${k}`} x={c} y={r} width="1" height="1" fill="oklch(0.82 0.16 188)" opacity="0.28"/>; })}
      {big && board.maxZone.map(k => { const [r, c] = at(k);
        return <rect key={`m${k}`} x={c + 0.1} y={r + 0.1} width="0.8" height="0.8" fill="none"
          stroke="var(--bio-dim)" strokeWidth="0.05" strokeDasharray="0.12 0.08" opacity="0.7"/>; })}
      {board.blocked.map(k => { const [r, c] = at(k);
        return (
          <g key={`b${k}`}>
            <rect x={c} y={r} width="1" height="1" fill="oklch(0.1 0.02 30)"/>
            <path d={`M ${c} ${r + 1} L ${c + 1} ${r}`} stroke="oklch(0.3 0.06 30)" strokeWidth="0.12"/>
          </g>
        ); })}
      {Object.entries(board.props).map(([k, id]) => {
        const p = FORGE_PROPS.find(x => x.id === id);
        const [r, c] = at(k);
        if (!p) return null;
        return big
          ? <text key={`p${k}`} x={c + 0.5} y={r + 0.68} textAnchor="middle" fontSize="0.5"
              fontFamily="Cinzel, serif" fill={p.color} opacity="0.8">{p.glyph}</text>
          : <rect key={`p${k}`} x={c + 0.3} y={r + 0.3} width="0.4" height="0.4" fill={p.color} opacity="0.8"/>;
      })}
      {[['enemies', 'var(--coral)'], ['allies', 'var(--bio)']].map(([side, sideColor]) =>
        Object.entries(board[side]).map(([k, key]) => {
          const a = FOLLOWER_ARCHETYPES[key];
          const [r, c] = at(k);
          return big ? (
            <g key={`${side}${k}`}>
              <text x={c + 0.5} y={r + 0.7} textAnchor="middle" fontSize="0.62"
                fontFamily="Cinzel, serif" fill={a?.color || sideColor}>{a?.glyph || '●'}</text>
              <rect x={c + 0.2} y={r + 0.84} width="0.6" height="0.07" fill={sideColor}/>
            </g>
          ) : (
            <circle key={`${side}${k}`} cx={c + 0.5} cy={r + 0.5} r="0.3"
              fill={a?.color || sideColor} stroke={sideColor} strokeWidth="0.1"/>
          );
        }))}
      {board.objCells.map((k, i) => { const [r, c] = at(k);
        return (
          <g key={`o${k}`}>
            <rect x={c + 0.05} y={r + 0.05} width="0.9" height="0.9" fill="none"
              stroke="var(--brass)" strokeWidth="0.09"/>
            {big && <text x={c + 0.08} y={r + 0.36} fontSize="0.3" fontFamily="JetBrains Mono, monospace"
              fill="var(--brass)">⚑{String.fromCharCode(65 + i)}</text>}
          </g>
        ); })}
    </svg>
  );
};

window.forgeLoadLibrary = forgeLoadLibrary;
window.forgeBoardPool = forgeBoardPool;
