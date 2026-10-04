import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('poster', { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const mode = process.argv[2] ?? 'all';
if (mode === 'all' || mode === 'ov') {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/?shot=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__island); await page.waitForTimeout(1500);
  const data = await page.evaluate(() => { const I = window.__island; I.camera.fov = 46; I.camera.updateProjectionMatrix(); I.camera.position.set(22, 14, 24); I.camera.lookAt(0, 3.2, 0); const pl = I.scene.getObjectByName('plane'); for (let i = 0; i < 200 && !(pl.position.x > 4.5 && pl.position.x < 7.5 && pl.position.z > 8); i++) I.advance(0.25); return I.render(); });
  writeFileSync('poster/ov.png', Buffer.from(data.split(',')[1], 'base64'));
  await page.close();
}
if (mode === 'all' || mode === 'det') {
  const page = await browser.newPage({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/?shot=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__island); await page.waitForTimeout(1500);
  const only = process.argv[3]?.split(',');
  const shots = [
    { n: 'coaster', target: 'coaster', off: [6.5, 3.6, 7.5], look: [0, 1.0, 0], fov: 34, t: 3 },
    { n: 'wheel', target: 'ferrisWheel', off: [5.4, 0.4, -3.9], look: [0, -0.2, 0], fov: 38, t: 1 },
    { n: 'bubble', target: 'char:bubbleKid', off: [0.7, 0.5, 1.3], look: [0, 0.38, 0], fov: 30, t: 1 },
    { n: 'diner', target: 'santaMonicaSign', off: [1.5, 2.8, 5.5], look: [-1.4, 0.9, -1.2], fov: 36, t: 1 },
    { n: 'pier', target: 'char:fisher', off: [4.2, 2.4, 4.2], look: [0, 0.3, 0], fov: 36, t: 1 },
    { n: 'beach', target: 'char:sandcastleKid', off: [2.8, 2.0, 3.0], look: [0.3, 0.2, 0], fov: 38, t: 1 },
    { n: 'surfer', target: 'char:surfer:18', off: [2.4, 0.9, 2.6], look: [0, 0.3, 0], fov: 34, t: 1 },
    { n: 'motel', target: 'char:poolFloat', off: [4.6, 2.4, 5.2], look: [0, 0.7, 0], fov: 38, t: 1 },
    { n: 'couple', target: 'char:couple', off: [2.0, 1.1, 2.6], look: [0, 0.55, 0], fov: 32, t: 1 },
    { n: 'taco', target: 'char:hotdogVendor', off: [3.6, 2.4, 2.8], look: [0.8, 0.5, -0.3], fov: 36, t: 1 },
  ];
  for (const s of shots) {
    if (only && !only.includes(s.n)) continue;
    const data = await page.evaluate((s) => {
      const I = window.__island; const T = window.__THREE;
      let g; I.scene.traverse(o => { if (!g && (o.name === s.target || o.name.startsWith(s.target + ':') || o.userData.sticker === s.target)) g = o; });
      const p = new T.Vector3(); g.getWorldPosition(p);
      I.camera.fov = s.fov; I.camera.updateProjectionMatrix();
      I.camera.position.set(p.x + s.off[0], p.y + s.off[1], p.z + s.off[2]);
      I.camera.lookAt(p.x + s.look[0], p.y + s.look[1], p.z + s.look[2]);
      I.advance(s.t); return I.render();
    }, s);
    writeFileSync(`poster/det-${s.n}.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  await page.close();
}
await browser.close();
