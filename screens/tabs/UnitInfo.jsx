// Tab 1 — Unit Info: portrait, stats, biography (with aug slot map), combat profile
const UnitInfoTab = ({ run, setRun, sel, arch, go, togglePool, setSubTab }) => {
  const evoData = EVOLUTION[sel.archetype][sel.evoTier];
  const slotCount = sel.augSlotCount ?? 5;

  // Piece-type tag color map
  const pieceColors = {
    King:   { bg:'oklch(0.32 0.1 50 / 0.4)',  border:'var(--brass)',          text:'var(--brass)',           glyph:'♔' },
    Queen:  { bg:'oklch(0.28 0.12 290 / 0.4)', border:'oklch(0.65 0.15 290)', text:'oklch(0.78 0.13 290)',  glyph:'♕' },
    Rook:   { bg:'oklch(0.25 0.08 35 / 0.4)',  border:'oklch(0.62 0.12 35)',  text:'oklch(0.78 0.12 35)',   glyph:'♖' },
    Bishop: { bg:'oklch(0.25 0.08 250 / 0.4)', border:'oklch(0.65 0.13 250)', text:'oklch(0.78 0.12 250)',  glyph:'♗' },
    Knight: { bg:'oklch(0.25 0.08 195 / 0.4)', border:'oklch(0.68 0.12 195)', text:'oklch(0.78 0.13 195)',  glyph:'♘' },
    Pawn:   { bg:'oklch(0.22 0.06 145 / 0.4)', border:'oklch(0.6 0.1 145)',   text:'oklch(0.75 0.1 145)',   glyph:'♙' },
  };
  const pt = pieceColors[arch.pieceType] || pieceColors.Pawn;

  return (
    <div style={{ padding:'24px 32px' }}>
      {/* HEADER: portrait + name + stats */}
      <div style={{ display:'flex', gap:24, alignItems:'flex-start', marginBottom:24 }}>
        <div style={{
          width:180, height:220, flexShrink:0, position:'relative',
          background:`linear-gradient(180deg, var(--abyss-3), var(--abyss-0))`,
          border:`1px solid ${arch.color}`,
          boxShadow:`0 0 30px ${arch.color}33, inset 0 0 40px rgba(0,0,0,0.6)`,
        }}>
          <FollowerPortrait arch={arch} evoTier={sel.evoTier}/>
          <div style={{ position:'absolute', top:6, left:6, right:6,
            fontFamily:'JetBrains Mono, monospace', fontSize:8, color:'var(--bio-dim)',
            letterSpacing:'0.2em', textTransform:'uppercase',
            background:'rgba(0,0,0,0.6)', padding:'2px 5px', textAlign:'center' }}>
            Specimen · {sel.instanceId}
          </div>
          <div style={{ position:'absolute', bottom:6, right:8,
            fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass)', letterSpacing:'0.2em',
            background:'rgba(0,0,0,0.6)', padding:'2px 6px' }}>
            E{sel.evoTier}
          </div>
        </div>

        <div style={{ flex:1 }}>
          {/* Piece-type tag */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px',
            background: pt.bg, border:`1px solid ${pt.border}`,
            boxShadow:`0 0 16px ${pt.border}33, inset 0 0 12px rgba(0,0,0,0.4)`,
            marginBottom:8 }}>
            <span style={{ fontSize:18, color:pt.text, fontFamily:'Cinzel, serif',
              textShadow:`0 0 10px ${pt.text}` }}>{pt.glyph}</span>
            <span style={{ fontFamily:'Cinzel, serif', fontSize:13, color:pt.text,
              letterSpacing:'0.25em', textTransform:'uppercase', fontWeight:600 }}>
              {arch.pieceType}
            </span>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9,
              color:'var(--bone-dim)', letterSpacing:'0.2em', borderLeft:`1px solid ${pt.border}33`, paddingLeft:8 }}>
              {arch.role.toUpperCase()}
            </span>
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:30, color:'var(--bone)', letterSpacing:'0.04em', marginTop:2 }}>
            {sel.name}
          </div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic', color:'var(--bone-dim)', marginTop:4 }}>
            &ldquo;{evoData.name}&rdquo;
          </div>

          <div style={{ display:'flex', gap:18, marginTop:16, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>
            <Stat2 label="Vigor"    value={`${arch.baseHp + sel.evoTier} ♥`}/>
            <Stat2 label="Evo Tier" value={`${sel.evoTier} / 3`}/>
            <Stat2 label="Aug Ports" value={`${Object.values(sel.augments||{}).filter(Boolean).length} / ${slotCount}`}/>
            <Stat2 label="Status"   value={sel.inPool ? '◆ Deployed' : '— Reserve'}/>
          </div>

          <div style={{ marginTop:14, padding:'10px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)',
            fontSize:13, color:'var(--bone)', lineHeight:1.5, fontStyle:'italic' }}>
            {evoData.effect}
          </div>
        </div>
      </div>

      {/* === ARCHETYPE BIOGRAPHY === */}
      <div style={{ padding:'18px 22px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)', marginBottom:18 }}>
        <div className="caps" style={{ marginBottom:8 }}>Archetype Biography</div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:16, fontStyle:'italic', color:'var(--bone-dim)', lineHeight:1.6, marginBottom:16 }}>
          {arch.desc}
        </div>

        {/* Aug Slot Map */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
          <div className="caps">Augmentation Ports</div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bio-dim)', letterSpacing:'0.2em' }}>
            {slotCount === 0 ? 'NONE · FLESH UNFIT FOR GRAFT' : `${slotCount} OF 5 PORTS GROWN`}
          </div>
        </div>

        <AugSlotMap follower={sel} slotCount={slotCount}/>

        {slotCount > 0 && (
          <div style={{ marginTop:14, display:'flex', gap:10, alignItems:'center' }}>
            <button className="btn primary sm" onClick={()=>setSubTab && setSubTab('item')}
              style={{ padding:'10px 20px' }}>
              ⊕ INSTALL AUGMENTATION
            </button>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)',
              letterSpacing:'0.18em' }}>
              ‣ OPENS ITEM TAB · AUGMENTATION SECTION
            </div>
          </div>
        )}
        {slotCount === 0 && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'oklch(0.18 0.05 30 / 0.4)',
            border:'1px solid oklch(0.4 0.1 30 / 0.5)', fontFamily:'JetBrains Mono, monospace',
            fontSize:10, color:'oklch(0.7 0.1 30)', letterSpacing:'0.15em' }}>
            ⚠ THIS SPECIMEN HAS NO VIABLE GRAFT-PORTS. BIRTH-FLAW. CANNOT BE AUGMENTED.
          </div>
        )}
      </div>

      {/* === COMBAT PROFILE === */}
      <div style={{ padding:'18px 22px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
        <div className="caps" style={{ marginBottom:14 }}>Combat Profile</div>

        <div style={{ display:'grid', gridTemplateColumns:'1.15fr 1fr 1fr', gap:10, alignItems:'stretch' }}>
          {/* COL 1 — Skills stack */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <ProfileRow glyph="✶" label="Innate"   color="oklch(0.7 0.13 290)" value={arch.innate}   note="Always-on trait baked into the flesh."/>
            <ProfileRow glyph="◈" label="Modifier" color="oklch(0.72 0.12 35)"  value={arch.modifier} note="Buff applied at battle start."/>
            <ProfileRow glyph="⚡" label="Active"   color="oklch(0.7 0.14 70)"   value={arch.active}   note="On-demand skill · uses one action."/>
          </div>

          {/* COL 2 — Move with board diagram */}
          <PatternCard
            glyph="→" label="Move" color="oklch(0.7 0.13 195)"
            text={arch.move}
            note="How the piece can travel."
            kind="move"
            pieceType={arch.pieceType}
          />

          {/* COL 3 — Capture with board diagram */}
          <PatternCard
            glyph="✗" label="Capture" color="oklch(0.7 0.16 25)"
            text={arch.capture}
            note="How the piece can take enemies."
            kind="capture"
            pieceType={arch.pieceType}
          />
        </div>
      </div>
    </div>
  );
};

// === Aug slot map: visual diagram of which of the 5 ports this specimen grew ===
const AugSlotMap = ({ follower, slotCount }) => {
  // Stable per-instance choice of which slots are present:
  // hash instanceId + archetype to pick which N of 5 are "grown"
  const seedStr = follower.instanceId + follower.archetype;
  let h = 0;
  for (let i=0; i<seedStr.length; i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
  const indices = [...AUG_SLOTS.keys()];
  // Fisher-Yates shuffle by hash
  for (let i = indices.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const grownIdx = new Set(indices.slice(0, slotCount));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8 }}>
      {AUG_SLOTS.map((slot, i) => {
        const grown = grownIdx.has(i);
        const installedId = follower.augments?.[slot.id];
        const installed = installedId && grown;
        return (
          <div key={slot.id} style={{
            padding:'10px 8px', position:'relative',
            background: grown ? `linear-gradient(180deg, ${slot.color.replace(')', ' / 0.12)')}, var(--abyss-1))` : 'var(--abyss-0)',
            border:'1px dashed', borderStyle: grown ? 'solid' : 'dashed',
            borderColor: installed ? slot.color : grown ? `${slot.color.replace(')', ' / 0.5)')}` : 'var(--abyss-3)',
            opacity: grown ? 1 : 0.35,
            textAlign:'center',
          }}>
            <div style={{ fontFamily:'Cinzel, serif', fontSize:22, color: grown ? slot.color : 'var(--bone-dim)',
              textShadow: installed ? `0 0 10px ${slot.color}` : 'none', marginBottom:4 }}>
              {grown ? slot.glyph : '✕'}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color: grown ? slot.color : 'var(--bone-dim)',
              letterSpacing:'0.2em', textTransform:'uppercase' }}>
              {slot.label}
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, color: grown ? 'var(--bio-dim)' : 'var(--bone-dim)',
              letterSpacing:'0.18em', marginTop:3 }}>
              {grown ? (installed ? '◆ FILLED' : '○ OPEN') : '— SEALED'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Combat profile row
const ProfileRow = ({ glyph, label, color, value, note }) => (
  <div style={{ padding:'12px 14px', background:'var(--abyss-2)', border:'1px solid var(--abyss-3)',
    borderLeft:`3px solid ${color}` }}>
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
      <span style={{ fontFamily:'Cinzel, serif', fontSize:16, color, textShadow:`0 0 8px ${color}` }}>{glyph}</span>
      <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color, letterSpacing:'0.25em', textTransform:'uppercase', fontWeight:600 }}>
        {label}
      </span>
    </div>
    <div style={{ fontFamily:'Cinzel, serif', fontSize:13.5, color:'var(--bone)', lineHeight:1.45, marginBottom:4 }}>
      {value}
    </div>
    <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
      letterSpacing:'0.18em', fontStyle:'italic' }}>
      ‣ {note}
    </div>
  </div>
);

// =============================================================================
// PATTERN CARD — combat profile column with a chess-board diagram
// Shows the move/capture pattern visually for a given piece type
// =============================================================================
const PIECE_PATTERNS = {
  King:   { dots: [[3,3],[3,4],[3,5],[4,3],[4,5],[5,3],[5,4],[5,5]], rays: [], leaps: [] },
  Queen:  { dots: [], rays: [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]], leaps: [] },
  Rook:   { dots: [], rays: [[0,1],[1,0],[0,-1],[-1,0]], leaps: [] },
  Bishop: { dots: [], rays: [[1,1],[1,-1],[-1,-1],[-1,1]], leaps: [] },
  Knight: { dots: [], rays: [], leaps: [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]] },
  Pawn:   { dots: [[3,4]], rays: [], leaps: [], capture: [[3,3],[3,5]] }, // forward 1, capture diagonal
};

const PatternCard = ({ glyph, label, color, text, note, kind, pieceType }) => {
  return (
    <div style={{ padding:'12px 14px', background:'var(--abyss-2)', border:'1px solid var(--abyss-3)',
      borderLeft:`3px solid ${color}`, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:16, color, textShadow:`0 0 8px ${color}` }}>{glyph}</span>
        <span style={{ fontFamily:'Cinzel, serif', fontSize:11, color, letterSpacing:'0.25em', textTransform:'uppercase', fontWeight:600 }}>
          {label}
        </span>
      </div>

      <PatternBoard kind={kind} pieceType={pieceType} color={color}/>

      <div style={{ fontFamily:'Cinzel, serif', fontSize:12.5, color:'var(--bone)', lineHeight:1.45, marginTop:10 }}>
        {text}
      </div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5, color:'var(--bone-dim)',
        letterSpacing:'0.18em', fontStyle:'italic', marginTop:6 }}>
        ‣ {note}
      </div>
    </div>
  );
};

const PatternBoard = ({ kind, pieceType, color }) => {
  const SIZE = 8;
  const CENTER = [4, 4]; // piece sits at d4
  const pat = PIECE_PATTERNS[pieceType] || PIECE_PATTERNS.Pawn;

  // Compute marked squares
  const marks = new Set(); // "r,c" -> kind
  const addMark = (r, c, type) => {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
    if (r === CENTER[0] && c === CENTER[1]) return;
    marks.add(`${r},${c},${type}`);
  };

  if (kind === 'move') {
    if (pieceType === 'Pawn') {
      addMark(CENTER[0]-1, CENTER[1], 'dot'); // forward 1
    } else {
      // dots
      pat.dots.forEach(([r,c]) => addMark(r, c, 'dot'));
      // leaps (knight)
      pat.leaps.forEach(([dr,dc]) => addMark(CENTER[0]+dr, CENTER[1]+dc, 'leap'));
      // rays
      pat.rays.forEach(([dr,dc]) => {
        for (let k=1; k<SIZE; k++) {
          addMark(CENTER[0]+dr*k, CENTER[1]+dc*k, 'ray');
        }
      });
    }
  } else { // capture
    if (pieceType === 'Pawn') {
      pat.capture.forEach(([r,c]) => addMark(r, c, 'cap'));
    } else {
      // Same as move for non-pawn pieces
      pat.dots.forEach(([r,c]) => addMark(r, c, 'cap'));
      pat.leaps.forEach(([dr,dc]) => addMark(CENTER[0]+dr, CENTER[1]+dc, 'cap'));
      pat.rays.forEach(([dr,dc]) => {
        for (let k=1; k<SIZE; k++) {
          addMark(CENTER[0]+dr*k, CENTER[1]+dc*k, 'cap');
        }
      });
    }
  }

  const lookup = {};
  marks.forEach(s => {
    const [r, c, t] = s.split(',');
    lookup[`${r},${c}`] = t;
  });

  return (
    <div style={{
      display:'grid', gridTemplateColumns:`repeat(${SIZE}, 1fr)`,
      aspectRatio:'1 / 1', width:'100%', maxWidth:200, alignSelf:'center',
      border:`1px solid ${color}`,
      boxShadow:`0 0 14px ${color}33, inset 0 0 18px rgba(0,0,0,0.7)`,
      background:'var(--abyss-0)',
    }}>
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        const isLight = (r + c) % 2 === 0;
        const isCenter = r === CENTER[0] && c === CENTER[1];
        const mark = lookup[`${r},${c}`];
        return (
          <div key={i} style={{
            position:'relative',
            background: isLight ? 'oklch(0.22 0.012 60)' : 'oklch(0.14 0.008 60)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {isCenter && (
              <div style={{
                fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)',
                textShadow:`0 0 8px ${color}`, lineHeight:1,
              }}>
                {pieceType === 'King' ? '♚' : pieceType === 'Queen' ? '♛' :
                 pieceType === 'Rook' ? '♜' : pieceType === 'Bishop' ? '♝' :
                 pieceType === 'Knight' ? '♞' : '♟'}
              </div>
            )}
            {!isCenter && mark === 'dot' && (
              <div style={{ width:'40%', aspectRatio:'1/1', borderRadius:'50%',
                background: color, opacity:0.55, boxShadow:`0 0 6px ${color}` }}/>
            )}
            {!isCenter && mark === 'ray' && (
              <div style={{ width:'30%', aspectRatio:'1/1', borderRadius:'50%',
                background: color, opacity:0.45, boxShadow:`0 0 5px ${color}` }}/>
            )}
            {!isCenter && mark === 'leap' && (
              <div style={{ width:'45%', aspectRatio:'1/1',
                border:`1.5px solid ${color}`, transform:'rotate(45deg)',
                opacity:0.7, boxShadow:`0 0 6px ${color}` }}/>
            )}
            {!isCenter && mark === 'cap' && (
              <div style={{ width:'55%', aspectRatio:'1/1', position:'relative' }}>
                <div style={{ position:'absolute', inset:0, border:`1.5px solid ${color}`,
                  borderRadius:'50%', opacity:0.85, boxShadow:`0 0 6px ${color}` }}/>
                <div style={{ position:'absolute', top:'50%', left:'15%', right:'15%', height:1.5,
                  background:color, transform:'rotate(45deg)', opacity:0.85 }}/>
                <div style={{ position:'absolute', top:'50%', left:'15%', right:'15%', height:1.5,
                  background:color, transform:'rotate(-45deg)', opacity:0.85 }}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

window.UnitInfoTab = UnitInfoTab;
