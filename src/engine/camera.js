// Camera (pure): follows the fighters' midpoint with an ease, clamped to the stage; lifts up to 14px for jumpers.
export const CAM_W = 384;
export const CAM_EASE = 0.18;
export const MAX_LIFT = 14;
export const LIFT_AT = 78;                  // jump apex height that gives the full lift

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const targetX = (fighters, stageW) => clamp((fighters[0].x + fighters[1].x) / 2 - CAM_W / 2, 0, stageW - CAM_W);
const targetLift = (fighters) => Math.min(MAX_LIFT, (Math.max(fighters[0].y, fighters[1].y) * MAX_LIFT) / LIFT_AT);

export const createCamera = (fighters, stageW) => ({ x: targetX(fighters, stageW), lift: 0 });

export function updateCamera(cam, fighters, stageW) {
  cam.x += (targetX(fighters, stageW) - cam.x) * CAM_EASE;
  cam.lift += (targetLift(fighters) - cam.lift) * CAM_EASE;
}

// Integer render position (pixel art: no sub-pixel scrolling).
export const camPos = (cam) => ({ x: Math.round(cam.x), lift: Math.round(cam.lift) });
