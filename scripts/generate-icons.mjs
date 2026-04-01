// Generate PWA icons as SVG (browsers accept SVG icons, and we'll also create a simple script)
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createSVG(size) {
  const fontSize = Math.round(size * 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#0A0A0B"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#2DD4BF">iT</text>
</svg>`;
}

// Write SVG versions
writeFileSync(join(__dirname, '..', 'public', 'icons', 'icon-192.svg'), createSVG(192));
writeFileSync(join(__dirname, '..', 'public', 'icons', 'icon-512.svg'), createSVG(512));

console.log('SVG icons generated');
