/** Run only while scroll interpolation needs another frame. */
export function createFrameLoop(render) {
  let frame = null;
  let previous = null;
  function tick(now) {
    frame = null;
    const dt = previous === null ? 16.67 : Math.min(32, now - previous);
    previous = now;
    if (render(now, dt)) frame = requestAnimationFrame(tick);
    else previous = null;
  }
  return {
    wake() {
      if (frame === null) frame = requestAnimationFrame(tick);
    },
    stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    },
  };
}
