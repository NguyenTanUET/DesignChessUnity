// Trader's Hold — 3 categories: Followers, Relics, Augmentations
const Trader = ({ run, setRun, go }) => {
  const [cat, setCat] = React.useState('followers'); // followers | relics | augmentations
  const [pending, setPending] = React.useState(null); // { cat, item } awaiting buy confirmation

  const res = run.res || {};
  const purchased = run.traderPurchased || {}; // { itemId: true }

  // Item display name, for the confirmation prompt.
  const itemName = (c, item) =>
    c === 'followers' ? FOLLOWER_ARCHETYPES[item.archetype]?.name : item.name;
  const costLine = (cost) => Object.entries(cost || {})
    .map(([k,v]) => `${v} ${k}`).join(' · ');

  const canAfford = (cost) => {
    return (cost.coral||0) <= (res.coral||0)
        && (cost.lumin||0) <= (res.lumin||0)
        && (cost.dna||0)   <= (res.dna||0);
  };

  const buy = (cat, item) => {
    if (purchased[item.id]) return;
    if (!canAfford(item.cost)) return;

    setRun(r => {
      const nextRes = { ...r.res };
      for (const k of Object.keys(item.cost)) nextRes[k] = (nextRes[k]||0) - item.cost[k];
      const updates = {
        res: nextRes,
        traderPurchased: { ...(r.traderPurchased||{}), [item.id]: true },
      };
      if (cat === 'followers') {
        const nextIdc = (r.roster||[]).length + 1;
        updates.roster = [...(r.roster||[]), {
          instanceId: `f-bought-${item.id}-${Date.now().toString(36)}`,
          archetype: item.archetype,
          name: window.generateFollowerName(item.archetype, Date.now() % 1000),
          evoTier: 0,
          augments: { optic:null, neural:null, blood:null, fin:null, chassis:null },
          classification: window.classificationFor(item.archetype), // fixed by species
          facet: window.rollFacet(),                                 // random temperament on purchase
          inPool: false,
        }];
      }
      if (cat === 'relics') {
        updates.relicsOwned = [...(r.relicsOwned||[]), item.id];
      }
      if (cat === 'augmentations') {
        updates.augInventory = [...(r.augInventory||[]), item.id];
      }
      return { ...r, ...updates };
    });
  };

  const tabs = [
    { id:'followers',     label:'Followers',     glyph:'♘', subtitle:'Refined Coral',
      color:'oklch(0.72 0.12 35)', desc:'Fresh flesh from the hunt-pens.' },
    { id:'relics',        label:'Relics',        glyph:'✠', subtitle:'Coral + Lumin Deposit',
      color:'oklch(0.72 0.11 80)', desc:'Trinkets of the drowned noble houses.' },
    { id:'augmentations', label:'Augmentations', glyph:'⌘', subtitle:'Lumin Deposit',
      color:'oklch(0.75 0.13 195)', desc:'Grafts harvested from older, stranger prey.' },
  ];

  const stock = TRADER_STOCK[cat] || [];

  return (
    <div className="screen" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      <OpTopBar run={run} setRun={setRun} go={go} current="op-trader" subtitle="Trader's Hold · Brine Manifest"/>

      <div style={{ position:'absolute', top:60, left:0, right:0, bottom:0,
        display:'grid', gridTemplateColumns:'260px 1fr', gap:0 }}>

        {/* Category sidebar */}
        <div style={{ borderRight:'1px solid var(--abyss-4)',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
          padding:'20px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div className="caps" style={{ padding:'4px 8px 8px' }}>Cargo Manifest</div>
          {tabs.map(t => {
            const active = cat === t.id;
            return (
              <button key={t.id} onClick={()=>setCat(t.id)}
                style={{
                  padding:'14px 12px', textAlign:'left', cursor:'pointer',
                  background: active ? 'linear-gradient(90deg, var(--abyss-3), var(--abyss-2))' : 'var(--abyss-1)',
                  border:'1px solid', borderColor: active ? t.color : 'var(--abyss-3)',
                  borderLeft: active ? `3px solid ${t.color}` : '3px solid transparent',
                  display:'flex', gap:12, alignItems:'center',
                  transition:'all 0.15s',
                  color:'var(--bone)',
                }}>
                <div style={{ fontSize:22, fontFamily:'Cinzel, serif', width:28, textAlign:'center',
                  color: t.color, textShadow: active ? `0 0 10px ${t.color}`:'none' }}>{t.glyph}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Cinzel, serif', fontSize:13, letterSpacing:'0.08em' }}>{t.label}</div>
                  <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--bone-dim)', marginTop:3, letterSpacing:'0.15em' }}>
                    {t.subtitle}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="divider fancy"><span>◈</span></div>
          <div style={{ padding:'12px 14px', background:'var(--abyss-1)', border:'1px solid var(--abyss-3)' }}>
            <div className="eyebrow" style={{ color:'var(--coral-dim)', marginBottom:6 }}>◣ WARNING</div>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)', fontStyle:'italic', lineHeight:1.5 }}>
              All sales final. The trader does not take back what the deep has touched.
            </div>
          </div>
        </div>

        {/* Catalogue */}
        <div style={{ overflowY:'auto', padding:'24px 32px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div className="eyebrow" style={{ color: tabs.find(t=>t.id===cat).color }}>
                {tabs.find(t=>t.id===cat).subtitle}
              </div>
              <h2 style={{ margin:'4px 0 4px', fontFamily:'Cinzel, serif', fontSize:30, color:'var(--bone)', letterSpacing:'0.05em' }}>
                {tabs.find(t=>t.id===cat).label}
              </h2>
              <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:14, fontStyle:'italic', color:'var(--bone-dim)' }}>
                {tabs.find(t=>t.id===cat).desc}
              </div>
            </div>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--bone-dim)', letterSpacing:'0.15em' }}>
              {stock.length} ITEMS IN STOCK
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
            {stock.map(item => (
              <TraderCard key={item.id}
                category={cat}
                item={item}
                purchased={!!purchased[item.id]}
                affordable={canAfford(item.cost || {})}
                res={res}
                onBuy={()=>setPending({ cat, item })}
                accent={tabs.find(t=>t.id===cat).color}/>
            ))}
          </div>
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          title={`Acquire ${itemName(pending.cat, pending.item)}?`}
          message={<>This will spend <b style={{ color:'var(--brass)' }}>{costLine(pending.item.cost)}</b>. All
            sales are final — the trader does not take back what the deep has touched.</>}
          confirmLabel="◎ Acquire"
          onConfirm={()=>buy(pending.cat, pending.item)}
          onClose={()=>setPending(null)}/>
      )}
    </div>
  );
};

const TraderCard = ({ category, item, purchased, affordable, res, onBuy, accent }) => {
  const has = (k, n) => (res?.[k]||0) >= n;
  let title, glyph, body, tierLabel;
  if (category === 'followers') {
    const arch = FOLLOWER_ARCHETYPES[item.archetype];
    title = arch.name;
    glyph = arch.glyph;
    body = <>
      <div style={{ fontSize:11, color:'var(--bone-dim)', fontStyle:'italic', marginTop:4 }}>
        Role: {arch.role} · {arch.baseHp} Vigor
      </div>
      <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:6, lineHeight:1.4 }}>
        {arch.desc}
      </div>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, fontStyle:'italic', color:'var(--bio-dim)', marginTop:8 }}>
        &ldquo;{item.flavor}&rdquo;
      </div>
    </>;
    tierLabel = 'Fresh stock';
  } else if (category === 'relics') {
    title = item.name;
    glyph = item.glyph;
    body = <>
      <div style={{ fontSize:11, color:'var(--bone-dim)', marginTop:4, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', textTransform:'uppercase' }}>
        {item.rarity}
      </div>
      <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:8, lineHeight:1.5, fontStyle:'italic' }}>
        {item.desc}
      </div>
    </>;
    tierLabel = `Tier ${item.tier}`;
  } else {
    const slot = AUG_SLOTS.find(s => s.id === item.slot);
    title = item.name;
    glyph = slot.glyph;
    accent = slot.color;
    body = <>
      <div style={{ fontSize:11, color:slot.color, marginTop:4, fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.15em', textTransform:'uppercase' }}>
        {slot.label} Port · Tier {item.tier}
      </div>
      <div style={{ fontSize:12, color:'var(--bone-dim)', marginTop:8, lineHeight:1.5, fontStyle:'italic' }}>
        {item.effect}
      </div>
    </>;
    tierLabel = `Tier ${item.tier}`;
  }

  return (
    <div style={{
      background: purchased
        ? 'linear-gradient(180deg, oklch(0.15 0.02 220 / 0.8), oklch(0.08 0.01 220 / 0.8))'
        : 'linear-gradient(180deg, var(--abyss-2), var(--abyss-1))',
      border:'1px solid',
      borderColor: purchased ? 'var(--abyss-3)' : affordable ? accent : 'var(--abyss-4)',
      padding:'16px 14px', position:'relative',
      opacity: purchased ? 0.5 : 1,
      transition:'all 0.15s',
    }}>
      {/* Top: glyph + title */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{
          width:52, height:52, flexShrink:0,
          background:'linear-gradient(180deg, var(--abyss-3), var(--abyss-1))',
          border:`1px solid ${accent}`,
          display:'grid', placeItems:'center',
          fontSize:28, fontFamily:'Cinzel, serif',
          color: accent, textShadow: `0 0 14px ${accent}`,
        }}>{glyph}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Cinzel, serif', fontSize:15, color:'var(--bone)', letterSpacing:'0.05em', lineHeight:1.2 }}>
            {title}
          </div>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:9, color:'var(--brass-dim)', letterSpacing:'0.2em', textTransform:'uppercase', marginTop:3 }}>
            {tierLabel}
          </div>
        </div>
      </div>
      {body}

      {/* Price + buy */}
      <div style={{ marginTop:14, padding:'10px 12px',
        background:'rgba(0,0,0,0.4)', border:'1px solid var(--abyss-3)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:10, fontFamily:'JetBrains Mono, monospace', fontSize:11 }}>
          {item.cost.coral && (
            <span style={{ color: has('coral', item.cost.coral) ? 'var(--bone)' : 'var(--coral)' }}>
              <span style={{ color:'oklch(0.72 0.12 35)' }}>◎</span> {item.cost.coral}
            </span>
          )}
          {item.cost.dna && (
            <span style={{ color: has('dna', item.cost.dna) ? 'var(--bone)' : 'var(--coral)' }}>
              <span style={{ color:'oklch(0.72 0.14 150)' }}>✧</span> {item.cost.dna}
            </span>
          )}
          {item.cost.lumin && (
            <span style={{ color: has('lumin', item.cost.lumin) ? 'var(--bone)' : 'var(--coral)' }}>
              <span style={{ color:'oklch(0.75 0.13 195)' }}>◆</span> {item.cost.lumin}
            </span>
          )}
        </div>
        {purchased ? (
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, color:'var(--brass-dim)', letterSpacing:'0.2em' }}>
            ✓ ACQUIRED
          </div>
        ) : (
          <button className={`btn sm ${affordable?'primary':''}`} disabled={!affordable} onClick={onBuy}
            style={{ padding:'4px 12px', fontSize:11 }}>
            {affordable ? 'ACQUIRE' : 'INSUFFICIENT'}
          </button>
        )}
      </div>
    </div>
  );
};

window.Trader = Trader;
