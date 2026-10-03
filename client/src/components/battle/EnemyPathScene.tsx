// EnemyPathScene.tsx — Independent Three.js renderer for the enemy path zone
// Uses CatmullRomCurve3 for path; enemies move via curve.getPoint(pathProgress)
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Enemy } from '../../game/battle/BattleTypes';

interface EnemyPathSceneProps {
  enemies: Enemy[];
  isMobile?: boolean;
}

// Path control points (left → right across the scene)
const PATH_POINTS = [
  new THREE.Vector3(-6, -0.5, 0),
  new THREE.Vector3(-3, 0.8, 0),
  new THREE.Vector3(0, -0.6, 0),
  new THREE.Vector3(3, 0.7, 0),
  new THREE.Vector3(6, -0.3, 0),
];

const ENEMY_COLOR: Record<string, number> = {
  normal: 0xe74c3c,
  boss: 0xff6600,
};

export function EnemyPathScene({ enemies, isMobile = false }: EnemyPathSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const enemyMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const rafRef = useRef<number | null>(null);
  const enemiesRef = useRef<Enemy[]>(enemies);

  // Keep enemies ref in sync without re-running setup
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0a0f1e, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── Camera (orthographic for 2D-style path view) ──────────────────────
    const aspect = w / h;
    const viewH = 4;
    const camera = new THREE.OrthographicCamera(
      -viewH * aspect, viewH * aspect, viewH, -viewH, 0.1, 100,
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // ── Path curve ────────────────────────────────────────────────────────
    const curve = new THREE.CatmullRomCurve3(PATH_POINTS);
    curveRef.current = curve;

    // Render path as a tube
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.08, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0x4a5568 });
    scene.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // ── Particle system (background atmosphere) ───────────────────────────
    const particleCount = isMobile ? 40 : 80;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = -1;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x334155, size: 0.06 });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // ── Render loop ───────────────────────────────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      syncEnemyMeshes(scene, curve, enemiesRef.current, enemyMeshesRef.current);
      renderer.render(scene, camera);
    };
    animate();

    // ── ResizeObserver ────────────────────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      renderer.setSize(width, height);
      const a = width / height;
      camera.left = -viewH * a;
      camera.right = viewH * a;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      enemyMeshesRef.current.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      enemyMeshesRef.current.clear();
      tubeGeo.dispose();
      tubeMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Sync enemy meshes to current enemies array ────────────────────────────────
function syncEnemyMeshes(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  enemies: Enemy[],
  meshMap: Map<string, THREE.Mesh>,
) {
  const activeIds = new Set(enemies.map((e) => e.id));

  // Remove meshes for dead enemies
  meshMap.forEach((mesh, id) => {
    if (!activeIds.has(id)) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      meshMap.delete(id);
    }
  });

  // Add / update meshes for live enemies
  for (const enemy of enemies) {
    let mesh = meshMap.get(enemy.id);
    if (!mesh) {
      const geo = new THREE.SphereGeometry(enemy.isBoss ? 0.35 : 0.22, 12, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: enemy.isBoss ? ENEMY_COLOR.boss : ENEMY_COLOR.normal,
      });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      meshMap.set(enemy.id, mesh);
    }

    // Move along curve using pathProgress ∈ [0, 1]
    const progress = Math.max(0, Math.min(1, enemy.pathProgress));
    const pos = curve.getPoint(progress);
    mesh.position.copy(pos);
  }
}
