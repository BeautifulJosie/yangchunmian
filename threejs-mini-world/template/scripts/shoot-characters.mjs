// Render each character sticker on its own, then the caller stitches a sheet.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('shots/chars', { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 520, height: 520 } });
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.goto('http://localhost:5173/?test=characters', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__island); await page.waitForTimeout(1200);
const n = await page.evaluate(() => window.__island.scene.children.filter(o => o.name).length);
const ids = await page.evaluate(() => { const out = []; window.__island.scene.traverse(o => { if (o.name?.startsWith('char:')) out.push(o.name.slice(5)); }); return out; });
for (const id of ids) {
  const data = await page.evaluate((id) => { const I = window.__island; const T = window.__THREE; const g = I.scene.getObjectByName('char:' + id); const p = new T.Vector3(); g.getWorldPosition(p); I.camera.position.set(p.x + 0.3, p.y + 1.9, p.z + 3.9); I.camera.lookAt(p.x, p.y + 0.55, p.z + 0.1); I.advance(0.9); return I.render(); }, id);
  writeFileSync(`shots/chars/${id}.png`, Buffer.from(data.split(',')[1], 'base64'));
}
console.log(ids.join(','));
await browser.close();
