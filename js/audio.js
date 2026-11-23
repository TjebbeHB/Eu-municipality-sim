/* Voxelstad — tiny synthesised sound: effects, a generative tune, a truck engine */
(function () {
  const A = (G.Audio = { ctx: null, muted: false, mode: 'off' });
  let master, musicGain, engineOsc, engineGain, timer = null, step = 0, nextT = 0;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    A.ctx = new AC();
    master = A.ctx.createGain(); master.gain.value = A.muted ? 0 : 0.5; master.connect(A.ctx.destination);
    musicGain = A.ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    engineOsc = A.ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
    const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    engineGain = A.ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master); engineOsc.start();
    timer = setInterval(schedule, 120);
  };
  A.toggle = function () { A.muted = !A.muted; if (master) master.gain.value = A.muted ? 0 : 0.5; return A.muted; };

  function tone(freq, t, dur, type = 'triangle', vol = 0.2, dest = master, slide = 0) {
    if (!A.ctx) return;
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol = 0.2, freq = 1200) {
    if (!A.ctx) return;
    const n = Math.floor(A.ctx.sampleRate * dur), buf = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = A.ctx.createBufferSource(); s.buffer = buf;
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = A.ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const SFX = {
    pick: (t) => { tone(520, t, 0.09, 'square', 0.08); tone(780, t + 0.06, 0.1, 'square', 0.08); },
    stamp: (t) => { noise(t, 0.09, 0.35, 500); tone(140, t, 0.1, 'sine', 0.3, master, 0.5); },
    done: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.06, 0.16, 'triangle', 0.16)); },
    coin: (t) => { tone(988, t, 0.07, 'square', 0.07); tone(1319, t + 0.07, 0.22, 'square', 0.07); },
    auto: (t) => { tone(1175, t, 0.06, 'sine', 0.07); tone(1568, t + 0.05, 0.12, 'sine', 0.06); },
    fail: (t) => { tone(220, t, 0.22, 'sawtooth', 0.12, master, 0.6); tone(165, t + 0.16, 0.3, 'sawtooth', 0.12, master, 0.6); },
    talk: (t) => { tone(G.rand(300, 420), t, 0.05, 'square', 0.04); },
    ui: (t) => { tone(660, t, 0.05, 'triangle', 0.1); },
    buy: (t) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.05, 0.22, 'triangle', 0.14)); },
    alarm: (t) => { tone(880, t, 0.25, 'square', 0.12); tone(660, t + 0.27, 0.25, 'square', 0.12); },
    isolate: (t) => { noise(t, 0.12, 0.3, 2400); tone(330, t, 0.3, 'sine', 0.2, master, 0.4); },
    engine: (t) => { noise(t, 0.3, 0.2, 200); },
    jump: (t) => { tone(300, t, 0.14, 'sine', 0.1, master, 1.8); },
    thunder: (t) => { noise(t, 1.4, 0.5, 90); },
  };
  A.sfx = function (name) { if (!A.ctx || A.muted) return; (SFX[name] || SFX.ui)(A.ctx.currentTime); };
  A.engine = function (speed, on) {
    if (!A.ctx) return;
    engineGain.gain.setTargetAtTime(on ? 0.05 + Math.min(0.07, Math.abs(speed) * 0.004) : 0, A.ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(46 + Math.abs(speed) * 5, A.ctx.currentTime, 0.1);
  };

  // Generative music: a slow chord loop with a wandering pentatonic lead.
  const MODES = {
    day:     { bpm: 96,  chords: [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]], scale: [523, 587, 659, 784, 880, 1047], lead: 0.5 },
    evening: { bpm: 72,  chords: [[220, 262, 330], [175, 220, 262], [262, 330, 392], [196, 247, 294]], scale: [440, 523, 587, 659, 784], lead: 0.3 },
    night:   { bpm: 132, chords: [[147, 175, 220], [147, 175, 208], [131, 156, 196], [139, 165, 208]], scale: [294, 349, 440, 466, 587], lead: 0.7 },
    title:   { bpm: 66,  chords: [[262, 330, 392], [196, 247, 294], [220, 262, 330], [175, 220, 262]], scale: [523, 659, 784, 880], lead: 0.25 },
  };
  A.music = function (mode) { A.mode = mode; };
  function schedule() {
    if (!A.ctx || A.mode === 'off' || !MODES[A.mode]) return;
    const m = MODES[A.mode], spb = 60 / m.bpm / 2;
    if (nextT < A.ctx.currentTime) nextT = A.ctx.currentTime + 0.05;
    while (nextT < A.ctx.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % m.chords.length, ch = m.chords[bar], s = step % 8;
      if (s === 0) ch.forEach((f) => tone(f / 2, nextT, spb * 7.5, 'sine', 0.09, musicGain));
      if (s % 2 === 0) tone(ch[(s / 2) % 3], nextT, spb * 1.6, 'triangle', 0.06, musicGain);
      if (Math.random() < m.lead && s !== 1) tone(G.pick(m.scale), nextT, spb * 1.8, A.mode === 'night' ? 'square' : 'triangle', A.mode === 'night' ? 0.03 : 0.05, musicGain);
      if (A.mode === 'night' && s % 2 === 0) tone(73, nextT, spb * 0.8, 'sawtooth', 0.08, musicGain);
      step++; nextT += spb;
    }
  }
})();
