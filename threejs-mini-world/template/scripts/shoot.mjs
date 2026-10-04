// Render the island headlessly and save PNGs for review.
// usage: node scripts/shoot.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.goto('http://localhost:5173/?shot=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__island);
await page.waitForTimeout(1500);

const shots = [
  { name: 'sunset', cam: [21, 13, 23] },
  { name: 'sunset-low', cam: [23, 8.5, 22] },
  { name: 'sunset-close', cam: [12, 7, 14] },
];
for (const s of shots) {
  const data = await page.evaluate((s) => {
    window.__island.setCamera(...s.cam);
    window.__island.advance(2.0);
    return window.__island.render();
  }, s);
  writeFileSync(`${out}/${s.name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('saved', s.name);
}
await browser.close();
