import test from "node:test";
import assert from "node:assert/strict";
import { createAndroidFrameController } from "../js/android-frame-controller.js";

class MockContext {
  globalAlpha = 1;
  draws = [];
  drawImage(...args) {
    this.draws.push({ args, alpha: this.globalAlpha });
  }
  clearRect() {
    this.draws = [];
  }
}

class MockCanvas {
  width = 0;
  height = 0;
  constructor() {
    this.ctx = new MockContext();
  }
  getContext() {
    return this.ctx;
  }
}

class MockImage {
  src = "";
  decoding = "";
  onload = null;
  onerror = null;
  decode() {
    return Promise.resolve();
  }
}

test("sets fixed canvas dimensions on initialization and avoids per-draw resizing", () => {
  const canvas = new MockCanvas();
  const controller = createAndroidFrameController(canvas, {
    frameWidth: 640,
    frameHeight: 360,
  });
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  canvas.width = 640;
  controller.setProgress(0.5);
  // Dimensions remain fixed
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  controller.destroy();
});

test("loads sheet 0 first and fires onFrame, then loads subsequent sheets", async () => {
  const canvas = new MockCanvas();
  let frameFired = 0;
  const createdImages = [];

  const controller = createAndroidFrameController(canvas, {
    sheetCount: 4,
    framesPerSheet: 12,
    createImage: () => {
      const img = new MockImage();
      createdImages.push(img);
      setTimeout(() => {
        if (img.onload) img.onload();
      }, 5);
      return img;
    },
    onFrame: () => {
      frameFired++;
    },
  });

  const loadPromise = controller.load();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(frameFired >= 1, "onFrame must be called once sheet 0 is ready");
  await loadPromise;
  assert.equal(createdImages.length, 4, "All 4 sheets must be loaded");
  controller.destroy();
});

test("blends frame A and frame B smoothly on fractional progress", async () => {
  const canvas = new MockCanvas();
  const createdImages = [];

  const controller = createAndroidFrameController(canvas, {
    sheetCount: 2,
    framesPerSheet: 12,
    frameWidth: 640,
    frameHeight: 360,
    createImage: () => {
      const img = new MockImage();
      createdImages.push(img);
      setTimeout(() => img.onload && img.onload(), 5);
      return img;
    },
  });

  await controller.load();
  canvas.ctx.draws = [];

  // Total frames: 24 (0 to 23). Progress: frame 0.4
  // exactFrame = 0.4 * 23 = 9.2 -> frameA = 9, frameB = 10, blendWeight = 0.2
  controller.setProgress(9.2 / 23);

  assert.equal(canvas.ctx.draws.length, 2, "Must draw base frame and blend overlay frame");
  assert.equal(canvas.ctx.draws[0].alpha, 1, "Base frame has alpha 1");
  assert.ok(Math.abs(canvas.ctx.draws[1].alpha - 0.2) < 0.001, "Overlay frame has fractional blend alpha");

  // Verify coordinates: frame 9 is col 1, row 2 -> x = 640, y = 720
  assert.equal(canvas.ctx.draws[0].args[1], 640);
  assert.equal(canvas.ctx.draws[0].args[2], 720);
  // Frame 10 is col 2, row 2 -> x = 1280, y = 720
  assert.equal(canvas.ctx.draws[1].args[1], 1280);
  assert.equal(canvas.ctx.draws[1].args[2], 720);

  controller.destroy();
});

test("falls back to nearest loaded sheet when requested sheet is still downloading", async () => {
  const canvas = new MockCanvas();
  let loadSheetCount = 0;

  const controller = createAndroidFrameController(canvas, {
    sheetCount: 4,
    framesPerSheet: 12,
    createImage: () => {
      const img = new MockImage();
      const idx = loadSheetCount++;
      // Only sheet 0 completes quickly; sheet 3 takes long
      if (idx === 0) {
        setTimeout(() => img.onload && img.onload(), 5);
      }
      return img;
    },
  });

  // Start loading, wait only for sheet 0
  controller.load();
  await new Promise((r) => setTimeout(r, 20));

  canvas.ctx.draws = [];
  // Scrub to progress in sheet 3 (e.g. 0.95)
  controller.setProgress(0.95);

  // Sheet 3 not ready, should fall back to nearest loaded sheet (sheet 0)
  assert.ok(canvas.ctx.draws.length >= 1, "Must draw nearest loaded sheet fallback");
  assert.equal(canvas.ctx.draws[0].alpha, 1);

  controller.destroy();
});

test("suspension pauses drawing and destruction clears resources", async () => {
  const canvas = new MockCanvas();
  const controller = createAndroidFrameController(canvas, {
    sheetCount: 2,
    framesPerSheet: 12,
    createImage: () => {
      const img = new MockImage();
      setTimeout(() => img.onload && img.onload(), 5);
      return img;
    },
  });

  await controller.load();
  canvas.ctx.draws = [];

  controller.setSuspended(true);
  controller.setProgress(0.5);
  assert.equal(canvas.ctx.draws.length, 0, "No drawing while suspended");

  controller.setSuspended(false);
  assert.ok(canvas.ctx.draws.length > 0, "Draws resumed target");

  controller.destroy();
  canvas.ctx.draws = [];
  controller.setProgress(0.8);
  assert.equal(canvas.ctx.draws.length, 0, "No drawing after destroy");
});
