import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CARD_TEMPLATES } from '../cardData';
import type { Rarity } from '../cardData';

const GRID_SIZE = 25; // 5×5

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-400',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
  mythic: 'border-pink-500',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: '',
  rare: 'shadow-md shadow-blue-400/40',
  epic: 'shadow-md shadow-purple-500/50',
  legendary: 'shadow-md shadow-yellow-400/60',
  mythic: 'shadow-md shadow-pink-500/70',
};

// ── NPC definitions ───────────────────────────────────────────────────────────

interface NPCDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  cardIds: number[]; // exactly 25 card IDs for the 5×5 grid
  reward: number;
}

const EMBER_SAGE_CARDS: number[] = [
  196, 197, 171, 172, 173,
  121, 122, 123, 124, 125,
  1, 2, 3, 4, 5,
  6, 7, 8, 9, 10,
  11, 12, 13, 14, 15,
];

const FROST_KEEPER_CARDS: number[] = [
  200, 201, 184, 185, 186,
  146, 147, 148, 149, 150,
  61, 62, 63, 64, 65,
  66, 67, 68, 69, 70,
  71, 72, 73, 74, 75,
];

const VOID_WANDERER_CARDS: number[] = [
  204, 205, 206, 198, 199,
  202, 203, 183, 195, 182,
  171, 172, 173, 174, 175,
  176, 177, 178, 179, 180,
  181, 182, 183, 184, 185,
];

const NPC_DEFINITIONS: NPCDefinition[] = [
  {
    id: 'ember-sage',
    name: 'Ember Sage',
    description: 'A fire-themed collector who has spent centuries gathering the rarest Volcanic Origins cards. Her gallery burns with ancient power.',
    icon: '🔥',
    cardIds: EMBER_SAGE_CARDS,
    reward: 50,
  },
  {
    id: 'frost-keeper',
    name: 'Frost Keeper',
    description: 'An ice-themed collector who guards the frozen relics of the Frozen Age. His gallery is a testament to the beauty of eternal winter.',
    icon: '❄️',
    cardIds: FROST_KEEPER_CARDS,
    reward: 50,
  },
  {
    id: 'void-wanderer',
    name: 'Void Wanderer',
    description: 'A mysterious collector who roams the space between worlds, amassing the rarest cards from every realm. Her gallery defies comprehension.',
    icon: '🌌',
    cardIds: VOID_WANDERER_CARDS,
    reward: 50,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `npc_gallery_visited_${yyyy}-${mm}-${dd}`;
}

function getVisitedNPCs(): Set<string> {
  try {
    const raw = localStorage.getItem(getTodayKey());
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markNPCVisited(npcId: string): void {
  const visited = getVisitedNPCs();
  visited.add(npcId);
  localStorage.setItem(getTodayKey(), JSON.stringify(Array.from(visited)));
}

// ── NPC Card Grid ─────────────────────────────────────────────────────────────

interface NPCCardGridProps {
  cardIds: number[];
}

function NPCCardGrid({ cardIds }: NPCCardGridProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 max-w-xs mx-auto">
      {Array.from({ length: GRID_SIZE }, (_, i) => {
        const cardId = cardIds[i];
        const template = cardId !== undefined ? CARD_TEMPLATES.find((t) => t.id === cardId) : undefined;

        return (
          <div
            key={i}
            className={[
              'aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-0.5',
              template
                ? `${RARITY_BORDER[template.rarity]} bg-gray-800 ${RARITY_GLOW[template.rarity]}`
                : 'border-gray-700 bg-gray-900',
            ].join(' ')}
            title={template ? `${template.name} (${template.rarity})` : `Slot ${i + 1}`}
          >
            {template ? (
              <>
                <span className="text-lg leading-none">{template.icon}</span>
                <span className="text-[8px] text-gray-300 mt-0.5 leading-tight truncate w-full text-center">
                  {template.name}
                </span>
              </>
            ) : (
              <span className="text-gray-600 text-xs">{i + 1}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── NPC Card ──────────────────────────────────────────────────────────────────

interface NPCCardProps {
  npc: NPCDefinition;
  visited: boolean;
  onVisit: (npcId: string) => void;
}

function NPCCard({ npc, visited, onVisit }: NPCCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* NPC Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{npc.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-gray-100">{npc.name}</h3>
            <p className="text-sm text-gray-400">{npc.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
          <span className="text-xs text-yellow-400 font-semibold">+{npc.reward} 🪙</span>
          {visited ? (
            <span className="px-3 py-1.5 bg-gray-700 text-gray-400 text-sm rounded-lg font-medium cursor-default">
              ✓ Visited
            </span>
          ) : (
            <button
              onClick={() => onVisit(npc.id)}
              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm rounded-lg font-semibold transition-colors"
            >
              Visit
            </button>
          )}
        </div>
      </div>

      {/* Toggle gallery */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
      >
        {expanded ? '▲ Hide Gallery' : '▼ View Gallery'}
      </button>

      {/* Gallery grid */}
      {expanded && (
        <div className="p-4 bg-gray-950">
          <NPCCardGrid cardIds={npc.cardIds} />
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function NPCGallery() {
  const player = useGameStore((s) => s.player);
  const setPlayer = useGameStore((s) => s.setPlayer);

  const [visitedToday, setVisitedToday] = useState<Set<string>>(() => getVisitedNPCs());
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);

  const handleVisit = (npcId: string) => {
    if (visitedToday.has(npcId)) return;

    const npc = NPC_DEFINITIONS.find((n) => n.id === npcId);
    if (!npc) return;

    // Award coins
    setPlayer({ softCurrency: player.softCurrency + npc.reward });

    // Mark as visited
    markNPCVisited(npcId);
    setVisitedToday((prev) => new Set([...prev, npcId]));

    // Show reward message
    setRewardMsg(`+${npc.reward} coins from ${npc.name}!`);
    setTimeout(() => setRewardMsg(null), 3000);
  };

  const allVisited = NPC_DEFINITIONS.every((n) => visitedToday.has(n.id));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-purple-400">🏛️ NPC Galleries</h1>
        <p className="text-sm text-gray-400 mt-1">
          Visit each collector's gallery once per day to earn coins.
        </p>
      </div>

      {/* Reward toast */}
      {rewardMsg && (
        <div className="mb-4 px-4 py-2 bg-yellow-900/50 border border-yellow-500 rounded-lg text-sm text-yellow-300 text-center">
          🪙 {rewardMsg}
        </div>
      )}

      {/* All visited banner */}
      {allVisited && (
        <div className="mb-4 px-4 py-2 bg-green-900/40 border border-green-600 rounded-lg text-sm text-green-400 text-center">
          ✓ You've visited all galleries today. Come back tomorrow for more rewards!
        </div>
      )}

      {/* NPC list */}
      <div className="flex flex-col gap-4">
        {NPC_DEFINITIONS.map((npc) => (
          <NPCCard
            key={npc.id}
            npc={npc}
            visited={visitedToday.has(npc.id)}
            onVisit={handleVisit}
          />
        ))}
      </div>

      {/* Daily progress */}
      <div className="mt-6 pt-4 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          Daily visits: {visitedToday.size} / {NPC_DEFINITIONS.length}
          {' · '}
          Max daily reward: {NPC_DEFINITIONS.reduce((s, n) => s + n.reward, 0)} 🪙
        </p>
      </div>
    </div>
  );
}
