// /framedata.html: the frame data table, rendered straight from src/data/moves-template.js through engine/moves.js.
import { allMoves, advantage, moveTotal, fmtAdv } from '../engine/moves.js';

const FIGHTERS = ['template', 'surge', 'brick'];
const INPUT = { LP: '5 + LP', HP: '5 + HP', LK: '5 + LK', HK: '5 + HK', '2LP': '2 + LP', '2LK': '2 + LK', '2HP': '2 + HP', '2HK': '2 + HK',
  jLP: 'air LP', jHP: 'air HP', jLK: 'air LK', jHK: 'air HK', throw: 'LP + LK close' };
const LEVEL = { H: 'High', M: 'Mid', L: 'Low', O: 'Overhead', T: 'Throw' };
const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
let fighter = FIGHTERS.includes(qs.get('fighter')) ? qs.get('fighter') : 'template';

const cancelText = (m) => (m.cancels.length ? [...new Set(m.cancels.map((c) => c.into))].join(', ') : 'none');

function render() {
  const base = Object.fromEntries(allMoves('template').map((m) => [m.id, m]));
  const rows = allMoves(fighter).map((m) => {
    const h = m.hits[0], adv = advantage(m);
    const diff = (k) => { const b = base[m.id]; return k === 'sar' ? [m.startup, m.active, m.recovery].join() !== [b.startup, b.active, b.recovery].join() : false; };
    const changed = fighter !== 'template' && (diff('sar') || h.dmg !== base[m.id].hits[0].dmg || h.box.join() !== base[m.id].hits[0].box.join());
    const total = moveTotal(m) + (m.landLag ? ` (+${m.landLag} land)` : '');
    const stunTxt = m.id === 'throw' ? '-' : h.kd ? 'KD ' + h.kd : h.launch ? 'launch' : `${h.hs}/${h.bs}`;
    const stunFull = h.kd || h.launch ? `${stunTxt} / ${h.bs}` : stunTxt;
    return `<tr class="${changed ? 'mod' : ''}">
      <td class="id">${m.id}</td><td class="in">${INPUT[m.id]}</td>
      <td class="num">${m.startup}/${m.active}/${m.recovery || '-'}</td><td class="num dim">${total}</td>
      <td class="num">${h.dmg}</td><td><span class="lv lv-${h.level}">${LEVEL[h.level]}</span></td>
      <td class="num">${stunFull}</td>
      <td class="num adv ${cls(adv.hit)}">${fmtAdv(adv.hit)}</td><td class="num adv ${cls(adv.block)}">${fmtAdv(adv.block)}</td>
      <td class="num">${m.id === 'throw' ? '-' : `${h.pbHit}/${h.pbBlock}`}</td>
      <td class="num">${h.box.join(', ')}</td><td class="num">${h.hitstop}</td><td class="dim">${cancelText(m)}</td></tr>`;
  });
  $('body').innerHTML = rows.join('');
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.f === fighter));
  $('note').textContent = fighter === 'template' ? 'Universal template (GAME_DESIGN 3.1).' : `${fighter.toUpperCase()}: template with the 3.3 modifiers applied. Changed rows are highlighted.`;
}
const cls = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero');

$('nav').innerHTML = FIGHTERS.map((f) => `<button data-f="${f}">${f}</button>`).join('');
$('nav').onclick = (e) => { const f = e.target.dataset?.f; if (f) { fighter = f; render(); } };
render();
