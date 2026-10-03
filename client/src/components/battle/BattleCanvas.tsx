// BattleCanvas.tsx — Random Dice-style Three.js renderer
// Dice rotate, show level numbers, enemies have HP bars, attacks are bright beams

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { BattleState, Enemy } from '../../game/battle/BattleTypes';
import { CARD_TEMPLATES } from '../../cardData';

const GRID_COLS = 8;
const GRID_ROWS = 3;
const CELL_W = 1.15;
const CELL_H = 1.15;
const CELL_GAP = 0.1;
const GRID_ORIGIN_X = -((GRID_COLS - 1) * (CELL_W + CELL_GAP)) / 2;
const GRID_ORIGIN_Y = -((GRID_ROWS - 1) * (CELL_H + CELL_GAP)) / 2;

const RARITY_COLOR: Record<string, number> = {
  common: 0x8090a0, rare: 0x4488ff, epic: 0xaa44ff,
  legendary: 0xffd700, mythic: 0xff44cc,
};
const RARITY_GLOW: Record<string, number> = {
  common: 0x405060, rare: 0x2244aa, epic: 0x6622aa,
  legendary: 0xaa8800, mythic: 0xaa2288,
};
const ELEMENT_COLOR: Record<string, number> = {
  fire: 0xff5500, ice: 0x44ddff, nature: 0x44ff88,
  light: 0xffff88, shadow: 0xaa44ff,
};

function cellToWorld(gx: number, gy: number): THREE.Vector3 {
  return new THREE.Vector3(
    GRID_ORIGIN_X + gx * (CELL_W + CELL_GAP),
    GRID_ORIGIN_Y + gy * (CELL_H + CELL_GAP),
    0,
  );
}

// ── Dice face texture: icon + level number + rarity border ───────────────────
function makeDiceTexture(icon: string, level: number, rarity: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const col = RARITY_COLOR[rarity] ?? 0x8090a0;
  const hex = '#' + col.toString(16).padStart(6, '0');
  const glowCol = RARITY_GLOW[rarity] ?? 0x405060;
  const glowHex = '#' + glowCol.toString(16).padStart(6, '0');

  // Background gradient
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 72);
  grad.addColorStop(0, '#1e1440');
  grad.addColorStop(1, '#0a0820');
  ctx.fillStyle = grad;
  ctx.roundRect(3, 3, 122, 122, 14);
  ctx.fill();

  // Glow border
  ctx.shadowColor = hex;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = hex;
  ctx.lineWidth = 5;
  ctx.roundRect(3, 3, 122, 122, 14);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner subtle border
  ctx.strokeStyle = glowHex;
  ctx.lineWidth = 2;
  ctx.roundRect(8, 8, 112, 112, 10);
  ctx.stroke();

  // Icon
  ctx.font = '54px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 64, 58);

  // Level badge (bottom-right corner, like RD dice dots)
  const lvlColors = ['', '#aaa', '#44aaff', '#aa44ff', '#ffaa00', '#ff44cc'];
  ctx.fillStyle = lvlColors[level] ?? '#fff';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = lvlColors[level] ?? '#fff';
  ctx.shadowBlur = 8;
  ctx.fillText(`${level}`, 118, 122);
  ctx.shadowBlur = 0;

  return new THREE.CanvasTexture(canvas);
}

// ── Enemy texture: emoji + HP bar ────────────────────────────────────────────
function makeEnemyTexture(isBoss: boolean, hpPct: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 80; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  // Emoji
  ctx.font = isBoss ? '52px serif' : '42px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isBoss ? '\ud83d\udc79' : '\ud83d\udc7e', 40, 44);

  // HP bar background
  ctx.fillStyle = '#333';
  ctx.roundRect(4, 78, 72, 10, 4);
  ctx.fill();

  // HP bar fill
  const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillStyle = hpColor;
  ctx.roundRect(4, 78, Math.max(4, 72 * hpPct), 10, 4);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// ── Tile mesh ─────────────────────────────────────────────────────────────────
function makeTileMesh(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(CELL_W - 0.08, CELL_H - 0.08);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x111825, transparent: true, opacity: 0.9,
    roughness: 0.9, metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: 0x223344, transparent: true, opacity: 0.7,
  }));
  mesh.add(line);
  return mesh;
}

// ── Particles ─────────────────────────────────────────────────────────────────
function spawnParticles(scene: THREE.Scene, pos: THREE.Vector3, color: number, count = 16): void {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z + 0.1;
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const spd = 0.03 + Math.random() * 0.05;
    velocities.push(new THREE.Vector3(Math.cos(angle) * spd, Math.sin(angle) * spd, 0));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size: 0.14, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  let t = 0;
  const posAttr = geo.attributes['position'] as THREE.BufferAttribute;
  const tick = () => {
    t += 0.018;
    if (t > 0.6) { scene.remove(pts); geo.dispose(); mat.dispose(); return; }
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, posAttr.getX(i) + velocities[i].x, posAttr.getY(i) + velocities[i].y, posAttr.getZ(i));
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - t / 0.6);
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Attack beam (line from guardian to enemy) ─────────────────────────────────
interface Beam {
  line: THREE.Line;
  life: number; // 0..1, decreases each frame
}

interface Projectile {
  mesh: THREE.Mesh;
  target: THREE.Vector3;
  speed: number;
  color: number;
}

export interface BattleCanvasProps {
  state: BattleState;
  dragCardId: string | null;
  dragCardRarity: string | null;
  onDropCard: (gridX: number, gridY: number) => void;
  onCellClick: (gridX: number, gridY: number) => void;
}

export function BattleCanvas({ state, dragCardId, onDropCard, onCellClick }: BattleCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);

  const tileMeshes = useRef<Map<string, THREE.Mesh>>(new Map());
  // guardian mesh + rotation data
  const guardianMeshes = useRef<Map<string, { mesh: THREE.Mesh; rotSpeed: number; level: number; cardId: string }>>(new Map());
  const enemyMeshes = useRef<Map<string, { mesh: THREE.Mesh; lastHp: number; maxHp: number }>>(new Map());
  const projectiles = useRef<Projectile[]>([]);
  const beams = useRef<Beam[]>([]);

  const stateRef = useRef<BattleState>(state);
  useEffect(() => { stateRef.current = state; });

  const isDraggingRef = useRef(false);
  const dragOverCell = useRef<{ x: number; y: number } | null>(null);
  const dragCardIdRef = useRef<string | null>(dragCardId);
  useEffect(() => { dragCardIdRef.current = dragCardId; }, [dragCardId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    sceneRef.current = scene;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 320;
    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 0, 9.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x223355, 2.0));
    const dir = new THREE.DirectionalLight(0x6688ff, 1.8);
    dir.position.set(2, 4, 6);
    scene.add(dir);
    const rim = new THREE.PointLight(0xff3300, 1.0, 25);
    rim.position.set(-6, -3, 4);
    scene.add(rim);

    // Starfield
    const starPos = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 35;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      starPos[i * 3 + 2] = -6 - Math.random() * 4;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x8899cc, size: 0.04, transparent: true, opacity: 0.5,
    })));

    // Grid tiles
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const tile = makeTileMesh();
        const pos = cellToWorld(gx, gy);
        tile.position.copy(pos);
        tile.position.z = -0.15;
        scene.add(tile);
        tileMeshes.current.set(`${gx}-${gy}`, tile);
      }
    }

    // Enemy path indicator (faint line left→right across middle row)
    const pathPoints = [
      new THREE.Vector3(GRID_ORIGIN_X - 0.5, GRID_ORIGIN_Y + 1 * (CELL_H + CELL_GAP), -0.12),
      new THREE.Vector3(-GRID_ORIGIN_X + 0.5, GRID_ORIGIN_Y + 1 * (CELL_H + CELL_GAP), -0.12),
    ];
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    scene.add(new THREE.Line(pathGeo, new THREE.LineBasicMaterial({
      color: 0xff3300, transparent: true, opacity: 0.15,
    })));

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;

      // ── Sync guardians ──────────────────────────────────────────────────────
      const liveGuardianIds = new Set<string>();
      for (const row of s.grid) {
        for (const cell of row) {
          if (!cell.guardian) continue;
          const g = cell.guardian;
          liveGuardianIds.add(g.id);

          const existing = guardianMeshes.current.get(g.id);
          if (!existing) {
            // New guardian — create dice mesh
            const template = CARD_TEMPLATES.find((t) => t.id === Number(g.cardId));
            const icon = template?.icon ?? '\u2753';
            const tex = makeDiceTexture(icon, g.level, g.rarity);
            const mat = new THREE.MeshStandardMaterial({
              map: tex, transparent: true,
              emissive: new THREE.Color(RARITY_GLOW[g.rarity] ?? 0x223344),
              emissiveIntensity: 0.6,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CELL_W * 0.88, CELL_H * 0.88), mat);
            const pos = cellToWorld(g.gridX, g.gridY);
            mesh.position.copy(pos);
            mesh.scale.set(0, 0, 0);
            scene.add(mesh);
            const rotSpeed = (Math.random() - 0.5) * 0.015; // slight random tilt oscillation
            guardianMeshes.current.set(g.id, { mesh, rotSpeed, level: g.level, cardId: g.cardId });
            // Pop-in animation
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2.5)' });
            spawnParticles(scene, pos.clone(), RARITY_COLOR[g.rarity] ?? 0xffffff, 20);
          } else {
            // Update texture if level changed (after synthesis)
            if (existing.level !== g.level || existing.cardId !== g.cardId) {
              const template = CARD_TEMPLATES.find((t) => t.id === Number(g.cardId));
              const icon = template?.icon ?? '\u2753';
              const newTex = makeDiceTexture(icon, g.level, g.rarity);
              const mat = existing.mesh.material as THREE.MeshStandardMaterial;
              mat.map?.dispose();
              mat.map = newTex;
              mat.needsUpdate = true;
              existing.level = g.level;
              existing.cardId = g.cardId;
              // Level-up flash
              gsap.to(mat, { emissiveIntensity: 3.0, duration: 0.15, yoyo: true, repeat: 5,
                onComplete: () => { mat.emissiveIntensity = 0.6; } });
              spawnParticles(scene, cellToWorld(g.gridX, g.gridY), RARITY_COLOR[g.rarity] ?? 0xffffff, 28);
            }
            // Gentle oscillating rotation (dice wobble)
            existing.mesh.rotation.z = Math.sin(Date.now() * 0.001 + g.gridX * 1.3) * 0.08;
          }
        }
      }
      // Remove departed guardians
      for (const [id, data] of guardianMeshes.current) {
        if (!liveGuardianIds.has(id)) {
          gsap.to(data.mesh.scale, { x: 0, y: 0, z: 0, duration: 0.2, onComplete: () => {
            scene.remove(data.mesh);
            (data.mesh.material as THREE.Material).dispose();
          }});
          guardianMeshes.current.delete(id);
        }
      }

      // ── Sync enemies ────────────────────────────────────────────────────────
      const liveEnemyIds = new Set<string>();
      for (const enemy of s.enemies) {
        liveEnemyIds.add(enemy.id);
        const existing = enemyMeshes.current.get(enemy.id);
        const hpPct = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 1;

        if (!existing) {
          const tex = makeEnemyTexture(enemy.isBoss, hpPct);
          const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
          const size = enemy.isBoss ? CELL_H * 0.92 : CELL_H * 0.72;
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 1.2), mat);
          mesh.position.z = 0.25;
          scene.add(mesh);
          enemyMeshes.current.set(enemy.id, { mesh, lastHp: enemy.hp, maxHp: enemy.maxHp });
        } else {
          // Refresh HP bar texture when HP changes
          if (existing.lastHp !== enemy.hp) {
            const mat = existing.mesh.material as THREE.MeshBasicMaterial;
            mat.map?.dispose();
            mat.map = makeEnemyTexture(enemy.isBoss, hpPct);
            mat.needsUpdate = true;
            existing.lastHp = enemy.hp;
            // Flash red on hit
            gsap.to(mat.color, { r: 2, g: 0.3, b: 0.3, duration: 0.08, yoyo: true, repeat: 1,
              onComplete: () => { mat.color.set(0xffffff); } });
          }
        }
        // Smooth position update
        const data = enemyMeshes.current.get(enemy.id)!;
        data.mesh.position.x = GRID_ORIGIN_X + enemy.gridX * (CELL_W + CELL_GAP);
        data.mesh.position.y = GRID_ORIGIN_Y + enemy.gridY * (CELL_H + CELL_GAP);
        // Slight bob
        data.mesh.position.y += Math.sin(Date.now() * 0.004 + enemy.gridX) * 0.04;
      }
      for (const [id, data] of enemyMeshes.current) {
        if (!liveEnemyIds.has(id)) {
          spawnParticles(scene, data.mesh.position.clone(), 0xff4400, 12);
          scene.remove(data.mesh);
          (data.mesh.material as THREE.Material).dispose();
          enemyMeshes.current.delete(id);
        }
      }

      // ── Spawn attack beams from guardians ───────────────────────────────────
      for (const row of s.grid) {
        for (const cell of row) {
          if (!cell.guardian) continue;
          const g = cell.guardian;
          // Find nearest enemy (all-map range like RD)
          let nearest: Enemy | null = null;
          let minDist = Infinity;
          for (const enemy of s.enemies) {
            const dx = enemy.gridX - g.gridX;
            const dy = enemy.gridY - g.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) { minDist = dist; nearest = enemy; }
          }
          if (nearest && Math.random() < 0.06) {
            const from = cellToWorld(g.gridX, g.gridY).clone();
            from.z = 0.3;
            const enemyData = enemyMeshes.current.get(nearest.id);
            if (enemyData) {
              const to = enemyData.mesh.position.clone();
              to.z = 0.3;
              const color = ELEMENT_COLOR[g.element] ?? 0xffffff;

              // Projectile ball
              const projGeo = new THREE.SphereGeometry(0.08, 6, 6);
              const projMat = new THREE.MeshBasicMaterial({
                color, transparent: true, blending: THREE.AdditiveBlending,
              });
              const projMesh = new THREE.Mesh(projGeo, projMat);
              projMesh.position.copy(from);
              scene.add(projMesh);
              projectiles.current.push({ mesh: projMesh, target: to, speed: 0.22, color });

              // Beam flash
              const beamGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
              const beamMat = new THREE.LineBasicMaterial({
                color, transparent: true, opacity: 0.7,
                blending: THREE.AdditiveBlending,
              });
              const beamLine = new THREE.Line(beamGeo, beamMat);
              scene.add(beamLine);
              beams.current.push({ line: beamLine, life: 1.0 });
            }
          }
        }
      }

      // ── Animate projectiles ─────────────────────────────────────────────────
      const aliveProj: Projectile[] = [];
      for (const proj of projectiles.current) {
        const dir = proj.target.clone().sub(proj.mesh.position);
        const dist = dir.length();
        if (dist < 0.15) {
          spawnParticles(scene, proj.target.clone(), proj.color, 10);
          scene.remove(proj.mesh);
          (proj.mesh.material as THREE.Material).dispose();
        } else {
          dir.normalize().multiplyScalar(proj.speed);
          proj.mesh.position.add(dir);
          aliveProj.push(proj);
        }
      }
      projectiles.current = aliveProj;

      // ── Fade beams ──────────────────────────────────────────────────────────
      const aliveBeams: Beam[] = [];
      for (const beam of beams.current) {
        beam.life -= 0.12;
        if (beam.life <= 0) {
          scene.remove(beam.line);
          (beam.line.material as THREE.Material).dispose();
        } else {
          (beam.line.material as THREE.LineBasicMaterial).opacity = beam.life * 0.7;
          aliveBeams.push(beam);
        }
      }
      beams.current = aliveBeams;

      // ── Tile highlight during drag ──────────────────────────────────────────
      for (const [key, tile] of tileMeshes.current) {
        const mat = tile.material as THREE.MeshStandardMaterial;
        if (dragCardIdRef.current) {
          const isHover = dragOverCell.current && key === `${dragOverCell.current.x}-${dragOverCell.current.y}`;
          mat.color.set(isHover ? 0x2244aa : 0x1a2535);
          mat.emissive?.set(isHover ? 0x112244 : 0x000000);
        } else {
          mat.color.set(0x111825);
          mat.emissive?.set(0x000000);
        }
      }

      renderer.render(scene, camera);
    };
    loop();

    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
      tileMeshes.current.clear();
      guardianMeshes.current.clear();
      enemyMeshes.current.clear();
      projectiles.current = [];
      beams.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pointerToCell = useCallback((e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return null;
    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hit);
    const gx = Math.round((hit.x - GRID_ORIGIN_X) / (CELL_W + CELL_GAP));
    const gy = Math.round((hit.y - GRID_ORIGIN_Y) / (CELL_H + CELL_GAP));
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
    return { x: gx, y: gy };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    dragOverCell.current = pointerToCell(e);
  }, [pointerToCell]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      const cell = pointerToCell(e);
      if (cell) onDropCard(cell.x, cell.y);
      isDraggingRef.current = false;
      dragOverCell.current = null;
    }
  }, [pointerToCell, onDropCard]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragCardIdRef.current) { isDraggingRef.current = true; return; }
    const cell = pointerToCell(e);
    if (cell) onCellClick(cell.x, cell.y);
  }, [pointerToCell, onCellClick]);

  useEffect(() => {
    isDraggingRef.current = !!dragCardId;
    if (!dragCardId) dragOverCell.current = null;
  }, [dragCardId]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', minHeight: '260px', touchAction: 'none',
        cursor: dragCardId ? 'crosshair' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
