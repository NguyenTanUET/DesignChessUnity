// Briefing HUD — the speaking box shown when a mission is chosen.
// Three parts, as the design asks: a portrait of who is speaking, their name,
// and what they say.
//
// Lines come from the Dialog Editor when the mission has any authored for its
// briefing (localStorage 'gok.customDialogs', stage = briefing). When it has
// none, the overseer speaks the assignment's own dossier instead, so the HUD is
// never empty.

// Stable per-name hash — the same character always gets the same face.
const briefHash = (s) => {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// Five silhouettes, picked by name. Enough that a cast reads as distinct faces
// without art assets; each is drawn inside a 108×160 box.
const BRIEF_SILHOUETTES = [
  // hooded
  { body:'M 18 160 L 18 96 Q 20 58 54 40 Q 88 58 90 96 L 90 160 Z',
    fold:'M 54 40 Q 37 54 33 82 Q 44 76 54 79 Q 64 76 74 82 Q 71 54 54 40 Z',
    crest:'M 54 30 L 60 42 L 54 40 L 48 42 Z' },
  // crowned
  { body:'M 20 160 L 20 100 Q 24 66 54 50 Q 84 66 88 100 L 88 160 Z',
    fold:'M 54 50 Q 40 62 37 86 Q 46 80 54 82 Q 62 80 71 86 Q 68 62 54 50 Z',
    crest:'M 38 44 L 42 28 L 47 40 L 54 24 L 61 40 L 66 28 L 70 44 Z' },
  // helmed
  { body:'M 22 160 L 22 98 Q 22 62 54 46 Q 86 62 86 98 L 86 160 Z',
    fold:'M 30 78 L 78 78 L 78 86 L 30 86 Z',
    crest:'M 54 30 Q 62 34 62 46 L 46 46 Q 46 34 54 30 Z' },
  // masked
  { body:'M 20 160 L 24 100 Q 30 64 54 48 Q 78 64 84 100 L 88 160 Z',
    fold:'M 54 48 Q 42 62 42 88 L 66 88 Q 66 62 54 48 Z',
    crest:'M 44 40 L 54 32 L 64 40 L 54 44 Z' },
  // finned
  { body:'M 16 160 L 22 98 Q 28 62 54 44 Q 80 62 86 98 L 92 160 Z',
    fold:'M 54 44 Q 40 58 36 84 Q 46 78 54 80 Q 62 78 72 84 Q 68 58 54 44 Z',
    crest:'M 54 26 L 66 44 L 54 38 L 42 44 Z' },
];

const BRIEF_HUES = [200, 145, 290, 25, 75, 260, 175];

// A procedural portrait for any named speaker.
const SpeakerPortrait = ({ name, accent }) => {
  const h = briefHash(name || '???');
  const sil = BRIEF_SILHOUETTES[h % BRIEF_SILHOUETTES.length];
  const hue = BRIEF_HUES[(h >> 3) % BRIEF_HUES.length];
  const eye = accent || `oklch(0.75 0.15 ${hue})`;
  const uid = `bp${h % 99999}`;
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <svg viewBox="0 0 108 160" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
      <defs>
        <radialGradient id={`${uid}bg`} cx="50%" cy="34%" r="72%">
          <stop offset="0%" stopColor={eye} stopOpacity="0.5"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <linearGradient id={`${uid}body`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.15 0.03 210)"/>
          <stop offset="100%" stopColor="oklch(0.05 0.02 220)"/>
        </linearGradient>
      </defs>

      <rect width="108" height="160" fill={`url(#${uid}bg)`}/>
      {/* drifting motes */}
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={((i * 29 + h) % 108)} cy={((i * 43 + h) % 160)} r="0.8"
          fill={eye} opacity={0.25 + (i % 3) * 0.15}/>
      ))}

      <path d={sil.body} fill={`url(#${uid}body)`}/>
      <path d={sil.fold} fill="oklch(0.08 0.02 220)" opacity="0.9"/>
      <path d={sil.crest} fill="var(--brass-deep)" opacity="0.85"/>

      {/* face shadow + eyes */}
      <ellipse cx="54" cy="76" rx="13" ry="16" fill="oklch(0.03 0.01 220)" opacity="0.92"/>
      <circle cx="49" cy="74" r="1.5" fill={eye}>
        <animate attributeName="opacity" values="0.45;1;0.45" dur="3.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="59" cy="74" r="1.5" fill={eye}>
        <animate attributeName="opacity" values="1;0.45;1" dur="3.2s" repeatCount="indefinite"/>
      </circle>

      {/* collar rim + sigil */}
      <path d="M 18 114 Q 30 100 54 100 Q 78 100 90 114"
        stroke="var(--brass-deep)" strokeWidth="1.2" fill="none" opacity="0.85"/>
      <text x="54" y="134" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="20"
        fill="var(--brass)" opacity="0.85">{initial}</text>
    </svg>
  );
};

// Briefing lines authored for this assignment, newest editor state each time.
const briefingLinesFor = (assignment) => {
  let dialogs = [];
  try { dialogs = JSON.parse(localStorage.getItem('gok.customDialogs')) || []; } catch (e) {}

  const authored = dialogs
    .filter(d => d.location === 'assignment'
      && d.stageKey === 'briefing'
      && d.assignmentId === assignment.id
      && (d.content || '').trim())
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)
      || String(a.missionId).localeCompare(String(b.missionId)))
    .map(d => ({ speaker: d.character || '???', text: d.content, title: null }));

  if (authored.length) return authored;

  // Nothing authored — the overseer reads the dossier aloud.
  const ov = (window.OVERSEERS || {})[assignment.overseer];
  const speaker = ov?.name || 'The Overseer';
  const title = ov?.title || null;
  const out = [{ speaker, title, text: assignment.description }];
  if (assignment.weather) out.push({ speaker, title, text: `The water: ${assignment.weather}.` });
  if (assignment.location) out.push({ speaker, title, text: `Thou art bound for ${assignment.location}.` });
  return out;
};

// The HUD itself. Click anywhere to finish the reveal, then to advance.
const BriefingHud = ({ assignment, accent, onClose }) => {
  const lines = React.useMemo(() => briefingLinesFor(assignment), [assignment.id]);
  const [idx, setIdx] = React.useState(0);
  const [shown, setShown] = React.useState(0);   // characters revealed so far
  const line = lines[idx] || { speaker:'???', text:'' };
  const full = line.text || '';
  const typing = shown < full.length;

  React.useEffect(() => { setIdx(0); setShown(0); }, [assignment.id]);

  // Typewriter reveal — one tick per few characters keeps long lines quick.
  React.useEffect(() => {
    setShown(0);
    const t = setInterval(() => {
      setShown(n => {
        if (n >= full.length) { clearInterval(t); return n; }
        return n + 2;
      });
    }, 18);
    return () => clearInterval(t);
  }, [full]);

  const advance = () => {
    if (typing) { setShown(full.length); return; }
    if (idx + 1 < lines.length) setIdx(i => i + 1);
    else onClose();
  };
  window.useEscClose(onClose);

  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0, zIndex:20,
      padding:'0 26px 22px', pointerEvents:'none',
    }}>
      <div onClick={advance}
        style={{
          pointerEvents:'auto', cursor:'pointer', position:'relative',
          display:'flex', gap:0, alignItems:'stretch',
          background:'linear-gradient(180deg, rgba(8,18,28,0.94), rgba(4,10,18,0.96))',
          border:'1px solid var(--brass-deep)',
          boxShadow:'0 18px 44px rgba(0,0,0,0.75)',
          animation:'dlgIn 0.3s ease',
        }}>

        {/* 1 — portrait */}
        <div style={{ width:124, flexShrink:0, position:'relative', overflow:'hidden',
          borderRight:'1px solid var(--brass-deep)' }}>
          <SpeakerPortrait name={line.speaker} accent={accent}/>
        </div>

        <div style={{ flex:1, minWidth:0, padding:'14px 18px 16px', position:'relative' }}>
          {/* filigree */}
          <span style={{ position:'absolute', top:4, left:4, width:9, height:9,
            borderTop:'1px solid var(--brass-dim)', borderLeft:'1px solid var(--brass-dim)' }}/>
          <span style={{ position:'absolute', bottom:4, right:4, width:9, height:9,
            borderBottom:'1px solid var(--brass-dim)', borderRight:'1px solid var(--brass-dim)' }}/>

          {/* 2 — name */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'Cinzel, serif', fontSize:16, color:'var(--brass)',
                letterSpacing:'0.1em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {line.speaker}
              </div>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
                color:'var(--bio-dim)', letterSpacing:'0.22em', textTransform:'uppercase', marginTop:3 }}>
                {line.title || `Briefing · ${assignment.name}`}
              </div>
            </div>
            <button onClick={(e)=>{ e.stopPropagation(); onClose(); }}
              title="Dismiss briefing"
              style={{ background:'transparent', border:'none', padding:'0 2px', flexShrink:0,
                color:'var(--bone-dim)', cursor:'pointer', opacity:0.55,
                fontFamily:'JetBrains Mono, monospace', fontSize:13, lineHeight:1 }}
              onMouseEnter={e=>e.currentTarget.style.opacity=1}
              onMouseLeave={e=>e.currentTarget.style.opacity=0.55}>×</button>
          </div>

          <div style={{ height:1, background:'var(--brass-deep)', opacity:0.5, margin:'10px 0 9px' }}/>

          {/* 3 — content */}
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:15.5, lineHeight:1.55,
            color:'var(--bone)', minHeight:52 }}>
            {full.slice(0, shown)}
            {typing && <span style={{ color:'var(--brass)', opacity:0.7 }}>▌</span>}
          </div>

          {/* footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:12, marginTop:10 }}>
            <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:8.5,
              color:'var(--bone-dim)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              {idx + 1} / {lines.length} · {typing ? 'click to reveal' : 'click to continue'}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {idx > 0 && (
                <button className="btn ghost sm"
                  onClick={(e)=>{ e.stopPropagation(); setIdx(i => i - 1); }}>‹ Back</button>
              )}
              <button className="btn ghost sm" onClick={(e)=>{ e.stopPropagation(); advance(); }}>
                {typing ? 'Reveal' : idx + 1 < lines.length ? 'Next ›' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.BriefingHud = BriefingHud;
window.SpeakerPortrait = SpeakerPortrait;
