import * as THREE from 'three';
import { palette as P } from '../palette';
import { box, cylinder, group, mat, shadowed } from './helpers';

/**
 * One-piece clay figures. The body is a capsule with the head sitting on a
 * short neck, limbs pivot at the joints so poses are just rotations.
 */
export interface Outfit {
  shirt?: number;
  pants?: number;
  skin?: number;
  hair?: number;
  hat?: 'cap' | 'sun' | 'none';
  shades?: boolean;
  scale?: number;
}

export interface Pose {
  armL?: [number, number, number]; // euler, radians, pivot at shoulder
  armR?: [number, number, number];
  legL?: [number, number, number];
  legR?: [number, number, number];
  lean?: number; // whole body pitch
  headTilt?: number;
  sit?: boolean; // legs forward, body lowered
  lie?: boolean; // flat on the back
}

const SKINS = [0xf6d2b8, 0xe8b894, 0xc98a5e, 0x8d5a3b];
const SHIRTS = [P.pink, P.coral, P.mint, P.yellow, P.lilac, P.sky, P.white, P.navy];
const HAIRS = [0x3b2a22, 0x7a4a2a, 0xe9c46a, 0x1c1c1c, 0xb24a3a];

function smooth(color: number): THREE.MeshStandardMaterial {
  return mat(color, { flat: false, roughness: 0.8 });
}

export function figure(outfit: Outfit = {}, pose: Pose = {}): THREE.Group {
  const skin = outfit.skin ?? SKINS[0];
  const shirt = outfit.shirt ?? SHIRTS[0];
  const pants = outfit.pants ?? P.navy;
  const hair = outfit.hair ?? HAIRS[0];
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  // torso: capsule, slightly wider at the hips
  const torso = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.26, 4, 12), smooth(shirt)));
  torso.position.y = 0.62;
  body.add(torso);
  const hips = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 8), smooth(pants)));
  hips.position.y = 0.45;
  hips.scale.set(1, 0.7, 1);
  body.add(hips);

  // head on a short neck; the neck is hidden inside both so it reads as one piece
  const neck = cylinder(0.06, 0.07, 0.12, skin, 8, { flat: false });
  neck.position.y = 0.8;
  body.add(neck);
  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), smooth(skin)));
  head.position.y = 1.0;
  head.rotation.x = pose.headTilt ?? 0;
  body.add(head);
  const hairCap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), smooth(hair)));
  hairCap.position.y = 1.01;
  body.add(hairCap);
  if (outfit.shades) {
    const shades = box(0.26, 0.05, 0.06, 0x1c1c1c);
    shades.position.set(0, 1.02, 0.13);
    body.add(shades);
  }
  if (outfit.hat === 'cap') {
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), smooth(P.coral)));
    cap.position.y = 1.02;
    body.add(cap);
    const brim = box(0.2, 0.03, 0.16, P.coral);
    brim.position.set(0, 1.03, 0.2);
    body.add(brim);
  } else if (outfit.hat === 'sun') {
    const brim = cylinder(0.32, 0.32, 0.03, P.cream, 16, { flat: false });
    brim.position.y = 1.1;
    body.add(brim);
    const top = cylinder(0.17, 0.18, 0.12, P.cream, 16, { flat: false });
    top.position.y = 1.12;
    body.add(top);
  }

  // limbs pivot at the joint
  const limb = (r: number, len: number, color: number): THREE.Group => {
    const pivot = new THREE.Group();
    const m = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), smooth(color)));
    m.position.y = -len / 2 - r;
    pivot.add(m);
    return pivot;
  };
  const armL = limb(0.055, 0.26, skin);
  armL.position.set(-0.21, 0.76, 0);
  const armR = limb(0.055, 0.26, skin);
  armR.position.set(0.21, 0.76, 0);
  const legL = limb(0.07, 0.26, pants);
  legL.position.set(-0.09, 0.42, 0);
  const legR = limb(0.07, 0.26, pants);
  legR.position.set(0.09, 0.42, 0);
  body.add(armL, armR, legL, legR);
  // sleeves so the shirt reads on the upper arm
  for (const a of [armL, armR]) {
    const s = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.08, 3, 8), smooth(shirt)));
    s.position.y = -0.06;
    a.add(s);
  }

  const rot = (o: THREE.Object3D, e?: [number, number, number]) => { if (e) o.rotation.set(e[0], e[1], e[2]); };
  rot(armL, pose.armL ?? [0.15, 0, 0.12]);
  rot(armR, pose.armR ?? [-0.15, 0, -0.12]);
  rot(legL, pose.legL);
  rot(legR, pose.legR);
  if (pose.sit) {
    legL.rotation.x = -Math.PI / 2;
    legR.rotation.x = -Math.PI / 2;
    body.position.y = -0.4;
  }
  if (pose.lie) {
    body.rotation.x = -Math.PI / 2;
    body.position.y = 0.18;
  }
  body.rotation.x += pose.lean ?? 0;
  g.userData.hands = { left: armL, right: armR };
  g.scale.setScalar(outfit.scale ?? 1);
  return g;
}

/** Attach a small object to a hand pivot (at the end of the arm). */
export function hold(fig: THREE.Group, side: 'left' | 'right', item: THREE.Object3D): void {
  const hand = fig.userData.hands[side] as THREE.Group;
  item.position.set(0, -0.36, 0.02);
  hand.add(item);
}

// ---- small hand props ------------------------------------------------------

export function hotdog(): THREE.Group {
  const bun = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 3, 8), smooth(P.wood)));
  bun.rotation.z = Math.PI / 2;
  const sausage = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 3, 8), smooth(0xc8553d)));
  sausage.rotation.z = Math.PI / 2;
  sausage.position.y = 0.03;
  const mustard = box(0.14, 0.015, 0.02, P.yellow);
  mustard.position.y = 0.055;
  return group(bun, sausage, mustard);
}

export function iceCream(): THREE.Group {
  const cone = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), smooth(P.wood)));
  cone.rotation.x = Math.PI;
  const scoop = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), smooth(P.pink)));
  scoop.position.y = 0.09;
  return group(cone, scoop);
}

export function camera(): THREE.Group {
  const bodyBox = box(0.14, 0.09, 0.07, 0x2a2a2a);
  const lens = cylinder(0.03, 0.03, 0.04, 0x555555, 10);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.045, 0.05);
  return group(bodyBox, lens);
}

export function guitar(): THREE.Group {
  const bodyG = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12), smooth(P.wood)));
  bodyG.rotation.x = Math.PI / 2;
  const neckG = box(0.04, 0.3, 0.03, P.woodDark);
  neckG.position.set(0, 0.2, 0);
  return group(bodyG, neckG);
}

export function fishingRod(): THREE.Group {
  const rod = cylinder(0.012, 0.015, 0.9, P.woodDark, 6);
  rod.rotation.z = -0.6;
  rod.position.set(0.2, 0.2, 0);
  const line = cylinder(0.004, 0.004, 0.6, P.white, 4);
  line.position.set(0.56, -0.1, 0);
  return group(rod, line);
}

export function tray(): THREE.Group {
  const t = cylinder(0.14, 0.14, 0.015, P.white, 12);
  const cup = cylinder(0.03, 0.025, 0.07, P.pink, 8);
  cup.position.set(0.04, 0.015, 0);
  const plate = cylinder(0.05, 0.05, 0.01, P.cream, 10);
  plate.position.set(-0.05, 0.015, 0.02);
  return group(t, cup, plate);
}

export function volleyball(): THREE.Mesh {
  const b = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), smooth(P.white)));
  return b;
}

export function surfboardSmall(color = P.mint): THREE.Mesh {
  const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.9, 3, 8), smooth(color)));
  b.scale.set(1, 1, 0.25);
  return b;
}

export function skateboard(): THREE.Group {
  const deck = box(0.5, 0.025, 0.16, P.coral);
  deck.position.y = 0.07;
  const g = group(deck);
  for (const [x, z] of [[-0.17, 0.07], [0.17, 0.07], [-0.17, -0.07], [0.17, -0.07]]) {
    const w = cylinder(0.03, 0.03, 0.03, P.white, 8);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.03, z);
    g.add(w);
  }
  return g;
}

export function bicycle(color = P.sky): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.32, 0.32]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 16), smooth(0x2a2a2a));
    w.position.set(x, 0.2, 0);
    shadowed(w);
    g.add(w);
  }
  const frame1 = cylinder(0.015, 0.015, 0.5, color, 6);
  frame1.rotation.z = Math.PI / 2 - 0.5;
  frame1.position.set(0.0, 0.35, 0);
  const frame2 = cylinder(0.015, 0.015, 0.4, color, 6);
  frame2.rotation.z = -0.3;
  frame2.position.set(-0.15, 0.4, 0);
  const bar = cylinder(0.012, 0.012, 0.3, 0x2a2a2a, 6);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.28, 0.55, 0);
  const seat = box(0.12, 0.03, 0.08, P.navy);
  seat.position.set(-0.12, 0.6, 0);
  const basket = box(0.14, 0.1, 0.14, P.wood);
  basket.position.set(0.4, 0.5, 0);
  g.add(frame1, frame2, bar, seat, basket);
  return g;
}

export function dog(color = P.cream): THREE.Group {
  const bodyD = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 3, 8), smooth(color)));
  bodyD.rotation.z = Math.PI / 2;
  bodyD.position.y = 0.17;
  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), smooth(color)));
  head.position.set(0.17, 0.26, 0);
  const snout = box(0.06, 0.04, 0.05, color);
  snout.position.set(0.22, 0.22, 0);
  const g = group(bodyD, head, snout);
  for (const z of [-0.045, 0.045]) {
    const ear = box(0.04, 0.07, 0.02, P.trunkDark);
    ear.position.set(0.15, 0.3, z);
    ear.rotation.x = z * 6;
    g.add(ear);
  }
  for (const [x, z] of [[-0.1, 0.04], [0.1, 0.04], [-0.1, -0.04], [0.1, -0.04]]) {
    const leg = cylinder(0.02, 0.02, 0.12, color, 6, { flat: false });
    leg.position.set(x, 0.02, z);
    g.add(leg);
  }
  const tail = cylinder(0.012, 0.02, 0.1, color, 6, { flat: false });
  tail.position.set(-0.18, 0.24, 0);
  tail.rotation.z = 0.7;
  g.add(tail);
  return g;
}

/** Quick random outfit, seeded so the default island is stable between loads. */
export function outfitFor(i: number): Outfit {
  return {
    skin: SKINS[i % SKINS.length],
    shirt: SHIRTS[(i * 3) % SHIRTS.length],
    pants: [P.navy, P.white, P.coral, 0x5a4a3a][(i * 5) % 4],
    hair: HAIRS[(i * 7) % HAIRS.length],
  };
}
