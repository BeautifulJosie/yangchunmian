import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export interface MatOpts {
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  flat?: boolean;
  transparent?: boolean;
  opacity?: number;
}

export function mat(color: number, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = JSON.stringify([color, opts]);
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0,
      flatShading: opts.flat ?? true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    materialCache.set(key, m);
  }
  return m;
}

export function shadowed<T extends THREE.Object3D>(obj: T, cast = true, receive = true): T {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

export function box(w: number, h: number, d: number, color: number, opts?: MatOpts): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.y = h / 2;
  return shadowed(m);
}

export function cylinder(rTop: number, rBottom: number, h: number, color: number, segments = 8, opts?: MatOpts): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat(color, opts));
  m.position.y = h / 2;
  return shadowed(m);
}

export function sphere(r: number, color: number, detail = 1, opts?: MatOpts): THREE.Mesh {
  return shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color, opts)));
}

export function cone(r: number, h: number, color: number, segments = 6, opts?: MatOpts): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color, opts));
  m.position.y = h / 2;
  return shadowed(m);
}

/** Rounded organic blob outline, used for the island and grass patches. */
export function blobShape(radius: number, points = 10, wobble = 0.18, seed = 1): THREE.Shape {
  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius * (1 + (rnd() - 0.5) * 2 * wobble);
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const curve = new THREE.SplineCurve(pts.concat([pts[0]]));
  const smooth = curve.getPoints(points * 6);
  shape.moveTo(smooth[0].x, smooth[0].y);
  for (let i = 1; i < smooth.length; i++) shape.lineTo(smooth[i].x, smooth[i].y);
  shape.closePath();
  return shape;
}

export function extrudedShape(shape: THREE.Shape, depth: number, color: number, bevel = 0.15, opts?: MatOpts): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(color, opts));
  return shadowed(m);
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  children.forEach((c) => g.add(c));
  return g;
}

export function place<T extends THREE.Object3D>(obj: T, x: number, z: number, rotY = 0, y = 0): T {
  obj.position.set(x, y, z);
  obj.rotation.y = rotY;
  return obj;
}

/** A flat sign with text drawn on a canvas. Lit at night when `glow` is set. */
export function textSign(text: string, bg: string, fg: string, w: number, h: number, glow = false): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round(512 * (h / w));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.round(c.height * 0.66)}px Nunito, "Arial Rounded MT Bold", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + c.height * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? tex : null, emissiveIntensity: 0 });
  if (glow) m.userData.nightLight = true;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), [mat(0xffffff), mat(0xffffff), mat(0xffffff), mat(0xffffff), m, m]);
  return shadowed(mesh);
}
