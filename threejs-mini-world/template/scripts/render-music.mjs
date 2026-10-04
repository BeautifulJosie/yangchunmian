// Render the procedural soundtrack offline to a WAV for auditioning.
// usage: node scripts/render-music.mjs [seconds] [out.wav]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const secs = Number(process.argv[2] ?? 50);
const out = process.argv[3] ?? 'shots/audio/la-daydream.wav';
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.goto('http://localhost:5173/?shot=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__island);
const b64 = await page.evaluate(async (secs) => {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, sr * secs, sr);
  window.__island.startMusic(ctx, secs - 4);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const fade = sr * 3;
  const out = new Int16Array(L.length * 2);
  for (let i = 0; i < L.length; i++) {
    const f = Math.min(1, (L.length - i) / fade) * Math.min(1, i / (sr * 0.5));
    out[i * 2] = Math.max(-1, Math.min(1, L[i] * gain * f)) * 32767;
    out[i * 2 + 1] = Math.max(-1, Math.min(1, R[i] * gain * f)) * 32767;
  }
  const u8 = new Uint8Array(out.buffer);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return { data: btoa(s), peak };
}, secs);
console.log('peak before normalise:', b64.peak.toFixed(3));
const pcm = Buffer.from(b64.data, 'base64');
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(44100, 24);
h.writeUInt32LE(44100 * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
writeFileSync(out, Buffer.concat([h, pcm]));
console.log('wrote', out, (pcm.length / 1e6).toFixed(1), 'MB');
await browser.close();
