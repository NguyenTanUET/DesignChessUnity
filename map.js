// Assignments — linear campaign of hand-drawn maps. Each map has fixed node positions
// and each node has a specific objective type.
(function(){

// Objective types
const OBJECTIVES = {
  exterminate: {
    id:'exterminate', label:'Exterminate',
    short:'Slaughter All',
    desc:'Devour every creature in the enemy brood.',
    icon:'skulls',
    color:'var(--bone)',
  },
  eliminate_leader: {
    id:'eliminate_leader', label:'Eliminate Leader',
    short:'Sever the Head',
    desc:'Slay the foe\'s commanding creature. Others may scatter.',
    icon:'crown-bleed',
    color:'var(--coral)',
  },
  purge: {
    id:'purge', label:'Boss Fight · Purge',
    short:'Purge the Leviathan',
    desc:'A great horror rises. End it, whatever the cost.',
    icon:'leviathan',
    color:'var(--coral)',
  },
  escort: {
    id:'escort', label:'Escort',
    short:'Shepherd the Vessel',
    desc:'Guide a charge from one reef-mark to another across the tide.',
    icon:'shepherd',
    color:'var(--brass)',
  },
  retrieve: {
    id:'retrieve', label:'Retrieve Resource',
    short:'Harvest the Silt',
    desc:'Move thy spawn onto each marked vein. Hold them long enough to strip it.',
    icon:'chalice',
    color:'var(--bio)',
  },
  seize: {
    id:'seize', label:'Seize Control',
    short:'Hold the Spire',
    desc:'Keep at least one creature within a marked radius for a set tide-count.',
    icon:'spire',
    color:'var(--void)',
  },
  advance: {
    id:'advance', label:'Advance',
    short:'Crown the Far Reef',
    desc:'March thy Sovereign onto the marked square. Do not fall.',
    icon:'flag-king',
    color:'var(--brass)',
  },
};

// Each assignment = a themed map with ~7-10 hand-placed nodes.
// Positions are normalized 0..1 on a 1000x720 canvas.
// The `path` field defines linear progression order by node id.

const ASSIGNMENTS = [
  {
    id:'a1', index:1, title:'The Silted Mouth',
    subtitle:'Assignment I',
    epigraph:'"Where the river bleeds into the abyss, the first brood wakes."',
    palette: {
      top: 'oklch(0.34 0.06 195)',
      bottom: 'oklch(0.10 0.03 215)',
      accent: 'oklch(0.6 0.12 180)',
    },
    // background decorations: kelp, rocks, reefs
    decor: [
      { kind:'kelp', x:0.08, y:0.5, h:0.55 },
      { kind:'kelp', x:0.15, y:0.55, h:0.45 },
      { kind:'reef', x:0.72, y:0.78, w:0.28, h:0.28 },
      { kind:'reef', x:0.02, y:0.82, w:0.22, h:0.22 },
      { kind:'wreck', x:0.55, y:0.22, w:0.18 },
      { kind:'kelp', x:0.88, y:0.62, h:0.5 },
      { kind:'rock', x:0.4, y:0.85, r:0.04 },
    ],
    nodes: [
      { id:'a1-01', x:0.08, y:0.82, obj:'exterminate', name:'Larval Shoals', flavor:'A swarm of bioluminescent spawn crosses the tide.' },
      { id:'a1-02', x:0.22, y:0.65, obj:'retrieve',   name:'Rust-Vein Cradle', flavor:'Iron-silt worth a brood. Three veins mark the bed.' },
      { id:'a1-03', x:0.36, y:0.78, obj:'escort',     name:'The Pilgrim Urn', flavor:'An ossuary-jar must reach the shrine unbroken.' },
      { id:'a1-04', x:0.48, y:0.58, obj:'exterminate', name:'Glass Eel Ambush', flavor:'They ribbon through the kelp, silent and hungry.' },
      { id:'a1-05', x:0.6, y:0.7, obj:'eliminate_leader', name:'The Barnacle Thane', flavor:'A crowned polyp rules this reef-shelf.' },
      { id:'a1-06', x:0.72, y:0.5, obj:'seize',        name:'The Broken Spire', flavor:'Hold the shattered lighthouse five tides.' },
      { id:'a1-07', x:0.83, y:0.62, obj:'advance',     name:'The Far Trench-Lip', flavor:'Lead the Sovereign to the ledge. The descent begins there.' },
      { id:'a1-08', x:0.92, y:0.38, obj:'purge',       name:'The Iron Widow', flavor:'A crowned anemone, mourning a king digested centuries past.' },
    ],
    edges: [
      ['a1-01','a1-02'],['a1-02','a1-03'],['a1-03','a1-04'],
      ['a1-04','a1-05'],['a1-05','a1-06'],['a1-06','a1-07'],
      ['a1-07','a1-08'],
    ],
  },
  {
    id:'a2', index:2, title:'The Whispering Thermocline',
    subtitle:'Assignment II',
    epigraph:'"Between warm & cold, the sea holds its breath. Something speaks in that pause."',
    palette: {
      top: 'oklch(0.25 0.06 210)',
      bottom: 'oklch(0.06 0.02 230)',
      accent: 'oklch(0.62 0.14 280)',
    },
    decor: [
      { kind:'layer', y:0.4 },
      { kind:'jelly', x:0.15, y:0.3 },
      { kind:'jelly', x:0.42, y:0.22 },
      { kind:'jelly', x:0.7, y:0.35 },
      { kind:'wreck', x:0.3, y:0.75, w:0.2 },
      { kind:'reef', x:0.8, y:0.82, w:0.22, h:0.22 },
      { kind:'kelp', x:0.52, y:0.72, h:0.42 },
    ],
    nodes: [
      { id:'a2-01', x:0.07, y:0.58, obj:'advance',      name:'The Cold Boundary', flavor:'Cross the thermal line. The Sovereign leads.' },
      { id:'a2-02', x:0.2, y:0.72, obj:'exterminate',   name:'The Eel-Choir', flavor:'Their song curdles the marrow of lesser broods.' },
      { id:'a2-03', x:0.32, y:0.55, obj:'retrieve',     name:'Silken Spore-Beds', flavor:'Harvest the glowing pollen. Three clutches.' },
      { id:'a2-04', x:0.44, y:0.68, obj:'seize',        name:'Pale Altar', flavor:'Hold the bone-shrine six tides. The song tests thee.' },
      { id:'a2-05', x:0.56, y:0.48, obj:'escort',       name:'The Blind Acolyte', flavor:'A weeping cleric, hunted. Shepherd her to the rift.' },
      { id:'a2-06', x:0.68, y:0.62, obj:'eliminate_leader', name:'The Drowned Duke', flavor:'He wears the helms of those he has pulled below.' },
      { id:'a2-07', x:0.8, y:0.45, obj:'exterminate',   name:'Mothlight Swarm', flavor:'Phosphor moths of the midwater. They burn when they bite.' },
      { id:'a2-08', x:0.9, y:0.58, obj:'purge',         name:'The Pale Abbess', flavor:'Her court is a mausoleum of baleen. Her hymn is not.' },
    ],
    edges: [
      ['a2-01','a2-02'],['a2-02','a2-03'],['a2-03','a2-04'],
      ['a2-04','a2-05'],['a2-05','a2-06'],['a2-06','a2-07'],
      ['a2-07','a2-08'],
    ],
  },
  {
    id:'a3', index:3, title:'The Unseen Tide',
    subtitle:'Assignment III — Finale',
    epigraph:'"It moves only when the water forgets to."',
    palette: {
      top: 'oklch(0.12 0.04 280)',
      bottom: 'oklch(0.03 0.01 270)',
      accent: 'oklch(0.55 0.2 25)',
    },
    decor: [
      { kind:'rift', x:0.5, y:0.55, w:0.7 },
      { kind:'bones', x:0.15, y:0.8, w:0.18 },
      { kind:'bones', x:0.75, y:0.82, w:0.2 },
      { kind:'jelly', x:0.3, y:0.2 },
      { kind:'jelly', x:0.65, y:0.28 },
    ],
    nodes: [
      { id:'a3-01', x:0.08, y:0.74, obj:'eliminate_leader', name:'The Last Warden', flavor:'One keeper remains of the old reef-vows.' },
      { id:'a3-02', x:0.22, y:0.58, obj:'seize',            name:'The Threshold Stone', flavor:'Hold it eight tides. The trench decides.' },
      { id:'a3-03', x:0.36, y:0.72, obj:'escort',           name:'The Black Urn', flavor:'A vessel of unspeakable marrow. Do not drop it.' },
      { id:'a3-04', x:0.5, y:0.55, obj:'exterminate',       name:'Marrow-Wraiths', flavor:'They were brood once. They remember it as grief.' },
      { id:'a3-05', x:0.62, y:0.7, obj:'retrieve',          name:'The Hymn-Salt', flavor:'Gather the crystallized song from five veins.' },
      { id:'a3-06', x:0.74, y:0.52, obj:'advance',          name:'The Crown-Reef', flavor:'Lead thy Sovereign to the bleached altar.' },
      { id:'a3-07', x:0.88, y:0.42, obj:'purge',            name:'THE UNSEEN TIDE', flavor:'Do not look directly. Strike where the water forgets.' },
    ],
    edges: [
      ['a3-01','a3-02'],['a3-02','a3-03'],['a3-03','a3-04'],
      ['a3-04','a3-05'],['a3-05','a3-06'],['a3-06','a3-07'],
    ],
  },
];

window.OBJECTIVES = OBJECTIVES;
window.ASSIGNMENTS = ASSIGNMENTS;
window.getAssignment = (i) => ASSIGNMENTS[Math.min(i, ASSIGNMENTS.length-1)];

})();
