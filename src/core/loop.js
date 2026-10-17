// Fixed-timestep loop: an accumulator drives `step()` at exactly `hz` per second, `render()` runs once per animation frame.
// Browser-side helper (uses rAF + the clock); the engine itself never sees time.
export function createLoop({ step, render, hz = 60, maxSteps = 6, now = () => performance.now(), raf = (f) => requestAnimationFrame(f) }) {
  const dt = 1000 / hz;
  const stats = { fps: 0, stepMs: 0, steps: 0 };
  let acc = 0, last = 0, running = false, frames = 0, fpsT = 0;
  function frame(t) {
    if (!running) return;
    acc += Math.min(t - last, dt * maxSteps);          // after a stall, run at most maxSteps catch-up ticks
    last = t;
    const t0 = now();
    let n = 0;
    while (acc >= dt) { step(); acc -= dt; n++; }
    stats.stepMs = now() - t0; stats.steps = n;
    render(acc / dt);
    frames++;
    if (t - fpsT >= 500) { stats.fps = Math.round((frames * 1000) / (t - fpsT)); frames = 0; fpsT = t; }
    raf(frame);
  }
  return {
    stats,
    start() { if (running) return; running = true; acc = 0; last = now(); fpsT = last; raf((t) => { last = t; fpsT = t; frame(t); }); },
    stop() { running = false; },
  };
}
