import * as THREE from 'three';
import { palette as P } from '../palette';
import { blobShape, box, extrudedShape, group, mat, shadowed, sphere } from './helpers';
import { Water } from './water';

export const BLOCK = 22; // width of the square ocean block
export const BLOCK_DEPTH = 1.7; // height of the rock base below the water line (thin, like a model slice)

/** Square ocean block with a layered rock base, like a slice cut out of the sea. */
export function makeOceanBlock(): THREE.Group {
  const g = new THREE.Group();

  // rock base: alternating dark/light strata
  // strata stop below the water volume (which occupies -1.1..0) so they never bleed through it
  const strata = [
    { h: 0.3, c: P.rockDark },
    { h: 0.12, c: P.sandWet },
    { h: 0.22, c: P.rock },
    { h: 0.08, c: P.stone },
    { h: 0.18, c: P.rockDark },
    { h: 0.1, c: P.sandWet },
    { h: 0.2, c: P.rock },
  ];
  let y = -BLOCK_DEPTH;
  for (const s of strata) {
    const inset = 0.05;
    const m = box(BLOCK - inset, s.h, BLOCK - inset, s.c, { roughness: 1 });
    m.position.y = y + s.h / 2;
    g.add(m);
    y += s.h;
  }

  // scattered stones and hanging moss on the sides
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
  for (let i = 0; i < 90; i++) {
    const side = Math.floor(rnd() * 4);
    const t = (rnd() - 0.5) * (BLOCK - 1);
    const yy = -BLOCK_DEPTH + 0.1 + rnd() * (BLOCK_DEPTH - 0.75);
    const r = 0.05 + rnd() * 0.1;
    const isMoss = rnd() > 0.65;
    const m = sphere(r, isMoss ? P.grassDark : P.stone, 0, { roughness: 1 });
    const half = BLOCK / 2;
    if (side === 0) m.position.set(t, yy, half);
    if (side === 1) m.position.set(t, yy, -half);
    if (side === 2) m.position.set(half, yy, t);
    if (side === 3) m.position.set(-half, yy, t);
    m.scale.set(1, isMoss ? 2.2 : 0.8, 1);
    g.add(m);
  }

  // thin sand rim at the water line
  const rim = box(BLOCK + 0.1, 0.18, BLOCK + 0.1, P.sandWet, { roughness: 1 });
  rim.position.y = -0.22;
  rim.castShadow = false;
  g.add(rim);

  // animated water surface, plus an opaque block below it for the visible side faces
  const water = new Water(BLOCK);
  water.mesh.position.y = 0;
  g.add(water.mesh);
  g.userData.water = water;

  const deep = box(BLOCK, 0.45, BLOCK, P.waterDeep, { roughness: 0.6, flat: false });
  deep.position.y = -0.5; // top stays clear of the water plane so the two never z-fight
  deep.castShadow = false;
  g.add(deep);

  return g;
}

/** The sandy island with a grassy top and a shallow underwater shelf. */
export function makeIsland(): THREE.Group {
  const g = new THREE.Group();

  const shelf = extrudedShape(blobShape(7.4, 11, 0.1, 5), 0.3, P.sandWet, 0.3, { roughness: 1 });
  shelf.position.y = -0.75;
  shelf.castShadow = false;
  g.add(shelf);

  const sand = extrudedShape(blobShape(7.4, 11, 0.1, 5), 0.3, P.sand, 0.3, { roughness: 1 });
  sand.position.y = -0.3;
  sand.name = 'ground';
  g.add(sand);

  const grass = extrudedShape(blobShape(5.5, 10, 0.18, 9), 0.2, P.grass, 0.28, { roughness: 1 });
  grass.position.set(-0.7, 0.08, -0.8);
  grass.name = 'ground';
  g.add(grass);

  // raised plateau on the north-west corner, home of the coaster
  const plateau = extrudedShape(blobShape(3.1, 10, 0.12, 3), 0.5, P.grassDark, 0.42, { roughness: 1 });
  plateau.position.set(-4.0, 0.45, -2.2);
  plateau.name = 'ground';
  g.add(plateau);
  const terrace = extrudedShape(blobShape(2.2, 9, 0.15, 7), 0.25, P.grass, 0.3, { roughness: 1 });
  terrace.position.set(-1.4, 0.4, -3.6);
  terrace.name = 'ground';
  g.add(terrace);
  // a few stone steps up to the plateau from the lawn
  for (let i = 0; i < 4; i++) {
    const step = box(0.7, 0.12, 0.3, P.stone, { roughness: 1 });
    step.position.set(-1.6 - i * 0.26, 0.6 + i * 0.16, -1.0 - i * 0.22);
    step.rotation.y = 0.7;
    g.add(step);
  }

  // winding stone path
  const pathPts = [
    new THREE.Vector3(-0.8, 0, 4.0),
    new THREE.Vector3(-1.2, 0, 2.2),
    new THREE.Vector3(-0.4, 0, 0.6),
    new THREE.Vector3(-1.2, 0, -0.6),
  ];
  const curve = new THREE.CatmullRomCurve3(pathPts);
  const stones = curve.getPoints(12);
  stones.forEach((p, i) => {
    const s = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 6), mat(P.stone, { roughness: 1 })));
    s.position.copy(p);
    s.position.y = groundHeight(g, p.x, p.z) + 0.02;
    s.position.x += (i % 2 ? 0.12 : -0.12);
    s.rotation.y = i;
    g.add(s);
  });

  // grass tufts and little flowers on the lawn
  let gs = 21;
  const grnd = () => ((gs = (gs * 16807) % 2147483647), gs / 2147483647);
  const tuftGeo = new THREE.ConeGeometry(0.09, 0.3, 4);
  tuftGeo.translate(0, 0.15, 0);
  for (let i = 0; i < 90; i++) {
    const a = grnd() * Math.PI * 2;
    const r = grnd() * 4.8;
    const x = -0.7 + Math.cos(a) * r;
    const z = -0.8 + Math.sin(a) * r * 0.9;
    const isFlower = grnd() > 0.8;
    const t = shadowed(new THREE.Mesh(tuftGeo, mat(isFlower ? [P.pink, P.yellow, P.white][i % 3] : (i % 2 ? P.grassDark : P.leafLight))), false);
    t.position.set(x, groundHeight(g, x, z) - 0.03, z);
    t.rotation.y = grnd() * 3;
    t.scale.setScalar(isFlower ? 0.5 : 0.5 + grnd() * 0.4);
    g.add(t);
  }

  // shells and a trail of footprints on the beach
  const shellGeo = new THREE.ConeGeometry(0.07, 0.05, 5);
  for (let i = 0; i < 14; i++) {
    const a = 0.3 + grnd() * 1.6;
    const r = 5.0 + grnd() * 1.4;
    const sh = shadowed(new THREE.Mesh(shellGeo, mat([P.white, P.pink, P.cream][i % 3])), false);
    sh.position.set(Math.cos(a) * r, groundHeight(g, Math.cos(a) * r, Math.sin(a) * r) + 0.02, Math.sin(a) * r);
    sh.rotation.y = grnd() * 3;
    g.add(sh);
  }
  const printGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 6);
  for (let i = 0; i < 12; i++) {
    const x = 1.4 + i * 0.22;
    const z = 5.6 - i * 0.14;
    const fp = new THREE.Mesh(printGeo, mat(P.sandWet));
    fp.scale.set(1, 1, 1.6);
    fp.position.set(x + (i % 2 ? 0.1 : -0.1), groundHeight(g, x, z) + 0.006, z);
    g.add(fp);
  }

  return group(g);
}

const _ray = new THREE.Raycaster();
const _down = new THREE.Vector3(0, -1, 0);

/** Height of the walkable terrain (sand, lawn, hill) at a point; 0 (water line) if nothing is there. */
export function groundHeight(terrain: THREE.Object3D, x: number, z: number): number {
  terrain.updateMatrixWorld(true);
  const targets: THREE.Object3D[] = [];
  terrain.traverse((o) => { if (o.name === 'ground') targets.push(o); });
  _ray.set(new THREE.Vector3(x, 20, z), _down);
  const hits = _ray.intersectObjects(targets, false);
  return hits.length ? hits[0].point.y : 0;
}
