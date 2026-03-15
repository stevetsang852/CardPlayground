import { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { IGallerySlot, ICardInstance } from '../db/CardGameDB';
import { CARD_TEMPLATES, type Rarity } from '../cardData';

// ── Rarity colors ─────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<Rarity | 'empty' | 'selected', string> = {
  common:    '#6b7280',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#facc15',
  mythic:    '#f472b6',
  empty:     '#1f2937',
  selected:  '#60a5fa',
};

// ── Card slot mesh ────────────────────────────────────────────────────────────

interface CardSlotProps {
  position: [number, number, number];
  slotIndex: number;
  card?: ICardInstance;
  isSelected: boolean;
  onClick: (slotIndex: number) => void;
}

function CardSlot({ position, slotIndex, card, isSelected, onClick }: CardSlotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const colorKey: Rarity | 'empty' | 'selected' = isSelected
    ? 'selected'
    : card
    ? card.rarity
    : 'empty';

  const color = new THREE.Color(RARITY_COLOR[colorKey]);

  // Hover animation: scale up filled slots
  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = hovered && card ? 1.12 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.15
    );
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(slotIndex);
  };

  const template = card ? CARD_TEMPLATES.find((t) => t.id === card.cardId) : undefined;

  return (
    <group position={position}>
      {/* Card plane */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[0.85, 0.85, 0.06]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? new THREE.Color('#60a5fa') : color}
          emissiveIntensity={isSelected ? 0.5 : card ? 0.15 : 0.05}
          roughness={0.4}
          metalness={isSelected ? 0.6 : 0.2}
        />
      </mesh>

      {/* Card icon / label */}
      {template && (
        <Text
          position={[0, 0, 0.08]}
          fontSize={0.28}
          anchorX="center"
          anchorY="middle"
          color="#ffffff"
        >
          {template.icon}
        </Text>
      )}

      {/* Selected glow ring */}
      {isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.44, 0.52, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ── Grid scene ────────────────────────────────────────────────────────────────

const COLS = 5;
const ROWS = 5;
const SPACING = 1.1;

interface GridSceneProps {
  slots: IGallerySlot[];
  cards: ICardInstance[];
  onSlotClick: (slotIndex: number) => void;
  selectedSlot: number | null;
}

function GridScene({ slots, cards, onSlotClick, selectedSlot }: GridSceneProps) {
  // Build slotIndex → cardInstanceId map
  const slotMap = new Map<number, number>(
    slots.map((s) => [s.slotIndex, s.cardInstanceId])
  );

  const offsetX = ((COLS - 1) * SPACING) / 2;
  const offsetY = ((ROWS - 1) * SPACING) / 2;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, 4, 4]} intensity={0.4} color="#a78bfa" />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* 5×5 grid of card slots */}
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = col * SPACING - offsetX;
        const y = (ROWS - 1 - row) * SPACING - offsetY;

        const cardInstanceId = slotMap.get(i);
        const card = cardInstanceId !== undefined
          ? cards.find((c) => c.id === cardInstanceId)
          : undefined;

        return (
          <CardSlot
            key={i}
            slotIndex={i}
            position={[x, y, 0]}
            card={card}
            isSelected={selectedSlot === i}
            onClick={onSlotClick}
          />
        );
      })}

      {/* Grid background plane */}
      <mesh position={[0, 0, -0.1]} receiveShadow>
        <planeGeometry args={[COLS * SPACING + 0.4, ROWS * SPACING + 0.4]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface GalleryGridProps {
  slots: IGallerySlot[];
  cards: ICardInstance[];
  onSlotClick: (slotIndex: number) => void;
  selectedSlot: number | null;
}

export function GalleryGrid({ slots, cards, onSlotClick, selectedSlot }: GalleryGridProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      shadows
    >
      <GridScene
        slots={slots}
        cards={cards}
        onSlotClick={onSlotClick}
        selectedSlot={selectedSlot}
      />
    </Canvas>
  );
}
