/**
 * Procedural soundtrack for the island, all synthesised with Web Audio.
 * Two layers: an ambience bed (surf, wind, gulls) and a slow lo-fi
 * "California sunset" loop (electric piano chords, plucked guitar melody,
 * soft bass and a brushed beat). Runs on any BaseAudioContext so the same
 * code can render offline for previews.
 */
export interface MusicHandle {
  master: GainNode;
  stop: () => void;
}

const BPM = 78;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// I – vi – IV – V in C with sevenths, then a lift to Am – F – G – C
const PROGRESSION: number[][] = [
  [0, 4, 7, 11], // Cmaj7
  [-3, 0, 4, 7], // Am7
  [-7, -3, 0, 4], // Fmaj7
  [-5, -1, 2, 5], // G7
  [-3, 0, 4, 7], // Am7
  [-7, -3, 0, 4], // Fmaj7
  [-5, -1, 2, 5], // G7
  [0, 4, 7, 11], // Cmaj7
];
const ROOT = 220 * Math.pow(2, 3 / 12); // C4 ≈ 261.6

const hz = (semi: number, octave = 0) => ROOT * Math.pow(2, semi / 12 + octave);

function noiseBuffer(ctx: BaseAudioContext, seconds = 4): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    // pink-ish noise, sounds more like water than white
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  return buf;
}

export function startMusic(ctx: BaseAudioContext, duration = Infinity): MusicHandle {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);

  // warm reverb: short decaying noise convolver
  const verb = ctx.createConvolver();
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6) * 0.5;
  }
  verb.buffer = ir;
  const verbGain = ctx.createGain();
  verbGain.gain.value = 0.35;
  verb.connect(verbGain).connect(master);

  const stops: (() => void)[] = [];
  const t0 = ctx.currentTime + 0.05;

  // ---- ambience ----------------------------------------------------------
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  noise.loop = true;
  const surf = ctx.createBiquadFilter();
  surf.type = 'lowpass';
  surf.frequency.value = 600;
  const surfGain = ctx.createGain();
  surfGain.gain.value = 0.5;
  // waves: slow swell on the filter and gain
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 350;
  lfo.connect(lfoDepth).connect(surf.frequency);
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.07;
  const lfo2Depth = ctx.createGain();
  lfo2Depth.gain.value = 0.22;
  lfo2.connect(lfo2Depth).connect(surfGain.gain);
  noise.connect(surf).connect(surfGain).connect(master);
  noise.start(t0);
  lfo.start(t0);
  lfo2.start(t0);
  stops.push(() => { noise.stop(); lfo.stop(); lfo2.stop(); });

  // wind: high shelf of the same noise, very quiet
  const wind = ctx.createBiquadFilter();
  wind.type = 'bandpass';
  wind.frequency.value = 1800;
  wind.Q.value = 0.6;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.06;
  noise.connect(wind).connect(windGain).connect(master);

  // gulls: pitch-swept sine chirps every so often
  const gull = (at: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    const base = 1500 + Math.random() * 500;
    o.frequency.setValueAtTime(base, at);
    o.frequency.linearRampToValueAtTime(base * 1.5, at + 0.12);
    o.frequency.linearRampToValueAtTime(base * 0.9, at + 0.35);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.05, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
    o.connect(g).connect(verb);
    o.start(at);
    o.stop(at + 0.45);
  };
  const scheduleGulls = (until: number) => {
    let t = t0 + 3;
    while (t < until) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) gull(t + i * (0.25 + Math.random() * 0.2));
      t += 9 + Math.random() * 12;
    }
  };

  // ---- music ---------------------------------------------------------------
  const epiano = (freq: number, at: number, len: number, vel = 0.12) => {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sine';
    o2.type = 'triangle';
    o.frequency.value = freq;
    o2.frequency.value = freq * 2.001;
    f.type = 'lowpass';
    f.frequency.value = 1400;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, at + 0.02);
    g.gain.exponentialRampToValueAtTime(vel * 0.4, at + len * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    const o2g = ctx.createGain();
    o2g.gain.value = 0.25;
    o.connect(g);
    o2.connect(o2g).connect(g);
    g.connect(f);
    f.connect(master);
    f.connect(verb);
    o.start(at); o2.start(at);
    o.stop(at + len + 0.05); o2.stop(at + len + 0.05);
  };
  const pluck = (freq: number, at: number, len: number, vel = 0.16) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, at);
    f.frequency.exponentialRampToValueAtTime(500, at + len);
    f.Q.value = 2;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    o.connect(f).connect(g);
    g.connect(master);
    g.connect(verb);
    o.start(at);
    o.stop(at + len + 0.05);
  };
  const bass = (freq: number, at: number, len: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = 320;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.22, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    o.connect(f).connect(g).connect(master);
    o.start(at);
    o.stop(at + len + 0.05);
  };
  const kick = (at: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.32);
  };
  const brush = (at: number, vel = 0.08) => {
    const s = ctx.createBufferSource();
    s.buffer = noise.buffer;
    s.playbackRate.value = 1.6;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 3500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    s.connect(f).connect(g).connect(master);
    s.start(at, Math.random() * 2);
    s.stop(at + 0.14);
  };

  // melody: pentatonic phrases over each chord
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  const scheduleBar = (t: number, bar: number) => {
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const rootSemi = chord[0];
    // chords: soft stabs on 1 and the "and" of 2, held through the bar
    chord.forEach((semi, i) => epiano(hz(semi, 0), t + i * 0.012, BAR * 0.95, 0.09));
    chord.slice(1).forEach((semi, i) => epiano(hz(semi, 0), t + BEAT * 1.5 + i * 0.01, BEAT * 1.4, 0.05));
    // bass: root on 1, fifth on 3, octave pickup on 4-and
    bass(hz(rootSemi, -2), t, BEAT * 1.6);
    bass(hz(rootSemi + 7, -2), t + BEAT * 2, BEAT * 1.2);
    if (bar % 2 === 1) bass(hz(rootSemi, -1), t + BEAT * 3.5, BEAT * 0.45);
    // beat: kick 1 & 3, brush 2 & 4 with light hats
    kick(t);
    kick(t + BEAT * 2.5);
    brush(t + BEAT, 0.09);
    brush(t + BEAT * 3, 0.09);
    for (let s = 0; s < 8; s++) brush(t + s * BEAT * 0.5, s % 2 ? 0.025 : 0.04);
    // melody every other bar, 3 to 5 notes on the chord's pentatonic
    if (bar % 2 === 0 || bar % 8 === 7) {
      const n = 3 + Math.floor(Math.random() * 3);
      let step = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const at = t + BEAT * (0.5 + k * 0.75 + (Math.random() < 0.3 ? 0.25 : 0));
        step = Math.max(0, Math.min(PENTA.length - 1, step + (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.7 ? 1 : 2)));
        pluck(hz(rootSemi + PENTA[step], 1), at, BEAT * 0.9, 0.11);
      }
    }
    // an occasional gull on the live loop (the offline render schedules them separately)
    if (duration === Infinity && Math.random() < 0.25) gull(t + Math.random() * BAR);
  };

  // Bars are scheduled strictly one after another from a single cursor, so the
  // rolling scheduler can never skip or double a bar.
  let nextBar = 0;
  let nextBarTime = t0;
  const scheduleAhead = (until: number) => {
    while (nextBarTime < until) {
      scheduleBar(nextBarTime, nextBar);
      nextBar++;
      nextBarTime += BAR;
    }
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  if (duration === Infinity) {
    scheduleAhead(t0 + 30);
    // keep roughly 30 to 60 seconds of music queued ahead of the playhead
    timer = setInterval(() => scheduleAhead(ctx.currentTime + 45), 5000);
  } else {
    scheduleAhead(t0 + duration);
    scheduleGulls(t0 + duration);
  }

  return {
    master,
    stop: () => {
      if (timer) clearInterval(timer);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => stops.forEach((s) => s()), 900);
    },
  };
}
