import { initAudio } from './audio.js';

const down = new Set();
const pressedSet = new Set();
const BLOCK_DEFAULT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

addEventListener('keydown', (e) => {
  if (BLOCK_DEFAULT.includes(e.code)) e.preventDefault();
  if (!e.repeat) pressedSet.add(e.code);
  down.add(e.code);
  initAudio();
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());

export const isDown = (codes) => codes.some((c) => down.has(c));
export const wasPressed = (codes) => codes.some((c) => pressedSet.has(c));
export const endFrame = () => pressedSet.clear();

export const P1 = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], block: ['KeyS'],
  punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'],
};
export const P2 = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], block: ['ArrowDown'],
  punch: ['KeyZ'], kick: ['KeyX'], special: ['KeyC'],
};
// Single player can use either layout.
export const SOLO = Object.fromEntries(
  Object.keys(P1).map((k) => [k, [...P1[k], ...P2[k]]])
);

export function keyboardCtrl(map) {
  return () => ({
    left: isDown(map.left),
    right: isDown(map.right),
    up: isDown(map.up),
    block: isDown(map.block),
    punch: wasPressed(map.punch),
    kick: wasPressed(map.kick),
    special: wasPressed(map.special),
  });
}

export const MENU = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  ok: ['Enter', 'Space', 'KeyJ', 'KeyZ'], back: ['Escape', 'Backspace', 'KeyK', 'KeyX'],
};
