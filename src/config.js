// Shared constants and original character data. Everything here is original IP.
export const W = 480;
export const H = 270;
export const GROUND = 228;

export const ROSTER = [
  {
    id: 'kaze', name: 'KAZE', title: 'THE GALE',
    skin: '#f1c27d', suit: '#2f6bff', trim: '#9fd0ff', hair: '#12121c', shoe: '#10152e',
    speed: 1.3, jump: 1.1, power: 0.9, special: 'dash', spName: 'GALE RUSH',
    bio: 'Street racer turned fighter. Fast hands, faster feet.',
  },
  {
    id: 'brutus', name: 'BRUTUS', title: 'THE WALL',
    skin: '#c68642', suit: '#c62828', trim: '#ffb74d', hair: '#2a1608', shoe: '#2a0d0d',
    speed: 0.85, jump: 0.9, power: 1.3, special: 'slam', spName: 'QUAKE FIST',
    bio: 'Dock-yard bruiser. Slow to start, impossible to stop.',
  },
  {
    id: 'vex', name: 'VEX', title: 'THE VIPER',
    skin: '#e0ac69', suit: '#1f9d55', trim: '#b6ff6a', hair: '#d6ff4a', shoe: '#0c2a18',
    speed: 1.05, jump: 1.0, power: 1.0, special: 'bolt', spName: 'TOXIC BOLT',
    bio: 'Chemist with a grudge. Controls space from across the stage.',
  },
  {
    id: 'nyx', name: 'NYX', title: 'THE ECLIPSE',
    skin: '#8d5524', suit: '#7b2fd0', trim: '#e0a8ff', hair: '#f4f0ff', shoe: '#1b0b33',
    speed: 1.0, jump: 1.2, power: 1.05, special: 'orb', spName: 'VOID ORB',
    bio: 'Night-shift monk. Slow orbs, heavy damage, scary patience.',
  },
];

export const BOSS = {
  id: 'omega', name: 'OMEGA', title: 'THE FINAL BRACKET',
  skin: '#d9b38c', suit: '#15151c', trim: '#ffcf33', hair: '#ffcf33', shoe: '#000000',
  speed: 1.15, jump: 1.1, power: 1.3, special: 'orb', spName: 'ECLIPSE BEAM',
  bio: 'Nobody has seen the final round and left.',
};

export const QUOTES = {
  kaze: 'Blink and you will miss the fight.',
  brutus: 'You hit like a breeze. I am the wall.',
  vex: 'Stay still. The poison works faster.',
  nyx: 'The void has been waiting for you.',
  omega: 'I am the last round. Nobody leaves.',
};

export const STAT_MAX = { speed: 1.4, power: 1.4, jump: 1.3 };
