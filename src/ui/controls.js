// Controls screen (OVERHAUL_PLAN R1): the active layout drawn as a keyboard diagram, per player; pick an action and press a key to rebind it.
// Tab switches P1 / P2 / ALT (the extra 1-player layout), left/right on the top row cycles presets, conflicts are red. Saved by the caller.
import { W, H } from '../config2.js';
import { ACTIONS, ACTION_NAMES, PROFILES, PROFILE_NAMES, PRESETS, applyPreset, conflicts, keyLabel, bindLabel } from '../core/bindings.js';

const FONT = (n = 8) => `${n}px "Press Start 2P", monospace`;
const COLOR = { dir: '#35e0ff', punch: '#ffcf33', kick: '#ff9a64', block: '#6ad06a', throw: '#d070ff', bad: '#ff4d4d', idle: '#2a2146', edge: '#0a0614', text: '#e9ebff', dim: '#8a80b0' };
const actionColor = (a) => (['up', 'down', 'left', 'right'].includes(a) ? COLOR.dir : a === 'LP' || a === 'HP' ? COLOR.punch : a === 'LK' || a === 'HK' ? COLOR.kick : a === 'BL' ? COLOR.block : COLOR.throw);

// Keyboard geometry in 14px key pitch: [code, x, y, w] with x,y in key units of the main block origin.
const KEY = 13, PITCH = 14;
function layout() {
  const keys = [];
  const row = (codes, x, y) => codes.forEach((c, i) => keys.push([c, x + i * PITCH, y, KEY]));
  const L = (s) => [...s].map((c) => 'Key' + c);
  row(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => 'Digit' + d), 0, 0);
  row([...L('QWERTYUIOP'), 'BracketLeft', 'BracketRight'], 7, PITCH);
  row([...L('ASDFGHJKL'), 'Semicolon', 'Quote'], 10, PITCH * 2);
  row([...L('ZXCVBNM'), 'Comma', 'Period', 'Slash'], 17, PITCH * 3);
  keys.push(['ShiftLeft', 0, PITCH * 4, 36], ['Space', 44, PITCH * 4, 84], ['ShiftRight', 136, PITCH * 4, 36]);
  const ax = 186;
  keys.push(['ArrowUp', ax + PITCH, PITCH * 3, KEY], ['ArrowLeft', ax, PITCH * 4, KEY], ['ArrowDown', ax + PITCH, PITCH * 4, KEY], ['ArrowRight', ax + PITCH * 2, PITCH * 4, KEY]);
  const nx = 238;
  ['7', '8', '9', '4', '5', '6', '1', '2', '3'].forEach((d, i) => keys.push(['Numpad' + d, nx + (i % 3) * PITCH, PITCH * Math.floor(i / 3), KEY]));
  keys.push(['Numpad0', nx, PITCH * 3, KEY * 2 + 1], ['NumpadDecimal', nx + PITCH * 2, PITCH * 3, KEY]);
  return keys;
}
const KEYS = layout();

export function createControls(bindings, { onChange = () => {}, onExit = () => {} } = {}) {
  const s = { profile: 0, row: 0, listening: false, flash: 0, preset: 0, t: 0 };
  const prof = () => PROFILES[s.profile];
  const action = () => ACTIONS[s.row - 1];

  function key(code) {          // a raw key while "press a key" is active
    if (code === 'Escape') { s.listening = false; return; }
    const list = bindings[prof()][action()];
    const at = list.indexOf(code);
    if (at > 0) list.splice(at, 1);
    if (at !== 0) { if (at < 0) list[0] = code; else list.unshift(code); }
    s.listening = false;
    onChange(bindings);
  }

  return {
    get listening() { return s.listening; },
    key,
    nav(ev) {
      if (s.listening) return;
      if (ev === 'back') onExit();
      else if (ev === 'tab') s.profile = (s.profile + 1) % PROFILES.length;
      else if (ev === 'up') s.row = (s.row + ACTIONS.length) % (ACTIONS.length + 1);
      else if (ev === 'down') s.row = (s.row + 1) % (ACTIONS.length + 1);
      else if ((ev === 'left' || ev === 'right') && s.row === 0) {
        s.preset = (s.preset + (ev === 'right' ? 1 : PRESETS.length - 1)) % PRESETS.length;
        applyPreset(bindings, s.preset); onChange(bindings);
      } else if (ev === 'ok' && s.row > 0) s.listening = true;
    },
    draw(ctx, hasPad = 0) {
      s.t++;
      const bad = conflicts(bindings);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1030'); g.addColorStop(1, '#2c1844');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const text = (str, x, y, color, align = 'left') => { ctx.font = FONT(); ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = COLOR.edge; ctx.fillText(str, x + 1, y + 1); ctx.fillStyle = color; ctx.fillText(str, x, y); };
      text('CONTROLS', 8, 10, '#ffcf33');
      PROFILES.forEach((p, i) => text(PROFILE_NAMES[p], 120 + i * 88, 10, i === s.profile ? '#ffffff' : COLOR.dim));
      // diagram: key colour = the action it triggers for the selected profile
      const owner = {};
      for (const a of ACTIONS) for (const c of bindings[prof()][a]) owner[c] = a;
      const ox = 8, oy = 22;
      for (const [code, x, y, w] of KEYS) {
        const a = owner[code], hot = a && s.row > 0 && a === action();
        ctx.fillStyle = COLOR.edge; ctx.fillRect(ox + x - 1, oy + y - 1, w + 2, KEY + 2);
        ctx.fillStyle = a ? (bad.has(prof() + ':' + a) ? COLOR.bad : actionColor(a)) : COLOR.idle;
        ctx.fillRect(ox + x, oy + y, w, KEY);
        if (hot) { ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + x, oy + y, w, 2); }
        ctx.font = FONT(code.length > 6 || w > 20 ? 6 : 8); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const lbl = code === 'Space' ? 'SPACE' : keyLabel(code);
        ctx.fillStyle = a ? '#0a0614' : COLOR.dim; ctx.fillText(lbl, ox + x + w / 2, oy + y + KEY / 2 + 1);
      }
      // preset row + action rows
      const top = 100, rowH = 10;
      const sel = (r) => s.row === r;
      text((sel(0) ? '> ' : '  ') + 'PRESET  < ' + PRESETS[s.preset].name + ' >', 8, top, sel(0) ? '#ffffff' : COLOR.dim);
      ACTIONS.forEach((a, i) => {
        const col = i < 5 ? 0 : 1, y = top + 14 + (i % 5) * rowH, x = 8 + col * 188, r = i + 1;
        const isBad = bad.has(prof() + ':' + a);
        text((sel(r) ? '>' : ' '), x, y, '#ffffff');
        ctx.fillStyle = isBad ? COLOR.bad : actionColor(a); ctx.fillRect(x + 10, y - 3, 6, 6);
        text(ACTION_NAMES[a], x + 20, y, sel(r) ? '#ffffff' : COLOR.text);
        const lbl = s.listening && sel(r) ? (Math.floor(s.t / 20) % 2 ? 'PRESS A KEY' : '') : bindLabel(bindings, prof(), a);
        text(lbl, x + 100, y, isBad ? COLOR.bad : s.listening && sel(r) ? '#ffcf33' : '#9ad0ff');
      });
      text(bad.size ? 'RED = KEY USED TWICE' : 'PAD: X Y A B  LB BLOCK  RT THROW', 8, H - 22, bad.size ? COLOR.bad : COLOR.dim);
      text(s.listening ? 'PRESS THE NEW KEY  ESC CANCEL' : 'ENTER REBIND  TAB PLAYER  ESC BACK', 8, H - 10, COLOR.dim);
      if (hasPad) text(`PAD x${hasPad}`, W - 8, 10, '#6ad06a', 'right');
    },
  };
}
