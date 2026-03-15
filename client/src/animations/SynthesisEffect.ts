/**
 * SynthesisEffect.ts
 * Three.js + GSAP synthesis cinematic.
 *
 * Usage:
 *   const fx = new SynthesisEffect();
 *   fx.play(materialCards, resultCard, success, onDone);
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

const RARITY_COLOR: Record<string, number> = {
  common: 0x8090a0, rare: 0x4080ff, epic: 0xa040ff,
  legendary: 0xffd700, mythic: 0xff80ff,
};

// ── Canvas card texture ───────────────────────────────────────────────────────
function makeCardMesh(icon: string, rarity: string, size = 1): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 268;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 268);
  grad.addColorStop(0, '#1e1040');
  grad.addColorStop(1, '#0e1830');
  ctx.fillStyle = grad;
  ctx.roundRect(3, 3, 186, 262, 12);
  ctx.fill();

  const hex = '#' + (RARITY_COLOR[rarity] >>> 0).toString(16).padStart(6, '0');
  ctx.strokeStyle = hex;
  ctx.lineWidth = 5;
  ctx.roundRect(3, 3, 186, 262, 12);
  ctx.stroke();

  ctx.font = '90px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 96, 120);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide,
    emissive: new THREE.Color(RARITY_COLOR[rarity]),
    emissiveIntensity: 0.2,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(size * 0.72, size), mat);
}

// ── Particle helpers ──────────────────────────────────────────────────────────
function spawnParticles(
  scene: THREE.Scene,
  origin: THREE.Vector3,
  color: number,
  count: number,
  spread: number,
  lifetime: number,
): void {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const spd = spread * (0.5 + Math.random() * 0.5);
    vel.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * spd,
      Math.sin(phi) * Math.sin(theta) * spd,
      Math.cos(phi) * spd * 0.4,
    ));
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size: 0.08, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  let t = 0;
  const posAttr = geo.attributes['position'] as THREE.BufferAttribute;
  const tick = () => {
    t += 0.016;
    if (t > lifetime) { scene.remove(pts); geo.dispose(); mat.dispose(); return; }
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, posAttr.getX(i) + vel[i].x, posAttr.getY(i) + vel[i].y, posAttr.getZ(i) + vel[i].z);
      vel[i].y -= 0.001;
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - t / lifetime);
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Lightning bolt (line segments) ───────────────────────────────────────────
function spawnLightning(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3): void {
  const segments = 10;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push(new THREE.Vector3(
      from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 0.4,
      from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 0.4,
      from.z,
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  gsap.to(mat, { opacity: 0, duration: 0.3, onComplete: () => {
    scene.remove(line); geo.dispose(); mat.dispose();
  }});
}

// ── Main class ────────────────────────────────────────────────────────────────
export interface CardInfo { icon: string; rarity: string; name: string; }

export class SynthesisEffect {
  private container: HTMLDivElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private rafId: number | null = null;

  play(
    materials: CardInfo[],
    result: CardInfo | null,
    success: boolean,
    onDone: () => void,
  ): void {
    this._setup();
    this._run(materials, result, success, onDone);
  }

  private _setup(): void {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;inset:0;z-index:500;background:#000;`;
    document.body.appendChild(div);
    this.container = div;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    this.scene = scene;

    const w = window.innerWidth, h = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    div.appendChild(renderer.domElement);
    this.renderer = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pt = new THREE.PointLight(0x8844ff, 2.5, 20);
    pt.position.set(0, 0, 4);
    scene.add(pt);

    // Starfield
    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 30;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      sPos[i * 3 + 2] = -8 - Math.random() * 8;
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.5 })));

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
    this.container = null; this.renderer = null; this.scene = null; this.camera = null; this.rafId = null;
  }

  private _run(materials: CardInfo[], result: CardInfo | null, success: boolean, onDone: () => void): void {
    const scene = this.scene!;
    const tl = gsap.timeline();

    // ── Phase 1: Material cards orbit in ─────────────────────────────────────
    const count = materials.length;
    const radius = 2.2;
    const meshes: THREE.Mesh[] = [];

    materials.forEach((card, i) => {
      const angle = (i / count) * Math.PI * 2;
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      const mesh = makeCardMesh(card.icon, card.rarity, 1.1);
      mesh.position.set(tx * 3, ty * 3, 0); // start far out
      mesh.scale.set(0, 0, 0);
      scene.add(mesh);
      meshes.push(mesh);

      tl.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2)' }, i * 0.12);
      tl.to(mesh.position, { x: tx, y: ty, duration: 0.5, ease: 'power2.out' }, i * 0.12);
    });

    // ── Phase 2: Cards orbit the centre ──────────────────────────────────────
    tl.to({}, { duration: 0.2 });
    const orbitStart = tl.duration();

    // Animate orbit via JS ticker
    let orbitAngle = 0;
    const orbitTicker = gsap.ticker.add(() => {
      orbitAngle += 0.04;
      meshes.forEach((mesh, i) => {
        const base = (i / count) * Math.PI * 2;
        const a = base + orbitAngle;
        mesh.position.x = Math.cos(a) * radius;
        mesh.position.y = Math.sin(a) * radius;
        mesh.rotation.z = a + Math.PI / 2;
      });
    });

    tl.to({}, { duration: 0.9 }); // orbit for ~0.9s

    // ── Phase 3: Cards converge to centre with lightning ──────────────────────
    tl.call(() => {
      gsap.ticker.remove(orbitTicker);
      // Spawn lightning from each card to centre
      meshes.forEach(mesh => {
        for (let j = 0; j < 3; j++) {
          setTimeout(() => spawnLightning(scene, mesh.position.clone(), new THREE.Vector3(0, 0, 0)), j * 80);
        }
      });
    });

    meshes.forEach(mesh => {
      tl.to(mesh.position, { x: 0, y: 0, duration: 0.35, ease: 'power3.in' }, `+=${0}`);
      tl.to(mesh.scale, { x: 0, y: 0, z: 0, duration: 0.2 }, `-=0.15`);
    });

    // ── Phase 4: Central explosion ────────────────────────────────────────────
    tl.call(() => {
      const burstColor = success
        ? (result ? (RARITY_COLOR[result.rarity] ?? 0xffffff) : 0x44ff88)
        : 0xff4422;
      spawnParticles(scene, new THREE.Vector3(0, 0, 0), burstColor, success ? 300 : 150, 0.12, 1.5);
      if (!success) {
        // Extra red flash for failure
        spawnParticles(scene, new THREE.Vector3(0, 0, 0), 0xff2200, 80, 0.06, 0.8);
      }
    });

    // ── Phase 5a: Success — result card flips in ──────────────────────────────
    if (success && result) {
      const resultMesh = makeCardMesh(result.icon, result.rarity, 2.0);
      resultMesh.scale.set(0, 0, 0);
      resultMesh.rotation.y = Math.PI;
      scene.add(resultMesh);

      tl.to(resultMesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(2)' }, '+=0.1');
      tl.to(resultMesh.rotation, { y: Math.PI * 2, duration: 0.5, ease: 'power2.inOut' }, '-=0.2');

      // Glow pulse for rare+
      if (['rare','epic','legendary','mythic'].includes(result.rarity)) {
        const mat = resultMesh.material as THREE.MeshStandardMaterial;
        tl.to(mat, { emissiveIntensity: 1.5, duration: 0.2, yoyo: true, repeat: 3 }, '-=0.3');
      }

      // Result label
      tl.call(() => {
        const label = document.createElement('div');
        label.textContent = `✅ ${result.icon} ${result.name}`;
        label.style.cssText = `
          position:absolute;bottom:80px;left:50%;transform:translateX(-50%);
          color:#a0ff80;font-size:1.3rem;font-family:"Segoe UI",sans-serif;
          font-weight:bold;letter-spacing:1px;text-shadow:0 0 12px #44ff88;
          pointer-events:none;
        `;
        this.container!.appendChild(label);
        gsap.fromTo(label, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
      });

      tl.to({}, { duration: 1.6 });
    } else {
      // ── Phase 5b: Failure — shatter effect ───────────────────────────────
      const failLabel = document.createElement('div');
      failLabel.textContent = '💥 Synthesis Failed';
      failLabel.style.cssText = `
        position:absolute;bottom:80px;left:50%;transform:translateX(-50%);
        color:#ff6644;font-size:1.3rem;font-family:"Segoe UI",sans-serif;
        font-weight:bold;letter-spacing:1px;text-shadow:0 0 12px #ff4422;
        pointer-events:none;
      `;
      tl.call(() => {
        this.container!.appendChild(failLabel);
        gsap.fromTo(failLabel, { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.4 });
      });
      tl.to({}, { duration: 1.2 });
    }

    // ── Tap to skip ───────────────────────────────────────────────────────────
    const hint = document.createElement('div');
    hint.textContent = 'Tap to continue';
    hint.style.cssText = `
      position:absolute;bottom:32px;left:50%;transform:translateX(-50%);
      color:rgba(200,160,255,0.6);font-size:.9rem;font-family:"Segoe UI",sans-serif;
      pointer-events:none;letter-spacing:2px;
    `;
    this.container!.appendChild(hint);
    gsap.fromTo(hint, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.8 });

    const finish = () => {
      tl.kill();
      gsap.ticker.remove(orbitTicker);
      gsap.killTweensOf('*');
      this._teardown();
      onDone();
    };
    this.container!.addEventListener('click', finish, { once: true });
    tl.call(() => {
      this.container?.removeEventListener('click', finish);
      this._teardown();
      onDone();
    });
  }
}
