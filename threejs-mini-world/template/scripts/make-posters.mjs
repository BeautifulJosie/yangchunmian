// Compose the poster PNGs (3:4, 2160x2880) from poster/p*.html and the shots next to them.
// usage: node scripts/make-posters.mjs
// First run `node scripts/shoot-poster-shots.mjs` so poster/ov.png and poster/det-*.png exist.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const dir = resolve('poster');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
  const file = join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(8765, '127.0.0.1', r));

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 2 });
for (const n of ['p1', 'p2', 'p3', 'p4']) {
  await page.goto(`http://127.0.0.1:8765/${n}.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${n}.png`, clip: { x: 0, y: 0, width: 1080, height: 1440 } });
  console.log('saved', `poster/${n}.png`);
}
await browser.close();
server.close();
