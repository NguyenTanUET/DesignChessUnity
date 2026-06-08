// App shell — screen router, run state, tweaks
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "boardSize": 8
}/*EDITMODE-END*/;

const App = () => {
  const [screen, setScreen] = useState('menu');
  const [run, setRun] = useState(null);
  const [nodePreview, setNodePreview] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksOn, setTweaksOn] = useState(false);

  // Track last non-settings screen so Settings' Back button returns there.
  const lastNonSettings = React.useRef('menu');
  useEffect(() => {
    if (screen !== 'settings') lastNonSettings.current = screen;
  }, [screen]);

  // Persist screen
  useEffect(() => {
    const s = localStorage.getItem('gok.screen');
    if (s) setScreen(s);
    const r = localStorage.getItem('gok.run');
    if (r) try { setRun(JSON.parse(r)); } catch(e){}
  }, []);
  useEffect(() => { localStorage.setItem('gok.screen', screen); }, [screen]);
  useEffect(() => { if (run) localStorage.setItem('gok.run', JSON.stringify(run)); }, [run]);

  // Tweaks protocol
  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    const next = {...tweaks, [k]: v};
    setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*');
  };

  const openNode = (node) => setNodePreview(node);

  const enterMatch = (node, enemy) => {
    setCurrentNode(node);
    setCurrentEnemy(enemy);
    setNodePreview(null);
    setScreen('match');
  };

  const finishMatchLose = () => setScreen('gameover-lose');

  // Match-win advances directly to the next node (or assignment victory).
  // The intermediate Reward screen has been retired — node-level spoils are no longer surfaced here.
  const finishMatchWin = () => {
    const assignment = window.getAssignment(run.assignmentIdx || 0);
    const nextIdx = (run.currentNodeIdx || 0) + 1;
    const completedAssignment = nextIdx >= assignment.nodes.length;
    const nextAssignment = completedAssignment ? (run.assignmentIdx||0) + 1 : (run.assignmentIdx||0);
    const allDone = completedAssignment && nextAssignment >= window.ASSIGNMENTS.length;

    setRun(r => ({
      ...r,
      currentNode: currentNode.id,
      visited: [...r.visited, currentNode.id],
      floor: completedAssignment ? r.floor+1 : r.floor,
      assignmentIdx: allDone ? r.assignmentIdx : nextAssignment,
      currentNodeIdx: completedAssignment ? 0 : nextIdx,
    }));
    if (allDone) setScreen('gameover-win');
    else setScreen('map');
  };

  const newRun = () => {
    localStorage.removeItem('gok.run');
    setRun(null);
    setScreen('menu');
  };

  return (
    <div style={{ position:'absolute', inset:0 }}>
      {screen === 'menu' && <MainMenu go={setScreen} setRun={setRun}/>}

      {/* Operation Center suite */}
      {screen === 'op-hub' && run && <OperationCenter run={run} setRun={setRun} go={setScreen}/>}
      {screen === 'op-follower' && run && <ManageFollower run={run} setRun={setRun} go={setScreen}/>}
      {screen === 'op-lineup' && run && <ManageFollower run={run} setRun={setRun} go={setScreen} initialSubTab="lineup"/>}
      {screen === 'op-trader' && run && <Trader run={run} setRun={setRun} go={setScreen}/>}
      {screen === 'op-command' && run && <CommandChamber run={run} setRun={setRun} go={setScreen}/>}
      {screen === 'training-board' && run && <SparringField run={run} setRun={setRun} go={setScreen}/>}

      {/* Mission — world map & battles */}
      {screen === 'map' && run && <WorldMap go={setScreen} run={run} setRun={setRun} openNode={openNode}/>}
      {screen === 'match' && run && <Match run={run} enemy={currentEnemy} node={currentNode} boardSize={tweaks.boardSize} onWin={finishMatchWin} onLose={finishMatchLose}/>}
      {screen === 'gameover-win' && run && <GameOver won={true} run={run} onAgain={newRun} onMenu={()=>setScreen('menu')}/>}
      {screen === 'gameover-lose' && run && <GameOver won={false} run={run} onAgain={newRun} onMenu={()=>setScreen('menu')}/>}

      {screen === 'settings' && <Settings go={setScreen} returnTo={lastNonSettings.current}/>}

      {nodePreview && run && (
        <NodePreview node={nodePreview} run={run} onClose={()=>setNodePreview(null)} onEnter={enterMatch}/>
      )}

      {/* Quick nav for demo/review */}
      <div style={{ position:'absolute', top:8, right:8, zIndex:100, display:'flex', gap:4, opacity:0.35, transition:'opacity 0.2s' }}
           onMouseEnter={e=>e.currentTarget.style.opacity=1}
           onMouseLeave={e=>e.currentTarget.style.opacity=0.35}>
        <select value={screen} onChange={e=>setScreen(e.target.value)}
          style={{ background:'#000', color:'var(--bone-dim)', border:'1px solid var(--abyss-4)', fontSize:10, padding:'2px 6px', fontFamily:'JetBrains Mono, monospace' }}>
          <option value="menu">Menu</option>
          <option value="op-hub">Op · Hub</option>
          <option value="op-follower">Op · Followers</option>
          <option value="op-trader">Op · Trader</option>
          <option value="op-command">Op · Command</option>
          <option value="training-board">Training · Field</option>
          <option value="map">World Map</option>
          <option value="match">Match</option>
          <option value="gameover-win">Victory</option>
          <option value="gameover-lose">Defeat</option>
          <option value="settings">Settings</option>
        </select>
      </div>

      <div className={`tweaks ${tweaksOn ? 'on' : ''}`}>
        <h4>Tweaks</h4>
        <div className="row">
          <span>Board size</span>
          <select value={tweaks.boardSize} onChange={e=>setTweak('boardSize', parseInt(e.target.value))}>
            <option value={6}>6×6</option>
            <option value={7}>7×7</option>
            <option value={8}>8×8 (standard)</option>
            <option value={10}>10×10</option>
          </select>
        </div>
        <div style={{ marginTop:8, fontSize:10, color:'var(--bone-dim)', fontStyle:'italic' }}>
          Applied on next match start.
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
