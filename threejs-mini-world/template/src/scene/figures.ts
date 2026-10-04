import * as THREE from 'three';
import { palette as P } from '../palette';
import { box, cylinder, group, mat, shadowed } from './helpers';

/**
 * Parametric cute figures. A style sets proportions; an outfit sets colours;
 * a pose rotates the limbs. Rider/surfer helpers build the person and the
 * vehicle as one piece so they move as a single sticker.
 */
export interface FigureStyle {
  name: string;
  height: number; // total height in scene units
  headR: number; // head radius as fraction of height
  bodyType: 'capsule' | 'bean' | 'kokeshi';
  bodyW: number; // body half-width as fraction of height
  limb: number; // limb length as fraction of height
  limbR: number; // limb thickness as fraction of height
  neck: boolean;
  face: boolean; // dot eyes + blush
  bangs: boolean; // hair fringe lump
}

export const STYLES: Record<string, FigureStyle> = {
  // A: one pill from feet to crown, stubby arms, no neck, face on the pill
  bean: { name: 'A 糖豆', height: 1.0, headR: 0.0, bodyType: 'bean', bodyW: 0.2, limb: 0.16, limbR: 0.05, neck: false, face: true, bangs: true },
  // B: big round head on a tiny body
  chibi: { name: 'B 大头娃', height: 1.0, headR: 0.24, bodyType: 'capsule', bodyW: 0.15, limb: 0.18, limbR: 0.05, neck: false, face: true, bangs: true },
  // C: softer version of the current figure, head a touch bigger, no neck, face
  round: { name: 'C 圆润', height: 1.0, headR: 0.17, bodyType: 'capsule', bodyW: 0.16, limb: 0.25, limbR: 0.05, neck: false, face: true, bangs: true },
  // D: kokeshi doll, cylinder body, round head, arms as short nubs
  kokeshi: { name: 'D 木偶', height: 1.0, headR: 0.21, bodyType: 'kokeshi', bodyW: 0.17, limb: 0.17, limbR: 0.055, neck: false, face: true, bangs: false },
};

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
  armL?: [number, number, number];
  armR?: [number, number, number];
  legL?: [number, number, number];
  legR?: [number, number, number];
  lean?: number;
  tiltZ?: number; // sideways lean of the whole body
  headTilt?: number;
  headTurn?: number;
  sit?: boolean;
  lie?: boolean;
}

const SKINS = [0xf6d2b8, 0xe8b894, 0xc98a5e, 0x8d5a3b];
const SHIRTS = [P.pink, P.coral, P.mint, P.yellow, P.lilac, P.sky, P.white, P.navy];
const HAIRS = [0x3b2a22, 0x7a4a2a, 0xe9c46a, 0x1c1c1c, 0xb24a3a];

function smooth(color: number): THREE.MeshStandardMaterial {
  return mat(color, { flat: false, roughness: 0.8 });
}

export function outfitFor(i: number): Outfit {
  return {
    skin: SKINS[i % SKINS.length],
    shirt: SHIRTS[(i * 3) % SHIRTS.length],
    pants: [P.navy, P.white, P.coral, 0x5a4a3a][(i * 5) % 4],
    hair: HAIRS[(i * 7) % HAIRS.length],
  };
}

function addFace(parent: THREE.Object3D, y: number, r: number, skinDark: boolean): void {
  const eyeMat = mat(0x2a2020, { flat: false });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 8, 6), eyeMat);
    eye.position.set(s * r * 0.36, y + r * 0.08, r * 0.9);
    parent.add(eye);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(r * 0.14, 10), mat(skinDark ? 0xd98a7a : 0xffa8b0, { flat: false, transparent: true, opacity: 0.75 }));
    blush.position.set(s * r * 0.58, y - r * 0.12, r * 0.82);
    blush.lookAt(blush.position.clone().multiplyScalar(2));
    parent.add(blush);
  }
}

export function figure(styleKey: keyof typeof STYLES, outfit: Outfit = {}, pose: Pose = {}): THREE.Group {
  const S = STYLES[styleKey];
  const H = S.height;
  const skin = outfit.skin ?? SKINS[0];
  const shirt = outfit.shirt ?? SHIRTS[0];
  const pants = outfit.pants ?? P.navy;
  const hair = outfit.hair ?? HAIRS[0];
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const limbLen = S.limb * H;
  const limbR = S.limbR * H;
  let shoulderY = 0;
  let hipY = 0;
  let headY = 0;
  let headR = S.headR * H;

  if (S.bodyType === 'bean') {
    // one pill: lower part pants colour via a second overlapping capsule
    const pillR = S.bodyW * H;
    const pillLen = H - 2 * pillR;
    const pill = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(pillR, pillLen, 6, 16), smooth(shirt)));
    pill.position.y = H / 2;
    body.add(pill);
    const trousers = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(pillR * 1.02, pillLen * 0.1, 4, 16), smooth(pants)));
    trousers.position.y = pillR * 0.9 + pillLen * 0.05;
    body.add(trousers);
    // face sits on the top third of the pill, hair cap on the crown
    headR = pillR;
    headY = H - pillR;
    shoulderY = H * 0.58;
    hipY = pillR * 0.5;
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(pillR * 1.03, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), smooth(hair)));
    cap.position.y = headY;
    body.add(cap);
    // skin patch for the face
    const facePatch = new THREE.Mesh(new THREE.SphereGeometry(pillR * 1.01, 16, 10, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.42), smooth(skin));
    facePatch.position.y = headY;
    body.add(facePatch);
  } else if (S.bodyType === 'kokeshi') {
    const bw = S.bodyW * H;
    const bodyH = H - headR * 2 + headR * 0.4;
    const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.85, bw, bodyH, 20), smooth(shirt)));
    trunk.position.y = bodyH / 2;
    body.add(trunk);
    const skirt = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(bw * 1.0, bw * 1.0, bodyH * 0.22, 20), smooth(pants)));
    skirt.position.y = bodyH * 0.11;
    body.add(skirt);
    headY = bodyH + headR * 0.75;
    shoulderY = bodyH * 0.85;
    hipY = -1; // no legs
    const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 14), smooth(skin)));
    head.position.y = headY;
    body.add(head);
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), smooth(hair)));
    cap.position.y = headY + headR * 0.02;
    body.add(cap);
  } else {
    // capsule torso with a round head sitting straight on it
    const bw = S.bodyW * H;
    const legs = S.limb * H + limbR;
    const torsoLen = Math.max(H - headR * 2 - legs - bw, bw * 0.4);
    const torso = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(bw, torsoLen, 6, 16), smooth(shirt)));
    hipY = legs;
    torso.position.y = hipY + bw + torsoLen / 2 - bw * 0.4;
    body.add(torso);
    const hips = shadowed(new THREE.Mesh(new THREE.SphereGeometry(bw * 1.02, 16, 10), smooth(pants)));
    hips.position.y = hipY + bw * 0.5;
    hips.scale.set(1, 0.7, 1);
    body.add(hips);
    shoulderY = torso.position.y + torsoLen / 2;
    headY = shoulderY + bw * 0.3 + headR * 0.95;
    if (S.neck) {
      const neck = cylinder(bw * 0.4, bw * 0.45, bw * 0.6, skin, 10, { flat: false });
      neck.position.y = shoulderY;
      body.add(neck);
    }
    const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR, 18, 14), smooth(skin)));
    head.position.y = headY;
    head.rotation.x = pose.headTilt ?? 0;
    body.add(head);
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), smooth(hair)));
    cap.position.y = headY + headR * 0.02;
    body.add(cap);
  }

  if (S.bangs) {
    const bangs = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR * 0.42, 10, 8), smooth(hair)));
    bangs.position.set(headR * 0.3, headY + headR * 0.55, headR * 0.72);
    bangs.scale.set(1.3, 0.6, 0.7);
    body.add(bangs);
  }
  if (S.face) addFace(body, headY, headR, skin === SKINS[3]);
  if (outfit.shades) {
    const shades = box(headR * 1.5, headR * 0.3, headR * 0.3, 0x1c1c1c);
    shades.position.set(0, headY + headR * 0.1, headR * 0.82);
    body.add(shades);
  }
  if (outfit.hat === 'cap') {
    const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(headR * 1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), smooth(P.coral)));
    cap.position.y = headY + headR * 0.05;
    body.add(cap);
    const brim = box(headR * 1.2, headR * 0.15, headR, P.coral);
    brim.position.set(0, headY + headR * 0.1, headR * 1.2);
    body.add(brim);
  } else if (outfit.hat === 'sun') {
    const brim = cylinder(headR * 1.9, headR * 1.9, headR * 0.15, P.cream, 20, { flat: false });
    brim.position.y = headY + headR * 0.6;
    body.add(brim);
    const top = cylinder(headR * 1.0, headR * 1.05, headR * 0.7, P.cream, 20, { flat: false });
    top.position.y = headY + headR * 0.75;
    body.add(top);
  }

  // limbs pivot at the joint; arms get a sleeve so the shirt reads on the upper arm
  const limb = (r: number, len: number, color: number): THREE.Group => {
    const pivot = new THREE.Group();
    const m = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 10), smooth(color)));
    m.position.y = -len / 2 - r;
    pivot.add(m);
    return pivot;
  };
  const armX = (S.bodyType === 'bean' ? S.bodyW : S.bodyW) * H + limbR * 0.4;
  const armL = limb(limbR, limbLen, skin);
  armL.position.set(-armX, shoulderY, 0);
  const armR = limb(limbR, limbLen, skin);
  armR.position.set(armX, shoulderY, 0);
  body.add(armL, armR);
  for (const a of [armL, armR]) {
    const s = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(limbR * 1.2, limbLen * 0.3, 3, 10), smooth(shirt)));
    s.position.y = -limbLen * 0.2;
    a.add(s);
  }
  let legL: THREE.Group | null = null;
  let legR: THREE.Group | null = null;
  if (hipY >= 0 && S.bodyType !== 'bean') {
    legL = limb(limbR * 1.3, limbLen, pants);
    legL.position.set(-S.bodyW * H * 0.55, hipY, 0);
    legR = limb(limbR * 1.3, limbLen, pants);
    legR.position.set(S.bodyW * H * 0.55, hipY, 0);
    body.add(legL, legR);
    for (const l of [legL, legR]) {
      const shoe = shadowed(new THREE.Mesh(new THREE.SphereGeometry(limbR * 1.5, 10, 8), smooth(P.white)));
      shoe.position.set(0, -limbLen - limbR * 1.2, limbR * 0.5);
      shoe.scale.set(1, 0.6, 1.4);
      l.add(shoe);
    }
  } else if (S.bodyType === 'bean') {
    for (const s of [-1, 1]) {
      const foot = shadowed(new THREE.Mesh(new THREE.SphereGeometry(limbR * 1.6, 10, 8), smooth(P.white)));
      foot.position.set(s * S.bodyW * H * 0.5, limbR * 0.9, S.bodyW * H * 0.5);
      foot.scale.set(1, 0.6, 1.4);
      body.add(foot);
    }
  }

  const rot = (o: THREE.Object3D | null, e?: [number, number, number]) => { if (o && e) o.rotation.set(e[0], e[1], e[2]); };
  rot(armL, pose.armL ?? [0.1, 0, 0.15]);
  rot(armR, pose.armR ?? [-0.1, 0, -0.15]);
  rot(legL, pose.legL);
  rot(legR, pose.legR);
  if (pose.sit && legL && legR) {
    legL.rotation.x = -Math.PI / 2;
    legR.rotation.x = -Math.PI / 2;
    body.position.y = -(limbLen + limbR);
  } else if (pose.sit) {
    body.position.y = -H * 0.12; // legless styles just settle a little lower
  }
  if (pose.lie) {
    body.rotation.x = -Math.PI / 2;
    body.position.y = S.bodyW * H;
  }
  body.rotation.x += pose.lean ?? 0;
  body.rotation.z += pose.tiltZ ?? 0;
  // head tilt/turn for styles whose head is a separate sphere: rotate everything above the shoulders
  if (pose.headTilt || pose.headTurn) {
    const headParts = body.children.filter((c) => c.position.y > shoulderY + 0.01 && c !== armL && c !== armR);
    const hg = new THREE.Group();
    hg.position.y = headY;
    headParts.forEach((c) => { body.remove(c); c.position.y -= headY; hg.add(c); });
    hg.rotation.set(pose.headTilt ?? 0, pose.headTurn ?? 0, 0);
    body.add(hg);
  }
  g.userData.hands = { left: armL, right: armR, len: limbLen + limbR };
  g.userData.height = H;
  g.scale.setScalar(outfit.scale ?? 1);
  return g;
}

/** Attach a small object to a hand pivot (at the end of the arm). */
export function hold(fig: THREE.Group, side: 'left' | 'right', item: THREE.Object3D, forward = 0.06): void {
  const hand = fig.userData.hands[side] as THREE.Group;
  item.position.set(0, -(fig.userData.hands.len as number), forward);
  hand.add(item);
}

/** Two short leg stubs under a legless (kokeshi) figure, for sitting on saddles and boards. */
export function legStubs(fig: THREE.Group, color: number, spread = 0.09, angle = 0.5, len = 0.22): void {
  const body = fig.children[0];
  for (const s of [-1, 1]) {
    const leg = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, len, 3, 10), smooth(color)));
    leg.position.set(s * spread, 0.02, 0.1);
    leg.rotation.x = angle;
    body.add(leg);
  }
}

// ---- one-piece vehicle stickers -----------------------------------------------

function bikeFrame(color: number): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.32, 0.32]) {
    const w = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 18), smooth(0x2a2a2a)));
    w.position.set(x, 0.2, 0);
    g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 12), mat(P.white, { flat: false, transparent: true, opacity: 0.35 }));
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.2, 0);
    g.add(hub);
  }
  const f1 = cylinder(0.018, 0.018, 0.5, color, 8);
  f1.rotation.z = Math.PI / 2 - 0.5;
  f1.position.set(0.0, 0.35, 0);
  const f2 = cylinder(0.018, 0.018, 0.42, color, 8);
  f2.rotation.z = -0.3;
  f2.position.set(-0.15, 0.4, 0);
  const f3 = cylinder(0.018, 0.018, 0.45, color, 8);
  f3.rotation.z = 0.45;
  f3.position.set(0.2, 0.4, 0);
  const bar = cylinder(0.014, 0.014, 0.34, 0x2a2a2a, 8);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.3, 0.58, 0);
  const seat = box(0.14, 0.04, 0.09, P.navy);
  seat.position.set(-0.14, 0.6, 0);
  const basket = box(0.16, 0.12, 0.16, P.wood);
  basket.position.set(0.42, 0.5, 0);
  g.add(f1, f2, f3, bar, seat, basket);
  return g;
}

/** Rider and bicycle as one sticker; the rider sits on the saddle holding the bars. */
export function cyclist(styleKey: keyof typeof STYLES, outfit: Outfit = {}): THREE.Group {
  const g = new THREE.Group();
  g.add(bikeFrame(outfit.shirt === P.sky ? P.coral : P.sky));
  const rider = figure(styleKey, { ...outfit, scale: 0.8 }, { lean: 0.3, armL: [-1.3, 0, 0.1], armR: [-1.3, 0, -0.1], legL: [-0.5, 0, 0], legR: [0.5, 0, 0] });
  rider.position.set(-0.12, 0.48, 0);
  g.add(rider);
  g.userData.sticker = 'cyclist';
  return g;
}

/** Surfer standing on a board, as one sticker. Place it on the water. */
export function surfer(styleKey: keyof typeof STYLES, outfit: Outfit = {}, boardColor = P.yellow): THREE.Group {
  const g = new THREE.Group();
  const board = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 4, 10), smooth(boardColor)));
  board.rotation.z = Math.PI / 2;
  board.scale.set(1, 1, 0.22);
  board.position.y = 0.06;
  const stripe = box(0.9, 0.02, 0.06, P.white);
  stripe.position.y = 0.1;
  g.add(board, stripe);
  const rider = figure(styleKey, { ...outfit, scale: 0.85 }, { lean: 0.1, armL: [-0.6, 0, 1.2], armR: [0.3, 0, -1.3], legL: [0, 0, 0.35], legR: [0, 0, -0.35] });
  rider.position.y = 0.12;
  rider.rotation.y = Math.PI / 2 - 0.5;
  g.add(rider);
  g.userData.sticker = 'surfer';
  return g;
}

/** Skater and board as one sticker. */
export function skater(styleKey: keyof typeof STYLES, outfit: Outfit = {}): THREE.Group {
  const g = new THREE.Group();
  const deck = box(0.5, 0.03, 0.16, P.coral);
  deck.position.y = 0.08;
  g.add(deck);
  for (const [x, z] of [[-0.17, 0.07], [0.17, 0.07], [-0.17, -0.07], [0.17, -0.07]]) {
    const w = cylinder(0.035, 0.035, 0.03, P.white, 10);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.035, z);
    g.add(w);
  }
  const rider = figure(styleKey, { ...outfit, scale: 0.85 }, { lean: 0.12, armL: [-0.8, 0, 0.9], armR: [0.4, 0, -0.9], legL: [-0.2, 0, 0.3], legR: [0.2, 0, -0.3] });
  rider.position.y = 0.1;
  rider.rotation.y = Math.PI / 2 - 0.4;
  g.add(rider);
  g.userData.sticker = 'skater';
  return g;
}

export function dog(color = P.cream): THREE.Group {
  const bodyD = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.16, 4, 10), smooth(color)));
  bodyD.rotation.z = Math.PI / 2;
  bodyD.position.y = 0.17;
  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), smooth(color)));
  head.position.set(0.17, 0.26, 0);
  const snout = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), smooth(color)));
  snout.position.set(0.24, 0.23, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), smooth(0x2a2020));
  nose.position.set(0.28, 0.235, 0);
  const g = group(bodyD, head, snout, nose);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), smooth(0x2a2020));
    eye.position.set(0.22, 0.29, s * 0.04);
    g.add(eye);
    const ear = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), smooth(P.trunkDark)));
    ear.position.set(0.14, 0.31, s * 0.07);
    ear.scale.set(0.8, 1.4, 0.5);
    g.add(ear);
  }
  for (const [x, z] of [[-0.09, 0.05], [0.09, 0.05], [-0.09, -0.05], [0.09, -0.05]]) {
    const leg = cylinder(0.022, 0.022, 0.12, color, 8, { flat: false });
    leg.position.set(x, 0.02, z);
    g.add(leg);
  }
  const tail = cylinder(0.012, 0.022, 0.1, color, 8, { flat: false });
  tail.position.set(-0.18, 0.25, 0);
  tail.rotation.z = 0.7;
  g.add(tail);
  return g;
}
