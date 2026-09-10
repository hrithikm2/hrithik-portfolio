import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollVideo } from '../js/video-controller.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
class Video extends EventTarget {
  duration = 6;
  readyState = 2;
  seeking = false;
  position = 0;
  seeks = [];
  loads = 0;
  pauses = 0;
  get currentTime() { return this.position; }
  set currentTime(value) {
    assert.equal(this.seeking, false, 'A seek must never interrupt the decoder');
    this.seeking = true;
    this.position = value;
    this.seeks.push(value);
  }
  complete() { this.seeking = false; this.dispatchEvent(new Event('seeked')); }
  load() { this.loads++; }
  pause() { this.pauses++; }
  removeAttribute() {}
}

test('coalesces a scroll burst while a slow decoder finishes, then reaches the newest frame', async () => {
  const video = new Video();
  const controller = createScrollVideo(video, { url: 'video.mp4' });
  video.dispatchEvent(new Event('loadedmetadata'));
  controller.setProgress(.1);
  for (let i = 0; i < 1000; i++) controller.setProgress(i / 999);
  await wait(60);
  assert.equal(video.seeks.length, 1);
  video.complete();
  await wait(60);
  assert.equal(video.seeks.length, 2);
  assert.equal(video.currentTime, 6 - 1 / 24);
  video.complete();
  await wait(100);
  assert.equal(video.seeks.length, 2, 'No repeated decode while stationary');
  assert.equal(video.pauses, 0, 'No play/pause priming');
  controller.destroy();
});

test('preserves the target set before metadata arrives and seeks backwards to frame zero', async () => {
  const video = new Video();
  const controller = createScrollVideo(video, { url: 'video.mp4' });
  controller.setProgress(.8);
  assert.equal(video.seeks.length, 0);
  video.dispatchEvent(new Event('loadedmetadata'));
  assert.ok(video.currentTime > 4);
  video.complete();
  controller.setProgress(0);
  await wait(60);
  assert.equal(video.currentTime, 0);
  controller.destroy();
});

test('downloads once and creates a local seekable source without range requests', async () => {
  const video = new Video();
  let fetches = 0;
  const controller = createScrollVideo(video, {
    url: 'video.mp4',
    fetchVideo: async () => { fetches++; return new Response(new Blob(['video'])); },
  });
  await Promise.all([controller.load(), controller.load(), controller.load()]);
  await controller.load();
  assert.equal(fetches, 1);
  assert.equal(video.loads, 1);
  assert.match(video.src, /^blob:/);
  controller.destroy();
});

test('failed downloads leave the poster available and allow an explicit retry', async () => {
  const video = new Video();
  let attempts = 0;
  let errors = 0;
  let frames = 0;
  const controller = createScrollVideo(video, {
    url: 'video.mp4', onError: () => errors++, onFrame: () => frames++,
    fetchVideo: async () => new Response('video', { status: ++attempts === 1 ? 503 : 200 }),
  });
  await controller.load();
  assert.equal(errors, 1);
  assert.equal(frames, 0);
  assert.equal(video.loads, 0);
  await controller.load();
  video.dispatchEvent(new Event('loadeddata'));
  assert.equal(video.loads, 1);
  assert.equal(frames, 1);
  controller.destroy();
});

test('suspension cancels pending seeks; resume jumps to the latest scroll target', async () => {
  const video = new Video();
  const controller = createScrollVideo(video, { url: 'video.mp4' });
  video.dispatchEvent(new Event('loadedmetadata'));
  controller.setProgress(.2);
  video.complete();
  controller.setProgress(.3);
  controller.setSuspended(true);
  controller.setProgress(.9);
  await wait(60);
  assert.equal(video.seeks.length, 1);
  controller.setSuspended(false);
  assert.equal(video.seeks.length, 2);
  assert.ok(video.currentTime > 5);
  controller.destroy();
});
