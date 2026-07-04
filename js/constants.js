// Core tuning constants. Values follow the 1982 arcade original where known
// (224x288 portrait, 16px sprites on a 14-wide grid, depth-banded scoring).

export const CANVAS_W = 224;
export const CANVAS_H = 288;
export const TILE = 16;

// Verified against the arcade: 224x288 portrait, 14 columns, 1 surface lane +
// 14 underground rows (y48..271), dirt bands split 3/4/4/3.
export const GRID_W = 14;          // columns
export const GRID_H = 16;          // rows (0 = sky, 1 = surface lane, 2..15 dirt)
export const FIELD_Y = 16;         // playfield top (below score HUD)
export const SURFACE_ROW = 1;      // walkable above-ground row
export const DIRT_TOP_ROW = 2;     // first dirt row

// Four dirt bands (3/4/4/3 rows, arcade-measured). Depth layer for scoring.
export const BANDS = [
  { rows: [2, 4] },
  { rows: [5, 8] },
  { rows: [9, 12] },
  { rows: [13, 15] },
];
export function depthLayer(row) {
  for (let i = 0; i < BANDS.length; i++) {
    if (row >= BANDS[i].rows[0] && row <= BANDS[i].rows[1]) return i;
  }
  return row < 2 ? -1 : 3;
}

// Speeds (pixels per second). Arcade: Pooka slightly faster than Dig Dug,
// Fygar slower; digging ~75% of walking; ghosts drift slowly.
export const SPEED = {
  playerTunnel: 60,
  playerDig: 46,
  pooka: 56,
  fygar: 46,
  enemyFast: 72,          // last-enemy flee / hurry-up speedup
  ghost: 26,
  rockFall: 150,
  pumpShot: 320,          // harpoon line extension
};

// Pump: ~2-cell range, 3 inflation stages, 4th press pops. Deflation is
// ~1 stage/second after a short hold; inflated enemies are frozen+harmless.
export const PUMP_RANGE = 2 * TILE + 6;
export const PUMP_STAGES = 4;
export const DEFLATE_HOLD_MS = 900;
export const DEFLATE_STAGE_MS = 1000;

// Rocks: ~1s wobble warning before the drop.
export const ROCK_SHAKE_MS = 1000;
export const ROCK_CRUMBLE_MS = 500;

// Hurry-up: after this long in a round, enemies speed up and music quickens.
export const HURRY_MS = 45000;

// Ghost mode timing (ms). First eligibility per enemy, shrinks by round.
export const GHOST_MIN_MS = 1400;
export function ghostDelay(round, isFygar) {
  const base = (isFygar ? 11000 : 8000) - round * 400;
  return Math.max(3200, base) + Math.random() * 3000;
}

// Fygar fire
export const FIRE_CHARGE_MS = 600;
export const FIRE_ACTIVE_MS = 700;
export const FIRE_COOLDOWN_MS = 3200;
export const FIRE_RANGE_TILES = 2;

// Scoring
export const SCORE_DIG = 10;
export const POOKA_SCORE = [200, 300, 400, 500];             // by depth layer
export const FYGAR_SCORE_V = [200, 300, 400, 500];
export const FYGAR_SCORE_H = [400, 600, 800, 1000];          // horizontal kill = 2x
export const ROCK_SCORE = [1000, 2500, 4000, 6000, 8000, 10000, 12000, 15000];
export const EXTEND_FIRST = 10000;
export const EXTEND_EVERY = 40000;

// Bonus vegetables by round (spawn at center after 2nd rock drops)
export const VEGGIES = [
  { name: 'carrot', score: 400, rounds: [1, 1] },
  { name: 'turnip', score: 600, rounds: [2, 2] },
  { name: 'mushroom', score: 800, rounds: [3, 3] },
  { name: 'cucumber', score: 1000, rounds: [4, 5] },
  { name: 'eggplant', score: 2000, rounds: [6, 7] },
  { name: 'pepper', score: 3000, rounds: [8, 9] },
  { name: 'tomato', score: 4000, rounds: [10, 11] },
  { name: 'garlic', score: 5000, rounds: [12, 13] },
  { name: 'watermelon', score: 6000, rounds: [14, 15] },
  { name: 'flagship', score: 7000, rounds: [16, 17] },
  { name: 'pineapple', score: 8000, rounds: [18, 99] },
];
export function veggieForRound(round) {
  return VEGGIES.find((v) => round >= v.rounds[0] && round <= v.rounds[1]) ||
    VEGGIES[VEGGIES.length - 1];
}
export const VEGGIE_LIFETIME_MS = 10000;

// Palette (dirt band fills measured from the arcade's round-1 screen)
export const COLORS = {
  sky: '#000097',
  band: ['#ffb800', '#de6800', '#b82100', '#970000'],
  bandDivider: ['#dede00', '#ffb800', '#de6800', '#b82100'],
  hudText: '#ffffff',
  score: '#ff2020',
  tunnel: '#000000',
};

export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
export function opposite(d) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[d];
}
