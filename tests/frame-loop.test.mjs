import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameLoop } from '../js/frame-loop.js';

test('coalesces wakeups, settles to zero callbacks, and cancels on suspension', () => {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const queue = new Map();
  let id = 0;
  globalThis.requestAnimationFrame = callback => { queue.set(++id, callback); return id; };
  globalThis.cancelAnimationFrame = frame => queue.delete(frame);
  try {
    let frames = 0;
    const loop = createFrameLoop(() => ++frames < 3);
    for (let i = 0; i < 100; i++) loop.wake();
    assert.equal(queue.size, 1);
    while (queue.size) {
      const [key, callback] = queue.entries().next().value;
      queue.delete(key);
      callback(frames * 16.67);
    }
    assert.equal(frames, 3);
    loop.wake();
    assert.equal(queue.size, 1);
    loop.stop();
    assert.equal(queue.size, 0);
  } finally {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});
