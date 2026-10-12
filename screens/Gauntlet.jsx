// Gauntlet — four boards in a row, fought with one lineup of the player's own
// followers. Stages 1–3 are Exterminate, stage 4 is Eliminate Leader. Every
// board is drawn from the Board Pool (Board Editor boards tagged "Appear on
// Board List") whose Max Lineup Width matches the chosen lineup.
//
// Between boards the player spends SOULS — earned by clearing a board — as many
// times as they like: buy back followers captured so far, recruit followers
// from their roster, graft augments, or swap the carried relic. Losing any
// board ends the gauntlet on the spot; the LP/DNA reward scales with boards won.
//
// Everything bought lives only inside the gauntlet — the roster, augment hold
// and relic loadout outside it are never touched. Only the final reward is.
//
// State lives on run.gauntlet, so leaving and coming back resumes the run
// (a board in progress restarts from its opening position):
//   { width, lineupName, stage:0-3, phase:'match'|'shop'|'over',
//     boards:[board snapshot ×4], army:[unit], fallen:[unit], souls, relicId,
//     offers:{ units:[{unit,sold}], augs:[{id,sold}], relics:[{id,sold}] } | null,
//     wins, log:[{ boardName, objective, won, souls, fallen:[name] }] }
//   unit = { uid, instanceId, archetype, name, evoTier, augSlotCount, augments, slot:'r0c3' }
// A unit's slot is its square in the two-rank formation: r0 = back, r1 = front.

const GAUNTLET_STAGES = ['exterminate', 'exterminate', 'exterminate', 'leader'];
const gauntletObjective = (id) => FORGE_OBJECTIVES.find(o => o.id === id) || FORGE_OBJECTIVES[0];

// LP and DNA paid out when a gauntlet ends, indexed by boards won (0–4).
const GAUNTLET_REWARDS = [0, 50, 100, 200, 400];

// What the reliquary lays out between boards, by lineup width.
const GAUNTLET_OFFERS = {
  4:  { units:4,  augs:2, relics:1 },
  8:  { units:8,  augs:4, relics:2 },
  12: { units:12, augs:6, relics:3 },
};
const gauntletOfferCounts = (w) => GAUNTLET_OFFERS[w] || GAUNTLET_OFFERS[8];

// SOULS — the gauntlet's own currency. Clearing a board pays a flat sum plus the
// worth of every foe taken on it. Tune the economy here.
const GAUNTLET_SOULS_CLEAR = 8;
const gauntletPieceValue = (arch) =>
  ({ Pawn:1, Knight:3, Bishop:3, Rook:5, Queen:9 })[FOLLOWER_ARCHETYPES[arch]?.pieceType] || 2;
const gauntletSoulsFor = (taken) => GAUNTLET_SOULS_CLEAR + taken.reduce((n, a) => n + gauntletPieceValue(a), 0);
const gauntletUnitPrice = (u) => 2 * gauntletPieceValue(u.archetype) + 2 * (u.evoTier || 0)
  + 2 * Object.values(u.augments || {}).filter(Boolean).length;
const gauntletAugPrice = (a) => 4 * a.tier;
const gauntletRelicPrice = (r) => 6 * r.tier;

const gauntletId = () => `gu-${Math.random().toString(36).slice(2,8)}`;
const gauntletPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const gauntletSample = (arr, n) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
};

// Board Pool boards a lineup of width `w` can be sent to.
const gauntletPool = (w) => forgeBoardPool().filter(b => b.lineupW === w);

// One board per stage. The leader stage draws first so a board authored for it
// is kept for it. Each stage then takes, in order of preference: a fresh board
// authored for its objective, any board authored for it, any fresh board, any board.
const gauntletDrawBoards = (pool) => {
  const used = new Set();
  const out = [];
  const order = GAUNTLET_STAGES.map((obj, i) => i).sort((a, b) =>
    (GAUNTLET_STAGES[b] === 'leader') - (GAUNTLET_STAGES[a] === 'leader'));
  order.forEach(i => {
    const fits = (b) => b.objective === GAUNTLET_STAGES[i];
    const fresh = (b) => !used.has(b.id);
    const tiers = [pool.filter(b => fresh(b) && fits(b)), pool.filter(fits), pool.filter(fresh), pool];
    out[i] = gauntletPick(tiers.find(t => t.length));
    used.add(out[i].id);
  });
  return out;
};

// A gauntlet-only copy of a roster follower.
const gauntletUnit = (f, slot) => ({
  uid: gauntletId(), instanceId: f.instanceId, archetype: f.archetype, name: f.name,
  evoTier: f.evoTier || 0, augSlotCount: f.augSlotCount ?? 5,
  augments: { ...(f.augments || {}) }, slot,
});

const gauntletStart = (run, width, lineup) => {
  const roster = run.roster || [];
  const army = Object.entries(lineup.board || {}).map(([slot, iid]) => {
    const f = roster.find(x => x.instanceId === iid);
    return f ? gauntletUnit(f, slot) : null;
  }).filter(Boolean);
  return {
    width, lineupName: lineup.name, stage: 0, phase: 'match',
    boards: gauntletDrawBoards(gauntletPool(width)),
    army, fallen: [], souls: 0, relicId: lineup.carryRelicId || null,
    offers: null, wins: 0, log: [],
  };
};

const gauntletOffers = (g, roster) => {
  const n = gauntletOfferCounts(g.width);
  const taken = new Set([...g.army, ...g.fallen].map(u => u.instanceId));
  return {
    units: gauntletSample(roster.filter(f => !taken.has(f.instanceId)), n.units)
      .map(f => ({ unit: gauntletUnit(f, null), sold: false })),
    augs: gauntletSample(AUGMENTATIONS, n.augs).map(a => ({ id: a.id, sold: false })),
    relics: gauntletSample(OP_RELICS.filter(r => r.id !== g.relicId), n.relics).map(r => ({ id: r.id, sold: false })),
  };
};

// The augment ports a follower has grown — the same hash the Follower screens use.
const gauntletOpenSlots = (u) => {
  const seedStr = u.instanceId + u.archetype;
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const indices = [...AUG_SLOTS.keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, u.augSlotCount ?? 5).map(i => AUG_SLOTS[i].id));
};

// Where a newcomer stands: its old square if still free, else the rank its kind
// prefers (larvae front, the rest back), else anywhere left. null = formation full.
const gauntletFreeSlot = (army, w, unit) => {
  const used = new Set(army.map(u => u.slot));
  if (unit.slot && !used.has(unit.slot)) return unit.slot;
  const ranks = FOLLOWER_ARCHETYPES[unit.archetype]?.pieceType === 'Pawn' ? [1, 0] : [0, 1];
  for (const r of ranks) for (let c = 0; c < w; c++) if (!used.has(`r${r}c${c}`)) return `r${r}c${c}`;
  return null;
};

// =============================================================================
// BOARD ENGINE — pure functions over { pieces:{ "r-c": piece }, … }.
// piece = { id, side:'ally'|'enemy', arch, moved?, uid? (army unit), npc?, leader? }
// Moves follow the archetype's pieceType; a slider's reach comes from the
// "range N" in its move text. Blocked squares stop every move.
// =============================================================================
const GAUNTLET_DIRS = {
  ortho: [[-1,0],[1,0],[0,-1],[0,1]],
  diag:  [[-1,-1],[-1,1],[1,-1],[1,1]],
};
const gauntletMoveRule = (arch) => {
  const a = FOLLOWER_ARCHETYPES[arch] || {};
  const range = Number((/range (\d+)/.exec(a.move || '') || [])[1]) || 99;
  switch (a.pieceType) {
    case 'Pawn':   return { pawn:true };
    case 'Knight': return { leap:true };
    case 'Bishop': return { dirs:GAUNTLET_DIRS.diag, range };
    case 'Rook':   return { dirs:GAUNTLET_DIRS.ortho, range };
    case 'Queen':  return { dirs:[...GAUNTLET_DIRS.ortho, ...GAUNTLET_DIRS.diag], range };
    default:       return { dirs:[...GAUNTLET_DIRS.ortho, ...GAUNTLET_DIRS.diag], range:1 };
  }
};

const gauntletMoves = (pieces, key, { W, H, blocked }) => {
  const p = pieces[key];
  if (!p) return [];
  const [r, c] = key.split('-').map(Number);
  const out = [];
  const open = (y, x) => y >= 0 && y < H && x >= 0 && x < W && !blocked.has(`${y}-${x}`);
  const at = (y, x) => pieces[`${y}-${x}`];
  // Returns whether a sliding ray may carry on past (y, x).
  const step = (y, x) => {
    if (!open(y, x)) return false;
    const q = at(y, x);
    if (!q) { out.push({ to:`${y}-${x}`, capture:false }); return true; }
    if (q.side !== p.side) out.push({ to:`${y}-${x}`, capture:true });
    return false;
  };
  const rule = gauntletMoveRule(p.arch);
  if (rule.pawn) {
    const d = p.side === 'ally' ? -1 : 1;
    if (open(r + d, c) && !at(r + d, c)) {
      out.push({ to:`${r + d}-${c}`, capture:false });
      if (!p.moved && open(r + 2*d, c) && !at(r + 2*d, c)) out.push({ to:`${r + 2*d}-${c}`, capture:false });
    }
    [-1, 1].forEach(dc => {
      const q = at(r + d, c + dc);
      if (open(r + d, c + dc) && q && q.side !== p.side) out.push({ to:`${r + d}-${c + dc}`, capture:true });
    });
  } else if (rule.leap) {
    [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]].forEach(([dy, dx]) => step(r + dy, c + dx));
  } else {
    rule.dirs.forEach(([dy, dx]) => { for (let i = 1; i <= rule.range; i++) if (!step(r + dy*i, c + dx*i)) break; });
  }
  return out;
};

// Nearest open, empty square to `want`, searched in widening rings; ties go to
// the row nearer the owner's home edge, then the nearer column.
const gauntletNearestFree = (pieces, blocked, W, H, [r0, c0], towardTop) => {
  for (let d = 0; d < Math.max(W, H); d++) {
    const ring = [];
    for (let y = r0 - d; y <= r0 + d; y++) for (let x = c0 - d; x <= c0 + d; x++) {
      if (Math.max(Math.abs(y - r0), Math.abs(x - c0)) !== d) continue;
      if (y < 0 || y >= H || x < 0 || x >= W) continue;
      const k = `${y}-${x}`;
      if (!blocked.has(k) && !pieces[k]) ring.push([y, x, k]);
    }
    if (ring.length) {
      ring.sort((a, b) => (towardTop ? a[0] - b[0] : b[0] - a[0]) || Math.abs(a[1] - c0) - Math.abs(b[1] - c0));
      return ring[0][2];
    }
  }
  return null;
};

// Back rank of the host raised on a board authored without any enemies.
const GAUNTLET_HOST_BACK = {
  4:  ['outrider', 'matriarch', 'witch', 'outrider'],
  8:  ['colossus', 'outrider', 'prelate', 'matriarch', 'witch', 'prelate', 'outrider', 'colossus'],
  12: ['myrmidon', 'colossus', 'outrider', 'prelate', 'prelate', 'matriarch',
       'witch', 'prelate', 'prelate', 'outrider', 'colossus', 'myrmidon'],
};

// Opening position: the board's own enemies and allies, then the player's
// formation on the bottom two rows, centred. On a leader stage the most
// valuable foe wears the crown.
const gauntletSetup = (board, army, width, objective) => {
  const W = board.w, H = board.h;
  const blocked = new Set(board.blocked);
  const off = Math.floor((W - width) / 2);
  const pieces = {};
  Object.entries(board.enemies || {}).forEach(([k, a]) => {
    if (!blocked.has(k)) pieces[k] = { id:`e${k}`, side:'enemy', arch:a };
  });
  if (!Object.keys(pieces).length) {
    const back = GAUNTLET_HOST_BACK[width] || GAUNTLET_HOST_BACK[8];
    for (let c = 0; c < width; c++) {
      [[0, back[c]], [1, 'larva']].forEach(([row, a]) => {
        const k = gauntletNearestFree(pieces, blocked, W, H, [row, off + c], true);
        if (k) pieces[k] = { id:`e${k}`, side:'enemy', arch:a };
      });
    }
  }
  Object.entries(board.allies || {}).forEach(([k, a]) => {
    if (!blocked.has(k) && !pieces[k]) pieces[k] = { id:`n${k}`, side:'ally', arch:a, npc:true };
  });
  army.forEach(u => {
    const m = /r(\d+)c(\d+)/.exec(u.slot || '');
    const want = m ? [H - 1 - Number(m[1]), off + Number(m[2])] : [H - 1, off];
    const k = gauntletNearestFree(pieces, blocked, W, H, want, false);
    if (k) pieces[k] = { id:u.uid, side:'ally', arch:u.archetype, uid:u.uid };
  });
  if (objective === 'leader') {
    const foes = Object.keys(pieces).filter(k => pieces[k].side === 'enemy');
    const crown = foes.reduce((best, k) =>
      !best || gauntletPieceValue(pieces[k].arch) > gauntletPieceValue(pieces[best].arch) ? k : best, null);
    if (crown) pieces[crown] = { ...pieces[crown], leader:true };
  }
  return pieces;
};

// Play from → to and settle the board: Exterminate is won when no foe stands,
// Eliminate Leader when the crowned foe falls; it is lost when no ally stands.
const gauntletApply = (s, from, to, objective) => {
  const mover = s.pieces[from], target = s.pieces[to];
  const pieces = { ...s.pieces, [to]: { ...mover, moved:true } };
  delete pieces[from];
  const taken = target?.side === 'enemy' ? [...s.taken, target.arch] : s.taken;
  const lost = target?.uid ? [...s.lost, target.uid] : s.lost;
  const next = { ...s, pieces, taken, lost, last:{ from, to } };
  const left = (side) => Object.values(pieces).some(p => p.side === side);
  const won = objective === 'leader' ? (!!target?.leader || !left('enemy')) : !left('enemy');
  if (won) return { ...next, result:{ won:true } };
  if (!left('ally')) return { ...next, result:{ won:false } };
  return next;
};

// The host takes the richest capture on offer; failing that it wanders,
// leaning toward the player's edge.
const gauntletEnemyTurn = (s, ctx) => {
  if (s.result) return s;
  const all = [];
  Object.keys(s.pieces).forEach(k => {
    if (s.pieces[k].side === 'enemy') gauntletMoves(s.pieces, k, ctx).forEach(m => all.push({ from:k, ...m }));
  });
  if (!all.length) return { ...s, turn:'ally', turnNo: s.turnNo + 1 };
  const score = (m) => m.capture
    ? 100 + 10 * gauntletPieceValue(s.pieces[m.to].arch)
    : 2 * (Number(m.to.split('-')[0]) - Number(m.from.split('-')[0])) + 3 * Math.random();
  const best = all.reduce((b, m) => { const v = score(m) + Math.random(); return v > b.v ? { m, v } : b; },
    { m:null, v:-Infinity }).m;
  return { ...gauntletApply(s, best.from, best.to, ctx.objective), turn:'ally', turnNo: s.turnNo + 1 };
};

// =============================================================================
// SCREEN — routes between the board, the reliquary and the reckoning.
// =============================================================================
const Gauntlet = ({ run, setRun, go }) => {
  const g = run.gauntlet;
  const back = () => { setRun(r => ({ ...r, commandSubTab:'gauntlet' })); go('op-command'); };

  if (!g) {
    return (
      <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)',
        display:'grid', placeItems:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic',
            color:'var(--bone-dim)', marginBottom:14 }}>No gauntlet is under way.</div>
          <button className="btn primary" onClick={back}>← Command Chamber</button>
        </div>
      </div>
    );
  }

  const setG = (fn) => setRun(r => r.gauntlet ? { ...r, gauntlet: fn(r.gauntlet) } : r);

  // A board is settled: the fallen leave the army, a win pays Souls and opens
  // the reliquary, a loss — or the last board — ends the gauntlet.
  const endMatch = ({ won, lost, taken }) => setRun(r => {
    const cur = r.gauntlet;
    const fallenNow = cur.army.filter(u => lost.includes(u.uid));
    const army = cur.army.filter(u => !lost.includes(u.uid));
    const fallen = [...cur.fallen, ...fallenNow];
    const souls = won ? gauntletSoulsFor(taken) : 0;
    const over = !won || cur.stage === GAUNTLET_STAGES.length - 1;
    const next = {
      ...cur, army, fallen, souls: cur.souls + souls, wins: cur.wins + (won ? 1 : 0),
      phase: over ? 'over' : 'shop',
      log: [...cur.log, { boardName: cur.boards[cur.stage].name, objective: GAUNTLET_STAGES[cur.stage],
        won, souls, fallen: fallenNow.map(u => u.name) }],
    };
    return { ...r, gauntlet: { ...next, offers: over ? null : gauntletOffers(next, r.roster || []) } };
  });

  const nextStage = () => setG(cur => ({ ...cur, stage: cur.stage + 1, phase:'match', offers:null }));

  const claim = () => {
    const reward = GAUNTLET_REWARDS[g.wins] || 0;
    setRun(r => {
      // No `{ gauntlet, ...rest } = r` here: Babel hoists the excluded-key list
      // into a global `_excluded` that a later screen file overwrites.
      const gauntlet = r.gauntlet;
      const rest = { ...r };
      delete rest.gauntlet;
      const res = r.res || { coral:0, dna:0, lumin:0 };
      const rec = r.gauntletRecord || { runs:0, completed:0, bestWins:0 };
      return {
        ...rest, commandSubTab:'gauntlet',
        res: { ...res, dna: (res.dna || 0) + reward, lp: (res.lp || 0) + reward },
        gauntletRecord: {
          runs: rec.runs + 1,
          completed: rec.completed + (gauntlet.wins === GAUNTLET_STAGES.length ? 1 : 0),
          bestWins: Math.max(rec.bestWins, gauntlet.wins),
        },
      };
    });
    go('op-command');
  };

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <GauntletTopBar g={g} onBack={back}/>
      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0 }}>
        {g.phase === 'match' && <GauntletMatch key={`stage-${g.stage}`} g={g} onEnd={endMatch}/>}
        {g.phase === 'shop'  && <GauntletShop g={g} setG={setG} onNext={nextStage}/>}
        {g.phase === 'over'  && <GauntletResult g={g} onClaim={claim}/>}
      </div>
    </div>
  );
};

const GAUNTLET_SOUL = { glyph:'❖', color:'oklch(0.76 0.12 300)' };

const GauntletTopBar = ({ g, onBack }) => {
  // The stage the player is on or heading into; -1 once it is all over.
  const current = g.phase === 'match' ? g.stage : g.phase === 'shop' ? g.stage + 1 : -1;
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:60, display:'flex', alignItems:'center',
      justifyContent:'space-between', padding:'0 24px', zIndex:5,
      background:'linear-gradient(180deg, rgba(8,12,16,0.92), rgba(0,0,0,0.6))',
      borderBottom:'1px solid var(--abyss-4)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:360 }}>
        <button className="btn ghost sm" onClick={onBack}>← Command Chamber</button>
        <div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.3em',
            color:'var(--brass-dim)', textTransform:'uppercase' }}>
            Command Chamber · Gauntlet
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--bone)', letterSpacing:'0.06em' }}>
            GAUNTLET · W{g.width} · {g.lineupName}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:6 }}>
        {GAUNTLET_STAGES.map((id, i) => {
          const entry = g.log[i];
          const state = entry ? (entry.won ? 'won' : 'lost') : i === current ? 'current' : 'ahead';
          const tone = { won:'var(--bio)', lost:'var(--coral)', current:'var(--brass)', ahead:'var(--abyss-4)' }[state];
          return (
            <div key={i} title={`Stage ${i + 1} · ${gauntletObjective(id).name}`}
              style={{ width:140, padding:'4px 8px', border:`1px solid ${tone}`,
                borderTop:`3px solid ${tone}`, background: state === 'current' ? 'var(--abyss-2)' : 'var(--abyss-1)' }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em',
                color: state === 'ahead' ? 'var(--bone-dim)' : tone }}>
                STAGE {i + 1} {state === 'won' ? '✓' : state === 'lost' ? '✕' : state === 'current' ? '◈' : ''}
              </div>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:10.5, color:'var(--bone)', whiteSpace:'nowrap',
                overflow:'hidden', textOverflow:'ellipsis' }}>
                {gauntletObjective(id).glyph} {gauntletObjective(id).name}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16, minWidth:360, justifyContent:'flex-end' }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
          letterSpacing:'0.2em' }}>WINS {g.wins}/{GAUNTLET_STAGES.length}</div>
        <div title="Souls — spent in the reliquary between boards"
          style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 12px',
            border:`1px solid ${GAUNTLET_SOUL.color}`, background:'var(--abyss-1)' }}>
          <span style={{ fontFamily:'Cinzel, serif', fontSize:16, color:GAUNTLET_SOUL.color }}>{GAUNTLET_SOUL.glyph}</span>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em',
            color:'var(--bone-dim)' }}>SOULS</span>
          <span style={{ fontFamily:'Cinzel, serif', fontSize:17, color:'var(--bone)' }}>{g.souls}</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MATCH — one board, played to its end.
// =============================================================================
const GAUNTLET_SQ_LIGHT = 'oklch(0.40 0.035 200)';
const GAUNTLET_SQ_DARK  = 'oklch(0.16 0.030 218)';

const GauntletMatch = ({ g, onEnd }) => {
  const board = g.boards[g.stage];
  const objective = GAUNTLET_STAGES[g.stage];
  const obj = gauntletObjective(objective);
  const W = board.w, H = board.h;
  const ctx = React.useMemo(() => ({ W, H, blocked: new Set(board.blocked), objective }), [board, objective]);
  const [st, setSt] = React.useState(() => ({
    pieces: gauntletSetup(board, g.army, g.width, objective),
    lost:[], taken:[], last:null, turn:'ally', turnNo:1, result:null,
  }));
  const [sel, setSel] = React.useState(null);
  const [inspect, setInspect] = React.useState(null);

  // The host answers after a beat.
  React.useEffect(() => {
    if (st.turn !== 'enemy' || st.result) return;
    const t = setTimeout(() => setSt(s => gauntletEnemyTurn(s, ctx)), 450);
    return () => clearTimeout(t);
  }, [st.turn, st.result, ctx]);

  const myTurn = st.turn === 'ally' && !st.result;
  const moves = sel && myTurn ? gauntletMoves(st.pieces, sel, ctx) : [];
  const moveTo = Object.fromEntries(moves.map(m => [m.to, m]));

  const click = (key) => {
    if (!myTurn) return;
    const p = st.pieces[key];
    if (sel && moveTo[key]) {
      const from = sel;
      setSel(null);
      setSt(s => { const n = gauntletApply(s, from, key, objective); return n.result ? n : { ...n, turn:'enemy' }; });
      return;
    }
    if (p?.side === 'ally') { setSel(key === sel ? null : key); setInspect(null); }
    else if (p) { setInspect(key); setSel(null); }
    else setSel(null);
  };

  const skip = () => { if (myTurn) { setSel(null); setSt(s => ({ ...s, turn:'enemy' })); } };
  const surrender = () => setSt(s => s.result ? s : { ...s, result:{ won:false } });
  const demoWin = () => setSt(s => s.result ? s : { ...s, result:{ won:true } });

  const foes = Object.values(st.pieces).filter(p => p.side === 'enemy');
  const leaderUp = foes.some(p => p.leader);
  const focusKey = sel || inspect;
  const focus = focusKey ? st.pieces[focusKey] : null;
  const relic = g.relicId ? OP_RELICS.find(r => r.id === g.relicId) : null;
  const last = g.stage === GAUNTLET_STAGES.length - 1;

  const cell = Math.max(14, Math.min(58, Math.floor(Math.min(800 / W, 740 / H))));
  const cells = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cells.push(`${r}-${c}`);

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'280px 1fr 280px',
      background:'linear-gradient(180deg, oklch(0.14 0.03 208), oklch(0.07 0.02 222))' }}>

      {/* LEFT — the brood on this board */}
      <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))' }}>
        <div className="caps" style={{ marginBottom:8 }}>Your Brood</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:16 }}>
          {g.army.map(u => {
            const a = FOLLOWER_ARCHETYPES[u.archetype] || {};
            const down = st.lost.includes(u.uid);
            return (
              <div key={u.uid} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px',
                background:'var(--abyss-1)', border:`1px solid ${down ? 'oklch(0.45 0.12 25 / 0.6)' : 'var(--abyss-3)'}`,
                opacity: down ? 0.55 : 1 }}>
                <span style={{ fontFamily:'Cinzel, serif', fontSize:17, color:a.color, width:18, textAlign:'center' }}>{a.glyph}</span>
                <span style={{ flex:1, minWidth:0, fontFamily:'Cinzel, serif', fontSize:11.5, color:'var(--bone)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  textDecoration: down ? 'line-through' : 'none' }}>{u.name}</span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.14em',
                  color: down ? 'var(--coral)' : 'var(--bio-dim)' }}>{down ? 'CAPTURED' : a.role?.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        <div className="caps" style={{ marginBottom:8 }}>Carried Relic</div>
        <GauntletRelicLine relic={relic}/>
      </div>

      {/* CENTER — the board */}
      <div style={{ position:'relative', display:'grid', placeItems:'center', overflow:'auto', padding:16 }}>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8,
            fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.2em', color:'var(--bone-dim)' }}>
            <span>{board.name.toUpperCase()} · {board.w}×{board.h}</span>
            <span style={{ color: myTurn ? 'var(--bio)' : 'var(--coral)' }}>
              TURN {st.turnNo} · {st.result ? 'SETTLED' : myTurn ? '◈ YOUR MOVE' : '◣ THE HOST MOVES'}
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${W}, ${cell}px)`,
            gridTemplateRows:`repeat(${H}, ${cell}px)`, border:'1px solid var(--brass-deep)',
            boxShadow:'0 12px 40px rgba(0,0,0,0.7)', userSelect:'none' }}>
            {cells.map(key => {
              const [r, c] = key.split('-').map(Number);
              const p = st.pieces[key];
              const isBlocked = ctx.blocked.has(key);
              const tv = board.terrain[key] ? forgeFormationVal(board.terrain[key]) : null;
              const terr = tv ? FORGE_TERRAINS.find(t => t.id === tv.type) : null;
              const prop = board.props[key] ? FORGE_PROPS.find(x => x.id === board.props[key]) : null;
              const mv = moveTo[key];
              const isLast = st.last && (st.last.to === key || st.last.from === key);
              return (
                <div key={key} onClick={()=>click(key)}
                  style={{ position:'relative', width:cell, height:cell,
                    cursor: mv || p?.side === 'ally' ? 'pointer' : 'default',
                    background: isBlocked
                      ? 'repeating-linear-gradient(45deg, oklch(0.09 0.015 220) 0 6px, oklch(0.13 0.03 30) 6px 12px)'
                      : (r + c) % 2 ? GAUNTLET_SQ_DARK : GAUNTLET_SQ_LIGHT }}>
                  {terr && !isBlocked && <div style={{ position:'absolute', inset:0,
                    background: terr.color.replace(')', ' / 0.22)') }}/>}
                  {isLast && <div style={{ position:'absolute', inset:0, background:'oklch(0.78 0.14 188 / 0.16)' }}/>}
                  {prop && !p && (
                    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center',
                      fontFamily:'Cinzel, serif', fontSize:cell * 0.45, color:prop.color, opacity:0.55 }}>{prop.glyph}</div>
                  )}
                  {p && <GauntletPiece piece={p} cell={cell}/>}
                  {sel === key && <div style={{ position:'absolute', inset:0, border:'3px solid var(--bio)' }}/>}
                  {inspect === key && <div style={{ position:'absolute', inset:0, border:'2px dashed var(--coral)' }}/>}
                  {mv?.capture && <div style={{ position:'absolute', inset:0, border:'3px solid var(--coral)' }}/>}
                  {mv && !mv.capture && (
                    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center' }}>
                      <div style={{ width:cell * 0.28, height:cell * 0.28, borderRadius:'50%',
                        background:'var(--bio)', opacity:0.55 }}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — the demand, the host, the focused piece */}
      <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'16px 14px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ padding:'12px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
          borderLeft:'3px solid var(--coral)' }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.22em',
            color:'var(--bone-dim)' }}>STAGE {g.stage + 1} / {GAUNTLET_STAGES.length}</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--coral)', marginTop:3 }}>
            {obj.glyph} {obj.name}
          </div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
            color:'var(--bone-dim)', marginTop:4, lineHeight:1.45 }}>{obj.desc}</div>
          <div style={{ marginTop:8, fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.14em',
            color:'var(--bone)' }}>
            {objective === 'leader'
              ? (leaderUp ? '♚ LEADER STILL STANDS' : '♚ LEADER FALLEN')
              : `${foes.length} FOE${foes.length === 1 ? '' : 'S'} REMAIN`}
          </div>
        </div>

        <div>
          <div className="caps" style={{ marginBottom:6 }}>{focus ? (focus.side === 'ally' ? 'Selected' : 'Inspected') : 'Inspector'}</div>
          {focus ? <GauntletPieceInfo piece={focus} army={g.army}/> : (
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
              color:'var(--bone-dim)', lineHeight:1.5 }}>
              Click one of your pieces to move it, or any foe to read it.
            </div>
          )}
        </div>

        <div style={{ flex:1 }}/>
        <button className="btn ghost" onClick={skip} disabled={!myTurn} style={{ justifyContent:'center' }}>
          ⏭ Skip Turn
        </button>
        <button className="btn ghost" onClick={surrender} disabled={!!st.result}
          style={{ justifyContent:'center', color:'oklch(0.7 0.15 25)' }}>
          ✕ Surrender · ends the gauntlet
        </button>
        <button className="btn sm" onClick={demoWin} disabled={!!st.result}
          style={{ justifyContent:'center', opacity:0.45 }}>[DEMO] Win</button>
      </div>

      {st.result && (
        <div className="modal-backdrop">
          <div className="modal ornate" style={{ textAlign:'center', minWidth:420 }}>
            <div className="eyebrow" style={{ color: st.result.won ? 'var(--bio-dim)' : 'var(--coral-dim)' }}>
              Stage {g.stage + 1} · {st.result.won ? 'Board Cleared' : 'The Gauntlet Ends'}
            </div>
            <h2 style={{ fontSize:52, margin:'10px 0', fontFamily:'Cinzel, serif', letterSpacing:'0.06em',
              color: st.result.won ? 'var(--bio)' : 'var(--coral)' }}>
              {st.result.won ? 'VICTORY' : 'DEFEAT'}
            </h2>
            {st.result.won && (
              <div style={{ fontFamily:'Cinzel, serif', fontSize:18, color:GAUNTLET_SOUL.color, marginBottom:8 }}>
                {GAUNTLET_SOUL.glyph} +{gauntletSoulsFor(st.taken)} Souls
                <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:9,
                  letterSpacing:'0.16em', color:'var(--bone-dim)', marginTop:3 }}>
                  {GAUNTLET_SOULS_CLEAR} FOR THE BOARD · {gauntletSoulsFor(st.taken) - GAUNTLET_SOULS_CLEAR} FROM {st.taken.length} FOE{st.taken.length === 1 ? '' : 'S'} TAKEN
                </span>
              </div>
            )}
            <div style={{ color:'var(--bone-dim)', fontStyle:'italic', marginBottom:20, fontSize:14 }}>
              {st.lost.length
                ? `Captured: ${g.army.filter(u => st.lost.includes(u.uid)).map(u => u.name).join(', ')}.`
                : 'Not one of thy brood was taken.'}
            </div>
            <button className="btn primary" onClick={()=>onEnd({ won: st.result.won, lost: st.lost, taken: st.taken })}>
              {!st.result.won ? 'Count the Spoils →' : last ? 'Complete the Gauntlet →' : 'Enter the Reliquary →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// A piece on the board — archetype glyph and colour, side bar beneath; foes
// also stand on a coral wash.
const GauntletPiece = ({ piece, cell }) => {
  const a = FOLLOWER_ARCHETYPES[piece.arch] || {};
  return (
    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', pointerEvents:'none',
      background: piece.side === 'enemy' ? 'oklch(0.55 0.16 25 / 0.22)' : 'transparent' }}>
      <span style={{ fontFamily:'Cinzel, serif', fontSize:cell * 0.64, lineHeight:1, color:a.color || 'var(--bone)',
        textShadow:'0 1px 3px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,0.9)' }}>{a.glyph || '●'}</span>
      <div style={{ position:'absolute', bottom:2, left:'22%', right:'22%', height:Math.max(2, Math.round(cell * 0.05)),
        background: piece.side === 'ally' ? 'var(--bio)' : 'var(--coral)' }}/>
      {piece.leader && (
        <span style={{ position:'absolute', top:1, left:2, fontSize:Math.max(9, cell * 0.3), lineHeight:1,
          color:'var(--coral)', textShadow:'0 0 4px rgba(0,0,0,0.9)' }}>♚</span>
      )}
      {piece.npc && (
        <span title="Board ally — not one of your followers"
          style={{ position:'absolute', top:1, right:3, fontSize:Math.max(8, cell * 0.22), lineHeight:1,
            color:'var(--bio-dim)' }}>◇</span>
      )}
    </div>
  );
};

const GauntletPieceInfo = ({ piece, army }) => {
  const a = FOLLOWER_ARCHETYPES[piece.arch] || {};
  const unit = piece.uid ? army.find(u => u.uid === piece.uid) : null;
  const tone = piece.side === 'ally' ? 'var(--bio)' : 'var(--coral)';
  const line = (k, v) => (
    <div style={{ display:'flex', gap:8, alignItems:'baseline' }}>
      <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em', color:'var(--bone-dim)',
        width:56, flexShrink:0, textTransform:'uppercase' }}>{k}</span>
      <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, color:'var(--bone)', lineHeight:1.35 }}>{v}</span>
    </div>
  );
  return (
    <div style={{ padding:'10px 12px', background:'var(--abyss-1)', border:`1px solid ${tone}`, borderTop:`3px solid ${tone}`,
      display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:2 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:28, lineHeight:1, color:a.color }}>{a.glyph}</span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)' }}>{unit?.name || a.name}</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.18em', color:tone }}>
            {piece.side === 'ally' ? (piece.npc ? '◇ BOARD ALLY' : '◈ YOUR FOLLOWER') : piece.leader ? '♚ ENEMY LEADER' : '◣ ENEMY'}
            {' · '}{a.role?.toUpperCase()}
          </div>
        </div>
      </div>
      {line('Move', a.move || '—')}
      {line('Capture', a.capture || '—')}
      {unit && line('Augments', Object.values(unit.augments || {}).filter(Boolean)
        .map(id => AUGMENTATIONS.find(x => x.id === id)?.name).filter(Boolean).join(', ') || 'None')}
    </div>
  );
};

const GauntletRelicLine = ({ relic }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--abyss-1)',
    border:`1px solid ${relic ? 'var(--brass-deep)' : 'var(--abyss-3)'}` }}>
    <span style={{ fontFamily:'Cinzel, serif', fontSize:20, width:22, textAlign:'center',
      color: relic ? 'var(--brass)' : 'var(--abyss-4)' }}>{relic ? relic.glyph : '∅'}</span>
    <div style={{ minWidth:0, flex:1 }}>
      <div style={{ fontFamily:'Cinzel, serif', fontSize:12.5, color: relic ? 'var(--bone)' : 'var(--bone-dim)' }}>
        {relic ? relic.name : 'None carried'}
      </div>
      {relic && <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11.5, fontStyle:'italic',
        color:'var(--bone-dim)', lineHeight:1.35 }}>{relic.desc}</div>}
    </div>
  </div>
);

// =============================================================================
// RELIQUARY — between boards. Buy as often as Souls allow, then march on.
// =============================================================================
const GauntletShop = ({ g, setG, onNext }) => {
  const [selUid, setSelUid] = React.useState(g.army[0]?.uid || null);
  const [dragUid, setDragUid] = React.useState(null);
  const selUnit = g.army.find(u => u.uid === selUid) || null;
  const cap = 2 * g.width;
  const full = g.army.length >= cap;
  const relic = g.relicId ? OP_RELICS.find(r => r.id === g.relicId) : null;
  const nextBoard = g.boards[g.stage + 1];
  const nextObj = gauntletObjective(GAUNTLET_STAGES[g.stage + 1]);

  // Spend `cost` Souls on `fn`, which returns the gauntlet unchanged when the
  // purchase no longer applies (sold out, no room, no port).
  const buy = (cost, fn) => setG(cur => {
    if (cur.souls < cost) return cur;
    const next = fn(cur);
    return next === cur ? cur : { ...next, souls: cur.souls - cost };
  });
  const sold = (list, i) => list.map((o, j) => j === i ? { ...o, sold:true } : o);

  const reclaim = (u) => buy(gauntletUnitPrice(u), cur => {
    const slot = gauntletFreeSlot(cur.army, cur.width, u);
    if (!slot || !cur.fallen.some(x => x.uid === u.uid)) return cur;
    return { ...cur, army:[...cur.army, { ...u, slot }], fallen: cur.fallen.filter(x => x.uid !== u.uid) };
  });
  const recruit = (i) => buy(gauntletUnitPrice(g.offers.units[i].unit), cur => {
    const o = cur.offers.units[i];
    const slot = gauntletFreeSlot(cur.army, cur.width, o.unit);
    if (o.sold || !slot) return cur;
    return { ...cur, army:[...cur.army, { ...o.unit, uid: gauntletId(), slot }],
      offers:{ ...cur.offers, units: sold(cur.offers.units, i) } };
  });
  const graft = (i) => {
    const aug = AUGMENTATIONS.find(a => a.id === g.offers.augs[i].id);
    const uid = selUid;
    buy(gauntletAugPrice(aug), cur => {
      const u = cur.army.find(x => x.uid === uid);
      if (cur.offers.augs[i].sold || !u || !gauntletOpenSlots(u).has(aug.slot) || u.augments?.[aug.slot]) return cur;
      return { ...cur,
        army: cur.army.map(x => x.uid === uid ? { ...x, augments:{ ...x.augments, [aug.slot]: aug.id } } : x),
        offers:{ ...cur.offers, augs: sold(cur.offers.augs, i) } };
    });
  };
  const swapRelic = (i) => {
    const r = OP_RELICS.find(x => x.id === g.offers.relics[i].id);
    buy(gauntletRelicPrice(r), cur => cur.offers.relics[i].sold ? cur
      : { ...cur, relicId: r.id, offers:{ ...cur.offers, relics: sold(cur.offers.relics, i) } });
  };
  // Drop a follower on a formation square; whoever stood there takes its old square.
  const place = (uid, slot) => setG(cur => {
    const mover = cur.army.find(u => u.uid === uid);
    if (!mover || mover.slot === slot) return cur;
    const occ = cur.army.find(u => u.slot === slot);
    return { ...cur, army: cur.army.map(u => u.uid === uid ? { ...u, slot } : occ && u.uid === occ.uid ? { ...u, slot: mover.slot } : u) };
  });

  const fcell = Math.min(54, Math.floor((340 - 2 * (g.width - 1)) / g.width));
  const priceBtn = (cost, ok, label, onClick, why) => (
    <button className="btn sm" disabled={!ok || g.souls < cost} onClick={onClick}
      title={!ok ? why : g.souls < cost ? 'Not enough Souls' : ''}
      style={{ justifyContent:'center', minWidth:92, color: ok && g.souls >= cost ? GAUNTLET_SOUL.color : 'var(--bone-dim)' }}>
      {label} · {GAUNTLET_SOUL.glyph}{cost}
    </button>
  );
  const section = (title, sub, children) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
        <div className="caps">{title}</div>
        <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bio-dim)', letterSpacing:'0.15em' }}>{sub}</span>
      </div>
      {children}
    </div>
  );
  const unitRow = (u, action) => {
    const a = FOLLOWER_ARCHETYPES[u.archetype] || {};
    const augs = Object.values(u.augments || {}).filter(Boolean).length;
    return (
      <div key={u.uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px',
        background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:20, color:a.color, width:22, textAlign:'center' }}>{a.glyph}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)', whiteSpace:'nowrap',
            overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.15em', color:'var(--bone-dim)' }}>
            {a.role?.toUpperCase()} · EVO {u.evoTier} · AUG {augs}/{u.augSlotCount}
          </div>
        </div>
        {action}
      </div>
    );
  };

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', gridTemplateColumns:'420px 1fr 320px' }}>

      {/* LEFT — the formation, and the follower chosen for grafting */}
      <div style={{ borderRight:'1px solid var(--abyss-4)', overflowY:'auto', padding:'18px 20px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))' }}>
        <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Stage {g.stage + 1} cleared</div>
        <h2 style={{ fontFamily:'Cinzel, serif', fontSize:24, margin:'4px 0 4px', letterSpacing:'0.08em' }}>THE RELIQUARY</h2>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic', color:'var(--bone-dim)',
          lineHeight:1.5, marginBottom:16 }}>
          Spend thy Souls as often as they last. Drag followers to rearrange the formation; click one to graft onto it.
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <div className="caps">Formation · W{g.width}</div>
          <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.15em',
            color: full ? 'var(--coral)' : 'var(--bio-dim)' }}>{g.army.length}/{cap} FIELDED</span>
        </div>
        {[1, 0].map(rank => (
          <div key={rank} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ width:34, fontFamily:'JetBrains Mono, monospace', fontSize:7.5, letterSpacing:'0.12em',
              color:'var(--bone-dim)' }}>{rank ? 'FRONT' : 'BACK'}</span>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${g.width}, ${fcell}px)`, gap:2 }}>
              {Array.from({ length:g.width }, (_, c) => {
                const slot = `r${rank}c${c}`;
                const u = g.army.find(x => x.slot === slot);
                const a = u ? FOLLOWER_ARCHETYPES[u.archetype] || {} : null;
                const isSel = u && u.uid === selUid;
                return (
                  <div key={slot}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragUid) place(dragUid, slot); setDragUid(null); }}
                    onClick={() => u && setSelUid(u.uid)}
                    draggable={!!u}
                    onDragStart={() => u && setDragUid(u.uid)}
                    title={u ? `${u.name} — drag to move` : 'Empty square'}
                    style={{ width:fcell, height:fcell, display:'grid', placeItems:'center', position:'relative',
                      cursor: u ? 'grab' : 'default',
                      background: (rank + c) % 2 ? GAUNTLET_SQ_DARK : GAUNTLET_SQ_LIGHT,
                      outline: isSel ? '2px solid var(--brass)' : 'none', outlineOffset:-2 }}>
                    {u && <span style={{ fontFamily:'Cinzel, serif', fontSize:fcell * 0.62, lineHeight:1, color:a.color,
                      textShadow:'0 1px 3px rgba(0,0,0,0.95)' }}>{a.glyph}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {selUnit && (() => {
          const open = gauntletOpenSlots(selUnit);
          return (
            <div style={{ marginTop:14 }}>
              <div className="caps" style={{ marginBottom:6 }}>Graft Target</div>
              {unitRow(selUnit, null)}
              <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:6 }}>
                {AUG_SLOTS.map(s => {
                  const aug = selUnit.augments?.[s.id] ? AUGMENTATIONS.find(a => a.id === selUnit.augments[s.id]) : null;
                  return (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px',
                      border:'1px dashed var(--abyss-3)', opacity: open.has(s.id) ? 1 : 0.4 }}>
                      <span style={{ color:s.color, width:14, textAlign:'center' }}>{s.glyph}</span>
                      <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.14em',
                        color:'var(--bone-dim)', width:60 }}>{s.label.toUpperCase()}</span>
                      <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:11.5,
                        color: aug ? 'var(--bone)' : 'var(--bone-dim)' }}>
                        {!open.has(s.id) ? 'Not grown' : aug ? aug.name : 'Free port'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* CENTER — what is for sale */}
      <div style={{ overflowY:'auto', padding:'18px 24px' }}>
        {section('Reclaim the Fallen', `${g.fallen.length} CAPTURED`, g.fallen.length === 0 ? (
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic', color:'var(--bone-dim)' }}>
            None of thy brood has been taken.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {g.fallen.map(u => unitRow(u, priceBtn(gauntletUnitPrice(u), !full, 'Reclaim', () => reclaim(u), 'Formation is full')))}
          </div>
        ))}

        {section('Recruits', `${g.offers.units.length} FROM THY ROSTER`, g.offers.units.length === 0 ? (
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, fontStyle:'italic', color:'var(--bone-dim)' }}>
            Every follower thou ownest already marches with thee.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {g.offers.units.map((o, i) => o.sold
              ? <div key={o.unit.uid} style={{ padding:'7px 10px', border:'1px dashed var(--abyss-3)',
                  fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.14em', color:'var(--bone-dim)',
                  display:'grid', placeItems:'center' }}>✓ RECRUITED · {o.unit.name.toUpperCase()}</div>
              : unitRow(o.unit, priceBtn(gauntletUnitPrice(o.unit), !full, 'Recruit', () => recruit(i), 'Formation is full')))}
          </div>
        ))}

        {section('Augments', selUnit ? `GRAFTS ONTO ${selUnit.name.toUpperCase()}` : 'CHOOSE A FOLLOWER TO GRAFT ONTO', (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {g.offers.augs.map((o, i) => {
              const aug = AUGMENTATIONS.find(a => a.id === o.id);
              const slot = AUG_SLOTS.find(s => s.id === aug.slot);
              const fits = !!selUnit && gauntletOpenSlots(selUnit).has(aug.slot) && !selUnit.augments?.[aug.slot];
              const why = !selUnit ? 'Choose a follower first'
                : !gauntletOpenSlots(selUnit).has(aug.slot) ? `${selUnit.name} has not grown a ${slot.label} port`
                : `${selUnit.name}'s ${slot.label} port is taken`;
              return (
                <div key={i} style={{ padding:'8px 10px', background:'var(--abyss-1)',
                  border:`1px solid ${o.sold ? 'var(--abyss-3)' : slot.color}`, opacity: o.sold ? 0.5 : 1,
                  display:'flex', flexDirection:'column', gap:5 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                    <span style={{ color:slot.color, fontSize:14 }}>{slot.glyph}</span>
                    <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)' }}>{aug.name}</span>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.14em',
                      color:slot.color }}>{slot.label.toUpperCase()} · T{aug.tier}</span>
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
                    color:'var(--bone-dim)', lineHeight:1.35 }}>{aug.effect}</div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    {o.sold
                      ? <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.14em',
                          color:'var(--bone-dim)' }}>✓ GRAFTED</span>
                      : priceBtn(gauntletAugPrice(aug), fits, 'Graft', () => graft(i), why)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* RIGHT — relic, record, the road on */}
      <div style={{ borderLeft:'1px solid var(--abyss-4)', overflowY:'auto', padding:'18px 16px',
        background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div className="caps" style={{ marginBottom:6 }}>Carried Relic</div>
          <GauntletRelicLine relic={relic}/>
        </div>
        <div>
          <div className="caps" style={{ marginBottom:6 }}>Relics on Offer</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {g.offers.relics.map((o, i) => {
              const r = OP_RELICS.find(x => x.id === o.id);
              return (
                <div key={o.id} style={{ padding:'8px 10px', background:'var(--abyss-1)', opacity: o.sold ? 0.5 : 1,
                  border:`1px solid ${o.sold ? 'var(--abyss-3)' : 'var(--brass-deep)'}` }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                    <span style={{ fontFamily:'Cinzel, serif', fontSize:17, color:'var(--brass)' }}>{r.glyph}</span>
                    <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)' }}>{r.name}</span>
                    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.14em',
                      color:'var(--bone-dim)' }}>T{r.tier}</span>
                  </div>
                  <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
                    color:'var(--bone-dim)', lineHeight:1.35, margin:'3px 0 6px' }}>{r.desc}</div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    {o.sold
                      ? <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.14em',
                          color:'var(--bone-dim)' }}>✓ CARRIED</span>
                      : priceBtn(gauntletRelicPrice(r), true, 'Swap in', () => swapRelic(i))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex:1 }}/>
        <div style={{ padding:'12px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
          borderLeft:'3px solid var(--coral)' }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.22em',
            color:'var(--bone-dim)' }}>NEXT · STAGE {g.stage + 2} / {GAUNTLET_STAGES.length}</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:15, color:'var(--coral)', margin:'3px 0 8px' }}>
            {nextObj.glyph} {nextObj.name}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <ForgeBoardThumb board={nextBoard} box={64}/>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.12em',
              color:'var(--bone)', lineHeight:1.6 }}>
              {nextBoard.name.toUpperCase()}<br/>
              <span style={{ color:'var(--bone-dim)' }}>{nextBoard.size} · {nextBoard.w}×{nextBoard.h}</span>
            </div>
          </div>
        </div>
        <button className="btn primary" onClick={onNext} disabled={g.army.length === 0}
          style={{ justifyContent:'center', padding:'14px', fontSize:14 }}>
          Enter Stage {g.stage + 2} →
        </button>
        {g.army.length === 0 && (
          <div style={{ marginTop:-8, fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--coral)',
            letterSpacing:'0.14em', textAlign:'center' }}>‣ FIELD AT LEAST ONE FOLLOWER</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// RECKONING — the gauntlet is over; pay out by boards won.
// =============================================================================
const GauntletResult = ({ g, onClaim }) => {
  const reward = GAUNTLET_REWARDS[g.wins] || 0;
  const complete = g.wins === GAUNTLET_STAGES.length;
  return (
    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', overflowY:'auto', padding:24 }}>
      <div className="panel ornate" style={{ width:620, padding:'28px 34px', textAlign:'center' }}>
        <div className="eyebrow" style={{ color: complete ? 'var(--bio-dim)' : 'var(--coral-dim)' }}>
          {complete ? 'Every Board Has Fallen' : 'The Gauntlet Ends'}
        </div>
        <h1 style={{ fontFamily:'Cinzel, serif', fontSize:40, margin:'6px 0 4px', letterSpacing:'0.08em',
          color: complete ? 'var(--bio)' : 'var(--bone)' }}>
          {complete ? 'GAUNTLET COMPLETE' : 'GAUNTLET ENDED'}
        </h1>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, letterSpacing:'0.2em', color:'var(--bone-dim)',
          marginBottom:18 }}>BOARDS WON · {g.wins} / {GAUNTLET_STAGES.length}</div>

        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20, textAlign:'left' }}>
          {GAUNTLET_STAGES.map((id, i) => {
            const e = g.log[i];
            const tone = !e ? 'var(--abyss-4)' : e.won ? 'var(--bio)' : 'var(--coral)';
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px',
                background:'var(--abyss-1)', border:'1px solid var(--abyss-3)', borderLeft:`3px solid ${tone}`,
                opacity: e ? 1 : 0.45 }}>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.18em', color:tone, width:64 }}>
                  STAGE {i + 1}
                </span>
                <span style={{ flex:1, fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)' }}>
                  {gauntletObjective(id).glyph} {e ? e.boardName : gauntletObjective(id).name}
                </span>
                <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.14em', color:tone }}>
                  {!e ? 'NOT REACHED' : e.won ? `✓ WON · ${GAUNTLET_SOUL.glyph}${e.souls}` : '✕ LOST'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="caps" style={{ marginBottom:8 }}>Reward</div>
        <div style={{ display:'flex', justifyContent:'center', gap:14, marginBottom:22 }}>
          {[['LP', '✦', 'oklch(0.78 0.12 85)'], ['DNA', '✧', 'oklch(0.72 0.14 150)']].map(([k, glyph, color]) => (
            <div key={k} style={{ minWidth:140, padding:'12px 16px', background:'var(--abyss-1)', border:`1px solid ${color}` }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:26, color }}>{glyph} {reward}</div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.22em', color:'var(--bone-dim)' }}>{k}</div>
            </div>
          ))}
        </div>
        <button className="btn primary" onClick={onClaim} style={{ padding:'14px 30px', fontSize:14 }}>
          {reward ? 'Claim & Return →' : 'Return to the Chamber →'}
        </button>
      </div>
    </div>
  );
};

window.Gauntlet = Gauntlet;
