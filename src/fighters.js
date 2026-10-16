import { W } from './config.js';
import { sfx } from './audio.js';

const ATTACKS = {
  punch: { start: 3, active: 3, rec: 8, dmg: 6, reach: 26, lo: 30, hi: 50, stun: 15, kb: 1.8, melee: true },
  kick: { start: 6, active: 4, rec: 12, dmg: 10, reach: 34, lo: 8, hi: 36, stun: 20, kb: 3.4, melee: true },
};

const SPECIALS = {
  dash: { type: 'dash', start: 8, active: 14, rec: 18, dmg: 13, reach: 26, lo: 10, hi: 52, stun: 24, kb: 5, melee: true },
  slam: { type: 'slam', start: 16, active: 4, rec: 24, dmg: 18, reach: 46, lo: 0, hi: 32, stun: 30, kb: 6, melee: true },
  bolt: { type: 'proj', start: 10, active: 1, rec: 20, dmg: 9, speed: 3.4, r: 4, stun: 18, kb: 2.5, melee: false, color: '#b6ff6a' },
  orb: { type: 'proj', start: 14, active: 1, rec: 26, dmg: 13, speed: 2.2, r: 7, stun: 24, kb: 3.5, melee: false, color: '#c58bff' },
};

const HURT_HALF_W = 11;
const HURT_H = 54;
const GRAVITY = 0.32;

export class Fighter {
  constructor(def, ctrl) {
    this.def = def;
    this.ctrl = ctrl;
    this.reset(120, 1);
  }

  reset(x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.hp = 100; this.lag = 100;
    this.state = 'idle'; this.t = 0;
    this.atk = null; this.hitDone = false; this.spCd = 0;
  }

  get airborne() { return this.y > 0; }

  face(opp) { this.facing = opp.x >= this.x ? 1 : -1; }

  startAttack(name) {
    const base = name === 'special' ? SPECIALS[this.def.special] : ATTACKS[name];
    this.atk = { ...base, name };
    this.state = 'attack'; this.t = 0; this.hitDone = false;
    if (name === 'special') this.spCd = 55;
    sfx(base.type === 'proj' ? 'proj' : 'whoosh');
  }

  update(opp, world) {
    this.t++;
    if (this.spCd > 0) this.spCd--;

    if (this.y > 0) {
      this.vy -= GRAVITY;
      this.y += this.vy;
      if (this.y <= 0) { this.y = 0; this.vy = 0; if (this.state === 'jump') this.state = 'idle'; }
    }
    this.x = Math.max(16, Math.min(W - 16, this.x + this.vx));

    if (this.state === 'ko') { if (!this.airborne) this.vx *= 0.88; return; }
    if (this.state === 'win') { this.vx = 0; return; }

    if (this.state === 'hit') {
      this.vx *= 0.88;
      if (this.t >= this.stunFrames) this.state = this.airborne ? 'jump' : 'idle';
      return;
    }

    if (this.state === 'attack') { this.tickAttack(world); return; }

    const c = this.ctrl();
    if (!this.airborne) {
      this.face(opp);
      if (c.block) { this.state = 'block'; this.vx = 0; return; }
      if (c.punch) return this.startAttack('punch');
      if (c.kick) return this.startAttack('kick');
      if (c.special && this.spCd <= 0) return this.startAttack('special');
      const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      const back = dir !== 0 && dir !== this.facing;
      this.vx = dir * 1.9 * this.def.speed * (back ? 0.8 : 1);
      this.state = dir ? 'walk' : 'idle';
      if (c.up) { this.vy = 7.4 * this.def.jump; this.y = 0.1; this.state = 'jump'; }
    } else if (c.kick) {
      this.startAttack('kick');
    }
  }

  tickAttack(world) {
    const a = this.atk;
    if (this.t === a.start) {
      if (a.type === 'proj') {
        world.proj.push({
          x: this.x + this.facing * 20, y: this.y + 38, vx: this.facing * a.speed,
          att: a, owner: this, dead: false, age: 0,
        });
      }
    }
    if (!this.airborne) {
      if (a.type === 'dash' && this.t >= a.start && this.t < a.start + a.active) this.vx = this.facing * 5 * this.def.speed;
      else this.vx *= 0.8;
    }
    if (this.t >= a.start + a.active + a.rec) this.state = this.airborne ? 'jump' : 'idle';
  }

  get hitActive() {
    const a = this.atk;
    return this.state === 'attack' && a.melee && !this.hitDone && this.t >= a.start && this.t < a.start + a.active;
  }

  // Returns true if this fighter's active melee hitbox overlaps `foe`.
  hits(foe) {
    const a = this.atk;
    const x1 = this.x + this.facing * 8;
    const x2 = this.x + this.facing * (8 + a.reach);
    const [l, r] = x1 < x2 ? [x1, x2] : [x2, x1];
    const xOk = r > foe.x - HURT_HALF_W && l < foe.x + HURT_HALF_W;
    const yOk = this.y + a.hi > foe.y && this.y + a.lo < foe.y + HURT_H;
    return xOk && yOk;
  }

  takeHit(att, owner, srcX, world) {
    if (this.state === 'ko') return false;
    const side = srcX >= this.x ? 1 : -1;
    const dmg = Math.round(att.dmg * owner.def.power);
    const blocking = this.state === 'block' && this.facing === side;
    if (blocking) {
      this.hp -= Math.max(1, Math.round(dmg * 0.15));
      this.vx = -side * att.kb * 0.6;
      this.t = 0;
      world.fx.push({ x: this.x + side * 12, y: this.y + 38, t: 0, kind: 'block' });
      world.hitstop = 3;
      sfx('block');
    } else {
      this.hp -= dmg;
      this.state = 'hit'; this.t = 0; this.stunFrames = att.stun;
      this.vx = -side * att.kb;
      if (this.airborne) this.vy = Math.max(this.vy, 2.5);
      world.fx.push({ x: this.x + side * 6, y: this.y + 36, t: 0, kind: 'hit' });
      world.hitstop = 6;
      world.shake = Math.max(world.shake, 5);
      sfx('hit');
    }
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'ko'; this.t = 0;
      this.vx = -side * 3; this.vy = 4.2; this.y = Math.max(this.y, 0.1);
      world.shake = 14; world.hitstop = 14;
      sfx('ko');
    }
    return true;
  }
}

export function resolveCombat(fighters, world) {
  const [p1, p2] = fighters;
  for (const [a, b] of [[p1, p2], [p2, p1]]) {
    if (a.hitActive && a.hits(b)) {
      a.hitDone = true;
      b.takeHit(a.atk, a, a.x, world);
    }
  }
  for (const p of world.proj) {
    p.x += p.vx; p.age++;
    if (p.x < -20 || p.x > W + 20) p.dead = true;
    const foe = p.owner === p1 ? p2 : p1;
    if (!p.dead && foe.state !== 'ko') {
      const r = p.att.r;
      const xOk = Math.abs(p.x - foe.x) < HURT_HALF_W + r;
      const yOk = p.y + r > foe.y && p.y - r < foe.y + HURT_H;
      if (xOk && yOk) { p.dead = true; foe.takeHit(p.att, p.owner, p.x, world); }
    }
  }
  world.proj = world.proj.filter((p) => !p.dead);

  // Keep fighters from overlapping on the ground.
  const gap = Math.abs(p1.x - p2.x);
  if (gap < 18 && !p1.airborne && !p2.airborne && p1.state !== 'ko' && p2.state !== 'ko') {
    const push = (18 - gap) / 2 * (p1.x <= p2.x ? 1 : -1);
    p1.x = Math.max(16, Math.min(W - 16, p1.x - push));
    p2.x = Math.max(16, Math.min(W - 16, p2.x + push));
  }
}

export function makeAI(self, level, getOpp) {
  let cd = 40;
  let blockT = 0;
  const projectile = SPECIALS[self.def.special].type === 'proj';
  return () => {
    const o = getOpp();
    const c = { left: false, right: false, up: false, block: false, punch: false, kick: false, special: false };
    const dx = o.x - self.x;
    const dist = Math.abs(dx);
    const toward = () => { if (dx > 0) c.right = true; else c.left = true; };
    const away = () => { if (dx > 0) c.left = true; else c.right = true; };

    if (o.state === 'attack' && dist < 70 && blockT <= 0 && Math.random() < 0.05 + 0.12 * level) {
      blockT = 16 + Math.random() * 14;
    }
    if (blockT > 0) { blockT--; c.block = true; return c; }

    cd--;
    if (dist > 62) {
      toward();
      if (projectile && dist > 110 && cd <= 0 && Math.random() < 0.04) { c.special = true; cd = 50; }
      else if (Math.random() < 0.004 + 0.004 * level) c.up = true;
    } else if (dist < 26 && Math.random() < 0.25 * level) {
      away();
    } else if (cd <= 0) {
      const r = Math.random();
      if (r < 0.45) c.punch = true;
      else if (r < 0.8) c.kick = true;
      else if (!projectile) c.special = true;
      else c.kick = true;
      cd = Math.floor(Math.max(14, 62 - level * 42) * (0.6 + Math.random() * 0.8));
    } else if (dist > 42) {
      toward();
    }
    return c;
  };
}
