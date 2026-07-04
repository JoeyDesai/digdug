// Original pixel art, authored as text maps and rasterized to offscreen
// canvases at load. Right-facing frames are mirrored for left; vertical
// movement rotates the sprite like the arcade did.

const PAL = {
  '.': null,
  W: '#ffffff', K: '#000000', B: '#2044e0', b: '#7090ff',
  R: '#e02020', r: '#ff7050', O: '#ff8c00', Y: '#ffe040',
  G: '#20a020', g: '#70e070', S: '#c0c0c0', P: '#ff90c0',
  T: '#8b4513', t: '#c07840', E: '#f0e0c0', V: '#8020c0',
};

function raster(rows, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = PAL[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

function mirror(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

function rotate(canvas, quarterTurns) {
  const c = document.createElement('canvas');
  c.width = canvas.height; c.height = canvas.width;
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((Math.PI / 2) * quarterTurns);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return c;
}

function scaleUp(canvas, size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, size, size);
  return c;
}

// --- Dig Dug (right-facing) ---
const DIG_WALK_A = [
  '................',
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWBBBBWW....',
  '....WBBBBBBW....',
  '....EEKEEKEE....',
  '....EEEEEEEE....',
  '.....EEPPEE.....',
  '....WWWWWWWW....',
  '...WWBWWWWBWW...',
  '...WBBWWWWBBW...',
  '...WBBWWWWBBW...',
  '....BBWWWWBB....',
  '....BBB..BBB....',
  '....BB....BB....',
  '...KKK....KKK...',
];
const DIG_WALK_B = [
  '................',
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWBBBBWW....',
  '....WBBBBBBW....',
  '....EEKEEKEE....',
  '....EEEEEEEE....',
  '.....EEPPEE.....',
  '....WWWWWWWW....',
  '...WWBWWWWBWW...',
  '...WBBWWWWBBW...',
  '....BBWWWWBB....',
  '....BWWWWWWB....',
  '.....BBBBBB.....',
  '....BB....BB....',
  '..KKK......KKK..',
];
const DIG_PUMP = [
  '................',
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWBBBBWW....',
  '....WBBBBBBW....',
  '....EEKEEKEE....',
  '....EEEEEEEE....',
  '.....EEPPEE.....',
  '...WWWWWWWWWW...',
  '..WWBWWWWWWBWW..',
  '..WBBWWWWWWBBW..',
  '...BBWWWWWWBB...',
  '....BWWWWWWB....',
  '.....BBBBBB.....',
  '....BB....BB....',
  '...KKK....KKK...',
];
const DIG_DEAD = [
  '................',
  '................',
  '......KKKK......',
  '.....KWWWWK.....',
  '....KWWBBWWK....',
  '....KWBBBBWK....',
  '....EEKEEKEE....',
  '....EEEEEEEE....',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WBBWWWWBBW...',
  '....BBWWWWBB....',
  '.....BBBBBB.....',
  '....BB....BB....',
  '...KK......KK...',
  '................',
];

// --- Pooka: round red creature, yellow goggles ---
const POOKA_A = [
  '................',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '...RRYYRRYYRR...',
  '...RYYKYYYKYR...',
  '...RRYYRRYYRR...',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '..RRWWRRRRWWRR..',
  '..RRRRRRRRRRRR..',
  '...RRRRRRRRRR...',
  '...RRRRRRRRRR...',
  '....RR.RR.RR....',
  '....RR.RR.RR....',
  '................',
];
const POOKA_B = [
  '................',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '...RRYYRRYYRR...',
  '...RYYKYYYKYR...',
  '...RRYYRRYYRR...',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '..RRWWRRRRWWRR..',
  '..RRRRRRRRRRRR..',
  '...RRRRRRRRRR...',
  '...RRRRRRRRRR...',
  '...RR..RR..RR...',
  '..RR...RR...RR..',
  '................',
];
const POOKA_GHOST_A = [
  '................',
  '................',
  '................',
  '....YY....YY....',
  '...YYYY..YYYY...',
  '...YKKY..YKKY...',
  '...YKKY..YKKY...',
  '...YYYY..YYYY...',
  '....YY....YY....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const POOKA_GHOST_B = [
  '................',
  '................',
  '................',
  '....YY....YY....',
  '...YYYY..YYYY...',
  '...YKKY..YKKY...',
  '...YYKY..YYKY...',
  '...YYYY..YYYY...',
  '....YY....YY....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const POOKA_BALLOON = [
  '................',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '..RRYYRRRRYYRR..',
  '..RYYKYRRYKYYR..',
  '..RRYYRRRRYYRR..',
  '.RRRRRRRRRRRRRR.',
  '.RRRRRRRRRRRRRR.',
  '.RRWWRRRRRRWWRR.',
  '.RRRRRRRRRRRRRR.',
  '..RRRRRRRRRRRR..',
  '..RRRRRRRRRRRR..',
  '...RRRRRRRRRR...',
  '....RRRRRRRR....',
  '................',
];

// --- Fygar: green dragon ---
const FYGAR_A = [
  '................',
  '....GGGGGG......',
  '...GGGGGGGG.....',
  '..GGWWGGWWGG....',
  '..GWKWGGWKWG....',
  '..GGWWGGWWGGRR..',
  '..GGGGGGGGGGRR..',
  '..GGGGGGGGGG....',
  '.GGgGGgGGgGGG...',
  '.GGGGGGGGGGGG...',
  '.GGgGGgGGgGG....',
  '..GGGGGGGGGG....',
  '..GGGGGGGGG.....',
  '...GG.GG.GG.....',
  '...GG.GG.GG.....',
  '................',
];
const FYGAR_B = [
  '................',
  '....GGGGGG......',
  '...GGGGGGGG.....',
  '..GGWWGGWWGG....',
  '..GWKWGGWKWG....',
  '..GGWWGGWWGG....',
  '..GGGGGGGGGGRR..',
  '..GGGGGGGGGGRR..',
  '.GGgGGgGGgGGG...',
  '.GGGGGGGGGGGG...',
  '.GGgGGgGGgGG....',
  '..GGGGGGGGGG....',
  '..GGGGGGGGG.....',
  '..GG..GG..GG....',
  '.GG...GG...GG...',
  '................',
];
const FYGAR_GHOST_A = [
  '................',
  '................',
  '................',
  '....WW....WW....',
  '...WWWW..WWWW...',
  '...WKKW..WKKW...',
  '...WKKW..WKKW...',
  '...WWWW..WWWW...',
  '....WW....WW....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const FYGAR_BALLOON = [
  '................',
  '....GGGGGGGG....',
  '...GGGGGGGGGG...',
  '..GGWWGGGGWWGG..',
  '..GWKWGGGGWKWG..',
  '..GGWWGGGGWWGG..',
  '.GGGGGGGGGGGGGG.',
  '.GGGGGGGGGGGGGG.',
  '.GGgGGgGGgGGgGG.',
  '.GGGGGGGGGGGGGG.',
  '.GGgGGgGGgGGgGG.',
  '..GGGGGGGGGGGG..',
  '..GGGGGGGGGGGG..',
  '...GGGGGGGGGG...',
  '....GGGGGGGG....',
  '................',
];
const FLAME_NEAR = [
  '........',
  '..YY....',
  '.YRRY...',
  'YRRRRY..',
  'YRRRRY..',
  '.YRRY...',
  '..YY....',
  '........',
];
const FLAME_FAR = [
  '........',
  '.YYYY...',
  'YRRRRYY.',
  'YRRRRRRY',
  'YRRRRRRY',
  'YRRRRYY.',
  '.YYYY...',
  '........',
];

// --- Rock ---
const ROCK = [
  '................',
  '.....TTTTTT.....',
  '...TTttttttTT...',
  '..TttttttttttT..',
  '..TtttTTttttttT.',
  '.TttTTtttttttT..',
  '.TtttttttTTttT..',
  '.TttttttttttttT.',
  '.TttTTttttttttT.',
  '.TtttttttTTtttT.',
  '..TtttttttttttT.',
  '..TttttttttttT..',
  '...TTttttttTT...',
  '.....TTTTTT.....',
  '................',
  '................',
];
const ROCK_CRUMBLE = [
  '................',
  '................',
  '...TT......TT...',
  '..Tttt....tttT..',
  '...TT..TT..TT...',
  '......Tttt......',
  '..TT...TT...TT..',
  '.Tttt......tttT.',
  '..TT...TT...TT..',
  '......Tttt......',
  '...TT..TT..TT...',
  '..Tttt....tttT..',
  '...TT......TT...',
  '................',
  '................',
  '................',
];

// --- Vegetables (simple 16x16 icons) ---
const VEG = {
  carrot: [
    '................',
    '......GG.gg.....',
    '.....GGgGG......',
    '......OOOO......',
    '.....OOOOOO.....',
    '.....OOOOOO.....',
    '......OOOO......',
    '......OOOO......',
    '.......OO.......',
    '.......OO.......',
    '......OO........',
    '......OO........',
    '.....OO.........',
    '.....O..........',
    '................',
    '................',
  ],
  turnip: [
    '................',
    '......gGGg......',
    '.......GG.......',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '...WWWWWWWWWW...',
    '...WWWWWWWWWW...',
    '...VWWWWWWWWV...',
    '...VVWWWWWWVV...',
    '....VVWWWWVV....',
    '.....VVWWVV.....',
    '......VVVV......',
    '.......VV.......',
    '................',
    '................',
    '................',
  ],
  mushroom: [
    '................',
    '.....RRRRRR.....',
    '....RRWWRRRR....',
    '...RRWWRRRRRR...',
    '...RRRRRRWWRR...',
    '...RRRRRRWWRR...',
    '...RRRRRRRRRR...',
    '.....EEEEEE.....',
    '.....EEEEEE.....',
    '.....EEEEEE.....',
    '.....EEEEEE.....',
    '......EEEE......',
    '................',
    '................',
    '................',
    '................',
  ],
  cucumber: [
    '................',
    '................',
    '................',
    '..gG............',
    '...GGGG.........',
    '....GGGGGG......',
    '.....GGGGGGGG...',
    '......GGGGGGGG..',
    '.......GGGGGGG..',
    '........GGGGG...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  eggplant: [
    '................',
    '......gGg.......',
    '.......G........',
    '......VVVV......',
    '.....VVVVVV.....',
    '....VVVVVVVV....',
    '....VVVVVVVV....',
    '....VVVVVVVV....',
    '....VVVVVVVV....',
    '.....VVVVVV.....',
    '......VVVV......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  pepper: [
    '................',
    '......gG........',
    '.......G........',
    '.....GGGGG......',
    '....GGGGGGG.....',
    '....GGGGGGG.....',
    '....GGGGGGG.....',
    '....GGGGGGG.....',
    '....GGGGGGG.....',
    '.....GGGGG......',
    '......GGG.......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  tomato: [
    '................',
    '......gGg.......',
    '.....gGGGg......',
    '....RRRRRRRR....',
    '...RRRRRRRRRR...',
    '...RRRRRRRRRR...',
    '...RRRRRRRRRR...',
    '...RRRRRRRRRR...',
    '....RRRRRRRR....',
    '.....RRRRRR.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  garlic: [
    '................',
    '.......gg.......',
    '......WWW.......',
    '.....WWWWW......',
    '....WWWWWWW.....',
    '...WWWWWWWWW....',
    '...WWWWWWWWW....',
    '...WWWWWWWWW....',
    '...WWWWWWWWW....',
    '....WWWWWWW.....',
    '.....WWWWW......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  watermelon: [
    '................',
    '.....KKKKKK.....',
    '....KGGGGGGK....',
    '...KGGgGGgGGK...',
    '...KGGGGGGGGK...',
    '..KGgGGgGGgGGK..',
    '..KGGGGGGGGGGK..',
    '..KGgGGgGGgGGK..',
    '...KGGGGGGGGK...',
    '...KGGgGGgGGK...',
    '....KGGGGGGK....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
    '................',
  ],
  flagship: [
    '................',
    '.......YY.......',
    '......YYYY......',
    '.....RYYYYR.....',
    '.....RYYYYR.....',
    '....RRYYYYRR....',
    '...WRRYYYYRRW...',
    '...WWRYYYYRWW...',
    '...WWRRYYRRWW...',
    '...W..RYYR..W...',
    '......RYYR......',
    '.......RR.......',
    '................',
    '................',
    '................',
    '................',
  ],
  pineapple: [
    '................',
    '.....g.gg.g.....',
    '......gggg......',
    '.....gggggg.....',
    '.....YYYYYY.....',
    '....YtYYtYYY....',
    '....YYtYYtYY....',
    '....YtYYtYYY....',
    '....YYtYYtYY....',
    '....YtYYtYYY....',
    '.....YYYYYY.....',
    '......YYYY......',
    '................',
    '................',
    '................',
    '................',
  ],
};

const FLOWER = [
  '........',
  '..YYY...',
  '.YRRRY..',
  '.YRWRY..',
  '.YRRRY..',
  '..YYY...',
  '...G....',
  '..GG....',
];

export function buildSprites() {
  const S = {};
  const r = raster;

  S.digWalk = [r(DIG_WALK_A), r(DIG_WALK_B)];
  S.digWalkL = S.digWalk.map(mirror);
  S.digWalkU = S.digWalk.map((f) => rotate(f, 3));
  S.digWalkD = S.digWalk.map((f) => rotate(f, 1));
  S.digPump = r(DIG_PUMP);
  S.digPumpL = mirror(S.digPump);
  S.digPumpU = rotate(S.digPump, 3);
  S.digPumpD = rotate(S.digPump, 1);
  S.digDead = r(DIG_DEAD);

  S.pooka = [r(POOKA_A), r(POOKA_B)];
  S.pookaGhost = [r(POOKA_GHOST_A), r(POOKA_GHOST_B)];
  const pb = r(POOKA_BALLOON);
  S.pookaInflate = [scaleUp(pb, 20), scaleUp(pb, 26), scaleUp(pb, 32)];

  S.fygar = [r(FYGAR_A), r(FYGAR_B)];
  S.fygarL = S.fygar.map(mirror);
  S.fygarGhost = [r(FYGAR_GHOST_A), mirror(r(FYGAR_GHOST_A))];
  const fb = r(FYGAR_BALLOON);
  S.fygarInflate = [scaleUp(fb, 20), scaleUp(fb, 26), scaleUp(fb, 32)];
  S.flame = [r(FLAME_NEAR, 2), r(FLAME_FAR, 2)];
  S.flameL = S.flame.map(mirror);

  S.rock = r(ROCK);
  S.rockCrumble = r(ROCK_CRUMBLE);
  S.veg = {};
  for (const [k, v] of Object.entries(VEG)) S.veg[k] = r(v);
  S.flower = r(FLOWER);
  return S;
}
