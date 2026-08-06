// Match — an abyssal hunt, played on a FLAT 2D board: top-down, true squares,
// solid fills. Colour (not depth) carries every piece of information.
const CELL = 64;
const SQ_LIGHT = 'oklch(0.40 0.035 200)';
const SQ_DARK  = 'oklch(0.16 0.030 218)';
// One solid silhouette set for BOTH sides — identical shapes read faster than
// hollow-vs-filled; the fill colour is what tells the sides apart.
const SOLID_GLYPH = { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟', W:'♛', A:'♝', G:'♞', S:'♜' };

const Match = ({ run, enemy, node, onWin, onLose, boardSize }) => {
  const N = boardSize || (node?.type === 'boss' ? 8 : node?.type === 'elite' ? 8 : enemy?.board?.startsWith('6') ? 6 : enemy?.board?.startsWith('7') ? 7 : 8);
  const [board, setBoard] = React.useState(() => setupBoard(N, run));
  const [sel, setSel] = React.useState(null);
  const [turnNo, setTurnNo] = React.useState(1);
  const [turn, setTurn] = React.useState('white');
  const [history, setHistory] = React.useState([]);
  const [captured, setCaptured] = React.useState({ white: [], black: [] });
  const [result, setResult] = React.useState(null);

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

  const sqClick = (r, c) => {
    if (result) return;
    const p = board[r][c];
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

      {/* TOP-RIGHT: fathom dial */}
      <div style={{ position:'absolute', top:10, right:14, zIndex:3, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.15em' }}>◐ TIDE · {turn==='white'?'EBB':'SURGE'}</div>
        <TurnDial turn={turnNo} phase={turn==='white'?'Ebb':'Surge'}/>
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

      {/* BOTTOM-RIGHT: end turn */}
      <div style={{ position:'absolute', right:18, bottom:18, zIndex:3, display:'flex', alignItems:'flex-end', gap:12 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
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
        <EndTurnButton onClick={() => { setTurnNo(n=>n+1); setSel(null); }}/>
      </div>

      {/* TOP-LEFT hud */}
      <div style={{ position:'absolute', top:14, left:16, zIndex:3, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--brass)', letterSpacing:'0.05em' }}>
          {run.cls.glyph} {run.cls.name}
        </div>
        <div style={{ display:'flex', gap:12, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--bone)' }}>
          <span>♥ <span style={{color:'var(--coral)'}}>{'♥'.repeat(run.hp)}</span><span style={{opacity:0.25}}>{'♥'.repeat(run.hpMax-run.hp)}</span></span>
          <span style={{color:'var(--brass)'}}>◎ {run.gold}</span>
        </div>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:13, fontStyle:'italic', color:'var(--bone-dim)', marginTop:4 }}>
          vs. {enemy?.name || 'The Deep'}
        </div>
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
                  {/* selected — solid ring */}
                  {isSel && (
                    <div style={{ position:'absolute', inset:0, border:'3px solid var(--bio)',
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

      <button className="btn sm primary" style={{ position:'absolute', bottom:18, left:18, zIndex:3 }} onClick={onWin}>[DEMO] Win</button>
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

// Tide dial (replaces day/night)
const TurnDial = ({ turn, phase }) => (
  <div style={{ position:'relative', width:80, height:80 }}>
    <svg viewBox="0 0 80 80" width="80" height="80" style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="dialBg" cx="50%" cy="50%">
          <stop offset="0%" stopColor="oklch(0.28 0.05 200)"/>
          <stop offset="100%" stopColor="oklch(0.08 0.02 220)"/>
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#dialBg)" stroke="oklch(0.04 0.01 225)" strokeWidth="1.5"/>
      {/* ebb arc (cyan) */}
      <path d="M 40 5 A 35 35 0 0 1 40 75" fill="none" stroke="var(--bio)" strokeWidth="7" opacity="0.85"/>
      {/* surge arc (coral) */}
      <path d="M 40 75 A 35 35 0 0 1 40 5" fill="none" stroke="var(--coral-dim)" strokeWidth="7" opacity="0.7"/>
      {Array.from({length:12}).map((_,i)=>{
        const a = i*30 * Math.PI/180;
        const x1 = 40 + Math.sin(a)*28, y1 = 40 - Math.cos(a)*28;
        const x2 = 40 + Math.sin(a)*33, y2 = 40 - Math.cos(a)*33;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.04 0.01 225)" strokeWidth="1.5"/>;
      })}
      <circle cx="40" cy="40" r="22" fill="oklch(0.14 0.03 215)" stroke="oklch(0.04 0.01 225)" strokeWidth="1"/>
    </svg>
    <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', textAlign:'center',
      fontFamily:'Cinzel, serif', color:'var(--brass)', lineHeight:1 }}>
      <div>
        <div style={{ fontSize:9, opacity:0.75, letterSpacing:'0.2em', textTransform:'uppercase' }}>Tide</div>
        <div style={{ fontSize:22, fontWeight:600 }}>{turn}</div>
        <div style={{ fontSize:9, opacity:0.8, color: phase==='Ebb'?'var(--bio)':'var(--coral)' }}>{phase}</div>
      </div>
    </div>
  </div>
);

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

const EndTurnButton = ({ onClick }) => (
  <button onClick={onClick} title="Release the Tide" style={{
    width: 72, height: 72, borderRadius:'50%',
    background:'radial-gradient(circle at 35% 30%, oklch(0.92 0.04 85), oklch(0.55 0.09 78) 80%)',
    border:'2px solid oklch(0.04 0.01 225)',
    boxShadow:'0 4px 12px rgba(0,0,0,0.8), inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,240,200,0.4), 0 0 20px rgba(200,160,80,0.3)',
    cursor:'pointer',
    display:'grid', placeItems:'center',
  }}>
    <svg viewBox="0 0 24 24" width="36" height="36" fill="oklch(0.2 0.03 215)">
      <path d="M8 4v16l12-8z"/>
    </svg>
  </button>
);

window.Match = Match;
