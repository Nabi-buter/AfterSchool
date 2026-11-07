// Hand-authored pixel maps. '.' = transparent. Letters map to the shared palette
// (overridable per sprite). Everything in the game is drawn from these maps.

export const PAL: Record<string, string> = {
  o: '#14161F', // outline
  w: '#F1EBDD', // ivory
  k: '#2A2D3A', // dark
  g: '#9CA3AF', // gray
  x: '#D8DCE4', // light gray
  r: '#C9563C', // red
  R: '#8E3A2A',
  y: '#E2B94A', // yellow
  Y: '#B08A2E',
  t: '#68B6AA', // teal
  T: '#3E7F76',
  b: '#5B7FB0', // blue
  B: '#2E4466',
  n: '#E69A5A', // orange
  N: '#A8653A',
  p: '#EDE6D3', // paper
  P: '#C9BFA6',
  s: '#F0C9A8', // skin
  e: '#14161F', // eye
  v: '#8A6FB0', // violet
  V: '#4B3A6B',
  l: '#A7C66B', // lime
  L: '#6E8E3E',
  m: '#D9788A', // pink
  M: '#A65464',
  c: '#6C7486', // slate
  C: '#474E5E',
  G: '#2F4A3E', // board green
  H: '#46685A',
  u: '#8B5E3C', // wood
  U: '#5E3D26',
  z: '#C79A4A', // bronze
  Z: '#7C5A2A',
};

export interface PixelMap {
  rows: string[];
  pal?: Record<string, string>;
}

// ───────────────────────── Characters ─────────────────────────
// Base 12x15 chibi. h=hair s=skin t=top b=bottom a=accent d=shoes
const CHAR_HEAD = [
  '....oooo....',
  '..oohhhhoo..',
  '.ohhhhhhhho.',
  '.ohhhhhhhho.',
  '.ohhsssshho.',
  '.ohsessesho.',
  '.ohssssssho.',
  '..osssssso..',
];
const CHAR_BODY = [
  '.otttttttto.',
  'osttttttttso',
  'osttttttttso',
  '.otttttttto.',
  '..obbbbbbo..',
];
const LEGS_A = ['..obboobbo..', '..oddooddo..'];
const LEGS_B = ['..obbooddo..', '..oddo.oo...'];
const LEGS_C = ['..oddoobbo..', '...oo.oddo..'];

export function characterFrames(accessory: string): string[][] {
  const frames = [LEGS_A, LEGS_B, LEGS_A, LEGS_C].map((legs) => {
    const rows = [...CHAR_HEAD, ...CHAR_BODY, ...legs].map((r) => r.split(''));
    const set = (y: number, x: number, ch: string) => {
      if (rows[y] && rows[y][x] !== undefined) rows[y][x] = ch;
    };
    const setRow = (y: number, s: string) => (rows[y] = s.split(''));
    switch (accessory) {
      case 'glasses':
        setRow(5, '.ohkekkekho.');
        break;
      case 'headband':
        setRow(3, '.oaaaaaaaao.');
        set(4, 10, 'a');
        set(5, 11, 'a');
        break;
      case 'goggles':
        setRow(2, '.okaakkaako.');
        setRow(3, '.okaakkaako.');
        break;
      case 'headset':
        setRow(1, '..ooaaaaoo..');
        for (const y of [4, 5, 6]) {
          set(y, 0, 'a');
          set(y, 11, 'a');
        }
        set(7, 1, 'a');
        set(7, 2, 'a');
        break;
      case 'beret':
        setRow(0, '...oaaaao...');
        setRow(1, '..oaaaaaaao.');
        setRow(2, '.ohaaaaaaaho');
        break;
      case 'cap':
        setRow(0, '...oooooo...');
        setRow(1, '..oaaaaaao..');
        setRow(2, '.oaaaaaaaao.');
        setRow(3, '.ohhaaaaaaao');
        break;
      case 'sash':
        set(8, 3, 'a');
        set(9, 4, 'a');
        set(9, 5, 'a');
        set(10, 6, 'a');
        set(10, 7, 'a');
        set(11, 8, 'a');
        break;
      case 'hood':
        for (let y = 1; y <= 3; y++) for (let x = 0; x < 12; x++) if (rows[y][x] === 'h') rows[y][x] = 't';
        for (const y of [4, 5, 6]) {
          set(y, 2, 't');
          set(y, 9, 't');
        }
        set(7, 1, 'o');
        set(7, 10, 'o');
        set(7, 2, 't');
        set(7, 9, 't');
        break;
    }
    return rows.map((r) => r.join(''));
  });
  return frames;
}

// ───────────────────────── Enemies ─────────────────────────
export const ENEMY_MAPS: Record<string, PixelMap> = {
  slime: {
    rows: [
      '...oooooo...',
      '..obbbbbbo..',
      '.obbbbbbbbo.',
      '.obppppppbo.',
      'obpeppppepbo',
      'obppppppppbo',
      'obpppmmpppbo',
      'oBbbbbbbbbBo',
      '.oBBBBBBBBo.',
      '..oooooooo..',
    ],
  },
  slime_mini: {
    rows: ['..ooo..', '.opppo.', 'opepepo', 'opppppo', '.obbbo.', '..ooo..'],
  },
  ghost: {
    rows: [
      '..ooooooo..',
      '.opppppppo.',
      'oppppppppPo',
      'oppepppeppo',
      'opppppppppo',
      'opprrrrpppo',
      'opppppppppo',
      'oprrrprrppo',
      'opppppppppo',
      'oPpppppppPo',
      'oPPoPPPoPPo',
      '.oo.ooo.oo.',
    ],
  },
  worm: {
    rows: ['.oooooooo.', 'owxwwxwweo', 'owxwwxwwwo', '.oooooooo.', '..o..o.o..'],
  },
  eraser: {
    rows: [
      '...oooooooo...',
      '..ommmmmmmmo..',
      '.ommmmmmmmmmo.',
      '.omeemmmmeemo.',
      '.ommmmmmmmmmo.',
      'obbbbbbbbbbbbo',
      'obbwwbbwwbwwbo',
      'obbbbbbbbbbbbo',
      'oMmmmmmmmmmmMo',
      'oMmmmmmmmmmmMo',
      '.oMmmmmmmmmMo.',
      '.ommmo..ommmo.',
      '.oMMMo..oMMMo.',
      '.ooooo..ooooo.',
    ],
  },
  locker: {
    rows: [
      'oooooooooooo',
      'occcccccccco',
      'ocCCCCCCCCco',
      'occcccccccco',
      'ocCCCCCCCCco',
      'occcccccccco',
      'occnccccncco',
      'occcccccccco',
      'owkwkwkwkwko',
      'okkkkrrkkkko',
      'okwkwkwkwkwo',
      'occcccccccco',
      'occccccccyco',
      'occcccccccco',
      'oooooooooooo',
      '.oo......oo.',
    ],
  },
  knight: {
    rows: [
      '.....oo.....',
      '....okko....',
      '....oppo....',
      '...oyyyyo...',
      '...oeyyeo...',
      '...oyyyyo...',
      '..oggggggo..',
      'ommoyyyyyo..',
      'ommoyYyYyo..',
      'ommoyyyyyok.',
      'ommoyYyYyok.',
      '.ooyyyyyyok.',
      '...oyyoyyo..',
      '...oko.oko..',
      '...oo..oo...',
    ],
  },
  zombie: {
    rows: [
      '....oooo....',
      '...ollllo...',
      '..ollllllo..',
      '..oleLLelo..',
      '..olllllLo..',
      '...oLLLLo...',
      '.obbbwwbbbo.',
      'obbbbwwbbbbo',
      'obbbbwwbbbbo',
      'olobbbbbbolo',
      '..obbbbbbo..',
      '..obboobbo..',
      '..owboowbo..',
      '..oBBooBBo..',
      '..okkookko..',
    ],
    pal: { b: '#2E4466', B: '#1F2E47' },
  },
  mimic_hide: {
    rows: [
      '.oooooooooo.',
      'oxxxxxxxxxxo',
      'oxwwxrrxyyxo',
      'oxwwxrrxyyxo',
      'oxxxxxxxxxxo',
      'oxllxxxnnnxo',
      'oxxxxxxxxxxo',
      '.oooooooooo.',
    ],
  },
  mimic: {
    rows: [
      '.oooooooooo.',
      'oxxxxxxxxxxo',
      'oxnxxxxxxnxo',
      'owkwkwkwkwko',
      'okkkkrrkkkko',
      'okwkwkwkwkwo',
      'oxxxxxxxxxxo',
      'oxwwxrrxyyxo',
      '.oooooooooo.',
    ],
  },
  plane: {
    rows: ['oo........', 'opoo......', 'opppoo....', 'oppppppoo.', 'oPPPPPPPPo', 'oPPPoo....', 'ooo.......'],
  },
  wraith: {
    rows: [
      '..oooooooo..',
      '.oGGGGGGGGo.',
      'oGGwGGGGwGGo',
      'oGGwGGGGwGGo',
      'oGGGGGGGGGGo',
      'oGwwwGwGwGGo',
      'oGGGGGGGGGGo',
      'oGGGwwwwGGGo',
      'oHGGGGGGGGHo',
      '.oHGGGGGGHo.',
      '..oHGGGGHo..',
      '...oHGGHo...',
      '....oooo....',
    ],
  },
  bomb: {
    rows: [
      '.oo.....oo.',
      'oyyoooooyyo',
      '.orrrrrrro.',
      'orwwwwwwwro',
      'orwwwkwwwro',
      'orwwwkwwwro',
      'orwwwkkkwro',
      'orwwwwwwwro',
      '.orwwwwwro.',
      '..orrrrro..',
      '.oo.....oo.',
    ],
  },
  ball: {
    rows: [
      '...oooo...',
      '.oonnnnoo.',
      '.onNnnnNno',
      'onnNenNeno',
      'oNNNNNNNNo',
      'onnNnnnNno',
      '.onNnnnNno',
      '.oonnnnoo.',
      '...oooo...',
    ],
  },
  dodgeball: {
    rows: [
      '....oooo....',
      '...oxxxxo...',
      '..oxxxxxxo..',
      '..oxexxexo..',
      '..oxxxxxxo..',
      '...oxxxxo...',
      '.orrrrrrrro.',
      'orrrwwrrrnno',
      'orrrwwrrrnno',
      '.orrrrrrrro.',
      '..orrrrrro..',
      '...oxxxxo...',
      '....oxxo....',
      '.....oo.....',
    ],
  },
  specimen: {
    rows: [
      '....oooo....',
      '...ollllo...',
      '..ollllllo..',
      '.ollwwwwllo.',
      'ollwwkkwwllo',
      '.ollwwwwllo.',
      'ollllllllllo',
      'olLllLllLllo',
      'olllllllllLo',
      '.oLLLLLLLLo.',
      '.o..o..o..o.',
    ],
  },
  monitor: {
    rows: [
      '...ooooooo...',
      '..okkkkkkko..',
      '.okkkkkkkkko.',
      '..oxxxxxxxo..',
      '..oxexxxexo..',
      '..oxxxxxxxo..',
      '...oxxgxxo...',
      '.oBBBBBBBBBo.',
      'oBBBBBBBBBBBo',
      'orrBBBBBBBBBo',
      'oBBBBBBBBBBBo',
      '.oBBBBBBBBBo.',
      '..oBBBBBBBo..',
      '...oBBBBBo...',
      '....oBBBo....',
      '.....ooo.....',
    ],
  },
  nightwraith: {
    rows: [
      '...oooooo...',
      '..oVVVVVVo..',
      '.oVVVVVVVVo.',
      '.oVVnVVnVVo.',
      '.oVVVVVVVVo.',
      '..oVVVVVVo..',
      '.oVVvvvvVVo.',
      'oVVvvvvvvVVo',
      'oVvvvvvvvvVo',
      'oVvvvvvvvvVo',
      '.oVvvvvvvVo.',
      '..oVvvvvVo..',
      '..oVVvvVVo..',
      '...oVVVVo...',
      '....oooo....',
    ],
  },
};

// ───────────────────────── Bosses ─────────────────────────
export const BOSS_MAPS: Record<string, PixelMap> = {
  proctor: {
    rows: [
      '......oooooooo......',
      '.....okkkkkkkko.....',
      '....okkkkkkkkkko....',
      '....okxxxxxxxxko....',
      '....oxwwwxxwwwxo....',
      '....oxwkwxxwkwxo....',
      '....oxxxxxxxxxxo....',
      '.....oxxxRRxxxo.....',
      '......oxxxxxxo......',
      '...occccccccccccco..',
      '..occccwwwwwwcccco..',
      '.occcccwwrrwwccccco.',
      'occcccccwrrwccccccco',
      'ocxxccccccccccccppxo',
      'ocxxccccccccccccppxo',
      'occcccccccccccccppco',
      '.occcccccccccccccco.',
      '..occcccccccccccco..',
      '...okkkkko.okkkkko..',
      '...okkkkko.okkkkko..',
      '...okkkkko.okkkkko..',
      '...oooooooooooooooo.',
    ],
  },
  discipline: {
    rows: [
      '.......oooooo.......',
      '......okkkkkko......',
      '.....okkkkkkkko.....',
      '.....osssssssso.....',
      '.....okkkkkkkko.....',
      '.....okkksskkko.....',
      '.....osssssssso.....',
      '......ossRRsso......',
      '.......osyyso.......',
      '..ooBBBBBByBBBBBBoo.',
      '.oBBBBBBBByBBBBBBBo.',
      'oBBBBwBBBBBBBBwBBBBo',
      'oBBBBwBBBBBBBBwBBBBo',
      'orrrBwBBBBBBBBwBBBBo',
      'orrrBwBBBBBBBBwBBsso',
      'oBBBBwBBBBBBBBwBBsso',
      'osssBBBBBBBBBBBBBuuo',
      '.oooBBBBBBBBBBBBouuo',
      '...oBBBBBooBBBBBouuo',
      '...oBwBBBooBBwBBouuo',
      '...okkkkkooklkkkouuo',
      '...ooooooooooooooooo',
    ],
  },
  golem: {
    rows: [
      '........oooooooo........',
      '......oorrrrrrrroo......',
      '.....orxxxxxxxxxxro.....',
      '.....ooooooooooooo......',
      '.......onnnnnnnno.......',
      '......onnNnnnnNnno......',
      '.....onnnNennNennno.....',
      '.....oNNNNNNNNNNNNo.....',
      '.....onnnNnnnnNnnno.....',
      '..ooo.onnNnnnnNnno.ooo..',
      '.onnno.oonnnnnnoo.onnno.',
      'onNnnNooonnnnnnooonNnnNo',
      'oNNNNNonnNnnnnNnnoNNNNNo',
      'onNnnNonnNnnnnNnnonNnnNo',
      '.onnnoonNNNNNNNNnoonnno.',
      '..ooo.onnNnnnnNnno.ooo..',
      '......onnNnnnnNnno......',
      '.......onnnnnnnno.......',
      '.....oooonnoonnoooo.....',
      '.....onnnno..onnnno.....',
      '.....oNNNNo..oNNNNo.....',
      '.....oooooo..oooooo.....',
    ],
  },
  failed: {
    rows: [
      '.........oooo.........',
      '........oxggxo........',
      '........oxggxo........',
      '.......oxxggxxo.......',
      '.....oollllllllloo....',
      '....ollllllllllllloo..',
      '...ollwwwllllwwwllllo.',
      '..ollwwkwwllwwkwwlllo.',
      '..olllwwwllllwwwlllllo',
      '.olllllllllllllllllllo',
      '.ollLllllwwwwlllllLllo',
      'ollLLllllwkkwlllllLLlo',
      'ollllllllwwwwlllllllo.',
      'olllllLllllllllLlllllo',
      'oLllllllllllllllllllLo',
      '.oLLlllllLLLLllllllLo.',
      '..oLLLLLLLLLLLLLLLLo..',
      '...oo.oo.oooo.oo.oo...',
      '....o..o..oo..o..o....',
    ],
  },
  lastbell: {
    rows: [
      '..........oooo..........',
      '.........ouUUuo.........',
      '..........ouuo..........',
      '.........oooooo.........',
      '.......oozzzzzzoo.......',
      '......ozzzzzzzzzzo......',
      '.....ozzZzzzzzzzzzo.....',
      '.....ozzzzzzzzzzzzo.....',
      '....ozzznnzzzznnzzzo....',
      '....ozzznezzzzenzzzo....',
      '....ozzzzzzzzzzzzzzo....',
      '...ozzzzzzzZzzzzzzzzo...',
      '...ozzzzzzZzzzzzzzzzo...',
      '...ozzzzzzzZZzzzzzzzo...',
      '..ozzzzzzzzzzzzzzzzzzo..',
      '..ozzzzkkkkkkkkkkzzzzo..',
      '.ozzzzkkkkkkkkkkkkzzzzo.',
      '.oZZZZZZZZZZZZZZZZZZZZo.',
      'ozzzzzzzzzzzzzzzzzzzzzzo',
      'oZZZZZZZZZZZZZZZZZZZZZZo',
      '.oooooooooooooooooooooo.',
      '..........onno..........',
      '..........onno..........',
      '...........oo...........',
    ],
  },
};

// ───────────────────────── Pickups ─────────────────────────
export const PICKUP_MAPS: Record<string, PixelMap> = {
  gem1: { rows: ['..o..', '.oto.', 'otwto', 'ottTo', '.oTo.', '..o..'] },
  gem2: { rows: ['..o..', '.obo.', 'obwbo', 'obbBo', '.oBo.', '..o..'] },
  gem3: { rows: ['...o...', '..ono..', '.onwno.', 'onnwnno', '.onnNo.', '..oNo..', '...o...'] },
  coin: { rows: ['.ooooo.', 'oyyyyyo', 'oyYyYyo', 'oyYYYyo', 'oyYyYyo', 'oyyyyyo', '.ooooo.'] },
  food: {
    rows: ['...oo...', '..owwo..', '.owwwwo.', '.owwwwo.', 'owwwwwwo', 'okkkkkko', 'okkkkkko', 'oooooooo'],
  },
  chest: {
    rows: [
      '.oooooooooo.',
      'ouuuuuuuuuuo',
      'ouUUUUUUUUuo',
      'oooooyyooooo',
      'ouuuuyyuuuuo',
      'ouuuuuuuuuuo',
      'ouUUUUUUUUuo',
      'ouuuuuuuuuuo',
      'oooooooooooo',
    ],
  },
  magnet: { rows: ['.oo.oo.', 'orooroo', 'oro.oro', 'oro.oro', 'orroroo', '.orrro.', '..ooo..'] },
};

// ───────────────────────── Icons (10x10) ─────────────────────────
export const ICON_MAPS: Record<string, PixelMap> = {
  chalk: { rows: ['..........', '.......oo.', '......owwo', '.....owwo.', '....owwo..', '...owwo...', '..owwo....', '.owxo.....', '.oxo......', '..o.......'] },
  textbook: { rows: ['..........', '.oooooooo.', '.obbbbbbbo', '.obwwwwwbo', '.obbbbbbbo', '.obwwwbbbo', '.obbbbbbbo', '.oBBBBBBBo', '.oppppppo.', '..oooooo..'] },
  pencil: { rows: ['........o.', '.......oko', '......oyyo', '.....oyyo.', '....oyyo..', '...oyyo...', '..oggo....', '.opgo.....', '.oko......', 'oo........'] },
  compass: { rows: ['....oo....', '...oggo...', '....oo....', '...ogo....', '...ogoo...', '..ogo.og..', '..og..ogo.', '.ogo...og.', '.oko...oko', '..o.....o.'] },
  basketball: { rows: ['...oooo...', '.oonnnnoo.', '.onNnnNno.', 'onnNnnNnno', 'oNNNNNNNNo', 'onnNnnNnno', '.onNnnNno.', '.oonnnnoo.', '...oooo...', '..........'] },
  ink: { rows: ['....oo....', '...okko...', '...okko...', '..okkkko..', '..okkkko..', '.okkkkkko.', '.okkwkkko.', '.okkkkkko.', '..okkkko..', '...oooo...'] },
  paper: { rows: ['..........', '..oooooo..', '.oppppppo.', '.opkkkkpo.', '.oppppppo.', '.oprrkkpo.', '.oppppppo.', '.opkkkppo.', '.oppppppo.', '..oooooo..'] },
  magnet: { rows: ['..........', '.ooo..ooo.', '.oro..oro.', '.oro..oro.', '.oro..oro.', '.orro.oro.', '.orrrrrro.', '..orrrro..', '...oooo...', '..........'] },
  alarm: { rows: ['.oo....oo.', 'oyyooooyyo', '.orrrrrro.', 'orwwwwwwro', 'orwwkwwwro', 'orwwkkwwro', 'orwwwwwwro', '.orrrrrro.', 'oo......oo', '..........'] },
  speaker: { rows: ['..........', '.....oo...', '....oco..o', '.oooocco.o', '.okkocco.o', '.okkocco.o', '.oooocco.o', '....oco..o', '.....oo...', '..........'] },
  cart: { rows: ['..........', '.o........', '.oo.......', '..oxxxxxxo', '..oxwwrwxo', '..oxxxxxxo', '..oxxxxxxo', '..oooooooo', '...oko.oko', '....o...o.'] },
  edict: { rows: ['..........', '.oooooooo.', '.okttttko.', '.oktwwtko.', '.okttttko.', '.oooooooo.', '.occcccco.', '.ocxcxcxo.', '.occcccco.', '.oooooooo.'] },
  // passives
  focus: { rows: ['...oooo...', '..orrrro..', '.orwwwwro.', 'orwrrrrwro', 'orwrkkrwro', 'orwrkkrwro', 'orwrrrrwro', '.orwwwwro.', '..orrrro..', '...oooo...'] },
  agility: { rows: ['..........', '..........', '...ooo....', '..owwwo...', '..owwwooo.', '..owwwwwwo', '.owwwwwwwo', '.ottttttto', '.oooooooo.', '..........'] },
  stamina: { rows: ['..........', '.ooo..ooo.', 'orrro.orro', 'orwrrorrro', 'orrrrrrrro', '.orrrrrro.', '..orrrro..', '...orro...', '....oo....', '..........'] },
  memory: { rows: ['..........', '.oooooooo.', '.obbbbbbo.', '.obwwwwbo.', '.obbbbbbo.', '.obbyybbo.', '.obyyyybo.', '.obbyybbo.', '.oooooooo.', '..........'] },
  creativity: { rows: ['...oooo...', '..oyyyyo..', '.oyywyyyo.', '.oyywyyyo.', '.oyyyyyyo.', '..oyyyyo..', '...oYYo...', '...oggo...', '...oggo...', '....oo....'] },
  timemgmt: { rows: ['.oooooooo.', '.ouuuuuuo.', '..owwwwo..', '...oyyo...', '....oo....', '....oo....', '...oyyo...', '..oyyyyo..', '.ouuuuuuo.', '.oooooooo.'] },
  patience: { rows: ['.oooooooo.', '.obbbbbbo.', '.obwwwwbo.', '.obwbbwbo.', '.obwbbwbo.', '.obbwwbbo.', '..obbbbo..', '..obbbbo..', '...obbo...', '....oo....'] },
  social: { rows: ['..........', '.ooooooo..', '.owwwwwwo.', '.owkwkwko.', '.owwwwwwo.', '..oowoooo.', '....ooxxo.', '....oxkxo.', '.....ooo..', '..........'] },
  luck: { rows: ['..........', '..oo..oo..', '.olloollo.', '.ollllllo.', '..olLLlo..', '.ollLLllo.', '.olloollo.', '..oo.oo...', '....oo....', '...oo.....'] },
  nightstudy: { rows: ['..........', '....ooo...', '...oyyo...', '..oyyo....', '..oyyo....', '..oyyo....', '..oyyyo...', '...oyyyoo.', '....oooo..', '..........'] },
  grit: { rows: ['..........', '...oooo...', '...owwo...', '..obbbbo..', '..obttbo..', '..obttbo..', '..obttbo..', '..obttbo..', '..obbbbo..', '...oooo...'] },
  notes: { rows: ['..........', '.ooooooo..', '.owwwwwwo.', '.okkkkwwo.', '.owwwwwwoo', '.okkkkwoyo', '.owwwwoyo.', '.okkkoyo..', '.owwwoo...', '.ooooo....'] },
  presentation: { rows: ['...oooo...', '..okkkko..', '..okxkko..', '..okkkko..', '..okkkko..', '...oooo...', '....og....', '....og....', '..oooooo..', '..........'] },
  lunch: { rows: ['..........', '..........', '..owwwwo..', '.owwwwwwo.', 'oooooooooo', 'orrrrrrrro', '.orRRRRro.', '..orrrro..', '...oooo...', '..........'] },
  allowance: { rows: ['..........', '...oooo...', '..oyyyyo..', '.oyyYYyyo.', '.oyYyyyyo.', '.oyyYYyyo.', '.oyyyyYyo.', '.oyYYYYyo.', '..oyyyyo..', '...oooo...'] },
};
