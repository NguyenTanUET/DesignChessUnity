// Node preview — the Hunt Ahead
const NodePreview = ({ node, run, onClose, onEnter }) => {
  if (!node) return null;
  window.useEscClose(onClose);

  const pool = node.type === 'boss' ? ENEMIES.boss : node.type === 'elite' ? ENEMIES.elite : ENEMIES.combat;
  const enemy = React.useMemo(() => {
    const idx = (node.id.charCodeAt(node.id.length-1) + node.row) % pool.length;
    return pool[idx];
  }, [node.id]);

  const tierColor = node.type==='boss' ? 'var(--coral)' : node.type==='elite' ? 'var(--void)' : 'var(--brass)';
  const tierLabel = node.type==='boss' ? 'LEVIATHAN' : node.type==='elite' ? 'APEX' : 'HUNT';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal ornate" style={{ width: 580 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="eyebrow" style={{ color: tierColor }}>{tierLabel} · Fathom I</div>
          <div className="pill">SONAR READING</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:18, alignItems:'start' }}>
          <div className="portrait" style={{ width:160, height:200, aspectRatio:'unset' }}>
            <svg viewBox="0 0 160 200" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
              <defs>
                <radialGradient id={`nc-${node.id}`} cx="50%" cy="45%">
                  <stop offset="0%" stopColor={tierColor} stopOpacity="0.55"/>
                  <stop offset="100%" stopColor="transparent"/>
                </radialGradient>
              </defs>
              <rect width="160" height="200" fill={`url(#nc-${node.id})`}/>
              {/* silhouette based on enemy */}
              <ellipse cx="80" cy="110" rx="55" ry="38" fill="oklch(0.08 0.02 220)" opacity="0.85"/>
              <ellipse cx="80" cy="100" rx="40" ry="22" fill="oklch(0.14 0.04 215)" opacity="0.7"/>
              {/* glowing eye */}
              <circle cx={node.type==='boss'?95:85} cy="100" r="3.5" fill={tierColor} opacity="0.95"/>
              <circle cx={node.type==='boss'?95:85} cy="100" r="10" fill="none" stroke={tierColor} strokeWidth="0.8" opacity="0.35"/>
              {/* tendrils */}
              {[...Array(6)].map((_,i)=>(
                <path key={i} d={`M ${40+i*17} 140 Q ${40+i*17+(i%2?8:-8)} 170 ${40+i*17+(i%2?-4:4)} 195`}
                  stroke="oklch(0.18 0.04 215)" strokeWidth="2" fill="none" opacity="0.7"/>
              ))}
              {/* particles */}
              {[...Array(18)].map((_,i)=>(
                <circle key={i} cx={(i*29)%160} cy={(i*47)%200} r="1" fill="var(--bio)" opacity="0.5"/>
              ))}
            </svg>
            <div className="glyph" style={{ fontSize: 90, color: tierColor, position:'relative', zIndex:2, mixBlendMode:'screen' }}>{enemy.glyph}</div>
          </div>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:30, fontFamily:'Cinzel, serif', letterSpacing:'0.03em' }}>{enemy.name}</h2>
            <div style={{ fontStyle:'italic', color:'var(--bone-dim)', fontSize:13, marginBottom:14, lineHeight:1.5 }}>
              &ldquo;{enemy.flavor}&rdquo;
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>
              <Row k="BOARD" v={enemy.board}/>
              <Row k="THREAT" v={'●'.repeat(enemy.difficulty) + '○'.repeat(5-enemy.difficulty)} c={tierColor}/>
              <Row k="REWARD" v={enemy.reward} span/>
            </div>
          </div>
        </div>

        <div className="divider fancy"><span>◈</span></div>

        <div style={{ fontSize:12, color:'var(--bone-dim)', lineHeight:1.6 }}>
          <span style={{color:'var(--brass-dim)'}}>CURRENTS · </span>
          {node.type==='elite' && 'Apex foe commands +1 Prelate. Thy Sovereign begins on a shifted trench.'}
          {node.type==='boss' && 'A Leviathan stirs. Its Aspect rewrites one rule of the tide. Victory unlocks a new Brood.'}
          {node.type==='combat' && 'Standard hunt. The 50-fathom stalemate rite applies.'}
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
          <button className="btn ghost" onClick={onClose}>Drift Away</button>
          <button className="btn primary" onClick={()=>onEnter(node, enemy)}>
            Descend &amp; Strike →
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({k, v, c, span}) => (
  <div style={{ gridColumn: span ? '1/-1' : undefined, display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px dotted var(--abyss-3)' }}>
    <span style={{ color:'var(--bone-dim)', textTransform:'uppercase', fontSize:10, letterSpacing:'0.18em' }}>{k}</span>
    <span style={{ color: c || 'var(--bone)' }}>{v}</span>
  </div>
);

window.NodePreview = NodePreview;
