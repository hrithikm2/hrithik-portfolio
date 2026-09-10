# Hrithik Mishra — The Long Road

Static Cloudflare Pages build.

## Deploy
Build an isolated public directory, then deploy it to Cloudflare Pages:

```bash
npm run build
npx wrangler pages deploy dist --project-name hrithik-portfolio
```

## Current experience
- Desktop: immersive full-screen scroll-driven career journey with live 2D knight/demon world and scroll-scrubbed Flow transition video.
- Mobile: intentionally redesigned narrative-game layout with a larger cinematic stage, floating header, overlapping editorial story sheet, simplified HUD, journey progress rail, next-chapter teaser, and mobile-specific world scale/camera tuning.
- The final transition video remains scroll-scrubbed and the story UI stays present during the transition.

## Source structure

- `index.html` contains the semantic page shell and SVG scene composition.
- `css/styles.css` contains layout, responsive rules, animation keyframes, and visual tokens.
- `js/data.js` contains chapter and encounter content so copy can change without touching runtime logic.
- `js/app.js` contains scroll progress, scene transitions, encounter state, armor upgrades, responsive layout, and video handoff behavior.

`js/video-controller.js` owns download, decode readiness and serialized scroll seeks.
`js/frame-loop.js` schedules rendering only while scroll position is settling.

The site has no runtime dependencies. Node is only needed for the allowlist build
and regression tests. `wrangler.toml` points to `dist`; do not deploy the repository
root, which contains source assets, local caches and test artifacts.

## Local development and checks

```bash
npm test
npm run build
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765`. Rebuild after edits. ES modules require HTTP rather
than opening `index.html` directly from disk.

`scripts/verify-browser.js` is a Playwright CLI `run-code` function that checks
actual decoded pixels, forward/backward seeks and zero DOM mutations at rest.
See [performance notes](docs/performance.md) for measurements and limitations.

## Transition video

The controller selects a 768×432 mobile encode or a 1280×720 desktop encode once
per page load. Both preserve the six-second, 24 fps source and have independently
decodable H.264 frames, no audio and fast-start metadata. The 53 KB JPEG provides
the handoff while the chosen clip downloads once into a Blob URL. This avoids
reliance on HTTP byte-range support for seeking. No autoplay is required.

To regenerate from the original high-quality clip:

```bash
FFMPEG=/path/to/ffmpeg bash scripts/encode-media.sh /path/to/original.mp4
```

If the media changes after publication, bump its `v2` filenames in the encoder,
controller selection, build allowlist and `_headers` before deploying, because
versioned media is cached immutably. HTML, JS and CSS revalidate on reload.
The legacy media stays in source history/the working repository for reference;
only the two selected variants and the JPEG poster are copied into `dist`.
