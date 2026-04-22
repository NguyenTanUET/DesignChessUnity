// Op Center — persistent top bar with 3 resources (Refined Coral, DNA, Lumin Deposit)
const OpTopBar = ({ run, setRun, go, current, subtitle }) => {
  const r = run.res || { coral:0, dna:0, lumin:0 };
  const tabs = [
    { id:'op-hub',      label:'Hub',           glyph:'◈' },
    { id:'op-follower', label:'Followers',     glyph:'♘' },
    { id:'op-evolve',   label:'Evolution',     glyph:'✧' },
    { id:'op-trader',   label:'Trader',        glyph:'⚖' },
    { id:'op-command',  label:'Command',       glyph:'✠' },
  ];
  return (
    <div style={{
      position:'absolute', top:0, left:0, right:0, height:60, zIndex:20,
      display:'flex', alignItems:'stretch',
      background:'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.35))',
      borderBottom:'1px solid var(--abyss-4)',
      boxShadow:'0 0 24px rgba(0,30,50,0.5)',
    }}>
      {/* crest + operation name */}
      <div style={{ padding:'0 20px', display:'flex', alignItems:'center', gap:12, borderRight:'1px solid var(--abyss-3)' }}>
        <div style={{
          width:32, height:32, border:'1px solid var(--brass-deep)',
          display:'grid', placeItems:'center',
          background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
          fontFamily:'Cinzel, serif', fontSize:18, color:'var(--brass)',
        }}>◈</div>
        <div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, letterSpacing:'0.3em', color:'var(--brass-dim)', textTransform:'uppercase' }}>
            Operation Center
          </div>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', letterSpacing:'0.08em' }}>
            {subtitle || run.cls?.name || 'Sovereign Unnamed'}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ flex:1, display:'flex', alignItems:'stretch' }}>
        {tabs.map(t => {
          const active = current === t.id;
          return (
            <button key={t.id} onClick={()=>go(t.id)}
              style={{
                padding:'0 22px', background:'transparent',
                border:'none', cursor:'pointer',
                position:'relative',
                display:'flex', alignItems:'center', gap:8,
                color: active ? 'var(--brass)' : 'var(--bone-dim)',
                fontFamily:'Cinzel, serif', fontSize:13,
                letterSpacing:'0.15em', textTransform:'uppercase',
                borderRight:'1px solid var(--abyss-3)',
                transition:'color 0.15s',
              }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.color='var(--bone)'; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.color='var(--bone-dim)'; }}
            >
              <span style={{ fontSize:16 }}>{t.glyph}</span>
              <span>{t.label}</span>
              {active && (
                <span style={{
                  position:'absolute', bottom:-1, left:10, right:10, height:2,
                  background:'linear-gradient(90deg, transparent, var(--brass), transparent)',
                }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* resources */}
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:'0 12px', borderLeft:'1px solid var(--abyss-3)' }}>
        <ResChip glyph="◎" label="Refined Coral" value={r.coral} color="oklch(0.72 0.12 35)"/>
        <ResChip glyph="✧" label="DNA"            value={r.dna}   color="oklch(0.72 0.14 150)"/>
        <ResChip glyph="◆" label="Lumin Deposit"  value={r.lumin} color="oklch(0.75 0.13 195)"/>
      </div>
    </div>
  );
};

const ResChip = ({ glyph, label, value, color }) => (
  <div title={label} style={{
    display:'flex', alignItems:'center', gap:8,
    padding:'8px 14px', margin:'0 2px',
    background:'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
    border:'1px solid var(--abyss-4)',
    minWidth:110,
  }}>
    <span style={{ color, fontSize:18, fontFamily:'Cinzel, serif', textShadow:`0 0 8px ${color}` }}>{glyph}</span>
    <div>
      <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8, letterSpacing:'0.2em', color:'var(--bone-dim)', textTransform:'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily:'Cinzel, serif', fontSize:15, color:'var(--bone)', letterSpacing:'0.04em', lineHeight:1 }}>
        {value ?? 0}
      </div>
    </div>
  </div>
);

window.OpTopBar = OpTopBar;
window.ResChip = ResChip;
