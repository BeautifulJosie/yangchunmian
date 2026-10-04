import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { animateIsland, buildIsland } from './scene/island';
import { SkyController, SUNSET } from './scene/sky';
import type { Water } from './scene/water';
import { animateSheet, buildCharacterSheet, buildStyleLineup } from './styleTest';
import { CameraKeys } from './cameraKeys';
import { startMusic, type MusicHandle } from './audio/music';

const params = new URLSearchParams(location.search);
const styleTest = params.get('test') === 'figures';
const sheetTest = params.get('test') === 'characters';

const app = document.getElementById('app')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, app.clientWidth / app.clientHeight, 0.1, 300);
camera.position.set(21, 13, 23);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 10;
controls.maxDistance = 60;
controls.update();

// wait for the sign fonts so canvas-drawn text uses them
if (document.fonts?.load) {
  await Promise.allSettled([document.fonts.load('700 40px Oswald'), document.fonts.load('500 40px Oswald'), document.fonts.load('900 40px Nunito')]);
}

const island = styleTest || sheetTest ? new THREE.Group() : buildIsland();
scene.add(island);
let sheet: THREE.Group | null = null;
if (styleTest) {
  scene.add(buildStyleLineup(params.get('style')));
  camera.position.set(0, 7, 12);
  controls.target.set(0.6, 0.6, 0);
  controls.update();
}
if (sheetTest) {
  sheet = buildCharacterSheet();
  scene.add(sheet);
  camera.position.set(0, 9, 14);
  controls.target.set(0, 0.5, 3);
  controls.update();
}
const water = island.getObjectByName('ocean')?.userData.water as Water | undefined;

const sky = new SkyController(scene);
if (water) sky.attachWater(water);
sky.collectLamps(island);
sky.apply(SUNSET);

// post: soft bloom so the sun, glitter and signs bleed a little
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(app.clientWidth, app.clientHeight), 0.32, 0.7, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const keys = new CameraKeys(camera, controls);
const timer = new THREE.Timer();
let elapsed = 0;

function tick(dt: number): void {
  elapsed += dt;
  animateIsland(island, elapsed, dt);
  if (sheet) animateSheet(sheet, elapsed);
  water?.update(dt);
}

function frame(): void {
  timer.update();
  const dt = timer.getDelta();
  tick(dt);
  keys.update(dt);
  controls.update();
  composer.render();
  requestAnimationFrame(frame);
}
frame();

addEventListener('resize', () => {
  camera.aspect = app.clientWidth / app.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(app.clientWidth, app.clientHeight);
  composer.setSize(app.clientWidth, app.clientHeight);
});

// audio: starts on the first click (browsers require a gesture), mute button toggles
let music: MusicHandle | null = null;
let audioCtx: AudioContext | null = null;
const enter = document.getElementById('enter');
const muteBtn = document.getElementById('mute') as HTMLButtonElement | null;
let muted = false;
function ensureMusic(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    music = startMusic(audioCtx);
  }
  void audioCtx.resume();
}
enter?.addEventListener('click', () => { enter.classList.add('hide'); if (!muted) ensureMusic(); });
muteBtn?.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '✕' : '♪';
  if (muted) music?.master.gain.linearRampToValueAtTime(0, (audioCtx?.currentTime ?? 0) + 0.4);
  else { ensureMusic(); music?.master.gain.linearRampToValueAtTime(0.9, (audioCtx?.currentTime ?? 0) + 0.4); }
});
if (styleTest || sheetTest || params.has('shot')) enter?.remove();

// Hooks used by the screenshot script and later by the UI.
Object.assign(window, {
  __island: {
    setCamera: (x: number, y: number, z: number) => { camera.position.set(x, y, z); controls.update(); },
    advance: (seconds: number) => tick(seconds),
    render: () => { composer.render(); return renderer.domElement.toDataURL('image/png'); },
    scene, renderer, sky, camera, water,
    startMusic,
  },
  __THREE: THREE,
  __x: {
  },
});
