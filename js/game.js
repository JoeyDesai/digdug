// Game orchestration: states (attract → ready → playing → death → clear →
// gameover), scoring, extra lives, HUD, round flow.

import {
  CANVAS_W, CANVAS_H, TILE, GRID_W, GRID_H, FIELD_Y, SURFACE_ROW, COLORS,
  SCORE_DIG, POOKA_SCORE, FYGAR_SCORE_V, FYGAR_SCORE_H, ROCK_SCORE,
  EXTEND_FIRST, EXTEND_EVERY, veggieForRound, depthLayer, HURRY_MS,
} from './constants.js';
import { DirtGrid } from './grid.js';
import { Player, Pump, Enemy, Rock, Veggie, centerX, centerY } from './entities.js';
import { roundConfig } from './levels.js';

const HISCORE_KEY = 'digdug_hiscore';
const CHAMBER_ROW = 8;   // starting chamber floor = top of the third layer

export class Game {
  constructor(sprites, audio) {
    this.S = sprites;
    this.audio = audio;
    this.state = 'attract';
    this.score = 0;
    this.hiscore = Number(localStorage.getItem(HISCORE_KEY) || 20000);
    this.lives = 2;                 // spare lives, like the arcade default (3 total)
    this.round = 1;
    this.stateT = 0;
    this.nextExtend = EXTEND_FIRST;
    this.grid = new DirtGrid();
    this.player = new Player(this);
    this.pump = new Pump(this);
    this.enemies = [];
    this.rocks = [];
    this.veggie = null;
    this.rocksDropped = 0;
    this.floaters = [];             // score popups
  }

  startGame() {
    this.score = 0;
    this.lives = 2;
    this.round = 1;
    this.nextExtend = EXTEND_FIRST;
    this.startRound();
  }

  startRound() {
    const cfg = roundConfig(this.round);
    this.grid = new DirtGrid();
    for (const [x0, y0, x1, y1] of cfg.tunnels) this.grid.carveTunnel(x0, y0, x1, y1);
    // Arcade-style start: central shaft down to a 3-cell-wide chamber whose
    // floor is the top of the third dirt layer.
    const midX = 6;
    this.grid.carveTunnel(midX, SURFACE_ROW, midX, CHAMBER_ROW);
    this.grid.carveTunnel(midX - 1, CHAMBER_ROW, midX + 1, CHAMBER_ROW);

    this.player.reset();
    this.player.x = centerX(midX);
    this.player.y = centerY(CHAMBER_ROW);
    this.roundT = 0;
    this.hurry = false;
    this.pump = new Pump(this);
    this.enemies = cfg.enemies.map((e) => {
      const en = new Enemy(this, e.x, e.y, e.type, this.round);
      en.speedScale = cfg.speedScale;
      return en;
    });
    this.rocks = cfg.rocks.map((r) => new Rock(this, r.x, r.y));
    this.veggie = null;
    this.rocksDropped = 0;
    this.floaters = [];
    this.setState('ready');
    this.audio.roundStart();
  }

  setState(s) { this.state = s; this.stateT = 0; }

  addScore(pts, x, y) {
    this.score += pts;
    if (x !== undefined) this.floaters.push({ pts, x, y, t: 0 });
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      localStorage.setItem(HISCORE_KEY, String(this.hiscore));
    }
    if (this.score >= this.nextExtend) {
      this.lives++;
      this.audio.sfx('extraLife');
      this.nextExtend = this.nextExtend === EXTEND_FIRST
        ? EXTEND_EVERY : this.nextExtend + EXTEND_EVERY;
    }
  }

  // -------- event hooks from entities --------
  onDig(row) { this.addScore(SCORE_DIG); }

  onEnemyPopped(e) {
    const layer = Math.max(0, depthLayer(e.cy));
    let pts;
    if (e.type === 'fygar') {
      const horizontal = this.pump.dir === 'left' || this.pump.dir === 'right';
      pts = (horizontal ? FYGAR_SCORE_H : FYGAR_SCORE_V)[layer];
    } else {
      pts = POOKA_SCORE[layer];
    }
    this.addScore(pts, e.x, e.y);
  }

  onRockLanded(rock) {
    if (rock.kills > 0) {
      const pts = ROCK_SCORE[Math.min(rock.kills - 1, ROCK_SCORE.length - 1)];
      this.addScore(pts, rock.x, rock.y - TILE);
    }
    this.rocksDropped++;
    if (this.rocksDropped === 2 && !this.veggie) {
      // Bonus item appears in the starting chamber, like the arcade.
      this.veggie = new Veggie(this, veggieForRound(this.round));
      this.veggie.x = centerX(6);
      this.veggie.y = centerY(CHAMBER_ROW);
      this.audio.sfx('veggieSpawn');
    }
  }

  onVeggie(def) {
    this.addScore(def.score, this.veggie.x, this.veggie.y);
    this.audio.sfx('veggieGet');
  }

  onPlayerDeath() {
    this.pump.release();
    this.audio.death();
    this.setState('death');
  }

  onEnemyEscaped() { this.audio.enemyEscape(); }

  checkFire(fygar) {
    const r = fygar.fireRect();
    if (!r || this.player.dead) return;
    const p = this.player;
    if (p.x + 6 > r.x && p.x - 6 < r.x + r.w && p.y + 6 > r.y && p.y - 6 < r.y + r.h) {
      p.die();
    }
  }

  // -------- update --------
  update(dt, input) {
    this.stateT += dt * 1000;

    if (input.wasPressed('mute')) this.audio.toggleMute();

    switch (this.state) {
      case 'attract':
        if (input.wasPressed('start') || input.wasPressed('pump')) {
          this.audio.init();
          this.startGame();
        }
        break;

      case 'ready':
        if (this.stateT > 1600) this.setState('playing');
        break;

      case 'playing':
        this.updatePlaying(dt, input);
        break;

      case 'death':
        if (this.stateT > 2200) {
          if (this.lives > 0) {
            this.lives--;
            this.respawn();
          } else {
            this.setState('gameover');
          }
        }
        break;

      case 'clear':
        if (this.stateT > 2000) {
          this.round++;
          this.startRound();
        }
        break;

      case 'gameover':
        if (this.stateT > 3500) this.setState('attract');
        break;
    }
    input.endFrame();
  }

  respawn() {
    // Keep the dug field; survivors return to their spawn caves (arcade rule).
    this.player.reset();
    this.player.x = centerX(6);
    this.player.y = centerY(CHAMBER_ROW);
    this.pump = new Pump(this);
    this.audio.tempo = 1;
    this.hurry = false;
    this.roundT = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.x = centerX(e.spawnX);
      e.y = centerY(e.spawnY);
      e.ghost = false;
      e.fleeing = false;
      e.state = 'walk';
      e.inflation = 0;
      e.latched = false;
      e.prevCell = null;
    }
    this.setState('ready');
    this.audio.roundStart();
  }

  updatePlaying(dt, input) {
    if (input.wasPressed('pump') && !this.player.dead) this.pump.fire();

    // Hurry-up escalation partway through the round.
    this.roundT += dt * 1000;
    if (!this.hurry && this.roundT > HURRY_MS) {
      this.hurry = true;
      this.audio.tempo = 1.25;
      for (const e of this.enemies) e.speedScale *= 1.25;
    }

    this.player.update(dt, input);
    this.pump.update(dt);
    for (const e of this.enemies) e.update(dt, this.round);
    for (const r of this.rocks) r.update(dt);
    this.rocks = this.rocks.filter((r) => r.state !== 'gone');
    if (this.veggie) {
      this.veggie.update(dt);
      if (this.veggie.gone) this.veggie = null;
    }

    // Enemy-player contact
    for (const e of this.enemies) {
      if (e.dangerous && !e.ghost &&
          Math.abs(e.x - this.player.x) < 10 && Math.abs(e.y - this.player.y) < 10) {
        this.player.die();
      }
      if (e.dangerous && e.ghost &&
          Math.abs(e.x - this.player.x) < 8 && Math.abs(e.y - this.player.y) < 8) {
        this.player.die();
      }
    }

    // Music gate
    this.audio.walkMusic(dt, this.player.moving && !this.player.dead, this.player.digging);

    // Last-enemy-flees rule
    const alive = this.enemies.filter((e) => !e.dead);
    if (alive.length === 1 && !alive[0].fleeing && alive[0].state === 'walk') {
      alive[0].flee();
    }
    // Round clear
    if (alive.length === 0 && this.state === 'playing') {
      this.audio.roundClear();
      this.setState('clear');
    }

    // Score floaters
    for (const f of this.floaters) f.t += dt * 1000;
    this.floaters = this.floaters.filter((f) => f.t < 1200);
  }

  // -------- draw --------
  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (this.state === 'attract') { this.drawAttract(ctx); return; }

    this.grid.draw(ctx);

    if (this.veggie) this.veggie.draw(ctx, this.S);
    for (const r of this.rocks) r.draw(ctx, this.S);
    for (const e of this.enemies) e.draw(ctx, this.S);
    this.pump.draw(ctx);
    this.player.draw(ctx, this.S);

    // Score floaters
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffffff';
    for (const f of this.floaters) {
      ctx.fillText(String(f.pts), f.x - 8, f.y - 4 - f.t / 100);
    }

    this.drawHUD(ctx);

    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    if (this.state === 'ready') {
      ctx.fillStyle = '#ffe040';
      ctx.fillText(this.stateT < 800 ? 'PLAYER ONE' : 'READY!', CANVAS_W / 2, CANVAS_H / 2 - 20);
    } else if (this.state === 'gameover') {
      ctx.fillStyle = '#ff4040';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20);
    }
    ctx.textAlign = 'left';
  }

  drawHUD(ctx) {
    ctx.font = '8px monospace';
    ctx.fillStyle = COLORS.score;
    ctx.fillText('1UP', 24, 8);
    ctx.fillText('HIGH SCORE', 88, 8);
    ctx.fillStyle = COLORS.hudText;
    ctx.textAlign = 'right';
    ctx.fillText(String(this.score).padStart(6, ' '), 66, 17);
    ctx.fillText(String(this.hiscore).padStart(6, ' '), 152, 17);
    ctx.textAlign = 'left';

    // Lives (bottom-left)
    for (let i = 0; i < Math.min(this.lives, 5); i++) {
      ctx.drawImage(this.S.digWalk[0], 4 + i * 14, CANVAS_H - 18, 12, 12);
    }
    // Round flowers grow on the surface, top-right; tens get bigger flowers.
    const tens = Math.floor(this.round / 10);
    const ones = this.round % 10;
    let fx = CANVAS_W - 12;
    const fy = FIELD_Y + TILE * 2 - 10;   // planted on the dirt lip
    for (let i = 0; i < ones; i++) { ctx.drawImage(this.S.flower, fx, fy); fx -= 9; }
    for (let i = 0; i < tens; i++) {
      ctx.drawImage(this.S.flower, fx - 2, fy - 4, 12, 12); fx -= 13;
    }
    // "ROUND n" bottom-right, like the arcade.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText('ROUND', CANVAS_W - 4, CANVAS_H - 10);
    ctx.fillText(String(this.round), CANVAS_W - 4, CANVAS_H - 2);
    ctx.textAlign = 'left';
  }

  drawAttract(ctx) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe040';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('DIG DUG', CANVAS_W / 2, 80);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('A WEB TRIBUTE', CANVAS_W / 2, 96);

    // Character roster
    ctx.drawImage(this.S.digWalk[0], CANVAS_W / 2 - 60, 120);
    ctx.drawImage(this.S.pooka[0], CANVAS_W / 2 - 8, 120);
    ctx.drawImage(this.S.fygar[0], CANVAS_W / 2 + 44, 120);
    ctx.fillStyle = '#c0c0c0';
    ctx.fillText('DIG DUG', CANVAS_W / 2 - 52, 148);
    ctx.fillText('POOKA', CANVAS_W / 2, 148);
    ctx.fillText('FYGAR', CANVAS_W / 2 + 52, 148);

    ctx.fillStyle = Math.floor(this.stateT / 500) % 2 ? '#ffffff' : '#808080';
    ctx.font = '10px monospace';
    ctx.fillText('PRESS ENTER', CANVAS_W / 2, 200);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#606060';
    ctx.fillText('ARROWS/WASD MOVE - SPACE PUMP', CANVAS_W / 2, 224);
    ctx.fillStyle = '#404040';
    ctx.fillText('HI ' + this.hiscore, CANVAS_W / 2, 250);
    ctx.textAlign = 'left';
  }
}
