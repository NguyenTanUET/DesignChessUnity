// Match — an abyssal hunt, played on a FLAT 2D board: top-down, true squares,
// solid fills. Colour (not depth) carries every piece of information.
const CELL = 64;
const SQ_LIGHT = 'oklch(0.40 0.035 200)';
const SQ_DARK  = 'oklch(0.16 0.030 218)';
// One solid silhouette set for BOTH sides — identical shapes read faster than
// hollow-vs-filled; the fill colour is what tells the sides apart.
const SOLID_GLYPH = { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟', W:'♛', A:'♝', G:'♞', S:'♜' };

// Day flips to night every 10 turns.
const DAY_CYCLE = 10;
const phaseOf = (turnNo) => {
  const block = Math.floor((turnNo - 1) / DAY_CYCLE);
  return { isDay: block % 2 === 0, left: DAY_CYCLE - ((turnNo - 1) % DAY_CYCLE) };
};

// Board piece letters → roster archetypes, so a piece on the board can show the
// same skills the Follower screens describe.
const TYPE_ARCH = { P:'larva', N:'outrider', B:'prelate', R:'colossus',
                    Q:'matriarch', S:'myrmidon', W:'witch', A:'prelate', G:'outrider' };

// Unified dossier for a board piece: name/art from PIECES, skills from the archetype.
const pieceProfile = (type) => {
  const base = (window.PIECES || {})[type] || {};
  const arch = (window.FOLLOWER_ARCHETYPES || {})[TYPE_ARCH[type]] || {};
  return {
    name: base.name || arch.name || type,
    desc: base.desc || arch.desc || '',
    ability: base.ability || null,
    color: arch.color || 'var(--bone)',
    role: arch.role || (type === 'K' ? 'Sovereign' : ''),
    move: arch.move || '—',
    capture: arch.capture || '—',
    innate: arch.innate || '—',
    modifier: arch.modifier || '—',
    active: arch.active || '— None —',
  };
};

// Which squares this piece's ACTIVE skill can reach.
const SKILL_SHAPE = { N:'adjacent', R:'adjacent', Q:'adjacent', S:'adjacent',
                      W:'allies', B:'area3', A:'ranged2' };
const skillTargets = (board, r, c, N) => {
  const p = board[r][c]; if (!p) return [];
  const shape = SKILL_SHAPE[p.type];
  if (!shape) return [];
  const out = [];
  const inB = (y,x) => y>=0 && y<N && x>=0 && x<N;
  const push = (y,x) => { if (inB(y,x) && !(y===r && x===c)) out.push(`${y}-${x}`); };
  if (shape === 'adjacent') {
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) push(r+dy, c+dx);
  } else if (shape === 'area3' || shape === 'ranged2') {
    const rad = shape === 'area3' ? 3 : 2;
    for (let dy=-rad; dy<=rad; dy++) for (let dx=-rad; dx<=rad; dx++) {
      if (Math.max(Math.abs(dy), Math.abs(dx)) <= rad) push(r+dy, c+dx);
    }
  } else if (shape === 'allies') {
    for (let y=0; y<N; y++) for (let x=0; x<N; x++) {
      if (board[y][x] && board[y][x].color === p.color) push(y, x);
    }
  }
  return out;
};

const Match = ({ run, enemy, node, onWin, onLose, boardSize }) => {
  const N = boardSize || (node?.type === 'boss' ? 8 : node?.type === 'elite' ? 8 : enemy?.board?.startsWith('6') ? 6 : enemy?.board?.startsWith('7') ? 7 : 8);
  const [board, setBoard] = React.useState(() => setupBoard(N, run));
  const [sel, setSel] = React.useState(null);
  const [turnNo, setTurnNo] = React.useState(1);
  const [turn, setTurn] = React.useState('white');
  const [history, setHistory] = React.useState([]);
  const [captured, setCaptured] = React.useState({ white: [], black: [] });
  const [result, setResult] = React.useState(null);
  const [inspect, setInspect] = React.useState(null);   // enemy square being inspected
  const [skillMode, setSkillMode] = React.useState(false); // paint the skill range

  function setupBoard(n, run) {
    const b = Array.from({length: n}, () => Array(n).fill(null));
    const backBlack = n === 8 ? ['R','N','B','Q','K','B','N','R'] : n === 7 ? ['R','N','B','Q','K','B','R'] : ['R','N','Q','K','B','R'];
    for (let c = 0; c < n; c++) {
      b[0][c] = { color:'black', type: backBlack[c] || 'P', id:`b${c}0` };
      b[1][c] = { color:'black', type:'P', id:`b${c}1` };
    }
    const nonKing = run.deck.filter(k => k !== 'K');
    const king = run.deck.find(k => k === 'K') || 'K';
    const pawns = nonKing.filter(k => k === 'P').slice(0, n);
    const nonPawn = nonKing.filter(k => k !== 'P').slice(0, n);
    for (let c = 0; c < n; c++) if (pawns[c]) b[n-2][c] = { color:'white', type:'P', id:`w${c}${n-2}` };
    const backWhite = Array(n).fill(null);
    const kingCol = Math.floor(n/2);
    backWhite[kingCol] = king;
    let idx = 0;
    for (let c = 0; c < n; c++) {
      if (c === kingCol) continue;
      if (nonPawn[idx]) { backWhite[c] = nonPawn[idx]; idx++; }
    }
    for (let c = 0; c < n; c++) if (backWhite[c]) b[n-1][c] = { color:'white', type: backWhite[c], id:`w${c}${n-1}` };
    return b;
  }

  function legalMoves(board, r, c) {
    const p = board[r][c]; if (!p) return [];
    const moves = [];
    const inB = (r,c) => r>=0&&r<N&&c>=0&&c<N;
    const push = (r2,c2) => {
      if (!inB(r2,c2)) return 'stop';
      const t = board[r2][c2];
      if (!t) { moves.push({r:r2,c:c2,capture:false}); return 'cont'; }
      if (t.color !== p.color) { moves.push({r:r2,c:c2,capture:true}); return 'stop'; }
      return 'stop';
    };
    const slide = (dr,dc) => { let rr=r+dr,cc=c+dc; while(inB(rr,cc)){ const r2=push(rr,cc); if(r2==='stop')break; rr+=dr;cc+=dc;} };
    const t = p.type;
    if (t==='P') {
      const dir = p.color==='white'?-1:1;
      const startR = p.color==='white'?N-2:1;
      if (inB(r+dir,c)&&!board[r+dir][c]) moves.push({r:r+dir,c,capture:false});
      if (r===startR && inB(r+2*dir,c)&&!board[r+dir][c]&&!board[r+2*dir][c]) moves.push({r:r+2*dir,c,capture:false});
      [-1,1].forEach(dc => { const r2=r+dir,c2=c+dc; if(inB(r2,c2)&&board[r2][c2]&&board[r2][c2].color!==p.color) moves.push({r:r2,c:c2,capture:true}); });
    } else if (t==='N'||t==='G') [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]].forEach(([dr,dc])=>push(r+dr,c+dc));
    else if (t==='B'||t==='A') [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));
    else if (t==='R'||t==='S') [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
    else if (t==='Q'||t==='W') [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
    else if (t==='K') [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc));
    return moves;
  }

  // Live status read off the board — no separate effect engine needed.
  // (Engine-driven effects can be added later as piece.effects[].)
  const statusOf = (r, c) => {
    const p = board[r][c];
    if (!p) return [];
    const foe = p.color === 'white' ? 'black' : 'white';
    const out = [...(p.effects || [])];

    // Threatened — some enemy piece can capture this square right now.
    let threatened = false;
    for (let y=0; y<N && !threatened; y++) for (let x=0; x<N && !threatened; x++) {
      const q = board[y][x];
      if (q && q.color === foe && legalMoves(board, y, x).some(m => m.r===r && m.c===c && m.capture)) threatened = true;
    }
    if (threatened) out.push({ name:'Threatened', color:'var(--coral)', glyph:'⚠',
      desc:'An enemy piece can capture this square this turn.' });

    // Guarded — flip its colour and see whether a friend would retake it.
    const probe = board.map(row => row.slice());
    probe[r][c] = { ...p, color: foe };
    let guarded = false;
    for (let y=0; y<N && !guarded; y++) for (let x=0; x<N && !guarded; x++) {
      const q = probe[y][x];
      if (q && q.color === p.color && legalMoves(probe, y, x).some(m => m.r===r && m.c===c && m.capture)) guarded = true;
    }
    if (guarded) out.push({ name:'Guarded', color:'var(--bio)', glyph:'⛨',
      desc:'An allied piece covers this square — a trade, not a loss.' });

    const last = history[history.length - 1];
    if (last && last.to.r === r && last.to.c === c) out.push({ name:'Just Moved', color:'var(--brass)', glyph:'↷',
      desc:'This piece took the most recent action.' });

    return out;
  };

  const sqClick = (r, c) => {
    if (result) return;
    const p = board[r][c];
    // Clicking an enemy that is not a capture target inspects it instead.
    if (p && p.color === 'black' && !captureSet.has(`${r}-${c}`)) { setInspect({ r, c }); return; }
    if (sel) {
      const moves = legalMoves(board, sel.r, sel.c);
      const m = moves.find(mv => mv.r===r && mv.c===c);
      if (m) {
        const nb = board.map(row => row.slice());
        const mover = nb[sel.r][sel.c];
        const target = nb[r][c];
        nb[r][c] = mover; nb[sel.r][sel.c] = null;
        if (target) {
          setCaptured(ch => ({ ...ch, [target.color]: [...ch[target.color], target.type] }));
          if (target.type === 'K') setResult({ won: target.color==='black', text: target.color==='black'?'APOTHEOSIS':'CARRION' });
        }
        setBoard(nb);
        setHistory(h => [...h, { from:{r:sel.r,c:sel.c}, to:{r,c}, piece: mover.type, capture: !!target }]);
        setSel(null);
        if (!target || target.type!=='K') setTimeout(() => enemyMove(nb), 600);
        return;
      }
      if (p && p.color==='white') { setSel({r,c}); return; }
      setSel(null);
    } else {
      if (p && p.color==='white' && turn==='white') setSel({r,c});
    }
  };

  const enemyMove = (b) => {
    const moves = [];
    for (let r=0;r<N;r++) for (let c=0;c<N;c++) {
      const p = b[r][c];
      if (p && p.color==='black') legalMoves(b,r,c).forEach(m => moves.push({ from:{r,c}, to:m, capture:m.capture, piece: p.type }));
    }
    if (!moves.length) return;
    const caps = moves.filter(m=>m.capture);
    const pick = caps.length?caps[Math.floor(Math.random()*caps.length)]:moves[Math.floor(Math.random()*moves.length)];
    const nb = b.map(row => row.slice());
    const mover = nb[pick.from.r][pick.from.c];
    const target = nb[pick.to.r][pick.to.c];
    nb[pick.to.r][pick.to.c] = mover; nb[pick.from.r][pick.from.c] = null;
    if (target) {
      setCaptured(ch => ({ ...ch, [target.color]: [...ch[target.color], target.type] }));
      if (target.type==='K') setResult({ won:false, text:'CARRION' });
    }
    setBoard(nb);
    setHistory(h => [...h, { ...pick, piece: mover.type }]);
    setTurnNo(n => n + 1);
  };

  const moves = sel ? legalMoves(board, sel.r, sel.c) : [];
  const moveSet = new Set(moves.map(m => `${m.r}-${m.c}`));
  const captureSet = new Set(moves.filter(m=>m.capture).map(m => `${m.r}-${m.c}`));
  // Squares the selected piece's active skill can reach (painted on demand).
  const skillSet = new Set(sel && skillMode ? skillTargets(board, sel.r, sel.c, N) : []);

  const selPiece = sel ? board[sel.r][sel.c] : null;
  // the inspected square may have emptied or changed hands since it was clicked
  const inspectPiece = inspect && board[inspect.r][inspect.c]?.color === 'black'
    ? board[inspect.r][inspect.c] : null;
  const phase = phaseOf(turnNo);

  return (
    <div className="screen" style={{ position:'absolute', inset:0,
      // flat backdrop — the board is the figure, this is only ground
      background:'linear-gradient(180deg, oklch(0.14 0.03 208), oklch(0.07 0.02 222))',
      overflow:'hidden'
    }}>
      {/* light shafts — dialled far back so they never compete with the board */}
      <svg viewBox="0 0 1440 900" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.18 }} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="mshaft" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.9 0.08 190)" stopOpacity="0.25"/>
            <stop offset="80%" stopColor="oklch(0.3 0.04 210)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="300,0 360,0 500,900 240,900" fill="url(#mshaft)"/>
        <polygon points="900,0 980,0 1180,900 820,900" fill="url(#mshaft)"/>
        <polygon points="1250,0 1310,0 1420,900 1190,900" fill="url(#mshaft)" opacity="0.6"/>
      </svg>

      {/* silt / noise */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.45 0 0 0 0 0.5 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        mixBlendMode:'screen', opacity:0.2
      }}/>

      {/* plankton */}
      <div className="plankton">
        {Array.from({length:14}).map((_,i)=>(
          <span key={i} style={{
            left:`${(i*151)%100}%`,
            animationDuration:`${20+(i%6)*3}s`,
            animationDelay:`${-(i*1.5)}s`,
          }}/>
        ))}
      </div>

      {/* TOP-CENTER capture tally */}
      <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', zIndex:3,
        display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Cinzel, serif' }}>
          <span style={{ color:'var(--bio)', fontSize:24, fontWeight:600, textShadow:'0 0 10px var(--bio), 0 1px 2px rgba(0,0,0,0.9)' }}>
            {captured.black.length}
          </span>
          <div style={{ display:'flex', gap:2 }}>
            {captured.black.slice(-3).map((t,i) => (
              <span key={i} style={{ fontSize:16, color:'var(--coral)' }}>{SOLID_GLYPH[t]||'♟'}</span>
            ))}
          </div>
        </div>
        <div style={{ width:44, height:44,
          background:'oklch(0.11 0.02 218)', border:'1px solid var(--brass-deep)',
          display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', color:'var(--brass)', fontSize:20 }}>
          ♚
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Cinzel, serif' }}>
          <div style={{ display:'flex', gap:2 }}>
            {captured.white.slice(-3).map((t,i) => (
              <span key={i} style={{ fontSize:16, color:'var(--bone)' }}>{SOLID_GLYPH[t]||'♟'}</span>
            ))}
          </div>
          <span style={{ color:'var(--coral)', fontSize:24, fontWeight:600, textShadow:'0 0 10px var(--coral), 0 1px 2px rgba(0,0,0,0.9)' }}>
            {captured.white.length}
          </span>
        </div>
      </div>

      {/* TOP-RIGHT: turn counter + day/night clock */}
      <div style={{ position:'absolute', top:12, right:14, zIndex:3 }}>
        <TurnClock turnNo={turnNo} phase={phase} side={turn}/>
      </div>

      {/* TOP-LEFT: enemy inspector — click any enemy piece */}
      <div style={{ position:'absolute', top:12, left:14, zIndex:3 }}>
        <EnemyPanel piece={inspectPiece} square={inspect}
          status={inspect ? statusOf(inspect.r, inspect.c) : []}
          onClose={()=>setInspect(null)}/>
      </div>

      {/* MID-LEFT: commanders + the relic each side carries */}
      <div style={{ position:'absolute', left:14, top:'42%', transform:'translateY(-50%)', zIndex:3 }}>
        <CommanderRail run={run} enemy={enemy}/>
      </div>

      {/* BOTTOM-CENTER: selected ally — movement, capture, skill, status */}
      <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', zIndex:3 }}>
        <AllyPanel piece={selPiece} square={sel}
          status={sel ? statusOf(sel.r, sel.c) : []}
          moveCount={moveSet.size - captureSet.size} capCount={captureSet.size}
          skillCount={sel ? skillTargets(board, sel.r, sel.c, N).length : 0}
          skillMode={skillMode} onToggleSkill={()=>setSkillMode(v=>!v)}
          onClear={()=>{ setSel(null); setSkillMode(false); }}/>
      </div>

      {/* BOTTOM-LEFT: skip turn */}
      <div style={{ position:'absolute', left:14, bottom:14, zIndex:3 }}>
        <SkipTurnButton onClick={() => { setTurnNo(n=>n+1); setSel(null); setSkillMode(false); }}/>
      </div>

      {/* RIGHT side icon buttons */}
      <div style={{ position:'absolute', right:20, top:'32%', zIndex:3, display:'flex', flexDirection:'column', gap:14 }}>
        <CircleBtn color="var(--brass)" hollow title="Flee" onClick={onLose}/>
        <IconBtn title="Bestiary">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--brass)" strokeWidth="1.6">
            <rect x="4" y="4" width="16" height="16" rx="1"/>
            <path d="M8 9h6M8 12h8M8 15h5"/>
            <circle cx="17" cy="9" r="1.2" fill="var(--brass)"/>
          </svg>
        </IconBtn>
        <IconBtn title="Abilities">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bio)" strokeWidth="1.6">
            <path d="M12 3l2 5 5 .5-4 3.5 1 5-4-3-4 3 1-5-4-3.5 5-.5z"/>
          </svg>
        </IconBtn>
        <CircleBtn color="var(--coral)" title="Surrender" onClick={onLose}/>
      </div>

      {/* BOTTOM-RIGHT: reference panels */}
      <div style={{ position:'absolute', right:18, bottom:18, zIndex:3, display:'flex', gap:6 }}>
        <IconBtn title="Brood Roster">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--brass)" strokeWidth="1.5">
            <circle cx="8" cy="10" r="3"/><circle cx="16" cy="10" r="3"/>
            <path d="M3 20c0-3 2-5 5-5s5 2 5 5M11 20c0-3 2-5 5-5s5 2 5 5"/>
          </svg>
        </IconBtn>
        <IconBtn title="Objective">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--brass)" strokeWidth="1.6">
            <path d="M6 4v16l5-3 5 3V4z"/>
          </svg>
        </IconBtn>
      </div>

      {/* BOARD — flat 2D, read top-down. No tilt, no perspective: every square is
          a true square and no piece ever overlaps the rank behind it. */}
      <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', zIndex:2 }}>
        <BoardFrame N={N}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${N}, ${CELL}px)`,
            gridTemplateRows:`repeat(${N}, ${CELL}px)`,
            position:'relative',
            border:'1px solid oklch(0.06 0.01 225)',
          }}>
            {board.map((row, r) => row.map((p, c) => {
              const isLight = (r+c) % 2 === 0;
              const key = `${r}-${c}`;
              const isSel = sel && sel.r===r && sel.c===c;
              const isMove = moveSet.has(key) && !captureSet.has(key);
              const isCap = captureSet.has(key);
              const isLast = history.length>0 && ((history[history.length-1].to.r===r && history[history.length-1].to.c===c));
              const isSkill = skillSet.has(key);
              const isInspected = inspect && inspect.r===r && inspect.c===c;
              return (
                <div key={key} onClick={()=>sqClick(r,c)}
                  style={{
                    position:'relative', width:CELL, height:CELL,
                    display:'grid', placeItems:'center',
                    // flat, solid squares — no gradients to muddy the contrast
                    background: isLight ? SQ_LIGHT : SQ_DARK,
                    cursor: (isMove||isCap||isSel|| (p&&p.color==='white')) ? 'pointer' : 'default',
                  }}
                >
                  {/* last move — faint flat wash */}
                  {isLast && (
                    <div style={{ position:'absolute', inset:0, background:'oklch(0.78 0.14 188 / 0.16)',
                      pointerEvents:'none' }}/>
                  )}
                  {/* skill range — flat amber wash under everything else */}
                  {isSkill && (
                    <div style={{ position:'absolute', inset:0, background:'oklch(0.80 0.13 82 / 0.22)',
                      border:'1px dashed var(--brass)', pointerEvents:'none' }}/>
                  )}
                  {/* selected — solid ring */}
                  {isSel && (
                    <div style={{ position:'absolute', inset:0, border:'3px solid var(--bio)',
                      pointerEvents:'none' }}/>
                  )}
                  {/* inspected enemy — dashed coral ring */}
                  {isInspected && (
                    <div style={{ position:'absolute', inset:0, border:'2px dashed var(--coral)',
                      pointerEvents:'none' }}/>
                  )}
                  {/* capture target — coral ring */}
                  {isCap && (
                    <div style={{ position:'absolute', inset:0, border:'3px solid var(--coral)',
                      pointerEvents:'none' }}/>
                  )}
                  {/* legal move onto an empty square — flat dot */}
                  {isMove && !p && (
                    <div style={{ width:CELL*0.28, height:CELL*0.28, borderRadius:'50%',
                      background:'var(--bio)', opacity:0.55, pointerEvents:'none' }}/>
                  )}
                  {p && <PieceMini piece={p} cell={CELL}/>}
                </div>
              );
            }))}
            {/* midline — thin flat rift, no bloom */}
            <div style={{
              position:'absolute', left:0, right:0,
              top: `${(N/2) * CELL}px`, height: 2, marginTop:-1,
              background:'var(--bio)', opacity:0.5,
              zIndex: 5, pointerEvents:'none',
            }}/>
          </div>
        </BoardFrame>
      </div>

      {result && (
        <div className="modal-backdrop">
          <div className="modal ornate" style={{ textAlign:'center' }}>
            <div className="eyebrow" style={{ color: result.won ? 'var(--bio-dim)' : 'var(--coral-dim)' }}>
              {result.won ? 'The Brood Feeds' : 'The Brood Is Unmade'}
            </div>
            <h2 style={{ fontSize:56, margin:'10px 0', fontFamily:'Cinzel, serif', letterSpacing:'0.06em',
              color: result.won ? 'var(--bio)' : 'var(--coral)' }}>{result.text}</h2>
            <div style={{ color:'var(--bone-dim)', fontStyle:'italic', marginBottom:24 }}>
              {result.won ? 'The carcass sinks. The tide carries thy reward.' : 'The Sovereign sinks. The brood scatters.'}
            </div>
            <button className="btn primary" onClick={result.won ? onWin : onLose}>
              {result.won ? 'Claim Carrion →' : 'Accept the Silt →'}
            </button>
          </div>
        </div>
      )}

      <button className="btn sm" style={{ position:'absolute', top:112, right:14, zIndex:3, opacity:0.45 }}
        onClick={onWin}>[DEMO] Win</button>
    </div>
  );
};

// Flat brass frame with file/rank coordinates — no bevel, no bloom, no depth.
const BoardFrame = ({ N, children }) => {
  const FRAME = 22;
  const files = 'ABCDEFGHIJKLMN'.slice(0, N).split('');
  const coord = {
    position:'absolute', display:'flex', alignItems:'center', justifyContent:'space-around',
    fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass-dim)',
    letterSpacing:'0.1em', pointerEvents:'none',
  };
  return (
    <div style={{ position:'relative', padding: FRAME,
      background:'oklch(0.11 0.02 218)',
      border:'1px solid var(--brass-deep)',
    }}>
      {/* file letters — top & bottom */}
      <div style={{ ...coord, top:2, left:FRAME, right:FRAME, height:FRAME-4 }}>
        {files.map(f => <span key={f} style={{ width:CELL, textAlign:'center' }}>{f}</span>)}
      </div>
      <div style={{ ...coord, bottom:2, left:FRAME, right:FRAME, height:FRAME-4 }}>
        {files.map(f => <span key={f} style={{ width:CELL, textAlign:'center' }}>{f}</span>)}
      </div>
      {/* rank numbers — left & right */}
      <div style={{ ...coord, flexDirection:'column', left:2, top:FRAME, bottom:FRAME, width:FRAME-4 }}>
        {Array.from({length:N}).map((_,i) => (
          <span key={i} style={{ height:CELL, display:'grid', placeItems:'center' }}>{N-i}</span>
        ))}
      </div>
      <div style={{ ...coord, flexDirection:'column', right:2, top:FRAME, bottom:FRAME, width:FRAME-4 }}>
        {Array.from({length:N}).map((_,i) => (
          <span key={i} style={{ height:CELL, display:'grid', placeItems:'center' }}>{N-i}</span>
        ))}
      </div>
      <div style={{ position:'relative' }}>{children}</div>
    </div>
  );
};

// Barnacle / coral glyph (replaces gear)
const Barnacle = ({ size=14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display:'block' }}>
    <g fill="none" stroke="var(--brass)" strokeWidth="1.2">
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="2" fill="var(--brass)"/>
      {[0,72,144,216,288].map(a => {
        const rad = a * Math.PI/180;
        const x1 = 12 + Math.cos(rad)*7, y1 = 12 + Math.sin(rad)*7;
        const x2 = 12 + Math.cos(rad)*10, y2 = 12 + Math.sin(rad)*10;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}/>;
      })}
      <circle cx="12" cy="12" r="10" opacity="0.5"/>
    </g>
  </svg>
);

const BarnacleRow = ({ N, thickness }) => (
  <>
    <div style={{ position:'absolute', top: 4, left: thickness, right: thickness, display:'flex', justifyContent:'space-around', zIndex: 3 }}>
      {Array.from({length: N}).map((_,i) => <Barnacle key={i}/>)}
    </div>
    <div style={{ position:'absolute', bottom: 4, left: thickness, right: thickness, display:'flex', justifyContent:'space-around', zIndex: 3 }}>
      {Array.from({length: N}).map((_,i) => <Barnacle key={i}/>)}
    </div>
    <div style={{ position:'absolute', top: thickness, bottom: thickness, left: 4, display:'flex', flexDirection:'column', justifyContent:'space-around', zIndex: 3 }}>
      {Array.from({length: N}).map((_,i) => <Barnacle key={i}/>)}
    </div>
    <div style={{ position:'absolute', top: thickness, bottom: thickness, right: 4, display:'flex', flexDirection:'column', justifyContent:'space-around', zIndex: 3 }}>
      {Array.from({length: N}).map((_,i) => <Barnacle key={i}/>)}
    </div>
  </>
);

// Piece — flat 2D token: one solid glyph, one flat side-colour, one contrast
// outline so it reads on light AND dark squares. No body, no base, no shadow.
const PieceMini = ({ piece, cell = CELL }) => {
  const glyph = SOLID_GLYPH[piece.type] || '♟';
  const isWhite = piece.color === 'white';
  // fill = the side · outline = the opposite value, so contrast never fails
  const fill    = isWhite ? 'oklch(0.95 0.02 85)'  : 'oklch(0.13 0.025 250)';
  const outline = isWhite ? 'oklch(0.12 0.02 230)' : 'oklch(0.80 0.03 200)';
  const side    = isWhite ? 'var(--bio)' : 'var(--coral)';
  const hasAbility = (piece.type==='W'||piece.type==='A'||piece.type==='G'||piece.type==='S');
  const abilityColor = piece.type==='W' ? 'oklch(0.78 0.14 320)' : piece.type==='A' ? 'var(--bio)' : piece.type==='G' ? 'var(--coral)' : 'var(--brass)';
  const t = Math.max(1, Math.round(cell * 0.022)); // outline thickness

  return (
    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center',
      pointerEvents:'none' }}>
      <span style={{
        fontFamily:'Cinzel, serif', fontSize: cell * 0.72, lineHeight:1,
        color: fill,
        // crisp 4-way outline — flat, no blur
        textShadow: `${t}px 0 0 ${outline}, -${t}px 0 0 ${outline}, 0 ${t}px 0 ${outline}, 0 -${t}px 0 ${outline}`,
      }}>{glyph}</span>
      {/* side bar — which army this belongs to, at a glance */}
      <div style={{ position:'absolute', bottom:3, left:'22%', right:'22%', height:2,
        background: side }}/>
      {hasAbility && (
        <div style={{ position:'absolute', top:3, right:4, width:6, height:6,
          background: abilityColor }}/>
      )}
    </div>
  );
};

// Turn counter + day/night clock. The ring fills across the 10-turn phase, and
// the whole dial flips Day ⇄ Night when it completes.
const TurnClock = ({ turnNo, phase, side }) => {
  const done = DAY_CYCLE - phase.left;                   // turns elapsed in this phase
  const R = 30, C = 2 * Math.PI * R;
  const tone = phase.isDay ? 'var(--brass)' : 'oklch(0.68 0.11 250)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      background:'oklch(0.10 0.02 220 / 0.9)', border:`1px solid ${tone}`, padding:'8px 12px' }}>
      <div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.25em',
          color:'var(--bone-dim)', textTransform:'uppercase' }}>Turn</div>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:30, color:'var(--bone)', lineHeight:1 }}>{turnNo}</div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.18em',
          color: side==='white' ? 'var(--bio)' : 'var(--coral)', textTransform:'uppercase', marginTop:3 }}>
          {side==='white' ? '◈ your move' : '◣ enemy'}
        </div>
      </div>

      <div style={{ position:'relative', width:72, height:72 }}>
        <svg viewBox="0 0 72 72" width="72" height="72">
          <circle cx="36" cy="36" r={R} fill="oklch(0.13 0.02 220)" stroke="var(--abyss-4)" strokeWidth="1"/>
          {/* phase progress — flat stroke, starts at 12 o'clock */}
          <circle cx="36" cy="36" r={R} fill="none" stroke={tone} strokeWidth="4"
            strokeDasharray={`${(done / DAY_CYCLE) * C} ${C}`}
            transform="rotate(-90 36 36)"/>
          {Array.from({length:DAY_CYCLE}).map((_,i)=>{
            const a = (i / DAY_CYCLE) * Math.PI * 2 - Math.PI/2;
            return <circle key={i} cx={36 + Math.cos(a)*R} cy={36 + Math.sin(a)*R} r="1.6"
              fill={i < done ? tone : 'var(--abyss-4)'}/>;
          })}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', textAlign:'center' }}>
          <div>
            <div style={{ fontSize:20, lineHeight:1, color:tone }}>{phase.isDay ? '☀' : '☾'}</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.15em',
              color:tone, textTransform:'uppercase', marginTop:2 }}>{phase.isDay ? 'Day' : 'Night'}</div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:7.5, color:'var(--bone-dim)',
              letterSpacing:'0.12em', marginTop:1 }}>{phase.left}t</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CircleBtn = ({ color, hollow, onClick, title }) => (
  <button onClick={onClick} title={title} style={{
    width: 36, height: 36, borderRadius:'50%',
    background: hollow ? 'transparent' : 'radial-gradient(circle at 35% 30%, oklch(0.26 0.04 200), oklch(0.06 0.01 220))',
    border: `2px solid ${color}`,
    cursor:'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.7), inset 0 -2px 4px rgba(160,200,220,0.05)',
  }}/>
);

const IconBtn = ({ children, onClick, title }) => (
  <button onClick={onClick} title={title} style={{
    width: 40, height: 40, borderRadius: 3,
    background: 'linear-gradient(180deg, oklch(0.26 0.04 200), oklch(0.1 0.02 220))',
    border: '1.5px solid var(--brass-deep)',
    cursor:'pointer',
    display:'grid', placeItems:'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(160,200,220,0.12)',
  }}>{children}</button>
);

const SkipTurnButton = ({ onClick }) => (
  <button onClick={onClick} title="Pass without acting" style={{
    display:'flex', alignItems:'center', gap:10, padding:'12px 18px',
    background:'oklch(0.10 0.02 220 / 0.9)', border:'1px solid var(--brass)',
    color:'var(--brass)', cursor:'pointer',
  }}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--brass)">
      <path d="M4 5v14l9-7z"/><rect x="15" y="5" width="3" height="14"/>
    </svg>
    <span>
      <span style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.08em' }}>
        Skip Turn
      </span>
      <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:8,
        color:'var(--bone-dim)', letterSpacing:'0.2em', textTransform:'uppercase' }}>
        Yield the tide
      </span>
    </span>
  </button>
);

// ── shared bits for the two inspector panels ──────────────────────────────
const PANEL_BG = 'oklch(0.10 0.02 220 / 0.92)';

const StatusChips = ({ status }) => (
  status.length === 0 ? (
    <span style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic',
      color:'var(--bone-dim)' }}>No effects active.</span>
  ) : (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {status.map((s,i) => (
        <span key={i} title={s.desc}
          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px',
            border:`1px solid ${s.color}`, color:s.color,
            fontFamily:'JetBrains Mono, monospace', fontSize:8.5, letterSpacing:'0.12em',
            textTransform:'uppercase' }}>
          {s.glyph} {s.name}
        </span>
      ))}
    </div>
  )
);

const SkillLine = ({ label, value, color }) => (
  <div style={{ display:'flex', gap:8, alignItems:'baseline' }}>
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em',
      color:color || 'var(--bone-dim)', textTransform:'uppercase', width:62, flexShrink:0 }}>{label}</span>
    <span style={{ flex:1, fontFamily:'Cormorant Garamond, serif', fontSize:12.5,
      color:'var(--bone)', lineHeight:1.4 }}>{value}</span>
  </div>
);

// TOP-LEFT — the enemy piece you clicked: what it is, what it can do, what's on it.
const EnemyPanel = ({ piece, square, status, onClose }) => {
  if (!piece) {
    return (
      <div style={{ width:270, padding:'10px 14px', background:PANEL_BG,
        border:'1px dashed var(--abyss-4)' }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.25em',
          color:'var(--coral-dim)', textTransform:'uppercase' }}>◣ Enemy Inspector</div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic',
          color:'var(--bone-dim)', marginTop:4 }}>
          Click any enemy piece to read it.
        </div>
      </div>
    );
  }
  const prof = pieceProfile(piece.type);
  return (
    <div style={{ width:270, background:PANEL_BG, border:'1px solid var(--coral-dim)',
      borderTop:'3px solid var(--coral)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px 8px' }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:30, lineHeight:1, color:'oklch(0.13 0.025 250)',
          textShadow:'1px 0 0 var(--coral), -1px 0 0 var(--coral), 0 1px 0 var(--coral), 0 -1px 0 var(--coral)' }}>
          {SOLID_GLYPH[piece.type] || '♟'}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.22em',
            color:'var(--coral-dim)', textTransform:'uppercase' }}>
            ◣ Enemy{square ? ` · ${'ABCDEFGHIJKLMN'[square.c]}${square.r + 1}` : ''}
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', letterSpacing:'0.03em' }}>
            {prof.name}
          </div>
        </div>
        <button onClick={onClose} title="Close"
          style={{ background:'transparent', border:'none', color:'var(--bone-dim)', cursor:'pointer',
            fontFamily:'JetBrains Mono, monospace', fontSize:13, padding:'0 2px' }}>×</button>
      </div>

      <div style={{ padding:'0 12px 10px', display:'flex', flexDirection:'column', gap:5 }}>
        <SkillLine label="Innate"   value={prof.innate}   color="oklch(0.7 0.13 290)"/>
        <SkillLine label="Modifier" value={prof.modifier} color="oklch(0.72 0.12 35)"/>
        <SkillLine label="Active"   value={prof.active}   color="oklch(0.7 0.14 70)"/>
      </div>

      <div style={{ padding:'8px 12px 10px', borderTop:'1px solid var(--abyss-3)' }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.22em',
          color:'var(--bone-dim)', textTransform:'uppercase', marginBottom:5 }}>Effects</div>
        <StatusChips status={status}/>
      </div>
    </div>
  );
};

// BOTTOM-CENTER — the ally you selected: how it moves, how it takes, where its
// skill reaches, and what is riding on it.
const AllyPanel = ({ piece, square, status, moveCount, capCount, skillCount, skillMode, onToggleSkill, onClear }) => {
  if (!piece) {
    return (
      <div style={{ padding:'8px 18px', background:PANEL_BG, border:'1px dashed var(--abyss-4)',
        fontFamily:'Cormorant Garamond, serif', fontSize:12.5, fontStyle:'italic', color:'var(--bone-dim)' }}>
        Click one of your pieces to see how it moves, takes, and where its skill reaches.
      </div>
    );
  }
  const prof = pieceProfile(piece.type);
  return (
    <div style={{ width:660, background:PANEL_BG, border:'1px solid var(--bio-dim)',
      borderTop:'3px solid var(--bio)', display:'flex' }}>
      {/* identity */}
      <div style={{ width:150, flexShrink:0, padding:'12px', borderRight:'1px solid var(--abyss-3)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:38, lineHeight:1, color:'oklch(0.95 0.02 85)',
          textShadow:'1px 0 0 oklch(0.12 0.02 230), -1px 0 0 oklch(0.12 0.02 230), 0 1px 0 oklch(0.12 0.02 230), 0 -1px 0 oklch(0.12 0.02 230)' }}>
          {SOLID_GLYPH[piece.type] || '♟'}
        </span>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)', lineHeight:1.2 }}>
          {prof.name}
        </div>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.18em',
          color:'var(--bio-dim)', textTransform:'uppercase' }}>
          {prof.role}{square ? ` · ${'ABCDEFGHIJKLMN'[square.c]}${square.r + 1}` : ''}
        </div>
      </div>

      {/* movement · capture · skill */}
      <div style={{ flex:1, padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
        <SkillLine label={`Move ${moveCount}`}    value={prof.move}    color="oklch(0.7 0.13 195)"/>
        <SkillLine label={`Capture ${capCount}`}  value={prof.capture} color="oklch(0.7 0.16 25)"/>
        <SkillLine label={`Skill ${skillCount}`}  value={prof.active}  color="var(--brass)"/>
        <div style={{ marginTop:2 }}><StatusChips status={status}/></div>
      </div>

      {/* actions */}
      <div style={{ width:120, flexShrink:0, padding:'12px 10px', borderLeft:'1px solid var(--abyss-3)',
        display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
        <button onClick={onToggleSkill} disabled={skillCount === 0}
          title={skillCount ? 'Highlight the squares this skill reaches' : 'This piece has no active skill'}
          style={{ padding:'7px 8px', cursor: skillCount ? 'pointer' : 'not-allowed',
            background: skillMode ? 'oklch(0.80 0.13 82 / 0.22)' : 'transparent',
            border:`1px solid ${skillCount ? 'var(--brass)' : 'var(--abyss-4)'}`,
            color: skillCount ? 'var(--brass)' : 'var(--bone-dim)',
            fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.15em',
            textTransform:'uppercase' }}>
          {skillMode ? '◆ Skill On' : '◇ Show Skill'}
        </button>
        <button onClick={onClear}
          style={{ padding:'7px 8px', cursor:'pointer', background:'transparent',
            border:'1px solid var(--abyss-4)', color:'var(--bone-dim)',
            fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.15em',
            textTransform:'uppercase' }}>
          Deselect
        </button>
      </div>
    </div>
  );
};

// MID-LEFT — both commanders and the single relic each side carries.
const CommanderRail = ({ run, enemy }) => {
  const RELICS = window.OP_RELICS || [];
  // player relic = the carry relic on the lineup this assignment deployed
  const lineup = ((run.lineups || {})[run.lineupWidth || 6] || [])
    .find(l => l.id === run.activeLineupId) || null;
  const myRelic = lineup?.carryRelicId ? RELICS.find(r => r.id === lineup.carryRelicId) : null;
  // enemy relic — deterministic from their id, so the same foe always bears it
  const seed = String(enemy?.id || enemy?.name || 'deep');
  let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i)) >>> 0;
  const foeRelic = RELICS.length ? RELICS[h % RELICS.length] : null;

  const Side = ({ tone, tag, glyph, name, sub, relic }) => (
    <div style={{ width:210, background:PANEL_BG, border:`1px solid ${tone}`, borderLeft:`3px solid ${tone}`,
      padding:'10px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:26, lineHeight:1, color:tone }}>{glyph}</span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.22em',
            color:'var(--bone-dim)', textTransform:'uppercase' }}>{tag}</div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', letterSpacing:'0.03em',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
          {sub && <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
            marginTop:2 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px dashed var(--abyss-3)',
        display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:18, color: relic ? 'var(--brass)' : 'var(--abyss-4)',
          width:20, textAlign:'center' }}>{relic ? relic.glyph : '∅'}</span>
        <span style={{ minWidth:0, flex:1 }}>
          <span style={{ display:'block', fontFamily:'JetBrains Mono, monospace', fontSize:7.5,
            letterSpacing:'0.2em', color:'var(--bone-dim)', textTransform:'uppercase' }}>Relic</span>
          <span title={relic?.desc} style={{ display:'block', fontFamily:'Cinzel, serif', fontSize:11.5,
            color: relic ? 'var(--bone)' : 'var(--bone-dim)', whiteSpace:'nowrap',
            overflow:'hidden', textOverflow:'ellipsis' }}>
            {relic ? relic.name : 'None carried'}
          </span>
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <Side tone="var(--coral)" tag="◣ Enemy Commander" glyph={enemy?.glyph || '☠'}
        name={enemy?.name || 'The Deep'} sub={enemy?.difficulty ? `Threat ${enemy.difficulty}` : null}
        relic={foeRelic}/>
      <Side tone="var(--bio)" tag="◈ Your Commander" glyph={run.cls?.glyph || '♛'}
        name={run.cls?.name || 'Sovereign'}
        sub={`♥ ${run.hp}/${run.hpMax}  ◎ ${run.gold}`}
        relic={myRelic}/>
    </div>
  );
};

window.Match = Match;
