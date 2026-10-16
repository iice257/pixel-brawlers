import { W, H, GROUND, ROSTER, BOSS, QUOTES, STAT_MAX } from './config.js';
import { Fighter, resolveCombat, makeAI } from './fighters.js';
import { text, stageCanvas, STAGES, drawFighter, drawShadow, drawFx } from './render.js';
import { wasPressed, keyboardCtrl, MENU, P1, P2, SOLO } from './input.js';
import { sfx } from './audio.js';

const ACCENT = '#ffcf33';
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const dummy = (def, facing = 1, state = 'idle', t = 0) => ({ def, facing, state, t, x: 0, y: 0, atk: null });

function dim(ctx, a = 0.55) { rect(ctx, 0, 0, W, H, `rgba(4,4,10,${a})`); }

/* ---------- Generic vertical menu ---------- */
class ChoiceScene {
  constructor(game, { title, subtitle, items, stage = 0, logo = false, footer }) {
    Object.assign(this, { game, title, subtitle, items, stage, logo, footer });
    this.i = 0; this.f = 0;
  }
  update() {
    this.f++;
    if (wasPressed(MENU.up)) { this.i = (this.i + this.items.length - 1) % this.items.length; sfx('select'); }
    if (wasPressed(MENU.down)) { this.i = (this.i + 1) % this.items.length; sfx('select'); }
    if (wasPressed(MENU.ok)) { sfx('confirm'); this.items[this.i].fn(); }
  }
  draw(ctx) {
    ctx.drawImage(stageCanvas(this.stage), 0, 0);
    dim(ctx, this.logo ? 0.35 : 0.65);
    if (this.logo) {
      const bob = Math.round(Math.sin(this.f * 0.05) * 2);
      text(ctx, 'PIXEL', W / 2, 40 + bob, { size: 24, color: '#fff', align: 'center' });
      text(ctx, 'BRAWLERS', W / 2, 72 + bob, { size: 24, color: ACCENT, align: 'center' });
      const a = ROSTER[0], b = ROSTER[1];
      const fa = dummy(a, 1, 'idle', this.f), fb = dummy(b, -1, 'idle', this.f + 20);
      drawShadow(ctx, { x: 120, y: 0 }); drawShadow(ctx, { x: 360, y: 0 });
      drawFighter(ctx, fa, 120, GROUND, 1.6);
      drawFighter(ctx, fb, 360, GROUND, 1.6);
    } else {
      text(ctx, this.title, W / 2, 48, { size: 16, color: ACCENT, align: 'center' });
      if (this.subtitle) text(ctx, this.subtitle, W / 2, 76, { size: 8, color: '#cfd3ff', align: 'center' });
    }
    const top = this.logo ? 130 : 110;
    this.items.forEach((it, k) => {
      const sel = k === this.i;
      const blink = sel && Math.floor(this.f / 20) % 2 === 0;
      text(ctx, (sel ? '> ' : '  ') + it.label, W / 2, top + k * 20, { size: 8, color: sel ? (blink ? '#fff' : ACCENT) : '#9aa0c8', align: 'center' });
    });
    if (this.footer) text(ctx, this.footer, W / 2, H - 20, { size: 8, color: '#8a90b8', align: 'center' });
  }
}

/* ---------- Controls ---------- */
class ControlsScene {
  constructor(game) { this.game = game; }
  update() { if (wasPressed(MENU.ok) || wasPressed(MENU.back)) { sfx('select'); this.game.go('title'); } }
  draw(ctx) {
    ctx.drawImage(stageCanvas(1), 0, 0); dim(ctx, 0.78);
    text(ctx, 'CONTROLS', W / 2, 24, { size: 16, color: ACCENT, align: 'center' });
    const rows = [
      ['', 'PLAYER 1', 'PLAYER 2'],
      ['MOVE', 'A / D', 'LEFT / RIGHT'],
      ['JUMP', 'W', 'UP'],
      ['BLOCK', 'S', 'DOWN'],
      ['PUNCH', 'J', 'Z'],
      ['KICK (AIR OK)', 'K', 'X'],
      ['SPECIAL', 'L', 'C'],
    ];
    rows.forEach((r, i) => {
      const y = 64 + i * 22;
      const head = i === 0;
      text(ctx, r[0], 60, y, { color: '#9aa0c8' });
      text(ctx, r[1], 250, y, { color: head ? ACCENT : '#fff', align: 'center' });
      text(ctx, r[2], 380, y, { color: head ? ACCENT : '#fff', align: 'center' });
    });
    text(ctx, 'STORY MODE: EITHER KEY SET WORKS', W / 2, 232, { color: '#cfd3ff', align: 'center' });
    text(ctx, 'F = FULLSCREEN   ESC = BACK', W / 2, 248, { color: '#8a90b8', align: 'center' });
  }
}

/* ---------- Character select ---------- */
class SelectScene {
  constructor(game, { mode, picks = [] }) { Object.assign(this, { game, mode, picks }); this.i = 0; this.f = 0; }
  get who() { return this.picks.length === 0 ? 'P1' : 'P2'; }
  update() {
    this.f++;
    if (wasPressed(MENU.left)) { this.i = (this.i + ROSTER.length - 1) % ROSTER.length; sfx('select'); }
    if (wasPressed(MENU.right)) { this.i = (this.i + 1) % ROSTER.length; sfx('select'); }
    if (wasPressed(MENU.back)) { sfx('select'); this.game.go('title'); return; }
    if (wasPressed(MENU.ok)) {
      sfx('confirm');
      const picks = [...this.picks, ROSTER[this.i]];
      if (this.mode === 'story') {
        const order = [...ROSTER.filter((r) => r.id !== ROSTER[this.i].id), BOSS];
        this.game.story = { player: ROSTER[this.i], order, idx: 0 };
        this.game.go('storyIntro');
      } else if (picks.length === 1) {
        this.game.go('select', { mode: 'versus', picks });
      } else {
        this.game.go('fight', { mode: 'versus', p1: picks[0], p2: picks[1], stage: Math.floor(Math.random() * STAGES.length) });
      }
    }
  }
  draw(ctx) {
    ctx.drawImage(stageCanvas(3), 0, 0); dim(ctx, 0.72);
    const head = this.mode === 'story' ? 'CHOOSE YOUR FIGHTER' : `${this.who} SELECT`;
    text(ctx, head, W / 2, 18, { size: 16, color: ACCENT, align: 'center' });
    const cw = 96, gap = 12, x0 = (W - (ROSTER.length * cw + (ROSTER.length - 1) * gap)) / 2;
    ROSTER.forEach((r, k) => {
      const x = x0 + k * (cw + gap), y = 46, sel = k === this.i;
      rect(ctx, x - 2, y - 2, cw + 4, 104, sel ? (Math.floor(this.f / 10) % 2 ? '#fff' : ACCENT) : '#2a2d4a');
      rect(ctx, x, y, cw, 100, sel ? '#1d2040' : '#12142a');
      drawFighter(ctx, dummy(r, 1, 'idle', sel ? this.f : 0), x + cw / 2 - 4, y + 80, 1.15);
      text(ctx, r.name, x + cw / 2, y + 86, { size: 8, color: sel ? '#fff' : '#9aa0c8', align: 'center' });
    });
    const r = ROSTER[this.i];
    text(ctx, `${r.name} - ${r.title}`, W / 2, 162, { size: 8, color: ACCENT, align: 'center' });
    text(ctx, r.bio, W / 2, 178, { size: 8, color: '#cfd3ff', align: 'center' });
    const bars = [['SPD', r.speed / STAT_MAX.speed], ['PWR', r.power / STAT_MAX.power], ['JMP', r.jump / STAT_MAX.jump]];
    bars.forEach(([n, v], k) => {
      const y = 202 + k * 14;
      text(ctx, n, 150, y, { color: '#9aa0c8' });
      rect(ctx, 190, y, 100, 8, '#12142a');
      rect(ctx, 190, y, Math.round(100 * Math.min(1, v)), 8, ACCENT);
    });
    text(ctx, 'SPECIAL', 310, 202, { color: '#9aa0c8' });
    text(ctx, r.spName, 310, 218, { color: '#fff' });
    text(ctx, 'ARROWS: MOVE   ENTER / J: PICK   ESC: BACK', W / 2, 256, { color: '#8a90b8', align: 'center' });
  }
}

/* ---------- Story intro ---------- */
class StoryIntroScene {
  constructor(game) {
    this.game = game; this.f = 0;
    const s = game.story;
    this.opp = s.order[s.idx];
    this.stage = s.idx % STAGES.length;
  }
  update() {
    this.f++;
    if (wasPressed(MENU.back)) { this.game.go('title'); return; }
    if (this.f > 20 && wasPressed(MENU.ok)) {
      sfx('confirm');
      const s = this.game.story;
      this.game.go('fight', { mode: 'story', p1: s.player, p2: this.opp, stage: this.stage, level: [0.3, 0.5, 0.7, 0.95][s.idx] ?? 0.9 });
    }
  }
  draw(ctx) {
    const s = this.game.story;
    ctx.drawImage(stageCanvas(this.stage), 0, 0); dim(ctx, 0.5);
    text(ctx, `STAGE ${s.idx + 1} / ${s.order.length}`, W / 2, 20, { size: 8, color: '#cfd3ff', align: 'center' });
    text(ctx, STAGES[this.stage].name, W / 2, 34, { size: 16, color: ACCENT, align: 'center' });
    drawShadow(ctx, { x: 120, y: 0 }); drawShadow(ctx, { x: 360, y: 0 });
    drawFighter(ctx, dummy(s.player, 1, 'idle', this.f), 120, GROUND, 1.8);
    drawFighter(ctx, dummy(this.opp, -1, 'idle', this.f + 15), 360, GROUND, 1.8);
    text(ctx, 'VS', W / 2, 110, { size: 24, color: '#fff', align: 'center' });
    text(ctx, s.player.name, 120, 100, { size: 8, color: '#fff', align: 'center' });
    text(ctx, this.opp.name, 360, 100, { size: 8, color: '#fff', align: 'center' });
    rect(ctx, 40, 58, 400, 26, 'rgba(0,0,0,0.6)');
    text(ctx, `"${QUOTES[this.opp.id]}"`, W / 2, 67, { size: 8, color: '#fff', align: 'center' });
    if (Math.floor(this.f / 25) % 2 === 0) text(ctx, 'PRESS ENTER', W / 2, 252, { color: ACCENT, align: 'center' });
  }
}

/* ---------- The fight ---------- */
class FightScene {
  constructor(game, { mode, p1, p2, stage, level = 0.5 }) {
    Object.assign(this, { game, mode, stage });
    this.a = new Fighter(p1, keyboardCtrl(mode === 'story' ? SOLO : P1));
    this.b = new Fighter(p2, null);
    this.b.ctrl = mode === 'story' ? makeAI(this.b, level, () => this.a) : keyboardCtrl(P2);
    this.fighters = [this.a, this.b];
    this.wins = [0, 0]; this.round = 1; this.over = false;
    this.startRound();
  }
  startRound() {
    this.a.reset(150, 1); this.b.reset(330, -1);
    this.world = { fx: [], proj: [], hitstop: 0, shake: 0 };
    this.phase = 'intro'; this.pt = 0; this.timer = 99 * 60; this.result = null;
  }
  endRound(winner) {
    this.phase = 'ko'; this.pt = 0; this.winner = winner;
    const loser = winner === 0 ? this.b : this.a;
    if (loser.state !== 'ko') { loser.state = 'ko'; loser.t = 0; loser.vy = 3; loser.y = 0.1; loser.vx = (loser.x < this.fighters[winner].x ? -2 : 2); sfx('ko'); }
    this.fighters[winner].state = 'win'; this.fighters[winner].t = 0;
    this.timeUp = this.timer <= 0;
  }
  update() {
    const w = this.world;
    this.pt++;
    for (const e of w.fx) e.t++;
    w.fx = w.fx.filter((e) => e.t < 12);
    if (w.shake > 0) w.shake--;
    for (const f of this.fighters) f.lag += (f.hp - f.lag) * 0.06;

    if (this.phase === 'intro') {
      if (this.pt === 60) sfx('fight');
      if (this.pt >= 100) { this.phase = 'fight'; this.pt = 0; }
      return;
    }
    if (this.over) {
      this.stepFighters();
      if (this.pt > 90 && wasPressed(MENU.ok)) this.finish();
      return;
    }
    if (w.hitstop > 0) { w.hitstop--; return; }
    this.stepFighters();

    if (this.phase === 'fight') {
      this.timer--;
      resolveCombat(this.fighters, w);
      const [a, b] = this.fighters;
      if (a.hp <= 0 || b.hp <= 0 || this.timer <= 0) this.endRound(a.hp >= b.hp ? 0 : 1);
    } else if (this.phase === 'ko' && this.pt > 150) {
      this.wins[this.winner]++;
      if (this.wins[this.winner] >= 2) { this.over = true; this.pt = 0; }
      else { this.round++; this.startRound(); }
    }
  }
  stepFighters() {
    this.a.update(this.b, this.world);
    this.b.update(this.a, this.world);
  }
  finish() {
    const g = this.game;
    const win = this.winner;
    if (this.mode === 'story') {
      if (win === 0) {
        g.story.idx++;
        g.go(g.story.idx >= g.story.order.length ? 'ending' : 'storyIntro');
      } else g.go('gameover');
    } else g.go('versusEnd', { p1: this.a.def, p2: this.b.def, winner: win });
  }
  draw(ctx) {
    const w = this.world;
    ctx.save();
    if (w.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * w.shake), Math.round((Math.random() - 0.5) * w.shake));
    ctx.drawImage(stageCanvas(this.stage), 0, 0);
    for (const f of this.fighters) drawShadow(ctx, f);
    const order = this.a.state === 'ko' ? [this.b, this.a] : [this.a, this.b];
    for (const f of order) drawFighter(ctx, f, f.x, GROUND - f.y);
    drawFx(ctx, w);
    ctx.restore();
    this.drawHud(ctx);
    this.drawBanner(ctx);
  }
  drawHud(ctx) {
    const bw = 190;
    const bar = (x, f, right) => {
      rect(ctx, x - 2, 10, bw + 4, 14, '#000');
      rect(ctx, x, 12, bw, 10, '#2a2a38');
      const lw = Math.round(bw * Math.max(0, f.lag) / 100), fw = Math.round(bw * f.hp / 100);
      if (right) { rect(ctx, x, 12, lw, 10, '#e0572f'); rect(ctx, x, 12, fw, 10, '#ffd24a'); }
      else { rect(ctx, x + bw - lw, 12, lw, 10, '#e0572f'); rect(ctx, x + bw - fw, 12, fw, 10, '#ffd24a'); }
      rect(ctx, right ? x : x + bw - fw, 12, fw, 2, 'rgba(255,255,255,0.45)');
    };
    bar(20, this.a, false);
    bar(W - 20 - bw, this.b, true);
    text(ctx, this.a.def.name, 22, 28, { size: 8 });
    text(ctx, this.b.def.name, W - 22, 28, { size: 8, align: 'right' });
    const secs = Math.max(0, Math.ceil(this.timer / 60));
    text(ctx, String(secs).padStart(2, '0'), W / 2, 10, { size: 16, align: 'center', color: secs <= 10 ? '#ff6a4a' : '#fff' });
    [this.a, this.b].forEach((_, i) => {
      for (let k = 0; k < 2; k++) {
        const x = i === 0 ? 24 + k * 12 : W - 30 - k * 12;
        rect(ctx, x, 42, 8, 8, '#000');
        rect(ctx, x + 1, 43, 6, 6, k < this.wins[i] ? ACCENT : '#2a2a38');
      }
    });
  }
  drawBanner(ctx) {
    const big = (s, c = '#fff', y = 100) => text(ctx, s, W / 2, y, { size: 24, color: c, align: 'center' });
    if (this.phase === 'intro') {
      if (this.pt < 60) big(`ROUND ${this.round}`);
      else big('FIGHT!', ACCENT);
    } else if (this.phase === 'ko') {
      const name = this.fighters[this.winner].def.name;
      big(this.timeUp ? 'TIME UP' : 'K.O.', '#ff6a4a');
      if (this.pt > 70 && !this.over) text(ctx, `${name} TAKES THE ROUND`, W / 2, 140, { align: 'center' });
    }
    if (this.over) {
      dim(ctx, 0.45);
      const name = this.fighters[this.winner].def.name;
      big(`${name} WINS`, ACCENT, 90);
      if (this.pt > 90 && Math.floor(this.pt / 25) % 2 === 0) text(ctx, 'PRESS ENTER', W / 2, 150, { color: '#fff', align: 'center' });
    }
  }
}

/* ---------- Ending ---------- */
class EndingScene {
  constructor(game) { this.game = game; this.f = 0; }
  update() { this.f++; if (this.f > 60 && wasPressed(MENU.ok)) this.game.go('title'); }
  draw(ctx) {
    const p = this.game.story.player;
    ctx.drawImage(stageCanvas(0), 0, 0); dim(ctx, 0.4);
    text(ctx, 'CHAMPION', W / 2, 30, { size: 24, color: ACCENT, align: 'center' });
    drawShadow(ctx, { x: 240, y: 0 });
    drawFighter(ctx, dummy(p, 1, 'win', this.f), 240, GROUND, 2);
    text(ctx, `${p.name} TAKES THE TITLE.`, W / 2, 84, { align: 'center' });
    text(ctx, 'END OF DEMO - THANKS FOR PLAYING', W / 2, 232, { color: '#cfd3ff', align: 'center' });
    if (this.f > 60 && Math.floor(this.f / 25) % 2 === 0) text(ctx, 'PRESS ENTER', W / 2, 250, { color: ACCENT, align: 'center' });
  }
}

export const scenes = {
  title: (g) => new ChoiceScene(g, {
    logo: true, stage: 0,
    items: [
      { label: 'STORY MODE', fn: () => g.go('select', { mode: 'story' }) },
      { label: 'VERSUS 2P', fn: () => g.go('select', { mode: 'versus' }) },
      { label: 'CONTROLS', fn: () => g.go('controls') },
    ],
    footer: 'AN ORIGINAL 2D FIGHTING GAME DEMO',
  }),
  controls: (g) => new ControlsScene(g),
  select: (g, p) => new SelectScene(g, p),
  storyIntro: (g) => new StoryIntroScene(g),
  fight: (g, p) => new FightScene(g, p),
  ending: (g) => new EndingScene(g),
  gameover: (g) => new ChoiceScene(g, {
    title: 'DEFEATED', subtitle: 'EVEN CHAMPIONS GET UP AGAIN', stage: 3,
    items: [
      { label: 'RETRY FIGHT', fn: () => g.go('storyIntro') },
      { label: 'QUIT TO TITLE', fn: () => g.go('title') },
    ],
  }),
  versusEnd: (g, p) => new ChoiceScene(g, {
    title: `${(p.winner === 0 ? p.p1 : p.p2).name} WINS`, subtitle: 'REMATCH?', stage: 1,
    items: [
      { label: 'REMATCH', fn: () => g.go('fight', { mode: 'versus', p1: p.p1, p2: p.p2, stage: Math.floor(Math.random() * STAGES.length) }) },
      { label: 'NEW FIGHTERS', fn: () => g.go('select', { mode: 'versus' }) },
      { label: 'TITLE', fn: () => g.go('title') },
    ],
  }),
};
