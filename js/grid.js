// Dirt model: a coarse logic grid (edge-connectivity per cell) paired with an
// offscreen pixel canvas that gets erased with rounded capsule stamps as the
// player digs. The pixels are the visuals; the grid drives AI, rocks, and the
// pump. This mirrors how the arcade faked smooth digging with pre-eaten
// character tiles.

import {
  CANVAS_W, CANVAS_H, TILE, GRID_W, GRID_H, FIELD_Y, DIRT_TOP_ROW,
  SURFACE_ROW, BANDS, COLORS, DIRS, opposite,
} from './constants.js';

const EDGE_BIT = { up: 1, right: 2, down: 4, left: 8 };

export class DirtGrid {
  constructor() {
    // Per cell: edge bitmask (dug-through edges) + carvedCenter flag.
    this.edges = new Uint8Array(GRID_W * GRID_H);
    this.carved = new Uint8Array(GRID_W * GRID_H);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext('2d');
    this.paintDirt();

    // Sky + surface rows are open air.
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y <= SURFACE_ROW; y++) {
        this.edges[y * GRID_W + x] = 15;
        this.carved[y * GRID_W + x] = 1;
      }
    }
  }

  paintDirt() {
    const c = this.ctx;
    c.clearRect(0, 0, CANVAS_W, CANVAS_H);
    BANDS.forEach((band, i) => {
      const y0 = FIELD_Y + band.rows[0] * TILE;
      const y1 = FIELD_Y + (band.rows[1] + 1) * TILE;
      c.fillStyle = COLORS.band[i];
      c.fillRect(0, y0, CANVAS_W, y1 - y0);
      // Arcade dirt: a 1px divider line every 16px in the layer-above color,
      // plus a light speckle texture.
      c.fillStyle = COLORS.bandDivider[i];
      for (let y = y0; y < y1; y += TILE) c.fillRect(0, y, CANVAS_W, 1);
      let seed = 1234 + i * 999;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 300; k++) {
        c.fillRect((rnd() * CANVAS_W) | 0, y0 + ((rnd() * (y1 - y0)) | 0), 1, 1);
      }
    });
    // 8px lip of layer-1 dirt above the first tunnel row.
    c.fillStyle = COLORS.band[0];
    c.fillRect(0, FIELD_Y + BANDS[0].rows[0] * TILE - 8, CANVAS_W, 8);
  }

  idx(x, y) { return y * GRID_W + x; }
  inField(x, y) { return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H; }

  hasEdge(x, y, dir) {
    if (!this.inField(x, y)) return false;
    return (this.edges[this.idx(x, y)] & EDGE_BIT[dir]) !== 0;
  }

  isCarved(x, y) {
    if (!this.inField(x, y)) return false;
    return this.carved[this.idx(x, y)] === 1;
  }

  // Can an entity move from cell (x,y) one step in dir? Ghosts pass anything.
  canMove(x, y, dir, ghost = false) {
    const d = DIRS[dir];
    const nx = x + d.dx, ny = y + d.dy;
    if (!this.inField(nx, ny)) return false;
    if (ny < SURFACE_ROW) return false;                 // nobody flies into the sky
    if (ghost) return true;
    return this.hasEdge(x, y, dir) && this.hasEdge(nx, ny, opposite(dir));
  }

  openEdge(x, y, dir) {
    if (!this.inField(x, y)) return;
    this.edges[this.idx(x, y)] |= EDGE_BIT[dir];
    const d = DIRS[dir];
    const nx = x + d.dx, ny = y + d.dy;
    if (this.inField(nx, ny)) this.edges[this.idx(nx, ny)] |= EDGE_BIT[opposite(dir)];
  }

  carveCenter(x, y) {
    if (!this.inField(x, y)) return false;
    const i = this.idx(x, y);
    if (this.carved[i]) return false;
    this.carved[i] = 1;
    return true;
  }

  // Erase a capsule along the segment (px0,py0)->(px1,py1) in canvas pixels.
  // radius ~7 gives the arcade's near-tile-wide rounded tunnels.
  erase(px0, py0, px1, py1, radius = 7) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.lineCap = 'round';
    c.lineWidth = radius * 2;
    c.beginPath();
    c.moveTo(px0, py0);
    c.lineTo(px1 + 0.01, py1 + 0.01);
    c.stroke();
    c.restore();
  }

  // Pre-carve a straight tunnel between two cells (inclusive), opening edges.
  carveTunnel(x0, y0, x1, y1) {
    const cx = (x) => x * TILE + TILE / 2;
    const cy = (y) => FIELD_Y + y * TILE + TILE / 2;
    this.erase(cx(x0), cy(y0), cx(x1), cy(y1));
    const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    this.carveCenter(x, y);
    while (x !== x1 || y !== y1) {
      const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      this.openEdge(x, y, dir);
      x += dx; y += dy;
      this.carveCenter(x, y);
    }
  }

  draw(ctx) {
    // Sky strip
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, FIELD_Y, CANVAS_W, DIRT_TOP_ROW * TILE);
    ctx.drawImage(this.canvas, 0, 0);
  }
}
