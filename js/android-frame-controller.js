/** Android Chrome fallback: render scroll position from compact JPEG sheets with frame blending. */
export function createAndroidFrameController(canvas, {
  baseUrl = 'assets/android-frames',
  sheetCount = 12,
  framesPerSheet = 12,
  columns = 4,
  rows = 3,
  frameWidth = 640,
  frameHeight = 360,
  fetchImage = fetch,
  createImage = () => new Image(),
  onFrame = () => {},
  onError = () => {},
} = {}) {
  // Set fixed canvas buffer dimensions once. CSS object-fit: cover handles viewport scaling on the GPU.
  if (canvas) {
    canvas.width = frameWidth;
    canvas.height = frameHeight;
  }
  const context = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const sheets = Array(sheetCount).fill(null);
  const totalFrames = sheetCount * framesPerSheet;
  let desiredProgress = 0;
  let loaded = false;
  let suspended = false;
  let destroyed = false;
  let presented = false;

  function findNearestLoadedSheet(target) {
    for (let dist = 1; dist < sheetCount; dist++) {
      if (target - dist >= 0 && sheets[target - dist]) return target - dist;
      if (target + dist < sheetCount && sheets[target + dist]) return target + dist;
    }
    return -1;
  }

  function draw() {
    if (destroyed || suspended || !context) return;
    const progress = Math.max(0, Math.min(1, desiredProgress));
    const exactFrame = progress * (totalFrames - 1);
    const frameA = Math.floor(exactFrame);
    const frameB = Math.min(totalFrames - 1, frameA + 1);
    const blendWeight = exactFrame - frameA;

    const sheetIndexA = Math.floor(frameA / framesPerSheet);
    const localFrameA = frameA % framesPerSheet;
    const sheetA = sheets[sheetIndexA];

    if (!sheetA) {
      const nearest = findNearestLoadedSheet(sheetIndexA);
      if (nearest === -1) return;
      const fallbackSheet = sheets[nearest];
      const fallbackFrame = nearest < sheetIndexA ? (framesPerSheet - 1) : 0;
      const sx = (fallbackFrame % columns) * frameWidth;
      const sy = Math.floor(fallbackFrame / columns) * frameHeight;
      context.globalAlpha = 1;
      context.drawImage(fallbackSheet, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
      if (!presented) { presented = true; onFrame(); }
      return;
    }

    // Draw primary frame A
    const sxA = (localFrameA % columns) * frameWidth;
    const syA = Math.floor(localFrameA / columns) * frameHeight;
    context.globalAlpha = 1;
    context.drawImage(sheetA, sxA, syA, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

    // If sub-frame weight exists and frameB is available, blend frame B smoothly over frame A
    if (blendWeight > 0.01 && frameB !== frameA) {
      const sheetIndexB = Math.floor(frameB / framesPerSheet);
      const localFrameB = frameB % framesPerSheet;
      const sheetB = sheets[sheetIndexB];
      if (sheetB) {
        const sxB = (localFrameB % columns) * frameWidth;
        const syB = Math.floor(localFrameB / columns) * frameHeight;
        context.globalAlpha = blendWeight;
        context.drawImage(sheetB, sxB, syB, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        context.globalAlpha = 1;
      }
    }

    if (!presented) {
      presented = true;
      onFrame();
    }
  }

  async function loadSheet(index) {
    if (sheets[index] || destroyed) return;
    const url = `${baseUrl}/sheet-${String(index + 1).padStart(2, '0')}.jpg`;
    try {
      if (typeof createImageBitmap === 'function') {
        const response = await fetchImage(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (destroyed) return;
        const bitmap = await createImageBitmap(blob);
        if (destroyed) {
          try { bitmap.close?.(); } catch {}
          return;
        }
        sheets[index] = bitmap;
      } else {
        const img = createImage();
        img.decoding = 'async';
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Sheet ${index + 1} failed`));
          img.src = url;
          if (img.decode) {
            img.decode().then(resolve).catch(() => resolve());
          }
        });
        if (destroyed) return;
        sheets[index] = img;
      }
      draw();
    } catch (err) {
      try {
        const img = createImage();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(err);
          img.src = url;
        });
        if (destroyed) return;
        sheets[index] = img;
        draw();
      } catch (fallbackErr) {
        if (!destroyed) onError(fallbackErr);
      }
    }
  }

  return {
    async load() {
      if (loaded || destroyed) return;
      loaded = true;
      try {
        // Step 1: Load sheet 0 immediately so frame 0 is ready for the handoff
        await loadSheet(0);
        if (destroyed) return;
        // Step 2: Stream remaining sheets in concurrent batches
        const batchSize = 3;
        for (let i = 1; i < sheetCount; i += batchSize) {
          if (destroyed) return;
          const batch = [];
          for (let j = i; j < Math.min(sheetCount, i + batchSize); j++) {
            batch.push(loadSheet(j));
          }
          await Promise.all(batch);
        }
      } catch (error) {
        if (!destroyed) onError(error);
      }
    },
    setProgress(progress) {
      desiredProgress = progress;
      draw();
    },
    setSuspended(value) {
      suspended = value;
      if (!value) draw();
    },
    destroy() {
      destroyed = true;
      for (let i = 0; i < sheets.length; i++) {
        if (sheets[i]?.close) {
          try { sheets[i].close(); } catch {}
        }
        sheets[i] = null;
      }
      if (context && canvas) {
        try { context.clearRect(0, 0, canvas.width, canvas.height); } catch {}
      }
    },
  };
}
