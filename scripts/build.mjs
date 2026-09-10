import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Publish an explicit allowlist, never the repository, browser traces or caches.
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const files = [
  'index.html', 'contact.html', 'resume.html', '404.html', '_headers',
  'css/styles.css', 'css/contact.css', 'js/app.js', 'js/data.js',
  'js/frame-loop.js', 'js/video-controller.js', 'js/android-frame-controller.js',
  'assets/transition-start.jpg',
  'assets/hrithik-mishra.jpg', 'assets/hrithik-mishra-resume.pdf', 'assets/hrithik-mishra-resume.docx',
  'assets/transition-mobile-v2.mp4', 'assets/transition-desktop-v2.mp4',
  'assets/android-frames/sheet-01.jpg', 'assets/android-frames/sheet-02.jpg',
  'assets/android-frames/sheet-03.jpg', 'assets/android-frames/sheet-04.jpg',
  'assets/android-frames/sheet-05.jpg', 'assets/android-frames/sheet-06.jpg',
  'assets/android-frames/sheet-07.jpg', 'assets/android-frames/sheet-08.jpg',
  'assets/android-frames/sheet-09.jpg',
];
await rm(dist, { recursive: true, force: true });
for (const file of files) {
  const destination = new URL(file, dist);
  await mkdir(new URL('.', destination), { recursive: true });
  await cp(new URL(file, root), destination);
}
console.log(`Built ${files.length} public files in ${fileURLToPath(dist)}`);
