import * as THREE from 'three';
import { NIGHT_LIGHT } from './props';
import type { Water } from './water';

/**
 * One look for now: the classic California sunset. Night and seasons will be
 * added later as further `SkyLook` presets layered on the same controller.
 */
export interface SkyLook {
  sunDir: THREE.Vector3; // direction the light comes from
  discPos: THREE.Vector3; // where the visible sun disc sits (the backdrop is art, not astronomy)
  horizonLift: number; // shifts the dome gradient up so it shows in a top-down framing
  sunColor: number;
  sunIntensity: number;
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  sunGlow: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  fill: number;
  fillIntensity: number;
  waterShallow: number;
  waterDeep: number;
  waterSky: number;
  glitter: number;
  lamps: number;
  sunDiscSize: number;
}

export const SUNSET: SkyLook = {
  sunDir: new THREE.Vector3(-0.78, 0.17, 0.6).normalize(),
  discPos: new THREE.Vector3(-70, -8, -42),
  horizonLift: 0.42,
  sunColor: 0xffa24a,
  sunIntensity: 3.0,
  skyTop: 0x6b3d8f,
  skyMid: 0xf0603a,
  skyHorizon: 0xffbe4f,
  sunGlow: 0xffd27a,
  hemiSky: 0xe9a7b8,
  hemiGround: 0xffb07a,
  hemiIntensity: 1.3,
  fill: 0xffc9b0,
  fillIntensity: 0.9,
  waterShallow: 0x8ae2dc,
  waterDeep: 0x2f93bf,
  waterSky: 0xf7a46a,
  glitter: 1.4,
  lamps: 0.25,
  sunDiscSize: 14,
};

function discTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.42, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class SkyController {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fill: THREE.DirectionalLight;
  readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  readonly sunDisc: THREE.Sprite;
  private lampMaterials: THREE.MeshStandardMaterial[] = [];
  private water: Water | null = null;

  constructor(private scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -22; cam.right = 22; cam.top = 22; cam.bottom = -22; cam.near = 1; cam.far = 80;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0xffffff, 0.9);
    this.fill.position.set(18, 10, 22);
    scene.add(this.fill);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffe0c0, 1);
    scene.add(this.hemi);

    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(90, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color() },
          mid: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
          glow: { value: new THREE.Color() },
          sunDir: { value: new THREE.Vector3(0, 1, 0) },
          lift: { value: 0 },
        },
        vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 sunDir; uniform float lift;
          varying vec3 vW;
          void main(){
            vec3 d = normalize(vW);
            float h = d.y + lift;
            vec3 c = mix(horizon, mid, smoothstep(0.0, 0.2, h));
            c = mix(c, top, smoothstep(0.2, 0.6, h));
            float s = max(dot(d, sunDir), 0.0);
            c += glow * (pow(s, 6.0) * 0.55 + pow(s, 40.0) * 0.6);
            // the band below the horizon (seen past the base) stays a soft warm tone
            c = mix(c, horizon * 0.9, smoothstep(-0.02, -0.4, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    scene.add(this.dome);

    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture('#fff3c4', 'rgba(255,190,90,0.55)'), transparent: true, depthWrite: false }));
    scene.add(this.sunDisc);
  }

  attachWater(water: Water): void {
    this.water = water;
  }

  /** Call once the scene is built so emissive night materials can be found. */
  collectLamps(root: THREE.Object3D): void {
    const seen = new Set<THREE.Material>();
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && m.userData?.[NIGHT_LIGHT] && !seen.has(m)) {
        seen.add(m);
        this.lampMaterials.push(m);
      }
    });
  }

  apply(look: SkyLook): void {
    const dir = look.sunDir.clone().normalize();
    this.sun.position.copy(dir).multiplyScalar(30);
    this.sun.color.set(look.sunColor);
    this.sun.intensity = look.sunIntensity;
    this.hemi.color.set(look.hemiSky);
    this.hemi.groundColor.set(look.hemiGround);
    this.hemi.intensity = look.hemiIntensity;
    this.fill.color.set(look.fill);
    this.fill.intensity = look.fillIntensity;

    const u = this.dome.material.uniforms;
    u.top.value.set(look.skyTop);
    u.mid.value.set(look.skyMid);
    u.horizon.value.set(look.skyHorizon);
    u.glow.value.set(look.sunGlow);
    u.sunDir.value.copy(look.discPos).normalize();
    u.lift.value = look.horizonLift;
    this.scene.background = new THREE.Color(look.skyHorizon);

    this.sunDisc.position.copy(look.discPos);
    this.sunDisc.scale.setScalar(look.sunDiscSize);

    if (this.water) {
      const w = this.water.uniforms;
      w.shallow.value.set(look.waterShallow);
      w.deep.value.set(look.waterDeep);
      w.sky.value.set(look.waterSky);
      w.lightDir.value.copy(dir);
      w.lightColor.value.set(look.sunColor);
      w.glitter.value = look.glitter;
    }
    for (const m of this.lampMaterials) m.emissiveIntensity = look.lamps * 1.6;
  }
}
