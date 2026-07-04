// Entities: Player, Pump (harpoon), Enemies (Pooka/Fygar), Rock, Fire, Veggie.
// All positions are canvas pixels at the entity center. Cell = 16px logic grid.

import {
  TILE, GRID_W, GRID_H, FIELD_Y, SURFACE_ROW, CANVAS_W,
  SPEED, DIRS, opposite, depthLayer,
  PUMP_RANGE, PUMP_STAGES, DEFLATE_HOLD_MS, DEFLATE_STAGE_MS,
  ROCK_SHAKE_MS, ROCK_CRUMBLE_MS, ROCK_RELEASE_MS,
  GHOST_MIN_MS, ghostDelay,
  FIRE_CHARGE_MS, FIRE_ACTIVE_MS, FIRE_COOLDOWN_MS, FIRE_RANGE_TILES,
} from './constants.js';

export const cellX = (px) => Math.floor(px / TILE);
export const cellY = (py) => Math.floor((py - FIELD_Y) / TILE);
export const centerX = (cx) => cx * TILE + TILE / 2;
export const centerY = (cy) => FIELD_Y + cy * TILE + TILE / 2;

function alignToAxis(v, center, speed, dt) {
  // Slide toward the tunnel centerline on the perpendicular axis.
  const d = center - v;
  const step = speed * dt;
  return Math.abs(d) <= step ? center : v + Math.sign(d) * step;
}

// ---------------------------------------------------------------- Player
export class Player {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.x = centerX(Math.floor(GRID_W / 2));
    this.y = centerY(SURFACE_ROW);
    this.dir = 'left';
    this.moving = false;
    this.digging = false;
    this.animT = 0;
    this.dead = false;
    this.deathT = 0;
    this.crushed = false;
  }

  get cx() { return cellX(this.x); }
  get cy() { return cellY(this.y); }

  update(dt, input) {
    if (this.dead) { this.deathT += dt * 1000; return; }

    const pump = this.g.pump;
    if (pump.active) {
      // Firing roots you in place. Any movement key cancels the pump.
      if (input.dir) pump.release();
      else { this.moving = false; return; }
    }

    const want = input.dir;
    this.moving = false;
    this.digging = false;
    if (!want) return;

    const grid = this.g.grid;
    const speedGhostWall = this.wouldDig(want) ? SPEED.playerDig : SPEED.playerTunnel;
    const step = speedGhostWall * dt;
    const cx = this.cx, cy = this.cy;
    const ccx = centerX(cx), ccy = centerY(cy);

    let nx = this.x, ny = this.y;
    if (want === 'left' || want === 'right') {
      // Must be near the row centerline to move horizontally.
      if (Math.abs(this.y - ccy) > 0.5) {
        ny = alignToAxis(this.y, ccy, speedGhostWall, dt);
        this.dir = this.y > ccy ? 'up' : 'down';
        this.moving = true;
      } else {
        ny = ccy;
        const s = want === 'left' ? -step : step;
        nx = this.x + s;
        // Field bounds (surface row lets you walk full width)
        nx = Math.max(TILE / 2, Math.min(CANVAS_W - TILE / 2, nx));
        this.dir = want;
        this.moving = nx !== this.x;
      }
    } else {
      if (Math.abs(this.x - ccx) > 0.5) {
        nx = alignToAxis(this.x, ccx, speedGhostWall, dt);
        this.dir = this.x > ccx ? 'left' : 'right';
        this.moving = true;
      } else {
        nx = ccx;
        const s = want === 'up' ? -step : step;
        ny = this.y + s;
        const minY = centerY(SURFACE_ROW);
        const maxY = centerY(GRID_H - 1);
        ny = Math.max(minY, Math.min(maxY, ny));
        this.dir = want;
        this.moving = ny !== this.y;
      }
    }

    // Rocks block the player.
    for (const r of this.g.rocks) {
      if (r.state === 'idle' || r.state === 'shaking') {
        if (Math.abs(nx - r.x) < TILE - 2 && Math.abs(ny - r.y) < TILE - 2) {
          return; // blocked
        }
      }
    }

    if (this.moving) {
      // Dig: erase pixels along the movement path, open cell edges as we
      // cross boundaries, and score dirt.
      const wasDirt = !grid.isCarved(cellX(nx), cellY(ny));
      grid.erase(this.x, this.y, nx, ny);
      this.digging = wasDirt;
      const ncx = cellX(nx), ncy = cellY(ny);
      if (ncx !== cx || ncy !== cy) {
        grid.openEdge(cx, cy, this.dir);
      }
      if (grid.carveCenter(ncx, ncy)) this.g.onDig(ncy);
      this.x = nx; this.y = ny;
      this.animT += dt * (this.digging ? 8 : 10);
    }
  }

  wouldDig(dir) {
    const d = DIRS[dir];
    return !this.g.grid.isCarved(this.cx + d.dx, this.cy + d.dy) ||
      !this.g.grid.hasEdge(this.cx, this.cy, dir);
  }

  die(crushed = false) {
    if (this.dead) return;
    this.dead = true;
    this.crushed = crushed;
    this.deathT = 0;
    this.g.onPlayerDeath();
  }

  draw(ctx, S) {
    if (this.dead) {
      ctx.drawImage(S.digDead, this.x - 8, this.y - 8);
      return;
    }
    const f = Math.floor(this.animT) % 2;
    let img;
    if (this.g.pump.active) {
      img = { left: S.digPumpL, right: S.digPump, up: S.digPumpU, down: S.digPumpD }[this.dir];
    } else {
      img = {
        left: S.digWalkL[f], right: S.digWalk[f],
        up: S.digWalkU[f], down: S.digWalkD[f],
      }[this.dir];
    }
    ctx.drawImage(img, Math.round(this.x - 8), Math.round(this.y - 8));
  }
}

// ---------------------------------------------------------------- Pump
export class Pump {
  constructor(game) {
    this.g = game;
    this.active = false;
    this.len = 0;
    this.dir = 'right';
    this.target = null;     // latched enemy
  }

  fire() {
    const p = this.g.player;
    if (this.target) {
      // Already latched: each press = one more inflation stage.
      this.target.inflate();
      return;
    }
    if (!this.active) {
      this.active = true;
      this.len = 0;
      this.dir = p.dir;
      this.ox = p.x; this.oy = p.y;
      this.g.audio.sfx('pumpShot');
    }
  }

  release() {
    this.active = false;
    this.len = 0;
    if (this.target) { this.target.unlatch(); this.target = null; }
  }

  update(dt) {
    if (!this.active || this.target) return;
    this.len += SPEED.pumpShot * dt;
    const d = DIRS[this.dir];
    const tipX = this.ox + d.dx * this.len;
    const tipY = this.oy + d.dy * this.len;

    // Stop at max range or dirt.
    const tc = { x: cellX(tipX), y: cellY(tipY) };
    if (this.len >= PUMP_RANGE || !this.g.grid.isCarved(tc.x, tc.y)) {
      this.release();
      return;
    }
    // Hit an enemy? Ghosts are pumpable too while over an open tunnel
    // (the arcade lets you catch eyes crossing your tunnel).
    for (const e of this.g.enemies) {
      if (e.dead || e.state === 'popped') continue;
      if (e.ghost && !this.g.grid.isCarved(e.cx, e.cy)) continue;
      if (Math.abs(tipX - e.x) < 10 && Math.abs(tipY - e.y) < 10) {
        this.target = e;
        e.latch();
        e.inflate();
        return;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const d = DIRS[this.dir];
    const p = this.g.player;
    let endX, endY;
    if (this.target) {
      endX = this.target.x; endY = this.target.y;
    } else {
      endX = this.ox + d.dx * this.len; endY = this.oy + d.dy * this.len;
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + d.dx * 6, p.y + d.dy * 6);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    if (!this.target) {
      // Harpoon tip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(endX - 2, endY - 2, 4, 4);
    }
  }
}

// ---------------------------------------------------------------- Enemy
export class Enemy {
  constructor(game, cx, cy, type, round) {
    this.g = game;
    this.type = type;               // 'pooka' | 'fygar'
    this.spawnX = cx;
    this.spawnY = cy;
    this.baseSpeed = type === 'fygar' ? SPEED.fygar : SPEED.pooka;
    this.x = centerX(cx);
    this.y = centerY(cy);
    this.dir = Math.random() < 0.5 ? 'left' : 'right';
    this.prevCell = null;
    this.dead = false;
    this.state = 'walk';            // walk | inflated | popped | crushed
    this.ghost = false;
    this.ghostT = 0;
    this.ghostTimer = ghostDelay(round, type === 'fygar');
    this.inflation = 0;             // 0..PUMP_STAGES
    this.latched = false;
    this.deflateT = 0;
    this.animT = 0;
    this.fleeing = false;
    this.speedScale = 1;
    // Fygar fire
    this.fireState = 'none';        // none | charging | breathing
    this.fireT = 0;
    this.fireCooldown = FIRE_COOLDOWN_MS * (0.5 + Math.random());
    this.escaped = false;
  }

  get cx() { return cellX(this.x); }
  get cy() { return cellY(this.y); }

  latch() {
    this.latched = true;
    if (this.ghost) {
      // Harpooned mid-float: solidify on the spot (snapped to the tunnel).
      this.ghost = false;
      this.x = centerX(this.cx);
      this.y = centerY(this.cy);
      this.targetX = undefined;
      this.ghostTimer = ghostDelay(this.g.round, this.type === 'fygar');
    }
  }
  unlatch() { this.latched = false; this.deflateT = 0; }

  inflate() {
    if (this.dead) return;
    this.inflation = Math.min(PUMP_STAGES, this.inflation + 1);
    this.state = 'inflated';
    this.deflateT = 0;
    this.g.audio.sfx('pumpUp', this.inflation);
    if (this.inflation >= PUMP_STAGES) {
      this.state = 'popped';
      this.popT = 0;
      this.g.audio.sfx('pop');
      this.g.onEnemyPopped(this);
      if (this.g.pump.target === this) {
        this.g.pump.target = null;
        this.g.pump.release();
      }
    }
  }

  update(dt, round) {
    if (this.dead) return;
    const ms = dt * 1000;
    this.animT += dt * 6;

    if (this.state === 'popped') {
      this.popT += ms;
      if (this.popT > 450) this.dead = true;
      return;
    }

    if (this.state === 'inflated') {
      if (this.latched) return;                    // held by the pump
      this.deflateT += ms;
      if (this.deflateT > DEFLATE_HOLD_MS) {
        this.deflateT -= DEFLATE_STAGE_MS;
        this.inflation--;
        this.g.audio.sfx('deflate');
        if (this.inflation <= 0) {
          this.inflation = 0;
          this.state = 'walk';
          this.ghostTimer = Math.max(2000, this.ghostTimer); // brief grace
        }
      }
      return;
    }

    // Fygar fire handling (only while solid, walking, horizontal)
    if (this.type === 'fygar' && !this.ghost && !this.fleeing) {
      if (this.fireState === 'charging') {
        this.fireT += ms;
        if (this.fireT >= FIRE_CHARGE_MS) {
          this.fireState = 'breathing';
          this.fireT = 0;
          this.g.audio.sfx('flame');
        }
        return;                                    // stands still while charging
      }
      if (this.fireState === 'breathing') {
        this.fireT += ms;
        this.g.checkFire(this);
        if (this.fireT >= FIRE_ACTIVE_MS) {
          this.fireState = 'none';
          this.fireCooldown = FIRE_COOLDOWN_MS * (0.7 + Math.random() * 0.8);
        }
        return;
      }
      this.fireCooldown -= ms;
      if (this.fireCooldown <= 0 && (this.dir === 'left' || this.dir === 'right')) {
        const rowAligned = Math.abs(this.y - this.g.player.y) < TILE;
        const p = rowAligned ? 0.5 : 0.08;
        if (Math.random() < p) {
          this.fireState = 'charging';
          this.fireT = 0;
          this.g.audio.sfx('flameCharge');
          return;
        }
        this.fireCooldown = 900;
      }
    }

    // Ghost mode
    if (!this.ghost && !this.fleeing) {
      this.ghostTimer -= ms;
      if (this.ghostTimer <= 0 && !this.latched) {
        this.ghost = true;
        this.ghostT = 0;
        this.g.audio.sfx('ghost');
      }
    }

    const grid = this.g.grid;
    const player = this.g.player;

    if (this.ghost) {
      this.ghostT += ms;
      // Float straight through everything: toward the player normally, or
      // toward the top-left surface when escaping.
      const tx = this.fleeing ? centerX(1) : player.x;
      const ty = this.fleeing ? centerY(SURFACE_ROW) : player.y;
      const dx = tx - this.x, dy = ty - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const sp = SPEED.ghost * (this.fleeing ? 1.7 : 1) * this.speedScale * dt;
      this.x += (dx / dist) * sp;
      this.y += (dy / dist) * sp;
      this.y = Math.max(centerY(SURFACE_ROW), this.y);
      if (this.fleeing && this.cy <= SURFACE_ROW && this.x <= centerX(1)) {
        this.dead = true;
        this.escaped = true;
        this.g.onEnemyEscaped();
        return;
      }
      // Re-solidify when inside a carved tunnel cell (and near its center).
      if (this.ghostT > GHOST_MIN_MS && grid.isCarved(this.cx, this.cy)) {
        const ccx = centerX(this.cx), ccy = centerY(this.cy);
        if (Math.abs(this.x - ccx) < 5 && Math.abs(this.y - ccy) < 5) {
          this.x = ccx; this.y = ccy;
          this.ghost = false;
          this.prevCell = null;
          this.stuckMs = 0;
          this.targetX = undefined;
          this.ghostTimer = ghostDelay(round, this.type === 'fygar');
        }
      }
      return;
    }

    // Stuck watchdog: an enemy that can't make progress (boxed into a
    // dead-end pocket, bad spawn, etc.) ghosts out instead of freezing.
    const cellKey = this.cx + this.cy * 100;
    if (cellKey !== this.lastCellKey) {
      this.lastCellKey = cellKey;
      this.stuckMs = 0;
    } else {
      this.stuckMs = (this.stuckMs || 0) + ms;
      if (this.stuckMs > 2500 && !this.latched && this.fireState === 'none') {
        this.stuckMs = 0;
        this.ghost = true;
        this.ghostT = 0;
        this.g.audio.sfx('ghost');
        return;
      }
    }

    // Tunnel walking: pick a neighboring cell and walk to its center; decide
    // again on arrival. (Never re-decide mid-cell — that caused oscillation.)
    const sp = (this.fleeing ? SPEED.enemyFast : this.baseSpeed) * this.speedScale * dt;
    if (this.targetX === undefined) this.pickTarget();
    if (this.ghost) return;                    // decide() may ghost (flee/dead end)
    const dx = this.targetX - this.x, dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= sp) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.pickTarget();
      if (this.ghost) return;
    } else {
      this.x += (dx / dist) * sp;
      this.y += (dy / dist) * sp;
    }

    if (this.fleeing) {
      // Escape off the left edge of the surface row.
      if (this.cy <= SURFACE_ROW && this.x <= TILE / 2) {
        this.dead = true;
        this.escaped = true;
        this.g.onEnemyEscaped();
      }
    }
  }

  // Choose a direction at the current cell center, then set the walk target:
  // the neighbor's center if passable, else stay put and retry on arrival.
  pickTarget() {
    this.decide();
    if (this.ghost) return;
    const d = DIRS[this.dir];
    if (this.g.grid.canMove(this.cx, this.cy, this.dir)) {
      this.targetX = centerX(this.cx + d.dx);
      this.targetY = centerY(this.cy + d.dy);
    } else {
      this.targetX = centerX(this.cx);
      this.targetY = centerY(this.cy);
    }
  }

  decide() {
    const grid = this.g.grid;
    const player = this.g.player;
    const cx = this.cx, cy = this.cy;

    if (this.fleeing) {
      // Head up, then left along the surface.
      if (cy > SURFACE_ROW && grid.canMove(cx, cy, 'up')) { this.dir = 'up'; return; }
      if (cy <= SURFACE_ROW) { this.dir = 'left'; return; }
      // Otherwise ghost straight up through dirt.
      if (cy > SURFACE_ROW) { this.ghost = true; this.ghostT = GHOST_MIN_MS; return; }
    }

    const options = [];
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (dir === opposite(this.dir)) continue;         // no 180s
      if (grid.canMove(cx, cy, dir)) options.push(dir);
    }
    if (options.length === 0) {
      // Dead end: turn around if possible, else wait for ghost timer.
      if (grid.canMove(cx, cy, opposite(this.dir))) this.dir = opposite(this.dir);
      return;
    }
    // Chase bias: prefer the option that closes distance to the player.
    options.sort((a, b) => this.distAfter(a, player) - this.distAfter(b, player));
    // Mostly greedy, sometimes random — the arcade enemies are imperfect.
    this.dir = (Math.random() < 0.75) ? options[0]
      : options[Math.floor(Math.random() * options.length)];
  }

  distAfter(dir, player) {
    const d = DIRS[dir];
    const nx = centerX(this.cx + d.dx), ny = centerY(this.cy + d.dy);
    return Math.hypot(player.x - nx, player.y - ny);
  }

  flee() {
    // Keep ghost state if mid-float — the ghost target switches to the exit.
    this.fleeing = true;
    this.fireState = 'none';
  }

  crush() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'crushed';
  }

  // Harmless & passable while inflated or popped.
  get dangerous() {
    return !this.dead && this.state === 'walk' && !this.escaped;
  }

  draw(ctx, S) {
    const f = Math.floor(this.animT) % 2;
    let img;
    if (this.state === 'popped') {
      // Flash the biggest balloon as a burst
      if (Math.floor(this.popT / 80) % 2 === 0) {
        img = this.type === 'pooka' ? S.pookaInflate[2] : S.fygarInflate[2];
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, this.x - img.width / 2, this.y - img.height / 2);
        ctx.globalAlpha = 1;
      }
      return;
    }
    if (this.state === 'inflated' && this.inflation > 0) {
      const stage = Math.min(2, this.inflation - 1);
      img = this.type === 'pooka' ? S.pookaInflate[stage] : S.fygarInflate[stage];
      ctx.drawImage(img, this.x - img.width / 2, this.y - img.height / 2);
      return;
    }
    if (this.ghost) {
      img = this.type === 'pooka' ? S.pookaGhost[f] : S.fygarGhost[f];
      ctx.drawImage(img, this.x - 8, this.y - 8);
      return;
    }
    if (this.type === 'pooka') {
      img = S.pooka[f];
    } else {
      img = this.dir === 'left' ? S.fygarL[f] : S.fygar[f];
    }
    ctx.drawImage(img, Math.round(this.x - 8), Math.round(this.y - 8));

    // Fygar flame
    if (this.type === 'fygar' && this.fireState === 'breathing') {
      const flames = this.dir === 'left' ? S.flameL : S.flame;
      const fi = this.fireT > FIRE_ACTIVE_MS * 0.4 ? 1 : 0;
      const fx = this.dir === 'left' ? this.x - 8 - flames[fi].width : this.x + 8;
      ctx.drawImage(flames[fi], fx, this.y - flames[fi].height / 2);
    } else if (this.type === 'fygar' && this.fireState === 'charging') {
      if (Math.floor(this.fireT / 100) % 2 === 0) {
        ctx.fillStyle = '#ff4040';
        ctx.fillRect(this.dir === 'left' ? this.x - 12 : this.x + 8, this.y - 2, 4, 4);
      }
    }
  }

  // Flame hitbox (canvas rect) while breathing, else null.
  fireRect() {
    if (this.fireState !== 'breathing') return null;
    const lenPx = FIRE_RANGE_TILES * TILE * Math.min(1, this.fireT / (FIRE_ACTIVE_MS * 0.5));
    const x0 = this.dir === 'left' ? this.x - 8 - lenPx : this.x + 8;
    return { x: x0, y: this.y - 6, w: lenPx, h: 12 };
  }
}

// ---------------------------------------------------------------- Rock
export class Rock {
  constructor(game, cx, cy) {
    this.g = game;
    this.x = centerX(cx);
    this.y = centerY(cy);
    this.state = 'idle';      // idle | shaking | waiting | falling | crumbling
    this.t = 0;
    this.kills = 0;
    this.crumbleT = 0;
  }

  get cx() { return cellX(this.x); }
  get cy() { return cellY(this.y); }

  update(dt) {
    const ms = dt * 1000;
    const grid = this.g.grid;
    const player = this.g.player;

    switch (this.state) {
      case 'idle':
        if (grid.isCarved(this.cx, this.cy + 1)) {
          this.state = 'shaking';
          this.t = 0;
        }
        break;
      case 'shaking':
        this.t += ms;
        if (this.t >= ROCK_SHAKE_MS) this.state = 'waiting';
        break;
      case 'waiting': {
        // Standing under an undermined rock "holds it up" indefinitely.
        // Once the player steps away, it hangs for a beat, then drops.
        const playerBelow = !player.dead && player.cx === this.cx &&
          player.cy >= this.cy + 1 && Math.abs(player.x - this.x) < TILE * 0.75;
        if (playerBelow) {
          this.releaseMs = 0;
        } else {
          this.releaseMs = (this.releaseMs || 0) + ms;
          if (this.releaseMs >= ROCK_RELEASE_MS) {
            this.state = 'falling';
            this.g.audio.sfx('rockFall');
          }
        }
        break;
      }
      case 'falling': {
        this.y += SPEED.rockFall * dt;
        // Crush check
        if (!player.dead &&
            Math.abs(player.x - this.x) < 10 && Math.abs(player.y - this.y) < 12) {
          player.die(true);
        }
        for (const e of this.g.enemies) {
          if (!e.dead && !e.ghost &&
              Math.abs(e.x - this.x) < 10 && Math.abs(e.y - this.y) < 12) {
            e.crush();
            this.kills++;
          }
        }
        // Land when the next cell down is uncarved dirt or the floor.
        const below = { x: this.cx, y: cellY(this.y + TILE / 2 + 1) };
        if (below.y >= GRID_H || !grid.isCarved(below.x, below.y)) {
          this.y = centerY(cellY(this.y));
          this.state = 'crumbling';
          this.crumbleT = 0;
          this.g.audio.sfx('rockLand');
          this.g.onRockLanded(this);
        }
        break;
      }
      case 'crumbling':
        this.crumbleT += ms;
        if (this.crumbleT >= ROCK_CRUMBLE_MS) this.state = 'gone';
        break;
    }
  }

  draw(ctx, S) {
    if (this.state === 'gone') return;
    if (this.state === 'crumbling') {
      ctx.drawImage(S.rockCrumble, this.x - 8, this.y - 8);
      return;
    }
    let jx = 0;
    if (this.state === 'shaking' || this.state === 'waiting') {
      jx = Math.sin(this.t / 30) > 0 ? 1 : -1;
      this.t += 16;
    }
    ctx.drawImage(S.rock, Math.round(this.x - 8 + jx), Math.round(this.y - 8));
  }
}

// ---------------------------------------------------------------- Veggie
export class Veggie {
  constructor(game, def) {
    this.g = game;
    this.def = def;
    this.x = centerX(Math.floor(GRID_W / 2));
    this.y = centerY(Math.floor((GRID_H + SURFACE_ROW) / 2));
    this.t = 0;
    this.taken = false;
    this.gone = false;
  }

  update(dt) {
    this.t += dt * 1000;
    if (this.t > 10000) this.gone = true;
    const p = this.g.player;
    if (!p.dead && Math.abs(p.x - this.x) < 10 && Math.abs(p.y - this.y) < 10) {
      this.taken = true;
      this.gone = true;
      this.g.onVeggie(this.def);
    }
  }

  draw(ctx, S) {
    if (this.gone) return;
    ctx.drawImage(S.veg[this.def.name], this.x - 8, this.y - 8);
  }
}
