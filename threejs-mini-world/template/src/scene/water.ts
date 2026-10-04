import * as THREE from 'three';

/**
 * Animated water surface. A slow swell plus fine ripples, a sharp sun/moon
 * glitter along the light direction, and a shallow band around the island.
 */
export class Water {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly uniforms: {
    time: { value: number };
    shallow: { value: THREE.Color };
    deep: { value: THREE.Color };
    sky: { value: THREE.Color };
    lightDir: { value: THREE.Vector3 };
    lightColor: { value: THREE.Color };
    glitter: { value: number };
    islandCenter: { value: THREE.Vector2 };
    islandRadius: { value: number };
  };

  constructor(size: number) {
    this.uniforms = {
      time: { value: 0 },
      shallow: { value: new THREE.Color(0x8ae2dc) },
      deep: { value: new THREE.Color(0x2f93bf) },
      sky: { value: new THREE.Color(0xdff1ff) },
      lightDir: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
      lightColor: { value: new THREE.Color(0xfff2d8) },
      glitter: { value: 1.0 },
      islandCenter: { value: new THREE.Vector2(0, 0) },
      islandRadius: { value: 7.0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        uniform float time;
        varying vec3 vWorld;
        float wave(vec2 p, float t) {
          return sin(p.x * 1.3 + t * 0.9) * 0.5 + sin(p.y * 1.7 - t * 0.7) * 0.35 + sin((p.x + p.y) * 0.8 + t * 1.3) * 0.25;
        }
        void main() {
          vec3 p = position;
          p.z += wave(position.xy, time) * 0.035;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec3 shallow;
        uniform vec3 deep;
        uniform vec3 sky;
        uniform vec3 lightDir;
        uniform vec3 lightColor;
        uniform float glitter;
        uniform vec2 islandCenter;
        uniform float islandRadius;
        varying vec3 vWorld;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        float height(vec2 p, float t) {
          // slow broad swell plus fine ripples; the ripples carry the glitter
          float swell = noise(p * 0.9 + t * 0.12) * 0.5;
          float ripple = noise(p * 6.0 + vec2(t * 0.5, -t * 0.3)) * 0.12 + noise(p * 11.0 - vec2(t * 0.4, t * 0.6)) * 0.06;
          return swell + ripple;
        }
        vec3 normalAt(vec2 p) {
          float e = 0.05;
          float h0 = height(p, time);
          float hx = height(p + vec2(e, 0.0), time);
          float hy = height(p + vec2(0.0, e), time);
          return normalize(vec3(-(hx - h0) / e * 0.35, 1.0, -(hy - h0) / e * 0.35));
        }

        void main() {
          vec2 p = vWorld.xz;
          vec3 n = normalAt(p);
          vec3 viewDir = normalize(cameraPosition - vWorld);

          // shallow band near the island, with a little noise so the edge isn't a perfect circle
          float d = distance(p, islandCenter) - islandRadius + noise(p * 0.9) * 0.8;
          float shallowMix = 1.0 - smoothstep(0.0, 2.4, d);
          vec3 base = mix(deep, shallow, shallowMix);

          // soft sky reflection by fresnel
          float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
          vec3 col = mix(base, sky, fresnel * 0.35);

          // diffuse lift from the light so the water isn't flat
          float diff = max(dot(n, lightDir), 0.0);
          col += lightColor * diff * 0.08;

          // glitter: tight specular, broken up by noise so it sparkles
          vec3 h = normalize(lightDir + viewDir);
          float spec = pow(max(dot(n, h), 0.0), 160.0);
          float sparkle = smoothstep(0.5, 0.95, noise(p * 14.0 + time * 0.8));
          col += lightColor * spec * (0.5 + sparkle * 2.5) * glitter;
          // broad path of light toward the sun/moon
          float path = pow(max(dot(n, h), 0.0), 6.0);
          col += lightColor * path * 0.18 * glitter;

          // foam ring at the shoreline
          float foam = smoothstep(0.35, 0.0, abs(d - 0.3 - sin(time * 0.8 + p.x * 0.5) * 0.15)) * (0.5 + 0.5 * noise(p * 4.0 + time));
          col = mix(col, vec3(1.0), foam * 0.55);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const geo = new THREE.PlaneGeometry(size, size, 48, 48);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = false;
    this.mesh.name = 'water';
  }

  update(dt: number): void {
    this.uniforms.time.value += dt;
  }
}
