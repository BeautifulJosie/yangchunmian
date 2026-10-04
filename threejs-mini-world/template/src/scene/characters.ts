import * as THREE from 'three';
import { palette as P } from '../palette';
import { box, cylinder, group, mat, shadowed } from './helpers';
import * as F from './figures';
import * as hand from './people';
import * as props from './props';

/**
 * Character stickers: each is a person (or a pair) together with the prop that
 * tells their story, built as one group so it moves as a single sticker.
 */
export interface Character {
  id: string;
  name: string;
  build: () => THREE.Group;
  animate?: (g: THREE.Group, t: number) => void;
}

const STYLE: keyof typeof F.STYLES = 'kokeshi';
const fig = (i: number, extra: F.Outfit = {}, pose: F.Pose = {}) => F.figure(STYLE, { ...F.outfitFor(i), ...extra }, pose);
const smooth = (c: number) => mat(c, { flat: false, roughness: 0.8 });

function heart(color = P.pink): THREE.Mesh {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.12);
  sh.bezierCurveTo(0.18, 0.04, 0.12, 0.18, 0, 0.1);
  sh.bezierCurveTo(-0.12, 0.18, -0.18, 0.04, 0, -0.12);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), smooth(color));
  m.name = 'heart';
  return m;
}

function bubble(r: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(0xdff6ff, { flat: false, transparent: true, opacity: 0.45, roughness: 0.2 }));
}

export const CHARACTERS: Character[] = [
  {
    id: 'sunbather', name: '躺椅晒太阳',
    build: () => {
      const g = new THREE.Group();
      g.add(props.loungeChair());
      const p = fig(0, { shades: true, shirt: P.coral }, { lie: true, armL: [0.2, 0, 0.5], armR: [0.2, 0, -0.5] });
      p.position.set(0, 0.24, 0.42); // head toward the backrest
      p.scale.setScalar(0.8);
      g.add(p);
      const drink = cylinder(0.04, 0.03, 0.12, P.yellow, 8, { flat: false });
      drink.position.set(0.38, 0.06, 0.35);
      g.add(drink);
      return g;
    },
  },
  {
    id: 'volleyball', name: '沙滩排球（两人）',
    build: () => {
      const g = new THREE.Group();
      const a = fig(1, { shirt: P.white }, { armL: [-1.6, 0.4, 0.6], armR: [-1.6, -0.4, -0.6] });
      const held = hand.volleyball();
      held.scale.setScalar(1.6);
      held.position.set(0, 0.62, 0.34);
      a.add(held);
      a.position.set(-0.7, 0, 0);
      a.rotation.y = 0.9;
      const b = fig(2, { shirt: P.mint, hat: 'cap' }, { armL: [-1.0, 0, 1.0], armR: [-1.0, 0, -1.0], tiltZ: 0.15 });
      b.position.set(0.7, 0, 0);
      b.rotation.y = -0.9 + Math.PI;
      const net = new THREE.Group();
      for (const x of [-0.5, 0.5]) { const pole = cylinder(0.015, 0.015, 1.0, P.wood, 6); pole.position.set(x, 0, 0.9); net.add(pole); }
      const mesh = box(1.0, 0.3, 0.01, P.white, { transparent: true, opacity: 0.6 });
      mesh.position.set(0, 0.7, 0.9);
      net.add(mesh);
      net.rotation.y = Math.PI / 2;
      g.add(a, b, net);
      return g;
    },
  },
  {
    id: 'sandcastleKid', name: '堆沙堡的小孩',
    build: () => {
      const g = new THREE.Group();
      const k = fig(3, { shirt: P.yellow, scale: 0.65, hat: 'cap' }, { sit: true, lean: 0.25, armL: [-1.3, 0, 0.3], armR: [-1.3, 0, -0.3] });
      k.position.set(0, 0, 0.1);
      const castle = props.sandcastle();
      castle.position.set(0, 0, 0.55);
      const bucket = cylinder(0.08, 0.06, 0.14, P.sky, 10, { flat: false });
      bucket.position.set(0.4, 0, 0.3);
      const spade = box(0.06, 0.02, 0.18, P.coral);
      spade.position.set(-0.4, 0.01, 0.35);
      g.add(k, castle, bucket, spade);
      return g;
    },
  },
  {
    id: 'surferWalk', name: '扛冲浪板',
    build: () => {
      const g = new THREE.Group();
      const p = fig(4, { shirt: P.sky, shades: true }, { armL: [-0.2, 0, 0.6], armR: [0.5, 0, -0.3] });
      // flat pointed board tucked under the arm, long axis vertical
      const board = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), smooth(P.yellow)));
      board.scale.set(0.035, 0.52, 0.17);
      board.position.set(-0.38, 0.5, 0.0);
      board.rotation.z = -0.08;
      g.add(p, board);
      return g;
    },
  },
  {
    id: 'dogWalker', name: '遛狗',
    build: () => {
      const g = new THREE.Group();
      const p = fig(5, { shirt: P.lilac, hat: 'sun' }, { armR: [-0.9, 0, -0.3] });
      const d = F.dog(P.cream);
      d.position.set(0.55, 0, 0.6);
      d.rotation.y = 0.3;
      const leash = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0.24, 0.52, 0.16), new THREE.Vector3(0.6, 0.3, 0.55)), 1, 0.008, 4), mat(0x2a2020));
      g.add(p, d, leash);
      return g;
    },
  },
  {
    id: 'bubbleKid', name: '吹泡泡的小孩',
    build: () => {
      const g = new THREE.Group();
      const k = fig(6, { shirt: P.pink, scale: 0.65 }, { armR: [-1.9, 0, -0.1], headTilt: -0.25 });
      const wand = cylinder(0.01, 0.01, 0.2, P.coral, 6);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), mat(P.coral));
      ring.position.y = 0.12;
      F.hold(k, 'right', group(wand, ring), 0.1);
      g.add(k);
      [[0.1, 0.95, 0.35, 0.05], [0.22, 1.1, 0.45, 0.07], [0.05, 1.25, 0.55, 0.04]].forEach(([x, y, z, r], i) => { const b = bubble(r); b.position.set(x, y, z); b.name = 'bubble' + i; g.add(b); });
      return g;
    },
    animate: (g, t) => { for (let i = 0; i < 3; i++) { const b = g.getObjectByName('bubble' + i); if (b) b.position.y = 0.95 + i * 0.15 + Math.sin(t * 1.5 + i) * 0.06; } },
  },
  {
    id: 'skater', name: '滑板少年',
    build: () => {
      const g = new THREE.Group();
      const deck = box(0.62, 0.035, 0.2, P.coral);
      deck.position.y = 0.09;
      g.add(deck);
      for (const [x, z] of [[-0.21, 0.09], [0.21, 0.09], [-0.21, -0.09], [0.21, -0.09]]) {
        const w = cylinder(0.04, 0.04, 0.035, P.white, 10);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.04, z);
        g.add(w);
      }
      const p = fig(7, { shirt: P.navy, hat: 'cap' }, { lean: 0.1, tiltZ: -0.12, armL: [-1.0, 0, 1.3], armR: [0.6, 0, -1.2] });
      p.position.set(0.05, 0.11, 0);
      p.rotation.y = 0.0;
      F.legStubs(p, P.navy, 0.1, 0.2, 0.08);
      g.add(p);
      return g;
    },
  },
  {
    id: 'bikeWalker', name: '推自行车的人',
    build: () => {
      const g = F.cyclist(STYLE, { ...F.outfitFor(8), shirt: P.coral });
      g.remove(g.children[1]);
      const p = fig(8, { shirt: P.coral, hat: 'cap' }, { armR: [-1.2, 0, -0.9], armL: [0.3, 0, 0.3] });
      p.position.set(0.1, 0, 0.42);
      p.rotation.y = -Math.PI / 2;
      g.add(p);
      g.rotation.y = 0.5;
      return g;
    },
  },
  {
    id: 'iceCreamVendor', name: '冰淇淋小贩（含车）',
    build: () => {
      const g = new THREE.Group();
      const cart = props.iceCreamCart();
      cart.position.set(0, 0, 0.4);
      cart.rotation.y = Math.PI / 2;
      const p = fig(9, { shirt: P.white, hat: 'cap' }, { armL: [-1.5, 0, 0.3], armR: [-1.5, 0, -0.3] });
      p.position.set(0, 0, -0.35);
      g.add(cart, p);
      return g;
    },
  },
  {
    id: 'hotdogVendor', name: '热狗摊老板（含摊）',
    build: () => {
      const g = new THREE.Group();
      const cart = props.hotdogCart();
      cart.position.z = 0.3;
      g.add(cart);
      const p = fig(10, { shirt: P.coral, hat: 'cap' }, { armR: [-1.6, 0, -0.3], armL: [-0.6, 0, 0.3] });
      F.hold(p, 'right', hand.hotdog(), 0.1);
      p.position.set(0, 0, -0.45);
      g.add(p);
      return g;
    },
  },
  {
    id: 'customer', name: '吃冰淇淋的人',
    build: () => {
      const p = fig(11, { shirt: P.mint }, { armL: [-1.7, 0.5, 0.5], armR: [-1.7, -0.5, -0.5], headTilt: 0.15 });
      const ice = hand.iceCream();
      ice.scale.setScalar(1.6);
      ice.position.set(0, 0.62, 0.3);
      return group(p, ice);
    },
  },
  {
    id: 'tourist', name: '拍照的游客',
    build: () => {
      const p = fig(12, { shirt: P.yellow, hat: 'sun' }, { armL: [-2.2, 0, 0.55], armR: [-2.2, 0, -0.55], headTilt: 0.1 });
      const cam = hand.camera();
      cam.position.set(0, 0.8, 0.44);
      return group(p, cam);
    },
  },
  {
    id: 'fisher', name: '码头钓鱼',
    build: () => {
      const g = new THREE.Group();
      const p = fig(13, { shirt: P.navy, hat: 'sun' }, { sit: true, armR: [-1.4, 0, -0.3], armL: [-1.2, 0, 0.3], lean: 0.1 });
      F.legStubs(p, P.navy, 0.09, 1.3, 0.24);
      const rod = cylinder(0.012, 0.015, 1.2, P.woodDark, 6);
      rod.rotation.x = 1.1;
      rod.position.set(0.18, 0.75, 0.5);
      const line = cylinder(0.004, 0.004, 0.8, P.white, 4);
      line.position.set(0.18, 0.55, 1.05);
      const bucket = cylinder(0.1, 0.08, 0.18, P.sky, 10, { flat: false });
      bucket.position.set(-0.45, 0, 0.1);
      g.add(p, rod, line, bucket);
      return g;
    },
  },
  {
    id: 'waiter', name: 'Diner 服务员',
    build: () => {
      const p = fig(14, { shirt: P.white, pants: 0x1c1c1c }, { armL: [-1.7, 0.5, 0.5], armR: [-1.7, -0.5, -0.5] });
      const menu = box(0.26, 0.34, 0.02, P.coral);
      const page = box(0.2, 0.26, 0.025, P.cream);
      page.position.y = 0.04;
      for (let i = 0; i < 3; i++) { const line = box(0.12, 0.015, 0.03, P.navy); line.position.y = 0.2 - i * 0.06; menu.add(line); }
      menu.add(page);
      menu.position.set(0, 0.6, 0.3);
      menu.rotation.x = -0.3;
      return group(p, menu);
    },
  },
  {
    id: 'busker', name: '弹吉他的街头艺人',
    build: () => {
      const g = new THREE.Group();
      const stool = cylinder(0.14, 0.12, 0.3, P.wood, 10);
      const p = fig(15, { shirt: P.lilac, hat: 'cap' }, { sit: true, armL: [-1.9, 0.6, 0.7], armR: [-1.6, -0.5, -0.6], headTilt: 0.2 });
      p.position.y = 0.3;
      F.legStubs(p, P.navy, 0.09, 1.3, 0.22);
      const gt = hand.guitar();
      gt.scale.setScalar(1.2);
      gt.position.set(0.06, 0.66, 0.4);
      gt.rotation.set(0, 0, -1.0);
      const hat = cylinder(0.12, 0.12, 0.04, P.rockDark, 12);
      hat.position.set(0.45, 0, 0.3);
      g.add(stool, p, gt, hat);
      return g;
    },
  },
  {
    id: 'couple', name: '牵手的情侣',
    build: () => {
      const g = new THREE.Group();
      const a = fig(16, { shirt: P.pink, hair: 0xe9c46a }, { armR: [-0.7, 0, -0.9], armL: [0.2, 0, 0.3], tiltZ: -0.12, headTurn: -0.5 });
      a.position.set(-0.26, 0, 0);
      const b = fig(17, { shirt: P.sky }, { armL: [-0.7, 0, 0.9], armR: [0.2, 0, -0.3], tiltZ: 0.12, headTurn: 0.5 });
      b.position.set(0.26, 0, 0);
      const h = heart();
      h.position.set(0, 1.35, 0);
      g.add(a, b, h);
      return g;
    },
    animate: (g, t) => { const h = g.getObjectByName('heart'); if (h) { h.position.y = 1.35 + Math.sin(t * 2) * 0.04; h.rotation.y = Math.sin(t) * 0.4; } },
  },
  {
    id: 'balconyGuest', name: '阳台喝饮料的人',
    build: () => {
      const g = new THREE.Group();
      const p = fig(18, { shirt: P.coral, shades: true }, { armR: [-1.7, -0.4, -0.6], armL: [-0.8, 0, 0.4], lean: 0.08 });
      const bowl = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 12), mat(0xffb15e, { flat: false }));
      bowl.rotation.x = Math.PI;
      bowl.position.y = 0.18;
      const stem = cylinder(0.01, 0.01, 0.12, P.cream, 6);
      const foot = cylinder(0.05, 0.05, 0.015, P.cream, 10);
      const brolly = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.03, 8), mat(P.pink));
      brolly.position.set(0.04, 0.3, 0);
      const stick = cylinder(0.005, 0.005, 0.14, P.cream, 4);
      stick.position.set(0.04, 0.2, 0);
      const drink = group(foot, stem, bowl, brolly, stick);
      drink.scale.setScalar(1.5);
      drink.position.set(0.1, 0.62, 0.34);
      p.add(drink);
      g.add(p);
      return g;
    },
  },
  {
    id: 'poolFloat', name: '泳池火烈鸟上的人',
    build: () => {
      const g = new THREE.Group();
      g.add(props.flamingoFloat());
      const p = fig(19, { shirt: P.yellow, hat: 'sun', scale: 0.8 }, { sit: true, armL: [0.3, 0, 1.3], armR: [0.3, 0, -1.3], lean: -0.2 });
      p.position.set(-0.05, 0.24, 0);
      g.add(p);
      return g;
    },
    animate: (g, t) => { g.userData.baseY ??= g.position.y; g.rotation.z = Math.sin(t * 1.3) * 0.05; g.position.y = g.userData.baseY + Math.sin(t) * 0.02; },
  },
  {
    id: 'surfer', name: '冲浪者',
    build: () => {
      const g = F.surfer(STYLE, { ...F.outfitFor(22), shirt: P.coral }, P.mint);
      const rider = g.children[2] as THREE.Group;
      F.legStubs(rider, P.navy, 0.1, 0.2, 0.08);
      return g;
    },
    animate: (g, t) => { g.userData.baseY ??= g.position.y; g.rotation.z = Math.sin(t * 1.4) * 0.08; g.position.y = g.userData.baseY + Math.sin(t * 1.1) * 0.05; },
  },
  {
    id: 'wheelRiders', name: '摩天轮座舱（两人）',
    build: () => {
      const g = new THREE.Group();
      const cabin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), mat(P.yellow)));
      cabin.position.y = 0.2;
      g.add(cabin);
      [-1, 1].forEach((s, k) => {
        const r = F.figure(STYLE, { ...F.outfitFor(20 + k), scale: 0.45 }, { armL: [-2.6, 0, 0.4], armR: [-2.6, 0, -0.4] });
        r.position.set(s * 0.1, 0.3, 0.02);
        g.add(r);
      });
      return g;
    },
  },
  {
    id: 'coasterTrain', name: '过山车一车人',
    build: () => {
      const g = new THREE.Group();
      [P.yellow, P.mint, P.pink].forEach((c, i) => {
        const car = new THREE.Group();
        const bodyC = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.46), mat(c)));
        bodyC.position.y = 0.14;
        car.add(bodyC);
        for (const side of [-1, 1]) {
          const r = F.figure(STYLE, { ...F.outfitFor(24 + i * 2 + (side + 1) / 2), scale: 0.3 }, { armL: [-2.4, 0, 0.3], armR: [-2.4, 0, -0.3] });
          r.position.set(side * 0.08, 0.2, -0.05);
          car.add(r);
        }
        car.position.z = -i * 0.5;
        g.add(car);
      });
      return g;
    },
  },
  {
    id: 'lifeguard', name: '救生员（望远镜）',
    build: () => {
      const p = fig(26, { shirt: P.coral, pants: P.coral, hat: 'cap' }, { armL: [-2.5, 0, 0.5], armR: [-2.5, 0, -0.5] });
      const bino = group(cylinder(0.035, 0.035, 0.12, 0x2a2a2a, 8), cylinder(0.035, 0.035, 0.12, 0x2a2a2a, 8));
      bino.children[0].position.x = -0.045;
      bino.children[1].position.x = 0.045;
      bino.rotation.x = Math.PI / 2;
      bino.position.set(0, 0.86, 0.46);
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 14), mat(P.coral));
      buoy.position.set(0.4, 0.17, 0);
      return group(p, bino, buoy);
    },
  },
  {
    id: 'swimmer', name: '套着游泳圈奔跑的人',
    build: () => {
      const p = fig(27, { shirt: P.sky, pants: P.sky }, { armL: [-1.4, 0, 1.1], armR: [-0.4, 0, -1.1], lean: 0.18 });
      const ring = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 10, 8, Math.PI / 2), mat(i % 2 ? P.white : 0xe8493a, { flat: false }));
        seg.rotation.z = (i * Math.PI) / 2;
        ring.add(seg);
      }
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.52;
      p.add(ring);
      return group(p);
    },
  },
];

export function characterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
