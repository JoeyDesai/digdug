// Game sound design on top of the AudioEngine. The walking music is an
// original chiptune loop in the spirit of the arcade (and, like the arcade,
// it only advances while the player is moving — pausing mid-phrase).

const N = (s) => 440 * Math.pow(2, (s - 9) / 12); // semitone from C4=0

// Original bouncy walk loop (composed for this project), 8th-note steps.
const WALK_LOOP = [
  N(0), N(4), N(7), N(4), N(9), N(7), N(4), N(2),
  N(0), N(4), N(7), N(12), N(9), N(7), N(4), N(2),
];
const WALK_BASS = [
  N(-12), null, N(-5), null, N(-7), null, N(-5), null,
  N(-12), null, N(-5), null, N(-7), null, N(-3), null,
];
const STEP_MS = 110;

export class GameAudio {
  constructor(engine) {
    this.e = engine;
    this.walkPos = 0;
    this.walkAcc = 0;
    this.tempo = 1;
  }

  init() { this.e.init(); }
  toggleMute() { return this.e.toggleMute(); }

  // Called every frame; advances the loop only while moving. Standing still
  // gives the arcade's quiet cricket-like idle tick instead.
  walkMusic(dt, moving, digging) {
    if (!this.e.ctx || this.e.muted) return;
    if (!moving) {
      this.idleAcc = (this.idleAcc || 0) + dt * 1000;
      if (this.idleAcc >= 520) {
        this.idleAcc = 0;
        this.e.note(2400, 0.03, { wave: 'flute', vol: 0.12 });
      }
      return;
    }
    this.walkAcc += dt * 1000 * this.tempo;
    const step = STEP_MS;
    while (this.walkAcc >= step) {
      this.walkAcc -= step;
      const i = this.walkPos % WALK_LOOP.length;
      this.e.note(WALK_LOOP[i], 0.09, { wave: 'flute', vol: 0.5 });
      if (WALK_BASS[i]) this.e.note(WALK_BASS[i], 0.1, { wave: 'square', vol: 0.35 });
      if (digging) {
        this.e.noise(0.05, { vol: 0.25, lowpass: 400 });
      }
      this.walkPos++;
    }
  }

  sfx(name, arg) {
    const e = this.e;
    if (!e.ctx) return;
    switch (name) {
      case 'pumpShot':
        e.note(900, 0.08, { wave: 'buzz', vol: 0.5, slide: -500 });
        break;
      case 'pumpUp': {
        const stage = arg || 1;
        e.note(200 + stage * 90, 0.18, { wave: 'buzz', vol: 0.6, slide: 120 });
        break;
      }
      case 'deflate':
        e.note(360, 0.15, { wave: 'buzz', vol: 0.3, slide: -140 });
        break;
      case 'pop':
        e.noise(0.25, { vol: 0.8, lowpass: 2500 });
        e.note(160, 0.2, { wave: 'buzz', vol: 0.5, slide: -100 });
        break;
      case 'rockFall':
        e.note(120, 0.5, { wave: 'buzz', vol: 0.5, slide: -60 });
        break;
      case 'rockLand':
        e.noise(0.3, { vol: 0.9, lowpass: 300 });
        break;
      case 'ghost':
        e.note(500, 0.4, { wave: 'flute', vol: 0.3, slide: -200 });
        e.note(480, 0.4, { wave: 'flute', vol: 0.2, slide: -180, when: 0.05 });
        break;
      case 'flameCharge':
        e.note(220, 0.3, { wave: 'buzz', vol: 0.35, slide: 80 });
        break;
      case 'flame':
        e.noise(0.5, { vol: 0.6, lowpass: 1200 });
        break;
      case 'veggieSpawn':
        [660, 880, 1100].forEach((f, i) => e.note(f, 0.1, { wave: 'flute', vol: 0.5, when: i * 0.08 }));
        break;
      case 'veggieGet':
        [523, 659, 784, 1047].forEach((f, i) => e.note(f, 0.12, { wave: 'flute', vol: 0.6, when: i * 0.07 }));
        break;
      case 'extraLife':
        [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) =>
          e.note(f, 0.11, { wave: 'flute', vol: 0.6, when: i * 0.09 }));
        break;
    }
  }

  // Original short jingles (composed for this project).
  roundStart() {
    if (!this.e.ctx) return;
    const seq = [N(0), N(4), N(7), N(9), N(7), N(12)];
    seq.forEach((f, i) => this.e.note(f, 0.14, { wave: 'flute', vol: 0.6, when: i * 0.13 }));
    seq.forEach((f, i) => this.e.note(f / 2, 0.14, { wave: 'square', vol: 0.35, when: i * 0.13 }));
    this.walkPos = 0;
    this.walkAcc = 0;
  }

  death() {
    if (!this.e.ctx) return;
    const seq = [N(7), N(4), N(2), N(0), N(-5), N(-12)];
    seq.forEach((f, i) => this.e.note(f, 0.22, { wave: 'buzz', vol: 0.5, when: i * 0.19 }));
  }

  roundClear() {
    if (!this.e.ctx) return;
    const seq = [N(0), N(7), N(12), N(16), N(12), N(16), N(19)];
    seq.forEach((f, i) => this.e.note(f, 0.13, { wave: 'flute', vol: 0.6, when: i * 0.11 }));
  }

  enemyEscape() {
    if (!this.e.ctx) return;
    const seq = [N(12), N(11), N(9), N(7), N(5), N(4)];
    seq.forEach((f, i) => this.e.note(f, 0.1, { wave: 'flute', vol: 0.4, when: i * 0.09 }));
  }
}
