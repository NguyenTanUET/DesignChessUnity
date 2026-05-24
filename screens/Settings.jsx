// Settings — Sovereign Codex. Audio, display, gameplay & rebindable hotkeys.
const SETTINGS_KEY = 'gok.settings';

const HOTKEY_DEFS = [
  { id:'pause',         section:'Match',      label:'Pause / Open Menu',    desc:'During a hunt, suspend play.',                     defaultKey:'Escape', defaultMod:null },
  { id:'resign',        section:'Match',      label:'Resign Match',         desc:'Yield the hunt. The brood is forfeit.',            defaultKey:'KeyR',   defaultMod:null },
  { id:'showMoves',     section:'Match',      label:'Toggle Legal Moves',   desc:'Highlight where the selected piece may strike.',   defaultKey:'KeyL',   defaultMod:null },
  { id:'undoSelect',    section:'Match',      label:'Deselect Piece',       desc:'Release the currently selected piece.',            defaultKey:'KeyX',   defaultMod:null },
  { id:'openInventory', section:'Navigation', label:'Open Reliquary',       desc:'View brood and bone-relics.',                      defaultKey:'KeyI',   defaultMod:null },
  { id:'openMap',       section:'Navigation', label:'Open World Map',       desc:'Survey the abyssal cartography.',                  defaultKey:'KeyM',   defaultMod:null },
  { id:'openHub',       section:'Navigation', label:'Return to Hub',        desc:'Back to the Operation Center.',                    defaultKey:'KeyB',   defaultMod:null },
  { id:'openFollowers', section:'Navigation', label:'Manage Followers',     desc:'Open the brood council.',                          defaultKey:'KeyF',   defaultMod:null },
  { id:'openTrader',    section:'Navigation', label:'Open Trader',          desc:'Visit the brine market.',                          defaultKey:'KeyT',   defaultMod:null },
  { id:'cycleTab',      section:'Navigation', label:'Cycle Sub-Tab',        desc:'Advance through screen sub-tabs.',                 defaultKey:'Tab',    defaultMod:null },
  { id:'quickSave',     section:'System',     label:'Quick Save',           desc:'Force a write to local storage.',                  defaultKey:'F5',     defaultMod:null },
  { id:'toggleMute',    section:'System',     label:'Mute / Unmute Audio',  desc:'Silence the trench song.',                         defaultKey:'KeyM',   defaultMod:'ctrl' },
  { id:'toggleHelp',    section:'System',     label:'Show Help Overlay',    desc:'Display key reference card.',                      defaultKey:'Slash',  defaultMod:'shift' },
];

const DEFAULT_SETTINGS = {
  audio:    { master: 80, music: 65, sfx: 85, muted: false },
  display:  { animationSpeed: 1.0, reduceMotion: false, showFps: false, boardTheme: 'abyssal' },
  gameplay: { confirmResign: true, autosave: true, highlightMoves: true, showCoords: true, fastAnimations: false },
  hotkeys:  Object.fromEntries(HOTKEY_DEFS.map(d => [d.id, { key: d.defaultKey, mod: d.defaultMod }])),
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      audio:    { ...DEFAULT_SETTINGS.audio,    ...(parsed.audio    || {}) },
      display:  { ...DEFAULT_SETTINGS.display,  ...(parsed.display  || {}) },
      gameplay: { ...DEFAULT_SETTINGS.gameplay, ...(parsed.gameplay || {}) },
      hotkeys:  { ...DEFAULT_SETTINGS.hotkeys,  ...(parsed.hotkeys  || {}) },
    };
  } catch (e) { return DEFAULT_SETTINGS; }
};

const formatKeyCode = (code, mod) => {
  if (!code) return '— Unbound —';
  let display = code;
  if      (code.startsWith('Key'))   display = code.slice(3);
  else if (code.startsWith('Digit')) display = code.slice(5);
  else if (code.startsWith('Arrow')) display = code.slice(5).toUpperCase();
  const friendly = {
    Escape:'Esc', Space:'Space', Slash:'/', Backslash:'\\', Comma:',', Period:'.',
    Enter:'↵', Tab:'Tab', Backquote:'`', Minus:'-', Equal:'=',
    BracketLeft:'[', BracketRight:']', Quote:"'", Semicolon:';',
  };
  if (friendly[code]) display = friendly[code];
  const parts = [];
  if (mod === 'ctrl')  parts.push('Ctrl');
  if (mod === 'shift') parts.push('Shift');
  if (mod === 'alt')   parts.push('Alt');
  parts.push(display);
  return parts.join(' + ');
};

const Settings = ({ go, returnTo = 'menu' }) => {
  const [settings, setSettings] = React.useState(loadSettings);
  const [activeSection, setActiveSection] = React.useState('audio');
  const [capturingId, setCapturingId] = React.useState(null);
  const [dirty, setDirty] = React.useState(false);
  const [savedToast, setSavedToast] = React.useState(false);

  // Capture key presses for rebind
  React.useEffect(() => {
    if (!capturingId) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !e.ctrlKey && !e.shiftKey && capturingId !== 'pause') {
        setCapturingId(null);
        return;
      }
      if (['Control','Shift','Alt','Meta'].includes(e.key)) return;
      const mod = e.ctrlKey ? 'ctrl' : e.shiftKey ? 'shift' : e.altKey ? 'alt' : null;
      setSettings(s => ({
        ...s,
        hotkeys: { ...s.hotkeys, [capturingId]: { key: e.code, mod } },
      }));
      setDirty(true);
      setCapturingId(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [capturingId]);

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setDirty(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const resetSection = (section) => {
    setSettings(s => ({ ...s, [section]: DEFAULT_SETTINGS[section] }));
    setDirty(true);
  };

  const resetAll = () => {
    setSettings(DEFAULT_SETTINGS);
    setDirty(true);
  };

  const updateField = (section, key, value) => {
    setSettings(s => ({ ...s, [section]: { ...s[section], [key]: value } }));
    setDirty(true);
  };

  // Hotkey conflict detection
  const conflicts = React.useMemo(() => {
    const byCombo = {};
    const out = {};
    Object.entries(settings.hotkeys).forEach(([id, bind]) => {
      if (!bind.key) return;
      const combo = `${bind.mod || ''}|${bind.key}`;
      if (byCombo[combo]) {
        out[id] = byCombo[combo];
        out[byCombo[combo]] = id;
      } else {
        byCombo[combo] = id;
      }
    });
    return out;
  }, [settings.hotkeys]);

  const SECTIONS = [
    { id:'audio',    label:'Audio',    glyph:'◐', epithet:'Trench Song' },
    { id:'display',  label:'Display',  glyph:'◉', epithet:'Lantern & Lens' },
    { id:'gameplay', label:'Gameplay', glyph:'✠', epithet:'Hunt Doctrine' },
    { id:'hotkeys',  label:'Hotkeys',  glyph:'◈', epithet:'Sovereign Edicts' },
  ];

  return (
    <div className="screen noise" style={{ position:'absolute', inset:0, background:'var(--abyss-0)' }}>
      {/* ambient plankton drift */}
      <div className="plankton">
        {Array.from({length:18}).map((_,i) => (
          <span key={i} style={{
            left:`${(i*167)%100}%`,
            animationDuration:`${20+(i%5)*4}s`,
            animationDelay:`${-(i*1.4)}s`,
            width:`${1.5+(i%3)}px`, height:`${1.5+(i%3)}px`, opacity:0.35,
          }}/>
        ))}
      </div>

      {/* Header */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:80, padding:'0 32px', zIndex:5,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom:'1px solid var(--abyss-4)',
        background:'linear-gradient(180deg, rgba(0,8,10,0.75), rgba(0,8,10,0.25))',
        boxShadow:'0 0 24px rgba(20,80,95,0.35)',
      }}>
        <div>
          <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ Sovereign Codex</div>
          <h1 style={{ fontFamily:'Cinzel, serif', fontSize:28, margin:'2px 0 0', letterSpacing:'0.1em' }}>SETTINGS</h1>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {savedToast && (
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.2em',
              color:'var(--bio)', textTransform:'uppercase' }}>✓ Inscribed</span>
          )}
          {dirty && !savedToast && (
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:10, letterSpacing:'0.2em',
              color:'var(--coral)', textTransform:'uppercase', animation:'dlgBlink 1.5s infinite' }}>
              ● Unsaved
            </span>
          )}
          <button className="btn ghost sm" onClick={resetAll}>Reset All</button>
          <button className="btn primary" onClick={save} disabled={!dirty}>Inscribe</button>
          <button className="btn ghost" onClick={()=>go(returnTo)}>← Back</button>
        </div>
      </div>

      {/* Body: section nav + content */}
      <div style={{ position:'absolute', top:80, left:0, right:0, bottom:0, display:'grid', gridTemplateColumns:'260px 1fr' }}>
        {/* Section nav */}
        <div style={{
          borderRight:'1px solid var(--abyss-4)', padding:'24px 0',
          background:'linear-gradient(180deg, var(--abyss-1), var(--abyss-0))',
        }}>
          {SECTIONS.map(sec => {
            const active = activeSection === sec.id;
            return (
              <button key={sec.id} onClick={()=>setActiveSection(sec.id)} style={{
                display:'flex', alignItems:'center', gap:14, width:'100%',
                padding:'14px 24px', background: active ? 'rgba(120,200,210,0.06)' : 'transparent',
                border:'none',
                borderLeft: active ? '3px solid var(--brass)' : '3px solid transparent',
                color: active ? 'var(--brass)' : 'var(--bone-dim)',
                fontFamily:'Cinzel, serif', fontSize:14, letterSpacing:'0.12em',
                textTransform:'uppercase', cursor:'pointer', textAlign:'left',
                transition:'all 0.15s',
              }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.color='var(--bone)'; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.color='var(--bone-dim)'; }}>
                <span style={{ fontSize:22, textShadow: active ? '0 0 10px var(--brass)' : 'none' }}>{sec.glyph}</span>
                <div>
                  <div>{sec.label}</div>
                  <div style={{ fontSize:10, letterSpacing:'0.18em', color:'var(--bone-deep)',
                    fontStyle:'italic', textTransform:'none', fontFamily:'Cormorant Garamond, serif', marginTop:2 }}>
                    {sec.epithet}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="divider suture" style={{ margin:'24px 24px' }}/>
          <div style={{ padding:'0 24px', fontFamily:'JetBrains Mono, monospace', fontSize:9,
            color:'var(--bone-deep)', letterSpacing:'0.2em', textTransform:'uppercase', lineHeight:1.9 }}>
            <div>· Saved locally to this vessel.</div>
            <div>· Esc cancels a rebind.</div>
            <div>· Reset returns brood defaults.</div>
          </div>
        </div>

        {/* Content panel */}
        <div style={{ overflowY:'auto', padding:'32px 48px' }}>
          {activeSection === 'audio'    && <AudioPanel    s={settings.audio}    update={(k,v)=>updateField('audio',k,v)}    reset={()=>resetSection('audio')}/>}
          {activeSection === 'display'  && <DisplayPanel  s={settings.display}  update={(k,v)=>updateField('display',k,v)}  reset={()=>resetSection('display')}/>}
          {activeSection === 'gameplay' && <GameplayPanel s={settings.gameplay} update={(k,v)=>updateField('gameplay',k,v)} reset={()=>resetSection('gameplay')}/>}
          {activeSection === 'hotkeys'  && (
            <HotkeyPanel
              bindings={settings.hotkeys}
              capturingId={capturingId}
              setCapturingId={setCapturingId}
              conflicts={conflicts}
              clearBinding={(id)=>{ setSettings(s=>({...s, hotkeys:{...s.hotkeys,[id]:{key:null,mod:null}}})); setDirty(true); }}
              resetBinding={(id)=>{
                const def = HOTKEY_DEFS.find(d => d.id === id);
                setSettings(s=>({...s, hotkeys:{...s.hotkeys,[id]:{key:def.defaultKey,mod:def.defaultMod}}}));
                setDirty(true);
              }}
              resetAll={()=>resetSection('hotkeys')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Shared sub-panel chrome ----------

const SectionHeader = ({ title, subtitle, onReset }) => (
  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
    <div>
      <div className="eyebrow" style={{ color:'var(--bio-dim)' }}>◆ {subtitle}</div>
      <h2 style={{ fontFamily:'Cinzel, serif', fontSize:24, margin:'4px 0 0', letterSpacing:'0.06em' }}>{title}</h2>
    </div>
    <button className="btn ghost sm" onClick={onReset}>Restore Defaults</button>
  </div>
);

const FieldRow = ({ label, hint, children }) => (
  <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', alignItems:'center', gap:20,
    padding:'14px 0', borderBottom:'1px dashed var(--abyss-3)' }}>
    <div>
      <div style={{ fontFamily:'Cinzel, serif', fontSize:14, color:'var(--bone)', letterSpacing:'0.04em' }}>{label}</div>
      {hint && (
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:12, color:'var(--bone-dim)',
          fontStyle:'italic', marginTop:3 }}>{hint}</div>
      )}
    </div>
    <div>{children}</div>
  </div>
);

const Slider = ({ value, onChange, min=0, max=100, step=1, suffix='%' }) => (
  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(Number(e.target.value))}
      style={{ flex:1, accentColor:'var(--bio)', maxWidth:380 }}/>
    <span style={{ minWidth:60, textAlign:'right', fontFamily:'JetBrains Mono, monospace',
      fontSize:12, color:'var(--brass)', letterSpacing:'0.1em' }}>{value}{suffix}</span>
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <button onClick={()=>onChange(!value)} style={{
    display:'inline-flex', alignItems:'center', gap:10,
    padding:'6px 14px', background:'transparent',
    border:`1px solid ${value ? 'var(--bio-dim)' : 'var(--abyss-4)'}`,
    cursor:'pointer', borderRadius:'2px', transition:'border-color 0.15s',
  }}>
    <span style={{
      width:32, height:18, borderRadius:'10px', position:'relative',
      background: value ? 'oklch(0.4 0.1 188)' : 'var(--abyss-3)',
      transition:'background 0.15s', display:'inline-block',
    }}>
      <span style={{
        position:'absolute', top:2, left: value ? 16 : 2,
        width:14, height:14, borderRadius:'50%',
        background: value ? 'var(--bio)' : 'var(--bone-dim)',
        boxShadow: value ? '0 0 8px var(--bio)' : 'none',
        transition:'left 0.15s, background 0.15s, box-shadow 0.15s',
      }}/>
    </span>
    <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:11, letterSpacing:'0.18em',
      color: value ? 'var(--bio)' : 'var(--bone-dim)', textTransform:'uppercase' }}>
      {label || (value ? 'On' : 'Off')}
    </span>
  </button>
);

const SegOption = ({ options, value, onChange }) => (
  <div style={{ display:'inline-flex', border:'1px solid var(--abyss-4)', borderRadius:'2px', overflow:'hidden' }}>
    {options.map((o,i) => {
      const active = value === o.value;
      return (
        <button key={String(o.value)} onClick={()=>onChange(o.value)} style={{
          padding:'8px 18px',
          background: active ? 'linear-gradient(180deg, oklch(0.35 0.08 188), oklch(0.22 0.05 192))' : 'transparent',
          border:'none', cursor:'pointer',
          color: active ? 'var(--brass)' : 'var(--bone-dim)',
          fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase',
          borderRight: i < options.length-1 ? '1px solid var(--abyss-3)' : 'none',
          transition:'all 0.15s',
        }}>{o.label}</button>
      );
    })}
  </div>
);

// ---------- Sub-panels ----------

const AudioPanel = ({ s, update, reset }) => (
  <>
    <SectionHeader title="Audio" subtitle="Trench Song" onReset={reset}/>
    <FieldRow label="Master Volume"  hint="Overall sound level of the abyss.">
      <Slider value={s.master} onChange={v=>update('master', v)}/>
    </FieldRow>
    <FieldRow label="Music Volume"   hint="Drowned hymns and brood chants.">
      <Slider value={s.music} onChange={v=>update('music', v)}/>
    </FieldRow>
    <FieldRow label="Effects Volume" hint="Bone-strike, tide-roar, capture sounds.">
      <Slider value={s.sfx} onChange={v=>update('sfx', v)}/>
    </FieldRow>
    <FieldRow label="Mute All"       hint="Silence everything until unmuted.">
      <Toggle value={s.muted} onChange={v=>update('muted', v)} label={s.muted?'Silenced':'Audible'}/>
    </FieldRow>
  </>
);

const DisplayPanel = ({ s, update, reset }) => (
  <>
    <SectionHeader title="Display" subtitle="Lantern & Lens" onReset={reset}/>
    <FieldRow label="Animation Speed" hint="How quickly creatures move and interfaces resolve.">
      <SegOption value={s.animationSpeed} onChange={v=>update('animationSpeed', v)}
        options={[
          {value:0.5, label:'Slow'},
          {value:1.0, label:'Standard'},
          {value:1.5, label:'Brisk'},
          {value:2.0, label:'Instant'},
        ]}/>
    </FieldRow>
    <FieldRow label="Board Theme" hint="Aesthetic of the chess slab.">
      <SegOption value={s.boardTheme} onChange={v=>update('boardTheme', v)}
        options={[
          {value:'abyssal', label:'Abyssal'},
          {value:'reef',    label:'Reef'},
          {value:'bone',    label:'Ossuary'},
        ]}/>
    </FieldRow>
    <FieldRow label="Reduce Motion" hint="Suppress drift, pulses, and screen-flicker.">
      <Toggle value={s.reduceMotion} onChange={v=>update('reduceMotion', v)}/>
    </FieldRow>
    <FieldRow label="Show FPS" hint="Performance overlay in the top-right.">
      <Toggle value={s.showFps} onChange={v=>update('showFps', v)}/>
    </FieldRow>
  </>
);

const GameplayPanel = ({ s, update, reset }) => (
  <>
    <SectionHeader title="Gameplay" subtitle="Hunt Doctrine" onReset={reset}/>
    <FieldRow label="Confirm Before Resign" hint="Prompt twice when abandoning a match.">
      <Toggle value={s.confirmResign} onChange={v=>update('confirmResign', v)}/>
    </FieldRow>
    <FieldRow label="Auto-Save Runs" hint="Persist progress between screens.">
      <Toggle value={s.autosave} onChange={v=>update('autosave', v)}/>
    </FieldRow>
    <FieldRow label="Highlight Legal Moves" hint="Glow squares a selected piece can reach.">
      <Toggle value={s.highlightMoves} onChange={v=>update('highlightMoves', v)}/>
    </FieldRow>
    <FieldRow label="Show Board Coordinates" hint="Display file/rank labels around the slab.">
      <Toggle value={s.showCoords} onChange={v=>update('showCoords', v)}/>
    </FieldRow>
    <FieldRow label="Fast UI Animations" hint="Skip dramatic flourishes on menus.">
      <Toggle value={s.fastAnimations} onChange={v=>update('fastAnimations', v)}/>
    </FieldRow>
  </>
);

const HotkeyPanel = ({ bindings, capturingId, setCapturingId, conflicts, clearBinding, resetBinding, resetAll }) => {
  const sections = ['Match', 'Navigation', 'System'];
  return (
    <>
      <SectionHeader title="Hotkeys" subtitle="Sovereign Edicts" onReset={resetAll}/>

      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:13, color:'var(--bone-dim)',
        fontStyle:'italic', marginBottom:18, padding:'12px 16px',
        background:'rgba(0,8,12,0.45)', border:'1px solid var(--abyss-3)',
        borderLeft:'3px solid var(--brass-deep)' }}>
        Click any binding to rebind. Press the new key — modifiers <strong style={{color:'var(--brass)'}}>Ctrl</strong>, <strong style={{color:'var(--brass)'}}>Shift</strong>, or <strong style={{color:'var(--brass)'}}>Alt</strong> are recorded with the keystroke. Press <strong style={{color:'var(--brass)'}}>Esc</strong> to cancel without changing.
      </div>

      {sections.map(section => (
        <div key={section} style={{ marginBottom:28 }}>
          <div className="eyebrow" style={{ color:'var(--brass-dim)', marginBottom:8 }}>‣ {section}</div>
          <div className="panel ornate" style={{ padding:'4px 16px' }}>
            {HOTKEY_DEFS.filter(d => d.section === section).map((def, i, arr) => {
              const bind = bindings[def.id] || { key:null, mod:null };
              const isCapturing = capturingId === def.id;
              const hasConflict = !!conflicts[def.id];
              return (
                <div key={def.id} style={{
                  display:'grid', gridTemplateColumns:'1fr 220px auto',
                  alignItems:'center', gap:14, padding:'12px 6px',
                  borderBottom: i < arr.length-1 ? '1px dashed var(--abyss-3)' : 'none',
                }}>
                  <div>
                    <div style={{ fontFamily:'Cinzel, serif', fontSize:13, color:'var(--bone)', letterSpacing:'0.04em' }}>
                      {def.label}
                      {hasConflict && (
                        <span style={{ marginLeft:8, fontSize:9, padding:'2px 6px',
                          background:'oklch(0.2 0.08 25 / 0.4)', color:'var(--coral)',
                          border:'1px solid var(--coral-dim)', letterSpacing:'0.15em',
                          fontFamily:'JetBrains Mono, monospace' }}>CONFLICT</span>
                      )}
                    </div>
                    <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:11,
                      color:'var(--bone-dim)', fontStyle:'italic', marginTop:2 }}>{def.desc}</div>
                  </div>

                  <button onClick={()=>setCapturingId(isCapturing ? null : def.id)} style={{
                    padding:'10px 14px', cursor:'pointer',
                    background: isCapturing
                      ? 'linear-gradient(180deg, oklch(0.42 0.10 188), oklch(0.26 0.07 192))'
                      : 'linear-gradient(180deg, var(--abyss-3), var(--abyss-2))',
                    border: `1px solid ${isCapturing ? 'var(--bio)' : hasConflict ? 'var(--coral)' : 'var(--brass-deep)'}`,
                    color: isCapturing ? 'var(--bone)' : hasConflict ? 'var(--coral)' : 'var(--brass)',
                    fontFamily:'JetBrains Mono, monospace', fontSize:12, letterSpacing:'0.14em',
                    textTransform:'uppercase', textAlign:'center',
                    boxShadow: isCapturing
                      ? '0 0 14px oklch(0.78 0.14 188 / 0.4), inset 0 0 12px oklch(0.78 0.14 188 / 0.2)'
                      : 'inset 0 1px 0 rgba(180,230,235,0.08)',
                    animation: isCapturing ? 'dlgBlink 1s infinite' : 'none',
                    transition:'all 0.15s',
                  }}>
                    {isCapturing ? '◆ Press a Key…' : formatKeyCode(bind.key, bind.mod)}
                  </button>

                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={()=>resetBinding(def.id)} title="Restore default" style={{
                      width:30, height:30, background:'transparent',
                      border:'1px solid var(--abyss-4)', color:'var(--bone-dim)', cursor:'pointer',
                      fontFamily:'Cinzel, serif', fontSize:14,
                    }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--brass)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--bone-dim)'}>↺</button>
                    <button onClick={()=>clearBinding(def.id)} title="Clear binding" style={{
                      width:30, height:30, background:'transparent',
                      border:'1px solid var(--abyss-4)', color:'var(--coral-dim)', cursor:'pointer',
                      fontFamily:'Cinzel, serif', fontSize:14,
                    }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--coral)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--coral-dim)'}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(conflicts).length > 0 && (
        <div style={{ marginTop:8, padding:'10px 16px',
          background:'oklch(0.2 0.08 25 / 0.3)', border:'1px solid var(--coral-dim)',
          fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--coral)',
          letterSpacing:'0.12em', textTransform:'uppercase' }}>
          ⚠ Some bindings share the same key. Coral-tinted rows are in conflict.
        </div>
      )}
    </>
  );
};

window.Settings = Settings;
window.loadSettings = loadSettings;
window.SETTINGS_KEY = SETTINGS_KEY;
window.HOTKEY_DEFS = HOTKEY_DEFS;
