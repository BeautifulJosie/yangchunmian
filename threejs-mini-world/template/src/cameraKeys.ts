import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Keyboard camera control so the view can be adjusted while the mouse is busy
 * dragging a sticker. A/D orbit, W/S tilt, Q/E zoom. Keys are polled each frame
 * so holding one gives a smooth, constant-speed move.
 */
const ORBIT_SPEED = 0.6; // radians per second
const TILT_SPEED = 0.4;
const ZOOM_SPEED = 0.4; // fraction of the current distance per second

export class CameraKeys {
  private down = new Set<string>();
  private spherical = new THREE.Spherical();
  private offset = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, private controls: OrbitControls) {
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      this.down.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.down.clear());
  }

  update(dt: number): void {
    if (this.down.size === 0) return;
    const orbit = (this.down.has('a') ? 1 : 0) - (this.down.has('d') ? 1 : 0);
    const tilt = (this.down.has('w') ? 1 : 0) - (this.down.has('s') ? 1 : 0);
    const zoom = (this.down.has('q') ? 1 : 0) - (this.down.has('e') ? 1 : 0);
    if (!orbit && !tilt && !zoom) return;

    this.offset.copy(this.camera.position).sub(this.controls.target);
    this.spherical.setFromVector3(this.offset);
    this.spherical.theta += orbit * dt * ORBIT_SPEED;
    this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi - tilt * dt * TILT_SPEED, 0.25, this.controls.maxPolarAngle);
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius * (1 + zoom * dt * ZOOM_SPEED), this.controls.minDistance, this.controls.maxDistance);
    this.offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.controls.target).add(this.offset);
    this.camera.lookAt(this.controls.target);
  }
}
