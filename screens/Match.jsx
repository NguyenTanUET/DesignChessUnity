// Match — an abyssal hunt. Pieces are creatures carved from bone & coral,
// board is a sunken reef slab, frame is brass + barnacle, midline a bioluminescent rift.
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
      background: `
        radial-gradient(ellipse at 50% 30%, oklch(0.22 0.06 200) 0%, oklch(0.1 0.03 215) 55%, oklch(0.04 0.01 225) 100%)
      `,
      overflow:'hidden'
    }}>
      {/* light shafts */}
      <svg viewBox="0 0 1440 900" style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.5 }} preserveAspectRatio="xMidYMid slice">
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
        mixBlendMode:'screen', opacity:0.5
      }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 70%, rgba(0,0,0,0.55) 0%, transparent 60%)' }}/>

      {/* plankton */}
      <div className="plankton">
        {Array.from({length:26}).map((_,i)=>(
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
              <span key={i} style={{ fontSize:16, color:'oklch(0.15 0.02 215)' }}>{GLYPHS.black[t]||'♟'}</span>
            ))}
          </div>
        </div>
        <div style={{ width:46, height:46, borderRadius:'50%',
          background:'radial-gradient(circle at 35% 30%, oklch(0.28 0.05 200), oklch(0.06 0.01 220))',
          border:'2px solid oklch(0.04 0.01 225)',
          boxShadow:'0 2px 10px rgba(0,0,0,0.8), inset 0 -2px 4px rgba(160,200,220,0.12), 0 0 18px rgba(30,120,150,0.4)',
          display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', color:'var(--brass)', fontSize:20 }}>
          ♔
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Cinzel, serif' }}>
          <div style={{ display:'flex', gap:2 }}>
            {captured.white.slice(-3).map((t,i) => (
              <span key={i} style={{ fontSize:16, color:'var(--bone)' }}>{GLYPHS.white[t]||'♙'}</span>
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

      {/* BOARD */}
      <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', perspective:'1400px', zIndex:2 }}>
        <div style={{ transform: 'rotateX(52deg)', transformStyle: 'preserve-3d', position: 'relative' }}>
          <BoardFrame N={N}>
            <div className="board3d" style={{
              display:'grid',
              gridTemplateColumns:`repeat(${N}, 64px)`,
              gridTemplateRows:`repeat(${N}, 64px)`,
              position:'relative',
              boxShadow:'0 0 0 1px rgba(0,0,0,0.5)',
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
                      position:'relative',
                      background: isLight
                        ? 'linear-gradient(135deg, oklch(0.42 0.04 200), oklch(0.36 0.035 205))'
                        : 'linear-gradient(135deg, oklch(0.18 0.035 215), oklch(0.12 0.025 220))',
                      boxShadow: isSel ? 'inset 0 0 0 3px var(--bio), inset 0 0 12px rgba(90,200,220,0.5)'
                                : isMove ? 'inset 0 0 0 2px rgba(120,220,240,0.5)'
                                : isCap ? 'inset 0 0 0 3px var(--coral), inset 0 0 14px rgba(224,75,58,0.5)'
                                : isLast ? 'inset 0 0 0 2px rgba(120,220,240,0.3)'
                                : 'inset 0 0 0 1px rgba(0,0,0,0.3)',
                      cursor: (isMove||isCap||isSel|| (p&&p.color==='white')) ? 'pointer' : 'default',
                    }}
                  >
                    {isMove && !p && (
                      <div style={{ position:'absolute', inset:0, margin:'auto', width:14, height:14, borderRadius:'50%',
                        background:'var(--bio)', opacity:0.6,
                        boxShadow:'0 0 8px var(--bio)' }}/>
                    )}
                    {p && <PieceMini piece={p} n={N}/>}
                  </div>
                );
              }))}
              {/* bioluminescent midline rift */}
              <div style={{
                position:'absolute', left:0, right:0,
                top: `${(N/2) * 64}px`, height: 3,
                background: 'linear-gradient(90deg, transparent, var(--bio) 10%, oklch(0.9 0.12 190) 50%, var(--bio) 90%, transparent)',
                boxShadow:'0 0 12px var(--bio), 0 0 24px rgba(90,200,220,0.6)',
                zIndex: 5, pointerEvents:'none',
              }}/>
            </div>
          </BoardFrame>
        </div>
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

// Brass + barnacle frame with bio-accent inner ring
const BoardFrame = ({ N, children }) => {
  const FRAME = 26;
  return (
    <div style={{ position:'relative', padding: FRAME,
      background:`
        repeating-linear-gradient(0deg, transparent 0 26px, rgba(0,0,0,0.2) 26px 27px),
        linear-gradient(180deg, oklch(0.26 0.04 200), oklch(0.14 0.03 215))
      `,
      border: '2px solid oklch(0.04 0.01 225)',
      boxShadow:`
        0 40px 100px rgba(0,0,0,0.9),
        0 0 0 1px rgba(160,200,220,0.08) inset,
        0 0 60px rgba(30,120,150,0.25)
      `,
    }}>
      {/* Inner bioluminescent rift */}
      <div style={{ position:'absolute', inset: FRAME-8, border:'3px solid oklch(0.5 0.1 195)',
        boxShadow:'0 0 0 1px oklch(0.04 0.01 225), inset 0 0 0 1px oklch(0.04 0.01 225), 0 0 18px rgba(90,200,220,0.5)',
        pointerEvents:'none', zIndex:2 }}/>
      <BarnacleRow N={N} thickness={FRAME}/>
      <div style={{ position:'relative', zIndex:1 }}>{children}</div>
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

// Piece — bone-carved upright chip; white = bleached bone, black = deep obsidian coral
const PieceMini = ({ piece, n }) => {
  const glyph = GLYPHS[piece.color][piece.type] || (piece.color==='white'?'♙':'♟');
  const isWhite = piece.color === 'white';
  const fg = isWhite ? 'oklch(0.2 0.03 215)' : 'oklch(0.08 0.01 220)';
  const bodyFill = isWhite
    ? 'radial-gradient(ellipse at 40% 30%, oklch(0.92 0.02 85), oklch(0.6 0.04 80) 80%)'  // bone
    : 'radial-gradient(ellipse at 40% 30%, oklch(0.28 0.06 215), oklch(0.06 0.02 220) 80%)'; // deep coral-obsidian
  const rim = isWhite ? 'oklch(0.72 0.11 80)' : 'oklch(0.35 0.07 215)';
  const hasAbility = (piece.type==='W'||piece.type==='A'||piece.type==='G'||piece.type==='S');
  const abilityColor = piece.type==='W' ? 'oklch(0.78 0.14 320)' : piece.type==='A' ? 'var(--bio)' : piece.type==='G' ? 'var(--coral)' : 'var(--brass)';
  return (
    <div style={{
      position:'absolute', inset:0,
      transform: 'rotateX(-52deg) translateZ(2px)',
      transformOrigin: '50% 85%',
      display:'grid', placeItems:'end center',
      pointerEvents:'none',
    }}>
      <div style={{ position:'relative', width:48, height:52, marginBottom:6 }}>
        {/* shadow */}
        <div style={{ position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%) scaleY(0.35)',
          width: 34, height: 14, borderRadius:'50%',
          background:'radial-gradient(ellipse, rgba(0,0,0,0.65), transparent 70%)' }}/>
        {/* base */}
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
          width: 36, height: 10, borderRadius:'50%',
          background: bodyFill,
          boxShadow:`inset 0 -2px 3px rgba(0,0,0,0.5), 0 2px 2px rgba(0,0,0,0.5), 0 0 0 1px ${rim}` }}/>
        {/* body */}
        <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)',
          width: 30, height: 42, borderRadius:'14px 14px 6px 6px',
          background: bodyFill,
          boxShadow:`inset -3px -6px 8px rgba(0,0,0,0.45), inset 3px 3px 6px rgba(200,220,230,0.2), 0 2px 4px rgba(0,0,0,0.6), 0 0 0 1px ${rim}`,
          display:'grid', placeItems:'center',
        }}>
          <span style={{
            fontFamily:'Cinzel, serif',
            fontSize: 24, fontWeight: 600,
            color: fg,
            textShadow: isWhite ? '0 1px 0 rgba(255,255,255,0.4)' : '0 1px 0 rgba(160,200,220,0.15)',
            lineHeight: 1,
          }}>{glyph}</span>
        </div>
        {hasAbility && (
          <div style={{ position:'absolute', top:4, right:6, width:6, height:6, borderRadius:'50%',
            background: abilityColor, boxShadow:`0 0 8px ${abilityColor}` }}/>
        )}
      </div>
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
