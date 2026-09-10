# Video and rendering performance — 2026-09-10

## Observed failure

On the previous production page, Chromium reported readyState 4 for the video but
only a [0, 0] seekable interval. The video stayed at time zero after scrolling to
the transition. This is stronger evidence than the earlier HEAD request, which
does not establish how a server handles a ranged GET. There was also a perpetual
animation loop, repeated armor/DOM writes, layout reads following style writes,
and a seek throttle that could create several outstanding timers.

The new controller downloads one selected clip to a Blob URL, waits for metadata,
and allows one in-flight seek plus the latest desired timestamp. The next seek
waits for `seeked`, which signals completion ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event)).
It never plays and immediately pauses the video to prime it. A failed download
keeps the handoff image visible and can retry on a pointer interaction.

## Measurements

Measured with Playwright-controlled Chromium on this Mac; these are browser
measurements, not physical device thermal or battery measurements.

| Measurement | Previous production | Optimized local build |
| --- | ---: | ---: |
| Video bytes downloaded on mobile | 4,758,593 | 1,687,965 (64.5% less) |
| Desktop video bytes | 4,758,593 | 3,308,240 |
| Handoff image bytes, approximate | 525 KB PNG | 53 KB JPEG |
| DOM mutations over 3 seconds at rest | 3,960 | 0 |
| Layouts over 3 seconds at rest | 361 | 0 |
| Main-thread task time over that idle interval | 574 ms | 1.1 ms |
| Seekable interval | [0, 0] | [0, 6] |

A cold 390×844 load with cache disabled, 150 ms network latency, 1.6 Mbps download
and 4× CPU slowdown reached decoded video data in 10.5 seconds. Once downloaded,
four forward/reverse scroll jumps settled in 233–775 ms including scroll easing.
Their pixel hashes were distinct, confirming real frames, not just updated times.
Without throttling, observed seek-to-seeked times were approximately 1–10 ms.
All 144 frames of the mobile encode were verified as keyframes with FFmpeg.

## Checks

- Node tests cover decoder backpressure, a 1,000-update burst, reverse seeking,
  late metadata, single download, failed-download retry, suspension and idle-loop scheduling.
- Browser checks compare decoded pixels at four timestamps, reverse through the
  career chapters, and require zero DOM mutations after settling.
- A blocked MP4 request left the JPEG visible and story usable; unblocking the
  request and interacting recovered the current scroll timestamp.
- Static output is built from an 11-file allowlist. No source tooling or browser
  traces are published.

WebKit 26.5 was installed for an iPhone-emulation check but its browser process
segfaulted before opening a page on this host. Native Safari/iPhone behavior and
temperature reduction therefore remain unverified. The slow-network numbers are
a simulation, not a promise of identical load times on every connection.

## Reproduction

Run `npm test`, `npm run build`, and serve `dist` over HTTP. Open it using
Playwright CLI, choose a mobile viewport before navigation, and pass the function
in `scripts/verify-browser.js` to `run-code`. For the cold-load experiment, disable
cache, apply 150 ms latency / 200,000 bytes per second and 4× CPU throttling before
navigation, then wait for video readyState >= 2 and compare pixels after seeking.
