// Pass this function to Playwright CLI run-code on the served site.
async (page) => {
  const result = { frames: [], seekMs: [] };
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
  await page.evaluate(() => {
    const video = document.querySelector('video');
    window.seekSamples = [];
    let start;
    video.addEventListener('seeking', () => { start = performance.now(); });
    video.addEventListener('seeked', () => {
      if (start !== undefined) window.seekSamples.push(performance.now() - start);
    });
  });
  for (const progress of [.8, .9, 1, .85, .5, 0]) {
    await page.evaluate(p => scrollTo(0, (document.querySelector('#journey').offsetHeight - innerHeight) * p), progress);
    await page.waitForTimeout(1400);
    const state = await page.evaluate(() => {
      const video = document.querySelector('video');
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 18;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 32, 18);
      let hash = 0;
      for (const byte of ctx.getImageData(0, 0, 32, 18).data) hash = (hash * 31 + byte) | 0;
      return { time: video.currentTime, hash, seeking: video.seeking,
        chapter: document.querySelector('#chapterIndex').textContent };
    });
    const expected = Math.max(0, Math.min(1, (progress - .78) / .205)) * (6 - 1 / 24);
    if (state.seeking || Math.abs(state.time - expected) > .06) throw new Error(`Seek failed: ${JSON.stringify(state)}`);
    result.frames.push(state);
  }
  if (new Set(result.frames.slice(0, 4).map(f => f.hash)).size !== 4) throw new Error('Video pixels did not change');
  result.seekMs = await page.evaluate(() => window.seekSamples);
  result.idleMutations = await page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const observer = new MutationObserver(records => { count += records.length; });
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 3000);
  }));
  if (result.idleMutations !== 0) throw new Error('Rendering did not settle');
  return result;
}
