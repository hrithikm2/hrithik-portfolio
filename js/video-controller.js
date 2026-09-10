/** Scroll owns the timeline; the decoder owns when the next seek may start. */
export function createScrollVideo(video, {
  url, fps = 24, fetchVideo = fetch, onFrame = () => {}, onError = () => {},
}) {
  let desired = 0;
  let duration = 0;
  let timer = null;
  let lastSeek = -Infinity;
  let loading = null;
  let objectURL = null;
  let abort = null;
  let suspended = false;
  let destroyed = false;
  let failed = false;
  let presented = false;
  const interval = 1000 / fps;
  const tolerance = 0.5 / fps;

  function cancelTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function pump() {
    if (destroyed || suspended || failed || !duration || video.seeking) return;
    const target = Math.min(desired * Math.max(0, duration - 1 / fps), duration - 0.001);
    // Do not repeatedly decode the same frame when scroll has stopped.
    if (Math.abs(video.currentTime - target) < tolerance) return;
    if (timer !== null) return;
    const wait = interval - (performance.now() - lastSeek);
    if (wait > 0) {
      timer = setTimeout(() => { timer = null; pump(); }, wait);
      return;
    }
    lastSeek = performance.now();
    try { video.currentTime = target; } catch (error) { fail(error); }
  }

  function fail(error) {
    failed = true;
    presented = false;
    cancelTimer();
    onError(error);
  }

  function metadata() {
    duration = Number.isFinite(video.duration) ? video.duration : 0;
    pump();
  }

  function frame() {
    if (destroyed || failed || video.seeking || video.readyState < 2) return;
    if (!presented) { presented = true; onFrame(); }
    // Only seek again after the browser has completed the previous decode.
    pump();
  }

  function mediaError() { fail(video.error || new Error('Video decode failed')); }
  video.addEventListener('loadedmetadata', metadata);
  video.addEventListener('loadeddata', frame);
  video.addEventListener('seeked', frame);
  video.addEventListener('error', mediaError);
  video.muted = true;
  video.playsInline = true;

  async function load() {
    if (destroyed || objectURL || loading) return loading;
    failed = false;
    abort = new AbortController();
    const timeout = setTimeout(() => abort?.abort(), 20000);
    loading = (async () => {
      try {
        // A small local Blob supports arbitrary seeks even when an intermediary
        // serves HTTP 200 for byte ranges. Fetch once; never refetch per seek.
        const response = await fetchVideo(url, { signal: abort.signal });
        if (!response.ok) throw new Error(`Video download failed: ${response.status}`);
        const blob = await response.blob();
        if (destroyed) return;
        objectURL = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }));
        video.src = objectURL;
        video.load();
      } catch (error) {
        if (!destroyed) fail(error);
      } finally {
        clearTimeout(timeout);
        loading = null;
        abort = null;
      }
    })();
    return loading;
  }

  return {
    load,
    setProgress(progress) {
      desired = Math.max(0, Math.min(1, progress));
      pump();
    },
    setSuspended(value) {
      suspended = value;
      if (value) cancelTimer(); else pump();
    },
    destroy() {
      destroyed = true;
      cancelTimer();
      abort?.abort();
      video.removeEventListener('loadedmetadata', metadata);
      video.removeEventListener('loadeddata', frame);
      video.removeEventListener('seeked', frame);
      video.removeEventListener('error', mediaError);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (objectURL) URL.revokeObjectURL(objectURL);
    },
  };
}
