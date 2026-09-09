# Hrithik Mishra — The Long Road

Static Cloudflare Pages build.

## Deploy
Upload the contents of this folder (or the provided ZIP) to Cloudflare Pages.

## Current experience
- Desktop: immersive full-screen scroll-driven career journey with live 2D knight/demon world and scroll-scrubbed Flow transition video.
- Mobile: intentionally redesigned narrative-game layout with a larger cinematic stage, floating header, overlapping editorial story sheet, simplified HUD, journey progress rail, next-chapter teaser, and mobile-specific world scale/camera tuning.
- The final transition video remains scroll-scrubbed and the story UI stays present during the transition.

## Source structure

- `index.html` contains the semantic page shell and SVG scene composition.
- `css/styles.css` contains layout, responsive rules, animation keyframes, and visual tokens.
- `js/data.js` contains chapter and encounter content so copy can change without touching runtime logic.
- `js/app.js` contains scroll progress, scene transitions, encounter state, armor upgrades, responsive layout, and video handoff behavior.

The site remains dependency-free and can still be deployed as a static Cloudflare Pages build.
