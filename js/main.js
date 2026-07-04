import { buildSprites } from './sprites.js';
import { AudioEngine } from './audio.js';
import { GameAudio } from './sfx.js';
import { Input } from './input.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const sprites = buildSprites();
const audio = new GameAudio(new AudioEngine());
const input = new Input();
const game = new Game(sprites, audio);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt, input);
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
