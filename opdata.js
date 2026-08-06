// Operation Center data — followers, augmentations, evolution, assignments, overseers, trader
(function() {

// ------------------ AUGMENTATION CATEGORIES ------------------
// 5 slots per follower, each accepts only its matching category.
const AUG_SLOTS = [
  { id:'optic',   label:'Optic',   glyph:'◉', color:'oklch(0.75 0.14 195)',
    desc:'Grafted to the ocular chasm. Sharpens sight across the tide.' },
  { id:'neural',  label:'Neural',  glyph:'⌘', color:'oklch(0.65 0.15 290)',
    desc:'Threaded through the ganglion. Alters instinct and calculation.' },
  { id:'blood',   label:'Blood',   glyph:'✢', color:'oklch(0.62 0.18 25)',
    desc:'Brewed into the humor. Changes what the body will endure.' },
  { id:'fin',     label:'Fin',     glyph:'≈', color:'oklch(0.7 0.13 160)',
    desc:'Fused to propulsion. Governs speed and turn of the hunt.' },
  { id:'chassis', label:'Chassis', glyph:'▦', color:'oklch(0.68 0.08 80)',
    desc:'Bolted to the bone-frame. Holds the shape against the deep.' },
];

// ------------------ AUGMENTATIONS ------------------
// Each augmentation is of one slot-type and gives a small modifier.
const AUGMENTATIONS = [
  // Optic
  { id:'a-lantern-eye',    slot:'optic',   name:'Lantern-Eye Graft',    tier:1, cost:{lumin:40}, effect:'+1 vision in darkened nodes.' },
  { id:'a-vitreous-lens',  slot:'optic',   name:'Vitreous Lens',        tier:2, cost:{lumin:85}, effect:'Reveals hidden enemy intent once per turn.' },
  { id:'a-prophet-iris',   slot:'optic',   name:'Prophet-Iris',         tier:3, cost:{lumin:180}, effect:'Sees 2 turns into probable future.' },
  // Neural
  { id:'a-ganglion-knot',  slot:'neural',  name:'Ganglion Knot',        tier:1, cost:{lumin:35}, effect:'+1 action per 5 turns.' },
  { id:'a-oracle-coil',    slot:'neural',  name:'Oracle Coil',          tier:2, cost:{lumin:90}, effect:'First move each battle is free.' },
  { id:'a-chorus-brain',   slot:'neural',  name:'Chorus-Brain',         tier:3, cost:{lumin:200}, effect:'Can issue orders while other pieces move.' },
  // Blood
  { id:'a-brine-humors',   slot:'blood',   name:'Brine Humors',         tier:1, cost:{lumin:30}, effect:'+2 Vigor.' },
  { id:'a-black-ichor',    slot:'blood',   name:'Black Ichor Transfusion', tier:2, cost:{lumin:80}, effect:'Heal 1 Vigor on kill.' },
  { id:'a-hymn-plasma',    slot:'blood',   name:'Hymn-Salted Plasma',   tier:3, cost:{lumin:175}, effect:'Cannot be reduced below 1 Vigor by a single blow.' },
  // Fin
  { id:'a-cartilage-foil', slot:'fin',     name:'Cartilage Foil',       tier:1, cost:{lumin:30}, effect:'+1 range on opening breach.' },
  { id:'a-eel-ribbon',     slot:'fin',     name:'Eel-Ribbon Augment',   tier:2, cost:{lumin:75}, effect:'May turn one corner mid-move.' },
  { id:'a-cavitation-jet', slot:'fin',     name:'Cavitation Jet',       tier:3, cost:{lumin:170}, effect:'Dash through one blocker per battle.' },
  // Chassis
  { id:'a-barnacle-plate', slot:'chassis', name:'Barnacle Plate',       tier:1, cost:{lumin:40}, effect:'-1 damage from pawn-tier strikes.' },
  { id:'a-ossuary-spine',  slot:'chassis', name:'Ossuary Spine',        tier:2, cost:{lumin:85}, effect:'Cannot be pushed off-square.' },
  { id:'a-leviathan-rib',  slot:'chassis', name:'Leviathan-Rib Cage',   tier:3, cost:{lumin:190}, effect:'Once per run, survive a killing blow at 1 Vigor.' },
  // Extras — more variety per slot
  { id:'a-abyssal-pupil',  slot:'optic',   name:'Abyssal Pupil',        tier:1, cost:{lumin:45}, effect:'Sees through ink clouds and smoke squares.' },
  { id:'a-moonstone-eye',  slot:'optic',   name:'Moonstone Eye',        tier:2, cost:{lumin:95}, effect:'+15% crit chance on long-diagonal strikes.' },
  { id:'a-hive-mind',      slot:'neural',  name:'Hive-Mind Fragment',   tier:2, cost:{lumin:80}, effect:'Adjacent allies gain +1 Vigor.' },
  { id:'a-saltwater-lung', slot:'blood',   name:'Saltwater Lung',       tier:1, cost:{lumin:35}, effect:'Immune to drowning hazards.' },
  { id:'a-siren-ichor',    slot:'blood',   name:'Siren Ichor',          tier:2, cost:{lumin:95}, effect:'On kill, charm adjacent enemy for 1 turn.' },
  { id:'a-coral-sail',     slot:'fin',     name:'Coral Sail',           tier:1, cost:{lumin:40}, effect:'+1 move on open water squares.' },
  { id:'a-riptide-tail',   slot:'fin',     name:'Riptide Tail',         tier:3, cost:{lumin:185}, effect:'Drags one adjacent enemy on move.' },
  { id:'a-nacre-shell',    slot:'chassis', name:'Nacre Shell',          tier:1, cost:{lumin:50}, effect:'Reflects first ranged attack per battle.' },
  { id:'a-gravebone-mesh', slot:'chassis', name:'Gravebone Mesh',       tier:2, cost:{lumin:110}, effect:'+1 Vigor per adjacent corpse.' },
];

// ------------------ FOLLOWER ARCHETYPES ------------------
// These are chess-like roles (but more diverse). Each instance on the roster
// is a copy of an archetype with its own name, evo level, and augmentations.
const FOLLOWER_ARCHETYPES = {
  larva: {
    key:'larva', name:'Brood-Larva', role:'Pawn', pieceType:'Pawn', glyph:'♙',
    baseHp:2, baseMove:'1 forward, captures diagonal',
    desc:'The unshaped. Will become whatever the deep demands.',
    color:'oklch(0.62 0.08 145)',
    innate:'On reaching far rank, may evolve into any Tier-1 follower.',
    modifier:'+1 Vigor when adjacent to allied larvae.',
    active:'— None —',
    move:'1 square forward (2 on first move)',
    capture:'1 square forward-diagonal',
  },
  outrider: {
    key:'outrider', name:'Hammerhead Outrider', role:'Knight', pieceType:'Knight', glyph:'♘',
    baseHp:3, baseMove:'L-hop, ignores blockers',
    desc:'Breaches in the blind spot. Smells blood first.',
    color:'oklch(0.68 0.1 195)',
    innate:'Cannot be blocked by intervening pieces.',
    modifier:'First strike each battle deals +1 damage.',
    active:'Blood-Frenzy · After a kill, may move again (1/turn).',
    move:'L-shape (2+1) · range 1 hop',
    capture:'Same as move · L-shape',
  },
  prelate: {
    key:'prelate', name:'Anglerfish Prelate', role:'Bishop', pieceType:'Bishop', glyph:'♗',
    baseHp:3, baseMove:'Any diagonal',
    desc:'Drifts the diagonals, luring with its bioluminescent lure.',
    color:'oklch(0.7 0.12 250)',
    innate:'Lure: enemies on its diagonal cannot retreat.',
    modifier:'+1 range when battle starts in dark squares.',
    active:'Bioluminescent Beacon · Reveal a 3×3 area for 2 turns.',
    move:'Diagonal · unlimited range',
    capture:'Diagonal · unlimited range',
  },
  colossus: {
    key:'colossus', name:'Reef Colossus', role:'Rook', pieceType:'Rook', glyph:'♖',
    baseHp:5, baseMove:'Any orthogonal',
    desc:'Calcified titan. Moves along current-lines.',
    color:'oklch(0.6 0.1 35)',
    innate:'Cannot be pushed off its square.',
    modifier:'+2 Vigor when battle has ≥3 allied pieces alive.',
    active:'Tide-Slam · Knock back all adjacent enemies 1 square.',
    move:'Orthogonal · unlimited range',
    capture:'Orthogonal · unlimited range',
  },
  matriarch: {
    key:'matriarch', name:'Kraken Matriarch', role:'Queen', pieceType:'Queen', glyph:'♕',
    baseHp:5, baseMove:'Any direction, any range',
    desc:'Tentacles part the tide.',
    color:'oklch(0.58 0.14 290)',
    innate:'Strikes hit all enemies in a 1-square arc.',
    modifier:'+1 to all stats while a King is on the board.',
    active:'Vortex-Pull · Drag one ally to an adjacent square.',
    move:'Any direction · unlimited range',
    capture:'Any direction · unlimited range',
  },
  myrmidon: {
    key:'myrmidon', name:'Coral Myrmidon', role:'Rook-variant', pieceType:'Rook', glyph:'♜',
    baseHp:6, baseMove:'Orthogonal, grants ally +1 hide',
    desc:'Pawn-proof bulwark of calcified bone.',
    color:'oklch(0.6 0.09 40)',
    innate:'Adjacent allies gain +1 Vigor.',
    modifier:'Cannot be captured by Pawn-tier on opening turn.',
    active:'Calcify · Make adjacent ally immune for 1 turn.',
    move:'Orthogonal · range 4',
    capture:'Orthogonal · range 4',
  },
  witch: {
    key:'witch', name:'Nautilus Witch', role:'Queen-variant', pieceType:'Queen', glyph:'♛',
    baseHp:4, baseMove:'Any direction. Once: vortex-pull an ally.',
    desc:'She speaks the tide into obedience.',
    color:'oklch(0.6 0.12 310)',
    innate:'Once per battle, swap places with any allied piece.',
    modifier:'+1 movement range when allied King has full Vigor.',
    active:'Tide-Whisper · Charm an enemy Pawn for 2 turns.',
    move:'Any direction · range 5',
    capture:'Any direction · range 5',
  },
};

// ------------------ EVOLUTION TREE (3 tiers linear) ------------------
// Each archetype has 3 linear evolution stages. Stage 0 = base.
const EVOLUTION = {
  larva: [
    { tier:0, name:'Brood-Larva',     cost:null,         effect:'Unshaped hatchling.' },
    { tier:1, name:'Frond-Spawn',     cost:{dna:25},     effect:'+1 HP, +1 move when touching a reef edge.' },
    { tier:2, name:'Gill-Saint',      cost:{dna:80},     effect:'Upon reaching far reef, becomes any Tier-1 follower.' },
    { tier:3, name:'Reef-Seer',       cost:{dna:220},    effect:'All allied larvae in 2 squares gain +1 HP.' },
  ],
  outrider: [
    { tier:0, name:'Hammerhead Outrider', cost:null,     effect:'L-hop base.' },
    { tier:1, name:'Drift-Hunter',        cost:{dna:50}, effect:'+1 L-hop range.' },
    { tier:2, name:'Tiger-Shark Marshal', cost:{dna:140},effect:'On kill, may immediately move again (once per turn).' },
    { tier:3, name:'Megalodon Vanguard',  cost:{dna:320},effect:'Breaches through 1 enemy piece per move.' },
  ],
  prelate: [
    { tier:0, name:'Anglerfish Prelate',  cost:null,     effect:'Diagonal drift.' },
    { tier:1, name:'Lure-Bearer',         cost:{dna:55}, effect:'Adjacent enemies -1 move.' },
    { tier:2, name:'Black Vespers',       cost:{dna:150},effect:'Blinds enemy on entering its diagonal.' },
    { tier:3, name:'Abyssal Confessor',   cost:{dna:340},effect:'Once per battle, may strike without moving.' },
  ],
  colossus: [
    { tier:0, name:'Reef Colossus',       cost:null,     effect:'Orthogonal titan.' },
    { tier:1, name:'Calcified Bastion',   cost:{dna:60}, effect:'+2 HP, grants adjacent ally +1 HP.' },
    { tier:2, name:'Tide-Wall',           cost:{dna:160},effect:'Cannot be pushed. Nullifies one diagonal strike per battle.' },
    { tier:3, name:'Old-Shell Titan',     cost:{dna:360},effect:'On death, leaves a rubble square that blocks movement.' },
  ],
  matriarch: [
    { tier:0, name:'Kraken Matriarch',    cost:null,     effect:'Omni-direction.' },
    { tier:1, name:'Nine-Armed Matron',   cost:{dna:75}, effect:'May strike two adjacent enemies on one move.' },
    { tier:2, name:'Deep-Throne Kraken',  cost:{dna:190},effect:'Grants all allies +1 range within 3 squares.' },
    { tier:3, name:'Elder Dreamer',       cost:{dna:420},effect:'Once per battle: rewind an ally\'s last action.' },
  ],
  myrmidon: [
    { tier:0, name:'Coral Myrmidon',      cost:null,     effect:'Bulwark rook.' },
    { tier:1, name:'Barnacle Legionary',  cost:{dna:65}, effect:'+2 HP. Pawns cannot capture this piece.' },
    { tier:2, name:'Reef-Ossified Guard', cost:{dna:170},effect:'Adjacent allies cannot die to single-blow.' },
    { tier:3, name:'Coral King',          cost:{dna:380},effect:'Grows a calcified square behind it each turn.' },
  ],
  witch: [
    { tier:0, name:'Nautilus Witch',      cost:null,     effect:'Queen path + vortex.' },
    { tier:1, name:'Spiral Oracle',       cost:{dna:80}, effect:'Vortex twice per battle instead of once.' },
    { tier:2, name:'Hymn-Singer',         cost:{dna:200},effect:'Silences one enemy ability per battle.' },
    { tier:3, name:'Pale Abbess',         cost:{dna:440},effect:'May swap places with any ally once per turn.' },
  ],
};

// ------------------ RELICS (Operation Center flavor) ------------------
const OP_RELICS = [
  { id:'r-lantern',    name:'Anglerfish Lantern', glyph:'◉', rarity:'common',    tier:1,
    cost:{coral:35,lumin:10}, desc:'Begin each battle with thy Sovereign\'s flank lit.' },
  { id:'r-chalice',    name:'Chalice of Brine',   glyph:'⚱', rarity:'rare',      tier:2,
    cost:{coral:80,lumin:25}, desc:'Sacrificing a larva grants +4 Refined Coral after battle.' },
  { id:'r-crown',      name:'Barnacle Crown',     glyph:'♔', rarity:'rare',      tier:2,
    cost:{coral:95,lumin:30}, desc:'Evolved larvae may become any minor evolution.' },
  { id:'r-shell',      name:'Whisper-Shell',      glyph:'☗', rarity:'uncommon',  tier:1,
    cost:{coral:55,lumin:15}, desc:'See one foe move ahead on odd turns.' },
  { id:'r-tooth',      name:'Megalodon Tooth',    glyph:'◣', rarity:'legendary', tier:3,
    cost:{coral:200,lumin:80}, desc:'Once per floor: copy a slain foe into thy brood.' },
  { id:'r-sigil',      name:'Trench-Sigil',       glyph:'✠', rarity:'common',    tier:1,
    cost:{coral:40,lumin:12}, desc:'Outriders gain +1 range on opening breach.' },
  { id:'r-pendulum',   name:'Abyssal Pendulum',   glyph:'↯', rarity:'rare',      tier:2,
    cost:{coral:110,lumin:40}, desc:'Slows one enemy piece each battle by 1 rank.' },
  { id:'r-drowned-cross', name:'Cross of the Drowned', glyph:'✟', rarity:'legendary', tier:3,
    cost:{coral:220,lumin:95}, desc:'Once per run: revive a fallen follower at 1 Vigor.' },
];

// ------------------ OVERSEERS ------------------
// NPCs who watch over assignments. Their gaze changes what the mission feels like.
const OVERSEERS = {
  'witness-marrow': {
    id:'witness-marrow', name:'The Witness of Marrow',
    title:'Keeper of the First Drowning',
    flavor:'Older than any brood present. She does not speak; her jaw never was.',
    color:'oklch(0.68 0.06 80)',
    portrait:'witness',
  },
  'choir-below': {
    id:'choir-below', name:'The Choir-Below',
    title:'Seven throats in one throat',
    flavor:'A chorus of drowned seraphim. They grade thy hunt in hymn.',
    color:'oklch(0.6 0.14 290)',
    portrait:'choir',
  },
  'iron-widow': {
    id:'iron-widow', name:'The Iron Widow Anemone',
    title:'Mourner of Swallowed Kings',
    flavor:'She offers her judgment only to those who survive it.',
    color:'oklch(0.6 0.17 25)',
    portrait:'widow',
  },
  'pale-mariner': {
    id:'pale-mariner', name:'The Pale Mariner',
    title:'Cartographer of the Black Trench',
    flavor:'His charts lie. His charts are also the truth.',
    color:'oklch(0.72 0.08 200)',
    portrait:'mariner',
  },
  'drowned-duke': {
    id:'drowned-duke', name:'The Drowned Duke',
    title:'He Who Wears Others\' Helms',
    flavor:'A rival noble. His interest is never a gift.',
    color:'oklch(0.5 0.14 30)',
    portrait:'duke',
  },
};

// ------------------ ASSIGNMENTS (mission briefs) ------------------
// Each has: id, kind(main/side), name, type(objective), location, weather, description,
// overseer, rewards, decision? (if main & locks out alternatives), locksOut?: [ids], palette
const OP_ASSIGNMENTS = [
  {
    id:'as-silt-mouth', kind:'main', name:'The Silted Mouth',
    type:'EXTERMINATE', location:'Karrenhal Estuary · Fathom 120',
    weather:'Turbid · heavy silt bloom · visibility cut by half',
    description:'A herd of Medusa-Fleet has ridden the thermocline into the estuary and will foul the brood-gardens within three tides. Scour them. Leave nothing that might remember us.',
    overseer:'witness-marrow',
    rewards:{coral:60, dna:30, lumin:10, relic:null},
    palette:{top:'oklch(0.24 0.06 190)', bottom:'oklch(0.09 0.025 210)', accent:'oklch(0.72 0.14 195)'},
    map: 0,
    width: 6,
  },
  {
    id:'as-eel-hymn', kind:'main', name:'The Eel-Hymn Gallery',
    type:'ELIMINATE_LEADER', location:'Sunken Nave of Karrenhal · Fathom 400',
    weather:'Still water · harmonic resonance · songs travel unbroken',
    description:'A conductor walks the nave. His hymn rouses the old dead to dance. Find him. End the hymn at its throat.',
    overseer:'choir-below',
    decision:true,
    locksOut:['as-tidebreak'],
    rewards:{coral:120, dna:70, lumin:35, relic:'r-pendulum'},
    palette:{top:'oklch(0.22 0.08 270)', bottom:'oklch(0.08 0.03 280)', accent:'oklch(0.68 0.13 290)'},
    map: 1,
    width: 8,
  },
  {
    id:'as-tidebreak', kind:'main', name:'Tidebreak at the Black Spires',
    type:'SEIZE', location:'Ridge of the Black Spires · Fathom 620',
    weather:'Riptide · counter-current · pieces drift one rank per 3 turns',
    description:'Hold the central spire while the tide turns against thee. The Widow\'s envoy comes to bargain; refuse her and the Spires are thine.',
    overseer:'iron-widow',
    decision:true,
    locksOut:['as-eel-hymn'],
    rewards:{coral:140, dna:55, lumin:45, relic:'r-crown'},
    palette:{top:'oklch(0.24 0.1 30)', bottom:'oklch(0.1 0.04 25)', accent:'oklch(0.68 0.15 25)'},
    map: 1,
    width: 10,
  },
  {
    id:'as-harvest-vein', kind:'side', name:'Coral-Vein Harvest',
    type:'RETRIEVE', location:'Bleached Shelf · Fathom 80',
    weather:'Warm upwelling · bright, sluggish water',
    description:'Veins at the shelf weep Refined Coral for two tides only. Strip them clean before a rival brood catches the scent.',
    overseer:'pale-mariner',
    rewards:{coral:90, dna:10, lumin:20, relic:null},
    palette:{top:'oklch(0.32 0.08 45)', bottom:'oklch(0.12 0.04 40)', accent:'oklch(0.72 0.13 45)'},
    map: 0,
    width: 4,
  },
  {
    id:'as-pale-mariner-charts', kind:'side', name:'The Mariner\'s Chart',
    type:'ESCORT', location:'Glass Corridor · Fathom 240',
    weather:'Clear · cold · unusual stillness',
    description:'The Pale Mariner offers a fragment of chart in exchange for passage through glass corridors no ally has surveyed. Thy body is his shell.',
    overseer:'pale-mariner',
    rewards:{coral:50, dna:45, lumin:55, relic:'r-shell'},
    palette:{top:'oklch(0.26 0.06 210)', bottom:'oklch(0.09 0.02 215)', accent:'oklch(0.75 0.1 200)'},
    map: 0,
    width: 6,
  },
];

// ------------------ TRADER STOCK ------------------
// Three categories: followers (coral), relics (coral+lumin), augmentations (dna+lumin).
// Items are static IDs; UI marks purchased ones.
const TRADER_STOCK = {
  followers: [
    { id:'t-f-larva',      archetype:'larva',     cost:{coral:40},  flavor:'Yet unshaped.' },
    { id:'t-f-larva2',     archetype:'larva',     cost:{coral:40},  flavor:'Yet unshaped.' },
    { id:'t-f-outrider',   archetype:'outrider',  cost:{coral:110}, flavor:'Fresh from the hunt-pens.' },
    { id:'t-f-prelate',    archetype:'prelate',   cost:{coral:120}, flavor:'Lure already lit.' },
    { id:'t-f-colossus',   archetype:'colossus',  cost:{coral:160}, flavor:'Takes three to move her.' },
    { id:'t-f-witch',      archetype:'witch',     cost:{coral:240}, flavor:'Whispers already.' },
  ],
  relics: OP_RELICS.slice(0, 6),
  augmentations: AUGMENTATIONS.slice(0, 10),
};

// ------------------ CLASSIFICATION (species) ------------------
// Pre-assigned to a follower before purchase (a property of the species). Its
// stat rises one level with every evolution: value(tier) = base + growth*tier.
// Each species carries an EFFECT whose magnitude is its classification stat at
// the piece's current evolution.
const CLASSIFICATIONS = [
  { id:'cnidaria',      name:'Cnidaria',       glyph:'❀', color:'oklch(0.70 0.13 330)', stat:'Sting',     base:2, growth:2,
    effect:(v)=>`Adjacent foes suffer ${v} venom at the end of each turn.` },
  { id:'cephalopoda',   name:'Cephalopoda',    glyph:'⊛', color:'oklch(0.62 0.14 290)', stat:'Guile',     base:3, growth:2,
    effect:(v)=>`Allies within 1 square gain ${v}% evasion.` },
  { id:'crustacea',     name:'Crustacea',      glyph:'⊐', color:'oklch(0.64 0.12 40)',  stat:'Carapace',  base:4, growth:2,
    effect:(v)=>`Grants an adjacent ally ${v} Shield at battle start.` },
  { id:'echinodermata', name:'Echinodermata',  glyph:'✸', color:'oklch(0.70 0.12 75)',  stat:'Regrowth',  base:2, growth:3,
    effect:(v)=>`Heals ${v} Vigor to itself or an adjacent ally every other turn.` },
  { id:'chondrichthyes',name:'Chondrichthyes', glyph:'⋀', color:'oklch(0.68 0.10 195)', stat:'Predation', base:3, growth:3,
    effect:(v)=>`Allies striking a wounded foe deal +${v} damage.` },
  { id:'teleostei',     name:'Teleostei',      glyph:'≈', color:'oklch(0.72 0.12 200)', stat:'Agility',   base:3, growth:2,
    effect:(v)=>`Adjacent allies gain +${v} movement points.` },
  { id:'polychaeta',    name:'Polychaeta',     glyph:'∿', color:'oklch(0.66 0.12 150)', stat:'Severance', base:2, growth:2,
    effect:(v)=>`Its captures strip ${v} Shield from the target's neighbours.` },
  { id:'marine-mammal', name:'Marine Mammal',  glyph:'◗', color:'oklch(0.70 0.06 230)', stat:'Resolve',   base:4, growth:3,
    effect:(v)=>`Allies within 2 squares shrug off ${v} turns of Control.` },
  { id:'marine-reptile',name:'Marine Reptile', glyph:'⊙', color:'oklch(0.66 0.10 140)', stat:'Tenacity',  base:4, growth:2,
    effect:(v)=>`Absorbs ${v} damage aimed at an adjacent ally.` },
  { id:'plankton',      name:'Plankton',       glyph:'·', color:'oklch(0.74 0.10 90)',  stat:'Swarm',     base:1, growth:2,
    effect:(v)=>`Breaks line of sight — adjacent allies gain ${v} concealment.` },
];
const classificationById = (id) => CLASSIFICATIONS.find(c => c.id === id) || CLASSIFICATIONS[0];
const classValueAt = (cls, tier) => cls.base + cls.growth * tier;

// Each archetype's species is fixed before purchase.
const ARCHETYPE_CLASS = {
  larva:'plankton', outrider:'chondrichthyes', prelate:'teleostei',
  colossus:'cnidaria', matriarch:'cephalopoda', myrmidon:'crustacea', witch:'cephalopoda',
};
const classificationFor = (archetype) => ARCHETYPE_CLASS[archetype] || 'plankton';

// ------------------ FACET (temperament) ------------------
// Facets come in OPPOSED PAIRS. A specimen is born under one pair (rolled at
// purchase — unknown until bought), and the player commits it to ONE of the
// pair's two sides. Each evolution strengthens the boon and softens the bane.
const FACETS = [
  // ── Regard · how it measures the ones across the board ──
  { id:'contempt',    pair:'regard',   name:'Contempt',    glyph:'⊽', color:'oklch(0.68 0.13 40)',  kind:'good',
    blurb:'Looks down on lesser prey.',
    desc:(t)=>`+${10 + t*5}% accuracy when capturing a LOWER-Rank piece.` },
  { id:'resentment',  pair:'regard',   name:'Resentment',  glyph:'⊼', color:'oklch(0.66 0.15 25)',  kind:'good',
    blurb:'Burns to drag down its betters.',
    desc:(t)=>`+${10 + t*5}% accuracy when capturing a HIGHER-Rank piece.` },

  // ── Dominion · whether it bends others, or is bent ──
  { id:'manipulator', pair:'dominion', name:'Manipulator', glyph:'⟁', color:'oklch(0.66 0.13 300)', kind:'mixed',
    blurb:'Bends others to its will, and resents being bent.',
    desc:(t)=>`+${1 + t} turn when it inflicts Controlled · −${Math.max(0, 1 - t)} turn when Controlled by a foe.` },
  { id:'fool',        pair:'dominion', name:'Fool',        glyph:'⊙', color:'oklch(0.70 0.11 95)',  kind:'mixed',
    blurb:'Too witless to command — too witless to hold.',
    desc:(t)=>`Controlled on this piece ends ${1 + t} turn early · it can never inflict Controlled.` },

  // ── Appetite · what it does with what it carries ──
  { id:'hoarder',     pair:'appetite', name:'Hoarder',     glyph:'◈', color:'oklch(0.72 0.12 80)',  kind:'good',
    blurb:'Covets what it carries.',
    desc:(t)=>`On State None→Carrying Resource: gain ${1 + t} Shield and ${1 + t} move range.` },
  { id:'spender',     pair:'appetite', name:'Spender',     glyph:'◇', color:'oklch(0.70 0.12 150)', kind:'good',
    blurb:'Gives it all away, and is loved for it.',
    desc:(t)=>`On State Carrying Resource→None: allies within 1 square gain ${1 + t} Shield.` },

  // ── Vigil · rooted, or restless ──
  { id:'sentinel',    pair:'vigil',    name:'Sentinel',    glyph:'⊓', color:'oklch(0.66 0.09 210)', kind:'good',
    blurb:'Roots itself and dares the tide.',
    desc:(t)=>`If it did not move last turn, gain ${1 + t} Shield.` },
  { id:'rover',       pair:'vigil',    name:'Rover',       glyph:'⇝', color:'oklch(0.72 0.12 195)', kind:'good',
    blurb:'Never still long enough to be caught.',
    desc:(t)=>`Moving 2+ squares grants +${10 + t*5}% accuracy on its next capture.` },
];

const FACET_PAIRS = [
  { id:'regard',   name:'Regard',   axis:'Scorn the lesser, or the greater',  a:'contempt',    b:'resentment' },
  { id:'dominion', name:'Dominion', axis:'Bend others, or shrug off the bend', a:'manipulator', b:'fool' },
  { id:'appetite', name:'Appetite', axis:'Keep the spoil, or give it away',   a:'hoarder',     b:'spender' },
  { id:'vigil',    name:'Vigil',    axis:'Hold the square, or never rest',    a:'sentinel',    b:'rover' },
];

const facetById     = (id) => FACETS.find(f => f.id === id) || null;
const facetPairById = (id) => FACET_PAIRS.find(p => p.id === id) || null;
const facetsOfPair  = (pair) => pair ? [facetById(pair.a), facetById(pair.b)].filter(Boolean) : [];
const rollFacetPair = () => FACET_PAIRS[Math.floor(Math.random() * FACET_PAIRS.length)].id;

// Which pair a specimen was born under. Falls back to the pair of an already
// chosen facet, then to a stable hash of the instanceId, so followers saved
// before pairs existed still resolve to the same pair every time.
const resolveFacetPair = (follower) => {
  if (!follower) return null;
  if (follower.facetPair) return facetPairById(follower.facetPair);
  const chosen = follower.facet ? facetById(follower.facet) : null;
  if (chosen) return facetPairById(chosen.pair);
  const seed = String(follower.instanceId || '');
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FACET_PAIRS[h % FACET_PAIRS.length];
};

// ------------------ STARTING FOLLOWERS (per class roster) ------------------
function buildStartingRoster(cls) {
  // Use the class's deck to seed a roster of follower instances.
  const deckMap = { P:'larva', N:'outrider', B:'prelate', R:'colossus',
                    Q:'matriarch', S:'myrmidon', W:'witch', K:null };
  let idc = 1;
  const roster = [];
  for (const k of (cls.deck || [])) {
    const archetype = deckMap[k];
    if (!archetype) continue;
    // Random number of aug slots: 0-5 (weighted toward 2-3)
    const slotRoll = Math.random();
    const slotCount = slotRoll < 0.08 ? 0 : slotRoll < 0.22 ? 1 : slotRoll < 0.5 ? 2 : slotRoll < 0.78 ? 3 : slotRoll < 0.93 ? 4 : 5;
    roster.push({
      instanceId: `f-${idc++}`,
      archetype,
      name: generateFollowerName(archetype, idc),
      evoTier: 0,
      augSlotCount: slotCount,
      augments: { optic:null, neural:null, blood:null, fin:null, chassis:null },
      classification: classificationFor(archetype), // species — fixed before purchase
      facetPair: rollFacetPair(),                   // opposed pair rolled per instance
      facet: null,                                  // the side the player commits to
      inPool: false, // deployment pool
    });
  }
  return roster.slice(0, 20);
}

// Generator for fictional follower names
const NAME_PREFIX = ['Morr','Vael','Thren','Olm','Harrow','Nix','Brae','Quel','Sable','Drow','Ossir','Vyr','Palen','Ceth','Orth','Yrn','Marr'];
const NAME_SUFFIX = ['-of-the-Kelp','-IX','-Oath','-Shell','-Salt','-Below','-Unwound','-III','-of-Marrow','-the-Still','-Hymn','-II','-Fin','-Deep','-Lure'];
function generateFollowerName(arch, seed) {
  const a = NAME_PREFIX[(seed*7) % NAME_PREFIX.length];
  const b = NAME_SUFFIX[(seed*13) % NAME_SUFFIX.length];
  return a + b;
}

Object.assign(window, {
  AUG_SLOTS, AUGMENTATIONS, FOLLOWER_ARCHETYPES, EVOLUTION,
  OP_RELICS, OVERSEERS, OP_ASSIGNMENTS, TRADER_STOCK,
  buildStartingRoster, generateFollowerName,
  CLASSIFICATIONS, FACETS, FACET_PAIRS, classificationById, classValueAt,
  classificationFor, facetById, facetPairById, facetsOfPair,
  rollFacetPair, resolveFacetPair,
});
})();
