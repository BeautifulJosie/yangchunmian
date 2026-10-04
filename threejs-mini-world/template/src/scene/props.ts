import * as THREE from 'three';
import { palette as P } from '../palette';
import { box, cone, cylinder, group, mat, shadowed, sphere, textSign } from './helpers';

/** Objects whose lights turn on at night are tagged so the sky controller can find them. */
export const NIGHT_LIGHT = 'nightLight';

function lamp(color: number): THREE.MeshStandardMaterial {
  const m = mat(color, { emissive: color, emissiveIntensity: 0 });
  m.userData[NIGHT_LIGHT] = true;
  return m;
}

export function palm(height = 2.6, lean = 0.25, seed = 0): THREE.Group {
  const g = new THREE.Group();
  const segs = 6;
  let x = 0;
  let y = 0;
  for (let i = 0; i < segs; i++) {
    const h = height / segs;
    const seg = cylinder(0.11 - i * 0.008, 0.14 - i * 0.008, h + 0.05, i % 2 ? P.trunk : P.trunkDark, 7);
    seg.position.set(x, y + h / 2, 0);
    seg.rotation.z = -lean * (i / segs);
    g.add(seg);
    x += Math.sin(lean * (i / segs)) * h;
    y += Math.cos(lean * (i / segs)) * h;
  }
  const top = new THREE.Group();
  top.position.set(x, y, 0);
  // leaf: a flat teardrop extruded thinly, drooping from the crown
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.45, 0.5, 0.12, 1.5);
  leafShape.lineTo(0, 1.6);
  leafShape.lineTo(-0.12, 1.5);
  leafShape.quadraticCurveTo(-0.45, 0.5, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.05, bevelEnabled: false });
  leafGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 9; i++) {
    const leaf = shadowed(new THREE.Mesh(leafGeo, mat(i % 2 ? P.leaf : P.leafLight)));
    leaf.rotation.y = (i / 9) * Math.PI * 2 + seed;
    leaf.rotation.x = 0.25 + (i % 3) * 0.18;
    leaf.rotation.order = 'YXZ';
    leaf.scale.set(1, 1, 0.9 + (i % 2) * 0.25);
    top.add(leaf);
  }
  const coconuts = new THREE.Group();
  coconuts.name = 'coconuts';
  coconuts.userData.sticker = 'coconuts';
  for (let i = 0; i < 3; i++) {
    const c = sphere(0.11, [P.trunkDark, 0x8f6a3a, P.trunk][i], 1, { flat: false });
    c.position.set(Math.cos(i * 2.1) * 0.12, -0.14, Math.sin(i * 2.1) * 0.12);
    coconuts.add(c);
  }
  top.add(coconuts);
  g.add(top);
  return g;
}

export function roundTree(color = P.leafLight, scale = 1): THREE.Group {
  const trunk = cylinder(0.1, 0.14, 0.7, P.trunkDark, 6);
  const a = sphere(0.65, color, 1);
  a.position.set(0, 1.0, 0);
  const b = sphere(0.5, color, 1);
  b.position.set(0.45, 1.3, 0.1);
  const c = sphere(0.45, color, 1);
  c.position.set(-0.4, 1.25, -0.2);
  const g = group(trunk, a, b, c);
  g.scale.setScalar(scale);
  return g;
}

export function bush(color = P.grassDark, r = 0.35): THREE.Mesh {
  const b = sphere(r, color, 1);
  b.position.y = r * 0.7;
  b.scale.set(1, 0.75, 1);
  return b;
}

export function rock(r = 0.3): THREE.Mesh {
  const m = sphere(r, P.stone, 0, { roughness: 1 });
  m.position.y = r * 0.5;
  m.scale.set(1.3, 0.8, 1);
  return m;
}

/** Diner: cream box, pink awning with stripes, big glass front and a sign on the roof. */
export function diner(): THREE.Group {
  const g = new THREE.Group();
  const body = box(3.2, 1.5, 2.2, P.cream);
  g.add(body);
  const roof = box(3.4, 0.18, 2.4, P.coral);
  roof.position.y = 1.55;
  g.add(roof);
  const glass = box(2.0, 0.85, 0.08, P.glass, { roughness: 0.2, flat: false });
  glass.position.set(-0.4, 0.75, 1.12);
  g.add(glass);
  for (let i = 0; i < 3; i++) {
    const mullion = box(0.04, 0.85, 0.1, P.navy);
    mullion.position.set(-1.4 + i * 0.66 + 0.33, 0.75, 1.12);
    g.add(mullion);
  }
  const door = box(0.5, 1.1, 0.08, P.coral);
  door.position.set(1.1, 0.0, 1.12);
  g.add(door);
  const knob = sphere(0.03, P.yellow, 0);
  knob.position.set(1.28, 0.55, 1.18);
  g.add(knob);
  for (let i = 0; i < 7; i++) {
    const stripe = box(0.46, 0.08, 0.6, i % 2 ? P.white : P.pink);
    stripe.position.set(-1.38 + i * 0.46, 1.32, 1.35);
    stripe.rotation.x = 0.35;
    g.add(stripe);
  }
  const signPost = cylinder(0.05, 0.05, 1.0, P.rock, 6);
  signPost.position.set(0, 1.6, -0.3);
  g.add(signPost);
  const sign = textSign('DINER', '#ff7f9f', '#fff5e6', 2.0, 0.6, true);
  sign.position.set(0, 2.75, -0.3);
  g.add(sign);
  // stools out front
  for (let i = 0; i < 3; i++) {
    const stool = cylinder(0.12, 0.1, 0.4, P.coral, 8);
    stool.position.set(-0.7 + i * 0.7, 0, 1.6);
    g.add(stool);
  }
  const counter = box(2.4, 0.5, 0.25, P.woodDark);
  counter.position.set(0, 0, 1.3);
  g.add(counter);
  return g;
}

/** Two-storey motel with an open balcony, a pool in front and a tall sign. */
export function motel(): THREE.Group {
  const g = new THREE.Group();
  const ground = box(4.4, 1.3, 2.0, P.cream);
  g.add(ground);
  const upper = box(4.4, 1.3, 2.0, P.pink);
  upper.position.y = 1.3 + 0.65;
  g.add(upper);
  const slab = box(4.9, 0.14, 2.5, P.cream);
  slab.position.y = 1.33;
  g.add(slab);
  const rail = box(4.9, 0.4, 0.06, P.white);
  rail.position.set(0, 1.6, 1.22);
  g.add(rail);
  const roof = box(4.7, 0.16, 2.3, P.navy);
  roof.position.y = 2.68;
  g.add(roof);
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 4; i++) {
      const door = box(0.4, 0.85, 0.06, P.mint);
      door.position.set(-1.65 + i * 1.0, 0.02 + f * 1.3, 1.03);
      g.add(door);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), lamp(P.yellow));
      shadowed(win);
      win.position.set(-1.15 + i * 1.0, 0.7 + f * 1.3, 1.03);
      g.add(win);
      const num = box(0.12, 0.08, 0.02, P.navy);
      num.position.set(-1.65 + i * 1.0, 0.95 + f * 1.3, 1.07);
      g.add(num);
    }
  }
  for (let i = 0; i < 9; i++) {
    const post = cylinder(0.015, 0.015, 0.4, P.white, 5);
    post.position.set(-2.4 + i * 0.6, 1.4, 1.22);
    g.add(post);
  }
  // stairs
  for (let i = 0; i < 6; i++) {
    const step = box(0.6, 0.22, 0.3, P.cream);
    step.position.set(2.5, i * 0.22, 1.0 - i * 0.3);
    g.add(step);
  }
  // sign
  const pole = cylinder(0.06, 0.06, 3.6, P.rock, 6);
  pole.position.set(-2.6, 0, 1.4);
  g.add(pole);
  const board = textSign('MOTEL', '#7fdccf', '#2d3a6b', 1.5, 0.7, true);
  board.position.set(-2.6, 3.4, 1.4);
  g.add(board);
  const star = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 5), lamp(P.yellow));
  star.position.set(-2.6, 4.0, 1.4);
  g.add(star);
  // pool
  const pool = box(2.4, 0.12, 1.4, P.mint, { roughness: 0.3, flat: false });
  pool.position.set(-0.4, 0, 2.3);
  g.add(pool);
  const poolRim = box(2.7, 0.06, 1.7, P.white);
  poolRim.position.set(-0.4, 0, 2.3);
  g.add(poolRim);
  const floatie = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 6, 10), mat(P.pink));
  floatie.rotation.x = Math.PI / 2;
  floatie.position.set(-0.9, 0.15, 2.4);
  g.add(floatie);
  return g;
}

/** Ferris wheel with coloured cabins, lit at night. */
export function ferrisWheel(radius = 2.0): THREE.Group {
  const g = new THREE.Group();
  const hubY = radius + 0.8;
  const wheel = new THREE.Group();
  wheel.position.y = hubY;
  wheel.name = 'ferrisWheel';
  const rimMat = mat(P.coral);
  for (const z of [-0.25, 0.25]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 6, 24), rimMat);
    rim.position.z = z;
    shadowed(rim);
    wheel.add(rim);
  }
  const cabinColors = [P.yellow, P.mint, P.pink, P.lilac];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, radius, 5), mat(P.cream));
    spoke.position.set(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0);
    spoke.rotation.z = a + Math.PI / 2;
    wheel.add(spoke);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), lamp(cabinColors[i % 4]));
    shadowed(cabin);
    cabin.position.set(Math.cos(a) * radius, Math.sin(a) * radius - 0.25, 0);
    cabin.name = 'cabin';
    wheel.add(cabin);
  }
  const hub = cylinder(0.14, 0.14, 0.8, P.cream, 8);
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 0;
  wheel.add(hub);
  g.add(wheel);
  // A-frame supports
  for (const z of [-0.45, 0.45]) {
    for (const side of [-1, 1]) {
      const leg = cylinder(0.06, 0.08, hubY * 1.12, P.navy, 6);
      leg.position.set(side * 0.9, 0, z);
      leg.rotation.z = -side * 0.42;
      leg.position.y = hubY / 2;
      g.add(leg);
    }
  }
  const base = box(2.6, 0.25, 1.4, P.rock);
  g.add(base);
  return g;
}

/** Wooden pier reaching out over the water, with a small boat tied to it. */
export function pier(length = 4.5): THREE.Group {
  const g = new THREE.Group();
  const deck = box(1.3, 0.12, length, P.wood);
  deck.position.set(0, 0.35, -length / 2);
  g.add(deck);
  for (let i = 0; i < 5; i++) {
    const plank = box(1.34, 0.03, 0.12, P.woodDark);
    plank.position.set(0, 0.42, -0.4 - i * (length / 5));
    g.add(plank);
  }
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const pile = cylinder(0.08, 0.08, 1.6, P.woodDark, 6);
      pile.position.set(s * 0.6, -0.6, -0.3 - i * (length / 3.5));
      g.add(pile);
    }
  }
  const lampPost = cylinder(0.04, 0.04, 1.1, P.navy, 6);
  lampPost.position.set(0.55, 0.4, -length + 0.3);
  g.add(lampPost);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lamp(P.yellow));
  bulb.position.set(0.55, 1.6, -length + 0.3);
  g.add(bulb);
  // boat
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.25, 1.4, 6), mat(P.coral));
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.6);
  shadowed(hull);
  boat.add(hull);
  const seat = box(0.5, 0.05, 0.5, P.wood);
  seat.position.y = 0.2;
  boat.add(seat);
  boat.position.set(1.4, 0.05, -length + 0.8);
  boat.rotation.y = 0.3;
  g.add(boat);
  return g;
}

export function car(color = P.yellow): THREE.Group {
  const g = new THREE.Group();
  const body = box(1.3, 0.35, 0.65, color);
  body.position.y = 0.3;
  g.add(body);
  const cabin = box(0.65, 0.3, 0.58, P.glass, { roughness: 0.2, flat: false });
  cabin.position.set(-0.05, 0.62, 0);
  g.add(cabin);
  for (const [x, z] of [[-0.42, 0.33], [0.42, 0.33], [-0.42, -0.33], [0.42, -0.33]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 8), mat(P.rockDark));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.14, z);
    g.add(w);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.14), lamp(P.cream));
  head.position.set(0.66, 0.32, 0.2);
  g.add(head);
  const head2 = head.clone();
  head2.position.z = -0.2;
  g.add(head2);
  return g;
}

export function vwBus(): THREE.Group {
  const g = new THREE.Group();
  const lower = box(1.7, 0.45, 0.8, P.mint);
  lower.position.y = 0.32;
  g.add(lower);
  const upper = box(1.7, 0.45, 0.8, P.cream);
  upper.position.y = 0.77;
  g.add(upper);
  for (let i = 0; i < 3; i++) {
    const win = box(0.4, 0.28, 0.82, P.glass, { roughness: 0.2, flat: false });
    win.position.set(-0.55 + i * 0.55, 0.78, 0);
    g.add(win);
  }
  for (const [x, z] of [[-0.55, 0.42], [0.55, 0.42], [-0.55, -0.42], [0.55, -0.42]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), mat(P.rockDark));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.15, z);
    g.add(w);
  }
  const board = box(1.1, 0.06, 0.3, P.pink);
  board.position.set(0, 1.03, 0);
  g.add(board);
  return g;
}

/** Striped beach umbrella with a towel below it. */
export function umbrella(color = P.pink): THREE.Group {
  const pole = cylinder(0.03, 0.03, 1.3, P.cream, 6);
  const top = cone(0.7, 0.35, color, 8);
  top.position.y = 1.3;
  const towel = box(0.5, 0.03, 1.1, P.mint);
  towel.position.set(0.45, 0, 0);
  return group(pole, top, towel);
}

/** LA lifeguard tower: a tiny hut on stilts with a ramp. */
export function lifeguardTower(): THREE.Group {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.4, 0.4], [0.4, 0.4], [-0.4, -0.4], [0.4, -0.4]]) {
    const leg = cylinder(0.05, 0.05, 1.0, P.wood, 6);
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  const floor = box(1.2, 0.1, 1.2, P.woodDark);
  floor.position.y = 1.0;
  g.add(floor);
  const hut = box(1.0, 0.8, 1.0, P.sky);
  hut.position.y = 1.1;
  g.add(hut);
  const win = box(0.7, 0.3, 1.04, P.glass, { roughness: 0.2, flat: false });
  win.position.y = 1.55;
  g.add(win);
  const roof = box(1.3, 0.1, 1.3, P.coral);
  roof.position.y = 1.9;
  g.add(roof);
  const ramp = box(0.5, 0.06, 1.8, P.wood);
  ramp.position.set(0, 0.5, 1.4);
  ramp.rotation.x = 0.5;
  g.add(ramp);
  return g;
}

export function surfboard(color = P.yellow): THREE.Mesh {
  const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 2, 6), mat(color)));
  b.scale.set(1, 1, 0.3);
  b.position.y = 0.75;
  b.rotation.z = 0.15;
  return b;
}

export function roadSign(): THREE.Group {
  const post = cylinder(0.04, 0.04, 1.3, P.rock, 6);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 6), mat(P.cream));
  shield.rotation.x = Math.PI / 2;
  shield.position.y = 1.35;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 6), mat(P.navy));
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 1.35;
  return group(post, shield, inner);
}

export function streetLamp(): THREE.Group {
  const post = cylinder(0.04, 0.05, 1.8, P.navy, 6);
  const arm = box(0.5, 0.05, 0.05, P.navy);
  arm.position.set(0.25, 1.8, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lamp(P.yellow));
  head.position.set(0.5, 1.72, 0);
  return group(post, arm, head);
}

export function road(length: number, width = 1.4): THREE.Group {
  const g = new THREE.Group();
  const strip = box(length, 0.06, width, P.road, { roughness: 1 });
  g.add(strip);
  const dashes = Math.floor(length / 0.8);
  for (let i = 0; i < dashes; i++) {
    const d = box(0.4, 0.02, 0.08, P.roadLine);
    d.position.set(-length / 2 + 0.4 + i * 0.8, 0.065, 0);
    g.add(d);
  }
  return g;
}

export function cactus(): THREE.Group {
  const body = cylinder(0.14, 0.17, 1.1, P.grassDark, 7);
  const armL = cylinder(0.09, 0.1, 0.5, P.grassDark, 7);
  armL.position.set(-0.3, 0.6, 0);
  const armLh = box(0.25, 0.14, 0.14, P.grassDark);
  armLh.position.set(-0.22, 0.55, 0);
  const armR = cylinder(0.09, 0.1, 0.4, P.grassDark, 7);
  armR.position.set(0.3, 0.75, 0);
  const armRh = box(0.25, 0.14, 0.14, P.grassDark);
  armRh.position.set(0.22, 0.7, 0);
  const flower = sphere(0.08, P.pink, 0);
  flower.position.y = 1.15;
  return group(body, armL, armLh, armR, armRh, flower);
}

/** Flat little figure: head, body and legs, used for people on the beach. */
export function person(shirt = P.pink, skin = 0xf1c7a8): THREE.Group {
  const legs = box(0.2, 0.3, 0.14, P.navy);
  const body = box(0.26, 0.32, 0.16, shirt);
  body.position.y = 0.3;
  const head = sphere(0.12, skin, 1);
  head.position.y = 0.75;
  const hair = sphere(0.125, P.trunkDark, 1);
  hair.position.y = 0.8;
  hair.scale.set(1, 0.6, 1);
  return group(legs, body, head, hair);
}

export function dog(): THREE.Group {
  const body = box(0.4, 0.18, 0.16, P.cream);
  body.position.y = 0.2;
  const head = box(0.18, 0.16, 0.16, P.cream);
  head.position.set(0.25, 0.32, 0);
  const ear = box(0.06, 0.1, 0.04, P.trunkDark);
  ear.position.set(0.25, 0.42, 0.08);
  const tail = box(0.06, 0.06, 0.16, P.cream);
  tail.position.set(-0.22, 0.32, 0);
  tail.rotation.x = 0.6;
  const g = group(body, head, ear, tail);
  for (const [x, z] of [[-0.14, 0.05], [0.14, 0.05], [-0.14, -0.05], [0.14, -0.05]]) {
    const leg = box(0.05, 0.14, 0.05, P.cream);
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  return g;
}


/** Classic Route 66 shield on a post. Detachable sticker. */
export function route66(): THREE.Group {
  const post = cylinder(0.03, 0.03, 1.1, P.rock, 6);
  const shield = textSign('66', '#fff5e6', '#2d3a6b', 0.5, 0.5);
  shield.position.y = 1.3;
  const top = textSign('ROUTE', '#2d3a6b', '#fff5e6', 0.5, 0.14);
  top.position.y = 1.62;
  const g = group(post, shield, top);
  g.userData.sticker = 'route66';
  return g;
}

/** Taco truck with a serving hatch and a little awning. */
export function tacoTruck(): THREE.Group {
  const g = new THREE.Group();
  const bodyT = box(2.0, 1.0, 0.9, P.yellow);
  bodyT.position.y = 0.3;
  g.add(bodyT);
  const cab = box(0.6, 0.7, 0.88, P.yellow);
  cab.position.set(1.25, 0.3, 0);
  g.add(cab);
  const win = box(0.3, 0.3, 0.9, P.glass, { roughness: 0.2, flat: false });
  win.position.set(1.3, 0.7, 0);
  g.add(win);
  const hatch = box(1.2, 0.5, 0.06, P.glass, { roughness: 0.2, flat: false });
  hatch.position.set(-0.2, 0.7, 0.46);
  g.add(hatch);
  const awning = box(1.4, 0.04, 0.5, P.coral);
  awning.position.set(-0.2, 1.3, 0.6);
  awning.rotation.x = 0.3;
  g.add(awning);
  const counter = box(1.3, 0.05, 0.25, P.wood);
  counter.position.set(-0.2, 0.9, 0.55);
  g.add(counter);
  const sign = textSign('TACOS', '#ff7f9f', '#fff5e6', 1.1, 0.3, true);
  sign.position.set(-0.2, 1.5, 0);
  g.add(sign);
  for (const [x, z] of [[-0.7, 0.45], [0.9, 0.45], [-0.7, -0.45], [0.9, -0.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10), mat(P.rockDark));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.18, z);
    g.add(w);
  }
  return g;
}

/** Hot dog cart with a striped umbrella. */
export function hotdogCart(): THREE.Group {
  const g = new THREE.Group();
  const cart = box(0.8, 0.5, 0.5, P.white);
  cart.position.y = 0.3;
  g.add(cart);
  const stripe = box(0.82, 0.12, 0.52, P.coral);
  stripe.position.y = 0.6;
  g.add(stripe);
  const pole = cylinder(0.02, 0.02, 1.2, P.rock, 6);
  pole.position.set(-0.25, 0.3, 0);
  g.add(pole);
  const top = cone(0.55, 0.25, P.yellow, 8);
  top.position.set(-0.25, 1.45, 0);
  g.add(top);
  for (const x of [-0.3, 0.3]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), mat(P.rockDark));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.12, 0.28);
    g.add(w);
  }
  const dog = box(0.3, 0.08, 0.1, 0xc8553d);
  dog.position.set(0.1, 0.8, 0);
  g.add(dog);
  return g;
}

export function iceCreamCart(): THREE.Group {
  const g = new THREE.Group();
  const cart = box(0.7, 0.55, 0.45, P.pink);
  cart.position.y = 0.25;
  g.add(cart);
  const lid = box(0.74, 0.06, 0.49, P.white);
  lid.position.y = 0.53;
  g.add(lid);
  const handle = cylinder(0.015, 0.015, 0.5, P.rock, 6);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.45, 0.5, 0);
  g.add(handle);
  for (const z of [-0.2, 0.2]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), mat(P.rockDark));
    w.rotation.x = Math.PI / 2;
    w.position.set(0.15, 0.14, z);
    g.add(w);
  }
  const cone1 = cone(0.07, 0.2, P.wood, 6);
  cone1.rotation.x = Math.PI;
  cone1.position.set(0.1, 0.72, 0);
  const scoop = sphere(0.08, P.mint, 1, { flat: false });
  scoop.position.set(0.1, 0.78, 0);
  g.add(cone1, scoop);
  return g;
}

export function loungeChair(color = P.white): THREE.Group {
  const seat = box(0.5, 0.06, 1.0, color);
  seat.position.y = 0.2;
  const back = box(0.5, 0.06, 0.5, color);
  back.position.set(0, 0.4, -0.6);
  back.rotation.x = -0.9;
  const g = group(seat, back);
  for (const [x, z] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.4], [0.2, -0.4]]) {
    const leg = cylinder(0.02, 0.02, 0.2, P.woodDark, 5);
    leg.position.set(x, 0, z);
    g.add(leg);
  }
  for (let i = 0; i < 4; i++) {
    const st = box(0.5, 0.01, 0.12, P.coral);
    st.position.set(0, 0.235, -0.35 + i * 0.25);
    g.add(st);
  }
  return g;
}

export function crosswalk(width = 1.4): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = box(0.18, 0.015, width * 0.85, P.roadLine);
    s.position.set(-0.4 + i * 0.2, 0.07, 0);
    g.add(s);
  }
  return g;
}

/** A string of bulbs sagging between two points (local x axis). */
export function stringLights(length: number, bulbs = 10): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push(new THREE.Vector3((t - 0.5) * length, -Math.sin(t * Math.PI) * length * 0.12, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.012, 4), mat(P.rockDark));
  g.add(wire);
  for (let i = 1; i < bulbs; i++) {
    const p = curve.getPoint(i / bulbs);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lamp([P.yellow, P.pink, P.mint][i % 3]));
    b.position.set(p.x, p.y - 0.06, p.z);
    g.add(b);
  }
  return g;
}

export function sandcastle(): THREE.Group {
  const base = cylinder(0.3, 0.34, 0.2, P.sandWet, 8);
  const tower = cylinder(0.12, 0.14, 0.3, P.sandWet, 8);
  tower.position.y = 0.2;
  const tower2 = cylinder(0.09, 0.1, 0.22, P.sandWet, 8);
  tower2.position.set(0.18, 0.2, 0.1);
  const flag = cylinder(0.008, 0.008, 0.2, P.rock, 4);
  flag.position.y = 0.5;
  const pennant = box(0.1, 0.06, 0.01, P.pink);
  pennant.position.set(0.05, 0.66, 0);
  return group(base, tower, tower2, flag, pennant);
}

export function flamingoFloat(): THREE.Group {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 14), mat(P.pink, { flat: false }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  shadowed(ring);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), mat(P.pink, { flat: false }));
  neck.position.set(0.22, 0.3, 0);
  neck.rotation.z = -0.3;
  const head = sphere(0.07, P.pink, 1, { flat: false });
  head.position.set(0.3, 0.5, 0);
  const beak = cone(0.03, 0.1, P.navy, 6);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.4, 0.49, 0);
  const g = group(ring, neck, head, beak);
  g.userData.sticker = 'flamingo';
  return g;
}

/** Distant hills with HOLLYWOOD letters, placed far behind the base as backdrop art. */
export function backdropHills(): THREE.Group {
  const g = new THREE.Group();
  const hillMat = mat(0xd98f98, { flat: true, roughness: 1 });
  const hillMat2 = mat(0xe6a9ad, { flat: true, roughness: 1 });
  const bumps: [number, number, number][] = [[-30, 9, 24], [-14, 12, 30], [4, 8, 22], [18, 11, 28], [34, 7, 20], [-42, 6, 18], [48, 8, 20]];
  bumps.forEach(([x, h, w], i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7), i % 2 ? hillMat : hillMat2);
    m.position.set(x, h / 2 - 6, 0);
    m.scale.set(1, 1, 0.5);
    g.add(m);
  });
  const letters = 'HOLLYWOOD';
  for (let i = 0; i < letters.length; i++) {
    const t = textSign(letters[i], '#fff5e6', '#3a2a3a', 1.6, 1.8);
    t.position.set(-10.5 + i * 2.4, 9.2, 14);
    t.rotation.y = 0.1;
    t.castShadow = false;
    g.add(t);
  }
  return g;
}

/** Little plane towing a banner; animated along a slow circle by the scene. */
export function bannerPlane(text = 'LA DAYDREAM'): THREE.Group {
  const g = new THREE.Group();
  const bodyP = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.6, 3, 8), mat(P.white, { flat: false }));
  bodyP.rotation.z = Math.PI / 2;
  const wing = box(0.3, 0.03, 1.1, P.coral);
  const tail = box(0.2, 0.3, 0.03, P.coral);
  tail.position.set(-0.35, 0.05, 0);
  const prop = box(0.02, 0.4, 0.06, P.rockDark);
  prop.position.set(0.44, 0, 0);
  const banner = textSign(text, '#fff5e6', '#ff7f9f', 2.6, 0.5);
  banner.position.set(-2.2, 0, 0);
  banner.castShadow = false;
  const line = cylinder(0.006, 0.006, 0.6, P.rockDark, 4);
  line.rotation.z = Math.PI / 2;
  line.position.set(-0.75, 0, 0);
  g.add(bodyP, wing, tail, prop, banner, line);
  g.name = 'plane';
  return g;
}

export function seagull(): THREE.Group {
  const bodyS = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 3, 6), mat(P.white, { flat: false }));
  bodyS.rotation.z = Math.PI / 2;
  const wl = box(0.3, 0.015, 0.08, P.white);
  wl.position.set(0, 0.02, -0.17);
  wl.rotation.x = 0.4;
  const wr = box(0.3, 0.015, 0.08, P.white);
  wr.position.set(0, 0.02, 0.17);
  wr.rotation.x = -0.4;
  const g = group(bodyS, wl, wr);
  g.name = 'seagull';
  return g;
}

/**
 * The end-of-Route-66 marker on Santa Monica Pier: three separate plates on a
 * blue pole. A rectangular SANTA MONICA plate, the US-highway shield with 66,
 * and an End of the Trail plate below.
 */
export function santaMonicaSign(): THREE.Group {
  const g = new THREE.Group();
  const pole = cylinder(0.04, 0.045, 2.5, 0x3f6fa8, 8, { flat: false });
  pole.position.z = -0.06;
  g.add(pole);
  const edge = mat(0x1a1a1a);

  const plate = (text: string, w: number, h: number, y: number, font: string): void => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.round(512 * (h / w));
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fbfbf6';
    ctx.fillRect(14, 14, c.width - 28, c.height - 28);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2 + c.height * 0.04);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), [edge, edge, edge, edge, face, face]));
    m.position.y = y;
    g.add(m);
  };
  plate('SANTA MONICA', 1.3, 0.34, 2.46, '700 84px Oswald, "Arial Narrow", sans-serif');
  plate('End of the Trail', 1.3, 0.3, 1.22, '500 70px Oswald, "Arial Narrow", sans-serif');

  // US highway shield: crown with a notch, sides curving in, pointed base
  const sh = new THREE.Shape();
  sh.moveTo(-0.5, 0.5);
  sh.lineTo(-0.1, 0.5);
  sh.quadraticCurveTo(0, 0.42, 0.1, 0.5);
  sh.lineTo(0.5, 0.5);
  sh.quadraticCurveTo(0.56, 0.1, 0.4, -0.2);
  sh.quadraticCurveTo(0.2, -0.5, 0, -0.62);
  sh.quadraticCurveTo(-0.2, -0.5, -0.4, -0.2);
  sh.quadraticCurveTo(-0.56, 0.1, -0.5, 0.5);
  sh.closePath();
  const back = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }), edge));
  back.scale.set(1.2, 0.78, 1);
  back.position.set(0, 1.88, -0.025);
  g.add(back);
  const inner = new THREE.Shape();
  inner.moveTo(-0.43, 0.43);
  inner.lineTo(-0.1, 0.43);
  inner.quadraticCurveTo(0, 0.36, 0.1, 0.43);
  inner.lineTo(0.43, 0.43);
  inner.quadraticCurveTo(0.48, 0.1, 0.34, -0.17);
  inner.quadraticCurveTo(0.17, -0.42, 0, -0.53);
  inner.quadraticCurveTo(-0.17, -0.42, -0.34, -0.17);
  inner.quadraticCurveTo(-0.48, 0.1, -0.43, 0.43);
  inner.closePath();
  const white = new THREE.Mesh(new THREE.ExtrudeGeometry(inner, { depth: 0.06, bevelEnabled: false }), mat(0xfbfbf6));
  white.scale.set(1.2, 0.78, 1);
  white.position.set(0, 1.88, -0.03);
  g.add(white);
  // the 66 itself, drawn on a transparent canvas laid over the shield
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '700 210px Oswald, "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('66', 128, 134);
  const numTex = new THREE.CanvasTexture(c);
  numTex.colorSpace = THREE.SRGBColorSpace;
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.5), new THREE.MeshStandardMaterial({ map: numTex, transparent: true, roughness: 0.6 }));
  num.position.set(0, 1.9, 0.035);
  g.add(num);
  const numBack = num.clone();
  numBack.rotation.y = Math.PI;
  numBack.position.z = -0.035;
  g.add(numBack);

  g.userData.sticker = 'santaMonicaSign';
  return g;
}

/**
 * A small looping roller coaster, Santa Monica pier style: lattice supports,
 * a twin-rail track and a train that runs along it (animated by the scene).
 */
export function coaster(): THREE.Group {
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector3(-3.0, 0.5, -1.6), new THREE.Vector3(-1.2, 2.6, -2.1), new THREE.Vector3(0.8, 0.7, -1.9),
    new THREE.Vector3(2.6, 1.8, -1.2), new THREE.Vector3(3.1, 0.6, 0.6), new THREE.Vector3(1.6, 2.4, 1.9),
    new THREE.Vector3(-0.6, 0.6, 2.0), new THREE.Vector3(-2.4, 1.7, 1.4), new THREE.Vector3(-3.3, 0.6, -0.2),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.6);
  g.userData.curve = curve;

  // rails: two tubes offset sideways from the centre line
  const railMat = mat(P.coral, { flat: false, roughness: 0.6 });
  const samples = 220;
  for (const side of [-1, 1]) {
    const rail: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
      rail.push(p.clone().addScaledVector(right, side * 0.16));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail, true), samples, 0.035, 6, true), railMat);
    shadowed(tube);
    g.add(tube);
  }
  // ties and lattice supports
  const tieMat = mat(P.cream);
  const postMat = mat(P.cream, { roughness: 0.9 });
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.08), tieMat);
    tie.position.copy(p).y -= 0.03;
    tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().setY(0).normalize());
    g.add(tie);
    if (i % 2 === 0 && p.y > 0.25) {
      for (const side of [-1, 1]) {
        const right = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        const foot = p.clone().addScaledVector(right, side * 0.16);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, foot.y, 5), postMat);
        post.position.set(foot.x, foot.y / 2, foot.z);
        g.add(post);
      }
      if (i % 4 === 0 && p.y > 0.9) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.03), postMat);
        brace.position.set(p.x, p.y * 0.5, p.z);
        brace.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize());
        g.add(brace);
      }
    }
  }
  // station platform and sign
  const platform = box(1.6, 0.18, 0.9, P.wood);
  platform.position.set(-3.0, 0.2, -1.0);
  g.add(platform);
  const sign = textSign('WEST COASTER', '#ffd166', '#2d3a6b', 1.6, 0.36, true);
  sign.position.set(-3.0, 1.3, -1.2);
  g.add(sign);
  for (const x of [-3.7, -2.3]) {
    const pole = cylinder(0.03, 0.03, 1.1, P.navy, 6);
    pole.position.set(x, 0.3, -1.2);
    g.add(pole);
  }
  // train: three cars with round riders
  const train = new THREE.Group();
  train.name = 'coasterTrain';
  const carColors = [P.yellow, P.mint, P.pink];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    const bodyC = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.46), mat(carColors[i])));
    bodyC.position.y = 0.14;
    car.add(bodyC);
    const nose = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat(carColors[i])));
    nose.position.set(0, 0.14, 0.23);
    nose.scale.set(1, 0.6, 0.6);
    car.add(nose);
    car.userData.offset = i * 0.045;
    train.add(car);
  }
  g.add(train);
  return g;
}

/** Move a coaster's train along its track; `t` is scene time in seconds. */
export function animateCoaster(c: THREE.Object3D, t: number): void {
  const curve = c.userData.curve as THREE.CatmullRomCurve3 | undefined;
  const train = c.getObjectByName('coasterTrain');
  if (!curve || !train) return;
  const base = (t * 0.045) % 1;
  for (const car of train.children) {
    const u = (base - (car.userData.offset as number) + 1) % 1;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    car.position.copy(p).y += 0.02;
    car.lookAt(p.clone().add(tan));
  }
}
