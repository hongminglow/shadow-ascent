// All sound effects are synthesized at runtime with the Web Audio API.
// No audio files required — fully offline.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._alarmNodes = null;
    this._hum = null;
  }

  // Must be created/resumed after a user gesture (handled by the menu Start button).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ctx?.resume?.();
  }

  setMuted(v) {
    this.muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.7;
  }

  _now() {
    return this.ctx.currentTime;
  }

  _env(node, t, attack, hold, release, peak = 1) {
    const g = node;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  _noise(duration) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  gunshot(kind = 'pistol') {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const dur = kind === 'sniper' ? 0.5 : 0.18;
    // Noise crack
    const src = this._noise(dur);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(kind === 'sniper' ? 1800 : 2600, t);
    filt.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = this.ctx.createGain();
    this._env(g, t, 0.001, 0.01, dur, kind === 'sniper' ? 0.9 : 0.6);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
    // Low thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'sniper' ? 110 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const og = this.ctx.createGain();
    this._env(og, t, 0.001, 0.02, 0.18, 0.7);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  reload() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    // two mechanical clicks
    [0, 0.14].forEach((off, i) => {
      const src = this._noise(0.04);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = i === 0 ? 1200 : 2000;
      const g = this.ctx.createGain();
      this._env(g, t + off, 0.001, 0.005, 0.04, 0.4);
      src.connect(filt).connect(g).connect(this.master);
      src.start(t + off);
      src.stop(t + off + 0.06);
    });
  }

  footstep() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const src = this._noise(0.08);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 400;
    const g = this.ctx.createGain();
    this._env(g, t, 0.005, 0.01, 0.07, 0.12);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.12);
  }

  hurt() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);
    const g = this.ctx.createGain();
    this._env(g, t, 0.002, 0.02, 0.25, 0.4);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  hitConfirm() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, t);
    const g = this.ctx.createGain();
    this._env(g, t, 0.001, 0.005, 0.05, 0.18);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  explosion() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const src = this._noise(0.5);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    const g = this.ctx.createGain();
    this._env(g, t, 0.002, 0.04, 0.5, 0.7);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.6);
  }

  pickup() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    [660, 880, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t + i * 0.06, 0.005, 0.02, 0.1, 0.25);
      osc.connect(g).connect(this.master);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.16);
    });
  }

  doorOpen() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.4);
    const g = this.ctx.createGain();
    this._env(g, t, 0.01, 0.1, 0.4, 0.35);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  // Looping alarm — call alarmOn()/alarmOff().
  alarmOn() {
    if (!this.ctx || this.muted || this._alarmNodes) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 220;
    osc.frequency.value = 620;
    lfo.connect(lfoGain).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    osc.connect(g).connect(this.master);
    osc.start();
    lfo.start();
    this._alarmNodes = { osc, lfo, g };
  }

  alarmOff() {
    if (!this._alarmNodes) return;
    const { osc, lfo, g } = this._alarmNodes;
    const t = this._now();
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.stop(t + 0.35);
    lfo.stop(t + 0.35);
    this._alarmNodes = null;
  }

  // Low ambient building hum.
  ambientOn() {
    if (!this.ctx || this._hum) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g).connect(this.master);
    osc.start();
    this._hum = { osc, g };
  }

  ambientOff() {
    if (!this._hum) return;
    const t = this._now();
    this._hum.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    this._hum.osc.stop(t + 0.6);
    this._hum = null;
  }

  win() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t + i * 0.13, 0.01, 0.08, 0.3, 0.3);
      osc.connect(g).connect(this.master);
      osc.start(t + i * 0.13);
      osc.stop(t + i * 0.13 + 0.42);
    });
  }

  lose() {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    [392, 330, 262, 196].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      this._env(g, t + i * 0.18, 0.01, 0.1, 0.35, 0.3);
      osc.connect(g).connect(this.master);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.5);
    });
  }
}
