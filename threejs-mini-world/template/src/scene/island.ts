import * as THREE from 'three';
import { palette as P } from '../palette';
import { groundHeight, makeIsland, makeOceanBlock } from './base';
import * as props from './props';
import * as F from './figures';
import { characterById } from './characters';

/** Props are built at a comfortable size and the whole set is shrunk so the island reads as a model. */
const PROP_SCALE = 0.64;
/** Layout coordinates were authored for the larger island; this squeezes them onto the current one. */
const LAYOUT = 0.89;
const STYLE: keyof typeof F.STYLES = 'kokeshi';

/** The default, fully furnished island. Everything in `props` is something a player can later move. */
export function buildIsland(): THREE.Group {
  const root = new THREE.Group();
  const ocean = makeOceanBlock();
  ocean.name = 'ocean';
  root.add(ocean);
  const terrain = makeIsland();
  terrain.name = 'terrain';
  root.add(terrain);

  const items = new THREE.Group();
  items.name = 'props';
  items.scale.setScalar(PROP_SCALE);
  const add = (o: THREE.Object3D, x: number, z: number, rotY = 0, y?: number): THREE.Object3D => {
    o.position.set((x * LAYOUT) / PROP_SCALE, 0, (z * LAYOUT) / PROP_SCALE);
    o.rotation.y = rotY;
    o.userData.lift = y;
    items.add(o);
    return o;
  };

  // ---- streets ------------------------------------------------------------
  add(props.road(10), 1.4, 3.8, 0.06);
  add(props.crosswalk(), 2.6, 3.8, 0.06);
  const bus = add(props.vwBus(), -1.2, 3.9, 0.06);
  bus.name = 'bus';
  add(props.car(P.yellow), 4.6, 3.6, 0.06 + Math.PI);
  add(props.santaMonicaSign(), 6.0, 3.0, -0.5);
  add(props.streetLamp(), 0.0, 3.0, Math.PI);
  add(props.streetLamp(), -4.4, 4.9, 0.4);
  add(props.roadSign(), -3.0, 4.7, 0.5);

  // ---- buildings ----------------------------------------------------------
  add(props.diner(), 3.6, 0.7, -0.45);
  add(props.motel(), -1.6, -3.9, 0.18);
  add(props.ferrisWheel(2.1), 5.4, -3.6, -0.95);
  add(props.lifeguardTower(), -2.6, 6.0, 0.35);
  add(props.pier(5.2), -5.6, 4.4, 2.36, 0.22);
  add(props.tacoTruck(), 3.2, 6.2, 2.9);
  add(props.stringLights(5.6, 12), 1.8, 2.2, -0.45, 2.3);
  const coaster = add(props.coaster(), -4.5, -2.5, 0.25);
  coaster.name = 'coaster';

  // ---- plants -------------------------------------------------------------
  const palmSpots: [number, number, number, number][] = [
    [-6.6, 1.0, 3.0, 0.3], [-5.0, 2.2, 2.7, -0.25], [7.0, -0.6, 2.6, 0.2], [7.4, 2.2, 3.0, -0.3],
    [0.8, -6.6, 2.8, 0.2], [-1.2, 1.2, 2.3, 0.1], [2.8, -1.6, 2.2, -0.2], [-7.2, 3.4, 2.4, 0.3],
    [5.2, 6.6, 2.5, -0.2], [-2.6, -6.6, 2.6, 0.25],
  ];
  palmSpots.forEach(([x, z, h, lean], i) => add(props.palm(h, lean, i), x, z, i * 1.3));
  add(props.roundTree(P.autumn, 1.0), -0.2, -6.0, 0);
  add(props.roundTree(P.leafLight, 0.9), -6.4, -5.0, 0);
  add(props.roundTree(P.autumn, 0.8), 2.2, -5.4, 0);
  add(props.bush(P.grassDark, 0.4), -6.2, -0.6, 0);
  add(props.bush(P.leafLight, 0.3), 1.0, -2.4, 0);
  add(props.bush(P.pink, 0.25), -2.6, 0.6, 0);
  add(props.bush(P.pink, 0.22), 2.0, -4.6, 0);
  add(props.cactus(), 6.4, 1.6, 0.4);
  add(props.cactus(), -3.8, 2.6, 1.2);
  add(props.cactus(), 7.2, -2.4, 2.0);
  add(props.rock(0.35), 6.2, 3.2, 0.4);
  add(props.rock(0.25), -6.4, 2.0, 1.1);
  add(props.rock(0.3), 2.2, -6.4, 2.2);
  add(props.rock(0.2), -0.6, 6.6, 1.6);

  // ---- beach --------------------------------------------------------------
  add(props.umbrella(P.pink), 3.4, 6.4, 0);
  add(props.umbrella(P.yellow), 5.8, 4.6, 0.4);
  add(props.loungeChair(P.mint), 6.0, 5.4, 2.9);
  add(props.surfboard(P.mint), 6.6, 3.4, 0.2);
  add(props.surfboard(P.coral), 6.9, 3.1, -0.3);

  // ---- people: character stickers from the catalog -------------------------
  const spots: [string, number, number, number, number?][] = [
    ['sunbather', 5.6, 6.9, 2.6],
    ['volleyball', 1.6, 7.2, 0.3],
    ['sandcastleKid', -0.4, 7.4, 2.9],
    ['surferWalk', 3.9, 2.9, -0.2],
    ['dogWalker', 0.4, 6.2, -1.0],
    ['bubbleKid', -1.6, 7.4, 0.3],
    ['skater', 3.4, 3.9, -0.2],
    ['bikeWalker', -3.2, 4.5, -0.3],
    ['iceCreamVendor', -4.6, 6.8, 0.5],
    ['hotdogVendor', 1.2, 5.3, -2.6],
    ['customer', 2.2, 5.8, -2.2],
    ['tourist', 5.0, -1.2, -2.4],
    ['fisher', -7.7, 6.2, 2.36 + Math.PI / 2, 0.74],
    ['waiter', 2.3, 2.5, 1.0],
    ['busker', -3.3, 1.7, 0.35],
    ['couple', -6.6, 3.4, 0.9],
    ['balconyGuest', 0.6, -2.0, 0.4],
    ['poolFloat', -1.9, -2.2, 0.6, 0.2],
    ['surfer', 9.6, 1.4, -0.6],
    ['surfer', 8.2, 7.4, 0.4],
    ['lifeguard', -3.6, 7.4, 0.4],
    ['swimmer', 3.0, 7.7, -1.4],
  ];
  spots.forEach(([id, x, z, rot, lift], i) => {
    const c = characterById(id);
    if (!c) return;
    const g = c.build();
    g.name = 'char:' + id + ':' + i;
    add(g, x, z, rot, lift);
  });
  // waving from the ferris wheel (attached to cabins so they ride along)
  const wheel = items.getObjectByName('ferrisWheel');
  if (wheel) {
    const cabins = wheel.children.filter((c) => c.name === 'cabin');
    [0, 5].forEach((ci, k) => {
      const r = F.figure(STYLE, { ...F.outfitFor(20 + k), scale: 0.5 }, { sit: true, armL: [-2.6, 0, 0.3], armR: [-2.6, 0, -0.3] });
      r.position.set(0, 0.0, 0.08);
      r.rotation.y = -Math.PI / 2;
      cabins[ci].add(r);
    });
  }
  // riders in the coaster cars
  const train = coaster.getObjectByName('coasterTrain');
  train?.children.forEach((car, i) => {
    for (const side of [-1, 1]) {
      const r = F.figure(STYLE, { ...F.outfitFor(24 + i * 2 + (side + 1) / 2), scale: 0.3 }, { armL: [-2.4, 0, 0.3], armR: [-2.4, 0, -0.3] });
      r.position.set(side * 0.08, 0.18, -0.05);
      car.add(r);
    }
  });

  // snap everything to the terrain under it; `lift` keeps things that sit on structures
  items.updateMatrixWorld(true);
  items.children.forEach((o) => {
    const wx = o.position.x * PROP_SCALE;
    const wz = o.position.z * PROP_SCALE;
    const lift = (o.userData.lift as number | undefined) ?? 0;
    o.position.y = (groundHeight(terrain, wx, wz) + lift) / PROP_SCALE;
  });
  root.add(items);

  // ---- sky and backdrop (not part of the sticker set) ---------------------
  const sky = new THREE.Group();
  sky.name = 'skyProps';
  const hills = props.backdropHills();
  hills.position.set(-14, -9.5, -46);
  hills.scale.setScalar(0.6);
  hills.rotation.y = 0.15;
  sky.add(hills);
  const plane = props.bannerPlane();
  plane.scale.setScalar(0.9);
  sky.add(plane);
  for (let i = 0; i < 5; i++) {
    const s = props.seagull();
    s.position.set(-8 + i * 2.2, 3.4 + (i % 2) * 0.6, -6 + i * 1.3);
    s.rotation.y = 0.6;
    s.userData.phase = i * 1.3;
    sky.add(s);
  }
  root.add(sky);

  return root;
}

/** Per-frame motion for the default island: wheel, coaster, plane, gulls, bus, surfers. */
export function animateIsland(root: THREE.Group, t: number, dt: number): void {
  const wheel = root.getObjectByName('ferrisWheel');
  if (wheel) {
    wheel.rotation.z += dt * 0.25;
    wheel.children.forEach((c) => { if (c.name === 'cabin') c.rotation.z = -wheel.rotation.z; });
  }
  const coaster = root.getObjectByName('coaster');
  if (coaster) props.animateCoaster(coaster, t);
  const plane = root.getObjectByName('plane');
  if (plane) {
    const a = t * 0.12;
    plane.position.set(Math.cos(a) * 17, 4.2 + Math.sin(t * 0.5) * 0.3, Math.sin(a) * 17 - 4);
    plane.rotation.y = -a - Math.PI / 2;
  }
  root.traverse((o) => {
    if (o.name === 'seagull') {
      const ph = o.userData.phase as number;
      o.position.y += Math.sin(t * 2 + ph) * 0.004;
      o.children[1].rotation.x = 0.4 + Math.sin(t * 6 + ph) * 0.4;
      o.children[2].rotation.x = -0.4 - Math.sin(t * 6 + ph) * 0.4;
    }
    if (o.name.startsWith('char:')) {
      const c = characterById(o.name.split(':')[1]);
      if (c?.animate) c.animate(o as THREE.Group, t + Number(o.name.split(':')[2]) * 1.7);
    }
  });
  const bus = root.getObjectByName('bus');
  if (bus) bus.position.x = ((-3.4 + ((t * 0.5) % 8)) * LAYOUT) / PROP_SCALE;
}
