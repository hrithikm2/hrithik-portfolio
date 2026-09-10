import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Publish an explicit allowlist, never the repository, browser traces or caches.
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const files = [
  'index.html', 'contact.html', '404.html', '_headers',
  'css/styles.css', 'css/contact.css', 'js/app.js', 'js/data.js',
  'js/frame-loop.js', 'js/video-controller.js',
  'assets/transition-start.jpg',
  'assets/hrithik-mishra.jpg', 'assets/hrithik-mishra-resume.pdf',
  'assets/transition-mobile-v2.mp4', 'assets/transition-desktop-v2.mp4',
];
await rm(dist, { recursive: true, force: true });
for (const file of files) {
  const destination = new URL(file, dist);
  await mkdir(new URL('.', destination), { recursive: true });
  await cp(new URL(file, root), destination);
}
console.log(`Built ${files.length} public files in ${fileURLToPath(dist)}`);
