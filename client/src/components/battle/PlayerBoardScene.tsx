// PlayerBoardScene.tsx — Independent Three.js renderer for the 5×3 player grid
// PlaneGeometry(1,1) tiles, Raycaster click detection → onCellClick(col, row)
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GridCell } from '../../game/battle/BattleTypes';

const COLS = 5;
const ROWS = 3;
const CELL_SIZE = 1;
const GAP = 0.1;
const STEP = CELL_SIZE + GAP;

// Rarity colours for guardian sprites
const RARITY_COLOR: Record<string, number> = {
  common: 0x8090a0,
  rare: 0x4488ff,
  epic: 0xaa44ff,
  legendary: 0xffd700,
  mythic: 0xff44cc,
};

interface PlayerBoardSceneProps {
  grid: GridCell[][];
  onCellClick: (col: number, row: number) => void;
}

export function PlayerBoardScene({ grid, onCellClick }: PlayerBoardSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const tileMeshesRef = useRef<THREE.Mesh[][]>([]);
  const guardianMeshesRef = useRef<(THREE.Mesh | null)[][]>([]);
  const rafRef = useRef<number | null>(null);
  const gridRef = useRef<GridCell[][]>(grid);
  const onCellClickRef = useRef(onCellClick);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { onCellClickRef.current = onCellClick; }, [onCellClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x111827, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // ── Camera ────────────────────────────────────────────────────────────
    // Fit the 5×3 grid with some padding
    const gridW = COLS * STEP - GAP;
    const gridH = ROWS * STEP - GAP;
    const padX = 0.8;
    const padY = 0.6;
    const camera = new THREE.OrthographicCamera(
      -padX, gridW + padX,
      gridH + padY, -padY,
      0.1, 100,
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // ── Build grid tiles ──────────────────────────────────────────────────
    const tileGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
    const tileMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const tileBorderMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true });

    const tiles: THREE.Mesh[][] = [];
    const guardianMeshes: (THREE.Mesh | null)[][] = [];

    for (let row = 0; row < ROWS; row++) {
      tiles[row] = [];
      guardianMeshes[row] = [];
      for (let col = 0; col < COLS; col++) {
        const x = col * STEP + CELL_SIZE / 2;
        const y = row * STEP + CELL_SIZE / 2;

        const tile = new THREE.Mesh(tileGeo, tileMat.clone());
        tile.position.set(x, y, 0);
        tile.userData = { col, row };
        scene.add(tile);
        tiles[row][col] = tile;

        // Border overlay
        const border = new THREE.Mesh(tileGeo, tileBorderMat.clone());
        border.position.set(x, y, 0.01);
        scene.add(border);

        guardianMeshes[row][col] = null;
      }
    }

    tileMeshesRef.current = tiles;
    guardianMeshesRef.current = guardianMeshes;

    // ── Raycaster for click detection ─────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const flatTiles = tiles.flat();
      const hits = raycaster.intersectObjects(flatTiles);
      if (hits.length > 0) {
        const { col, row } = hits[0].object.userData as { col: number; row: number };
        onCellClickRef.current(col, row);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // ── Render loop ───────────────────────────────────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      syncGuardians(scene, gridRef.current, tiles, guardianMeshesRef.current);
      renderer.render(scene, camera);
    };
    animate();

    // ── ResizeObserver ────────────────────────────────────────────────────
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      renderer.setSize(width, height);
      // Camera is fixed to grid coords — no aspect update needed for ortho grid fit
    });
    ro.observe(container);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      tileGeo.dispose();
      guardianMeshesRef.current.flat().forEach((m) => {
        if (m) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Sync guardian meshes to current grid state ────────────────────────────────
function syncGuardians(
  scene: THREE.Scene,
  grid: GridCell[][],
  tiles: THREE.Mesh[][],
  guardianMeshes: (THREE.Mesh | null)[][],
) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = grid[row]?.[col];
      const existing = guardianMeshes[row]?.[col];
      const guardian = cell?.guardian ?? null;

      if (!guardian) {
        // Remove mesh if guardian was removed
        if (existing) {
          scene.remove(existing);
          existing.geometry.dispose();
          (existing.material as THREE.Material).dispose();
          guardianMeshes[row][col] = null;
        }
        // Reset tile colour
        if (tiles[row]?.[col]) {
          (tiles[row][col].material as THREE.MeshBasicMaterial).color.setHex(0x1e293b);
        }
        continue;
      }

      const color = RARITY_COLOR[guardian.rarity] ?? 0x8090a0;

      if (!existing) {
        // Create guardian mesh (circle sprite)
        const geo = new THREE.CircleGeometry(CELL_SIZE * 0.35, 16);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        const tile = tiles[row][col];
        mesh.position.set(tile.position.x, tile.position.y, 0.05);
        scene.add(mesh);
        guardianMeshes[row][col] = mesh;
      } else {
        // Update colour if rarity changed
        (existing.material as THREE.MeshBasicMaterial).color.setHex(color);
      }

      // Highlight tile
      if (tiles[row]?.[col]) {
        (tiles[row][col].material as THREE.MeshBasicMaterial).color.setHex(0x1e3a5f);
      }
    }
  }
}
