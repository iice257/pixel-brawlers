// Tiny WebAudio sfx synth. No audio files needed.
let ac = null;

export function initAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch { /* audio unavailable */ }
}

function tone(f0, f1, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.1) {
  if (!ac) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource();
  const g = ac.createGain();
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(g).connect(ac.destination);
  s.start();
}

const SFX = {
  whoosh: () => { noise(0.07, 0.05); tone(500, 200, 0.07, 'triangle', 0.03); },
  hit: () => { noise(0.1, 0.16); tone(220, 60, 0.12, 'square', 0.09); },
  block: () => { tone(900, 700, 0.05, 'square', 0.05); noise(0.04, 0.05); },
  ko: () => { noise(0.4, 0.2); tone(300, 40, 0.6, 'sawtooth', 0.1); },
  select: () => tone(660, 880, 0.06, 'square', 0.05),
  confirm: () => { tone(520, 520, 0.06, 'square', 0.05); tone(780, 780, 0.1, 'square', 0.05, 0.06); },
  fight: () => { tone(220, 220, 0.12, 'sawtooth', 0.08); tone(330, 330, 0.18, 'sawtooth', 0.08, 0.1); },
  proj: () => tone(400, 900, 0.18, 'sawtooth', 0.04),
};

export const sfx = (name) => SFX[name]?.();
