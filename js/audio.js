// Web Audio sound engine.
// The arcade board used a Namco WSG: 3 voices of 32-sample wavetable synthesis.
// We approximate that character with PeriodicWave voices built from a few
// harmonic recipes, plus a noise buffer for thuds/pops. Every sound here is
// synthesized — there are no samples.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.walkOsc = null;
    this.walkTimer = 0;
    this.waves = {};
  }

  // Must be called from a user gesture.
  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(ctx.destination);

    // Wavetable-ish timbres: [harmonic amplitudes]
    this.waves.square = this.makeWave([1, 0, 0.33, 0, 0.2, 0, 0.14, 0, 0.11]);
    this.waves.flute = this.makeWave([1, 0.4, 0.1, 0.05]);
    this.waves.buzz = this.makeWave([1, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15]);

    // Noise buffer for percussive sounds.
    const len = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }

  makeWave(harmonics) {
    const n = harmonics.length + 1;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    harmonics.forEach((a, i) => { imag[i + 1] = a; });
    return this.ctx.createPeriodicWave(real, imag);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // Play one note. freq in Hz, dur in seconds.
  note(freq, dur, { wave = 'square', vol = 1, when = 0, slide = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(this.waves[wave]);
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur - 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  noise(dur, { vol = 1, when = 0, lowpass = 800 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }
}
