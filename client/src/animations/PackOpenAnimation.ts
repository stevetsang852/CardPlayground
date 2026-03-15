/**
 * PackOpenAnimation.ts
 * Three.js + GSAP pack-opening cinematic.
 *
 * Usage:
 *   const anim = new PackOpenAnimation();
 *   anim.play(packIcon, drawnCards, onDone);
 *
 * The animation creates a full-screen canvas overlay, runs the sequence,
 * then removes itself and calls onDone so ui.ts can show the normal card grid.
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

// ── Rarity colour map ─────────────────────────────────────────────────────────
const RARITY_COLOR: Record<string, number> = {
  common:    0x8090a0,
  rare:      0x4080ff,
  epic:      0xa040ff,
  legendary: 0xffd700,
  mythic:    0xff80ff,
};

const RARITY_PARTICLE_COUNT: Record<string, number> = {
  common: 20, rare: 60, epic: 120, legendary: 220, mythic: 400,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCardMesh(icon: string, rarity: string, size = 1): THREE.Mesh {
  const w = size * 0.7;
  const h = size;
  const geo = new THREE.PlaneGeometry(w, h, 1, 1);

  // Canvas texture for the card face
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, '#1e1040');
  grad.addColorStop(1, '#0e1830');
  ctx.fillStyle = grad;
  ctx.roundRect(4, 4, 248, 352, 16);
  ctx.fill();

  // Rarity border glow
  const borderColor = ['#', (RARITY_COLOR[rarity] >>> 0).toString(16).padStart(6, '0')].join('');
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.roundRect(4, 4, 248, 352, 16);
  ctx.stroke();

  // Icon
  ctx.font = '120px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 128, 160);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(RARITY_COLOR[rarity]),
    emissiveIntensity: 0.15,
  });

  return new THREE.Mesh(geo, mat);
}

function makePackMesh(icon: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, '#3a1a6a');
  grad.addColorStop(1, '#0d0a1a');
  ctx.fillStyle = grad;
  ctx.roundRect(8, 8, 240, 240, 24);
  ctx.fill();

  ctx.strokeStyle = '#a040ff';
  ctx.lineWidth = 6;
  ctx.roundRect(8, 8, 240, 240, 24);
  ctx.stroke();

  ctx.font = '140px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    emissive: new THREE.Color(0xa040ff),
    emissiveIntensity: 0.3,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mat);
}

function burstParticles(
  scene: THREE.Scene,
  position: THREE.Vector3,
  color: number,
  count: number
): void {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    pos[i * 3] = position.x;
    pos[i * 3 + 1] = position.y;
    pos[i * 3 + 2] = position.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 0.04 + Math.random() * 0.08;
    vel.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed + 0.02,
      Math.cos(phi) * speed * 0.5,
    ));
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.07,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  let elapsed = 0;
  const posAttr = geo.attributes['position'] as THREE.BufferAttribute;

  const tick = () => {
    elapsed += 0.016;
    if (elapsed > 1.8) {
      scene.remove(pts);
      geo.dispose(); mat.dispose();
      return;
    }
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i,
        posAttr.getX(i) + vel[i].x,
        posAttr.getY(i) + vel[i].y,
        posAttr.getZ(i) + vel[i].z,
      );
      vel[i].y -= 0.001;
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - elapsed / 1.2);
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Main class ────────────────────────────────────────────────────────────────

export interface DrawnCardInfo {
  icon: string;
  name: string;
  rarity: string;
}

export class PackOpenAnimation {
  private container: HTMLDivElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private rafId: number | null = null;

  play(
    packIcon: string,
    cards: DrawnCardInfo[],
    onDone: () => void
  ): void {
    this._setup();
    this._run(packIcon, cards, onDone);
  }

  private _setup(): void {
    // Full-screen overlay container
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed;inset:0;z-index:500;background:#000;
      display:flex;align-items:center;justify-content:center;
    `;
    document.body.appendChild(div);
    this.container = div;

    // Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    this.scene = scene;

    const w = window.innerWidth, h = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 5);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    div.appendChild(renderer.domElement);
    this.renderer = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pt = new THREE.PointLight(0xc080ff, 2, 20);
    pt.position.set(0, 2, 4);
    scene.add(pt);
    const pt2 = new THREE.PointLight(0x4080ff, 1.5, 20);
    pt2.position.set(-3, -2, 3);
    scene.add(pt2);

    // Starfield background
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 30;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      starPos[i * 3 + 2] = -5 - Math.random() * 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Render loop
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };
    loop();
  }

  private _teardown(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.renderer?.dispose();
    this.container?.remove();
    this.scene?.clear();
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.rafId = null;
  }

  private _run(packIcon: string, cards: DrawnCardInfo[], onDone: () => void): void {
    const scene = this.scene!;

    // ── Phase 1: Pack appears and spins ──────────────────────────────────────
    const packMesh = makePackMesh(packIcon);
    packMesh.scale.set(0, 0, 0);
    scene.add(packMesh);

    const tl = gsap.timeline();

    // Pack pops in
    tl.to(packMesh.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.5, ease: 'back.out(2)' });
    // Pack spins and glows
    tl.to(packMesh.rotation, { y: Math.PI * 2, duration: 0.8, ease: 'power2.inOut' }, '+=0.1');
    tl.to((packMesh.material as THREE.MeshStandardMaterial), {
      emissiveIntensity: 1.2, duration: 0.4,
    }, '-=0.4');

    // Pack explodes outward
    tl.to(packMesh.scale, { x: 2.5, y: 2.5, z: 2.5, duration: 0.2, ease: 'power2.in' });
    tl.to(packMesh.scale, { x: 0, y: 0, z: 0, duration: 0.15 }, '+=0');
    tl.call(() => {
      scene.remove(packMesh);
      burstParticles(scene, new THREE.Vector3(0, 0, 0), 0xa040ff, 180);
    });

    // ── Phase 2: Cards fly in one by one ─────────────────────────────────────
    const isSingle = cards.length === 1;
    const cols = Math.min(cards.length, 5);
    const rows = Math.ceil(cards.length / cols);
    const spacingX = isSingle ? 0 : 1.6;
    const spacingY = isSingle ? 0 : 2.2;
    const offsetX = -(cols - 1) * spacingX * 0.5;
    const offsetY = (rows - 1) * spacingY * 0.5;

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = offsetX + col * spacingX;
      const ty = offsetY - row * spacingY;

      const mesh = makeCardMesh(card.icon, card.rarity, isSingle ? 2.2 : 1.3);
      mesh.position.set(tx, ty - 8, 0); // start below screen
      mesh.rotation.y = Math.PI; // start face-down
      scene.add(mesh);

      const delay = 0.1 + i * (isSingle ? 0 : 0.18);

      // Fly up
      tl.to(mesh.position, {
        y: ty, duration: 0.5, ease: 'back.out(1.4)',
      }, `+=${delay}`);

      // Flip to reveal
      tl.to(mesh.rotation, {
        y: Math.PI * 2, duration: 0.45, ease: 'power2.inOut',
      }, `-=0.2`);

      // Particle burst on reveal
      tl.call(() => {
        burstParticles(
          scene,
          new THREE.Vector3(tx, ty, 0),
          RARITY_COLOR[card.rarity] ?? 0xffffff,
          RARITY_PARTICLE_COUNT[card.rarity] ?? 40,
        );
        // Extra glow pulse for legendary/mythic
        if (card.rarity === 'legendary' || card.rarity === 'mythic') {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          gsap.to(mat, { emissiveIntensity: 1.5, duration: 0.2, yoyo: true, repeat: 3 });
        }
      }, [], `-=0.1`);
    });

    // ── Phase 3: Hold, then skip hint ────────────────────────────────────────
    tl.to({}, { duration: isSingle ? 1.8 : 1.2 });

    // Skip hint text
    const hint = document.createElement('div');
    hint.textContent = 'Tap to collect';
    hint.style.cssText = `
      position:absolute;bottom:32px;left:50%;transform:translateX(-50%);
      color:rgba(200,160,255,0.7);font-size:1rem;font-family:"Segoe UI",sans-serif;
      pointer-events:none;letter-spacing:2px;
    `;
    this.container!.appendChild(hint);
    gsap.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: tl.duration() - 0.8 });

    // Click / tap to skip or finish
    const finish = () => {
      tl.kill();
      gsap.killTweensOf('*');
      this._teardown();
      onDone();
    };
    this.container!.addEventListener('click', finish, { once: true });

    // Auto-finish after timeline
    tl.call(() => {
      this.container?.removeEventListener('click', finish);
      this._teardown();
      onDone();
    });
  }
}
