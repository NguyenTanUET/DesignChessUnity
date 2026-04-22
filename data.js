// Abyssal Gambit — data: deep-sea evolved creatures as chess pieces
(function() {

// Unicode chess glyphs (we restyle with SVG piece art in Match)
const GLYPHS = {
  white: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
           W: '♛', A: '♝', G: '♞', S: '♜' },
  black: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',
           W: '♛', A: '♝', G: '♞', S: '♜' }
};

const PIECES = {
  K: { key:'K', name:'Leviathan Sovereign', glyph:'♔', cost: 0, rarity:'core',
       desc:'Thy ancient god-whale. If slain, the brood ends.' },
  Q: { key:'Q', name:'Kraken Matriarch', glyph:'♕', cost: 8, rarity:'rare',
       desc:'Glides any direction, any fathom. Tentacles part the tide.' },
  R: { key:'R', name:'Reef Colossus', glyph:'♖', cost: 5, rarity:'common',
       desc:'Calcified titan. Moves orthogonally along current-lines.' },
  B: { key:'B', name:'Anglerfish Prelate', glyph:'♗', cost: 5, rarity:'common',
       desc:'Drifts the diagonals, luring with its bioluminescent lure.' },
  N: { key:'N', name:'Hammerhead Outrider', glyph:'♘', cost: 4, rarity:'common',
       desc:'Breaches in L-hops. Ignores blockers. Smells blood first.' },
  P: { key:'P', name:'Spawnling', glyph:'♙', cost: 2, rarity:'common',
       desc:'A larval brood. Evolves upon reaching the far reef.' },
  W: { key:'W', name:'Nautilus Witch', glyph:'♛', cost: 9, rarity:'legendary',
       desc:'Moves as Matriarch. Once: pulls an ally through a vortex.', ability:'Vortex' },
  A: { key:'A', name:'Harpoon Archon', glyph:'♝', cost: 6, rarity:'rare',
       desc:'Bishop path. Passive: strikes from 2 squares without moving.', ability:'Volley' },
  G: { key:'G', name:'Drowned Revenant', glyph:'♞', cost: 6, rarity:'rare',
       desc:'Knight path. Dies and resurfaces on enemy rank after 3 turns.', ability:'Undying' },
  S: { key:'S', name:'Coral Myrmidon', glyph:'♜', cost: 7, rarity:'rare',
       desc:'Rook path. Adjacent allies take one less wound. Pawn-proof.', ability:'Bulwark' },
};

const CLASSES = [
  {
    id: 'leviathan', name: 'Leviathan Brood',
    epithet: 'They Who Sleep In Trenches',
    tag: 'Balanced. Extra Outriders; ancient bloodline.',
    glyph: '♘',
    color: 'oklch(0.68 0.1 195)',
    lore: 'A lineage older than continents. They remember when the sun was strangers.',
    startHp: 4, startGold: 40, deck: ['K','Q','R','R','B','B','N','N','N','P','P','P','P','P','P'],
    passive: 'Outriders ignore turbulence on opening breach.',
  },
  {
    id: 'abyssal-cult', name: 'Abyssal Cult',
    epithet: 'The Candle Beneath The Tide',
    tag: 'Arcane. Nautilus Witch, fragile spawner.',
    glyph: '♛',
    color: 'oklch(0.58 0.14 290)',
    lore: 'They sing to things with no tongues, and the things sing back.',
    startHp: 3, startGold: 35, deck: ['K','W','R','B','B','N','P','P','P','P','P','P','P','P'],
    passive: 'Begin each battle with 1 Lumen. Spells bleed less.',
  },
  {
    id: 'coral-wardens', name: 'Coral Wardens',
    epithet: 'The Calcified Oath',
    tag: 'Defensive. Myrmidons, thicker hide.',
    glyph: '♜',
    color: 'oklch(0.65 0.1 35)',
    lore: 'They grew their keep from their own bones. They will not bend.',
    startHp: 5, startGold: 30, deck: ['K','Q','S','S','B','N','N','P','P','P','P','P','P','P','P','P'],
    passive: 'Back-reef pieces gain +1 fathom on their first breach.',
  },
];

const RELICS = [
  { id:'lantern', name:'Anglerfish Lantern', glyph:'◉', rarity:'common',
    desc:'Begin each battle with thy Sovereign\'s flank lit and guarded.' },
  { id:'chalice', name:'Chalice of Brine', glyph:'⚱', rarity:'rare',
    desc:'Sacrificing a spawnling grants +4 coral after the battle.' },
  { id:'crown', name:'Barnacle Crown', glyph:'♔', rarity:'rare',
    desc:'Evolved spawnlings may become any minor evolution.' },
  { id:'shell', name:'Whisper-Shell', glyph:'☗', rarity:'uncommon',
    desc:'See one foe move ahead on odd turns.' },
  { id:'tooth', name:'Megalodon Tooth', glyph:'◣', rarity:'legendary',
    desc:'Once per floor: copy a slain foe into thy brood.' },
  { id:'sigil', name:'Trench-Sigil', glyph:'✠', rarity:'common',
    desc:'Outriders gain +1 range on opening breach.' },
];

const ENEMIES = {
  combat: [
    { id:'jellyfleet', name:'Medusa Fleet', tier:'combat', glyph:'☄',
      flavor:'A hundred silent bells drifting on the thermocline.',
      difficulty:1, reward:'15–25c + Relic or Brood', board:'6×6' },
    { id:'eel-choir', name:'Eel-Choir of the Trench', tier:'combat', glyph:'♗',
      flavor:'They sing in frequencies that curdle marrow.',
      difficulty:2, reward:'20–30c + Brood', board:'7×7' },
    { id:'shark-mongers', name:'The Blood-Mongers', tier:'combat', glyph:'♘',
      flavor:'Hammerheads rule their pelagic fief with patient teeth.',
      difficulty:2, reward:'25c + Brood', board:'8×8' },
  ],
  elite: [
    { id:'drowned-duke', name:'The Drowned Duke', tier:'elite', glyph:'♞',
      flavor:'He wears the helms of those he has pulled below.',
      difficulty:3, reward:'45c + Relic', board:'8×8' },
    { id:'iron-widow', name:'The Iron Widow Anemone', tier:'elite', glyph:'♛',
      flavor:'A crowned polyp mourning a king digested centuries past.',
      difficulty:3, reward:'50c + Rare Brood', board:'8×8' },
  ],
  boss: [
    { id:'unseen-tide', name:'The Unseen Tide', tier:'boss', glyph:'♚',
      flavor:'It moves only when the water forgets to.',
      difficulty:5, reward:'100c + Legendary Relic', board:'8×8' },
    { id:'pale-abbess', name:'The Pale Abbess', tier:'boss', glyph:'♕',
      flavor:'Her court is a mausoleum of baleen. Her hymn is not.',
      difficulty:5, reward:'100c + Brood Unlock', board:'8×8' },
  ],
};

Object.assign(window, { GLYPHS, PIECES, CLASSES, RELICS, ENEMIES });
})();
