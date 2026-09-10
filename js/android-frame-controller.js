/** Android Chrome fallback: render scroll position from six compact JPEG sheets. */
export function createAndroidFrameController(canvas, {
  baseUrl = 'assets/android-frames', sheetCount = 9, framesPerSheet = 12,
  columns = 4, rows = 3, frameWidth = 640, frameHeight = 360,
  createImage = () => new Image(), onFrame = () => {}, onError = () => {},
}) {
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const sheets = Array(sheetCount).fill(null);
  let desiredFrame = 0;
  let loaded = false;
  let suspended = false;
  let destroyed = false;
  let presented = false;

  function draw() {
    if (destroyed || suspended || !context) return;
    const sheetIndex = Math.floor(desiredFrame / framesPerSheet);
    const sheet = sheets[sheetIndex];
    if (!sheet) return;
    const localFrame = desiredFrame % framesPerSheet;
    const sourceX = (localFrame % columns) * frameWidth;
    const sourceY = Math.floor(localFrame / columns) * frameHeight;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.fillStyle = '#26392d';
    context.fillRect(0, 0, width, height);
    const scale = Math.min(width / frameWidth, height / frameHeight);
    const outputWidth = frameWidth * scale;
    const outputHeight = frameHeight * scale;
    context.drawImage(sheet, sourceX, sourceY, frameWidth, frameHeight,
      (width - outputWidth) / 2, (height - outputHeight) / 2, outputWidth, outputHeight);
    if (!presented) { presented = true; onFrame(); }
  }

  function loadSheet(index) {
    return new Promise((resolve, reject) => {
      const image = createImage();
      image.decoding = 'async';
      image.onload = () => { sheets[index] = image; draw(); resolve(); };
      image.onerror = () => reject(new Error(`Android frame sheet ${index + 1} failed`));
      image.src = `${baseUrl}/sheet-${String(index + 1).padStart(2, '0')}.jpg`;
    });
  }

  return {
    async load() {
      if (loaded || destroyed) return;
      loaded = true;
      try {
        await loadSheet(0);
        await Promise.all(Array.from({ length: sheetCount - 1 }, (_, index) => loadSheet(index + 1)));
      } catch (error) { if (!destroyed) onError(error); }
    },
    setProgress(progress) {
      desiredFrame = Math.round(Math.max(0, Math.min(1, progress)) * (sheetCount * framesPerSheet - 1));
      draw();
    },
    setSuspended(value) { suspended = value; if (!value) draw(); },
    destroy() { destroyed = true; sheets.fill(null); context?.clearRect(0, 0, canvas.width, canvas.height); },
  };
}
