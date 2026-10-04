import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1800, height: 800 } });
page.on('pageerror', (e) => console.log('[error]', e.message));
const styles = { A: 'bean', B: 'chibi', C: 'round', D: 'kokeshi' };
const shots = Object.entries(styles).map(([n, key]) => ({ name: `style-${n}`, key, cam: [0.8, 2.6, 10.8], target: [0.8, 0.35, 0] }));
for (const s of shots) {
  await page.goto('http://localhost:5173/?test=figures&style=' + s.key, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__island); await page.waitForTimeout(900);
  const data = await page.evaluate((s) => { const I = window.__island; I.camera.position.set(...s.cam); I.camera.lookAt(...s.target); return I.render(); }, s);
  writeFileSync(`shots/${s.name}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();
