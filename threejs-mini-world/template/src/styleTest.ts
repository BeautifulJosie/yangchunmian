import * as THREE from 'three';
import { palette as P } from './palette';
import { textSign } from './scene/helpers';
import * as F from './scene/figures';
import { CHARACTERS } from './scene/characters';

/** A lineup of figure styles rendered with the island's lighting, for choosing a look. */
export function buildStyleLineup(only?: string | null): THREE.Group {
  const root = new THREE.Group();
  root.add(floor());
  const all = Object.keys(F.STYLES) as (keyof typeof F.STYLES)[];
  const keys = only && only in F.STYLES ? [only as keyof typeof F.STYLES] : all;
  keys.forEach((key, row) => {
    const z = (row - (keys.length - 1) / 2) * 3.2;
    const label = textSign(F.STYLES[key].name, '#fff5e6', '#3a2a3a', 1.6, 0.5);
    label.position.set(-4.6, 0.3, z);
    label.rotation.y = 0.5;
    root.add(label);
    const stand = F.figure(key, { ...F.outfitFor(1), shirt: P.pink, hat: 'sun' });
    stand.position.set(-3.0, 0, z);
    const wave = F.figure(key, { ...F.outfitFor(2), shirt: P.mint, shades: true, hat: 'cap' }, { armR: [-2.7, 0, -0.3] });
    wave.position.set(-1.6, 0, z);
    const ride = F.cyclist(key, { ...F.outfitFor(4), shirt: P.coral });
    ride.position.set(1.4, 0, z);
    ride.rotation.y = -0.4;
    root.add(stand, wave, ride);
  });
  return root;
}

function floor(): THREE.Mesh {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: P.sand, roughness: 1 }));
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  return f;
}

/** Character sheet: every character sticker in a grid with its name, for review. */
export const SHEET_COLS = 6;
export const SHEET_STEP = 6;
export function buildCharacterSheet(): THREE.Group {
  const root = new THREE.Group();
  root.add(floor());
  CHARACTERS.forEach((c, i) => {
    const col = i % SHEET_COLS;
    const row = Math.floor(i / SHEET_COLS);
    const x = (col - (SHEET_COLS - 1) / 2) * SHEET_STEP;
    const z = row * SHEET_STEP * 1.6;
    const g = c.build();
    g.position.set(x, 0, z);
    g.rotation.y = 0.3;
    g.name = 'char:' + c.id;
    root.add(g);
    const label = textSign(`${i + 1} ${c.name}`, '#fff5e6', '#3a2a3a', 2.0, 0.34);
    label.position.set(x, 0.17, z + 1.1);
    label.castShadow = false;
    root.add(label);
  });
  return root;
}

export function animateSheet(root: THREE.Group, t: number): void {
  CHARACTERS.forEach((c) => {
    const g = root.getObjectByName('char:' + c.id) as THREE.Group | undefined;
    if (g && c.animate) c.animate(g, t);
  });
}
