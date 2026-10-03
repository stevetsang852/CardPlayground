// BattleGrid.tsx — wraps BattleCanvas, handles synthesis modal and coin upgrade modal
import { useState } from 'react';
import { BattleCanvas } from './BattleCanvas';
import type { BattleState, Guardian } from '../../game/battle/BattleTypes';
import { CARD_TEMPLATES } from '../../cardData';
import { getBaseStats, calculateAttack, calculateHp } from '../../game/battle/GuardianFactory';

const UPGRADE_COST: Record<number, number> = { 1: 50, 2: 100, 3: 200, 4: 400 };

interface SynthTarget { guardian: Guardian; x: number; y: number; }

export interface BattleGridProps {
  state: BattleState;
  dragCardId: string | null;
  dragCardRarity: string | null;
  onDropCard: (gridX: number, gridY: number) => void;
  onSynthesize: (x1: number, y1: number, x2: number, y2: number) => void;
  onCoinUpgrade?: (x: number, y: number) => void;
}

interface ActionModal {
  target: SynthTarget;
  adjSameLevel: SynthTarget | null;
}

export function BattleGrid({ state, dragCardId, dragCardRarity, onDropCard, onSynthesize, onCoinUpgrade }: BattleGridProps) {
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);

  const handleCellClick = (x: number, y: number) => {
    const cell = state.grid[y]?.[x];
    if (!cell?.guardian) return;
    const g = cell.guardian;
    // Find adjacent same-level guardian (for synthesis option)
    const dirs = [{ x, y: y - 1 }, { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }];
    let adjSameLevel: SynthTarget | null = null;
    for (const d of dirs) {
      const adj = state.grid[d.y]?.[d.x];
      if (adj?.guardian && adj.guardian.level === g.level) {
        adjSameLevel = { guardian: adj.guardian, x: d.x, y: d.y };
        break;
      }
    }
    setActionModal({ target: { guardian: g, x, y }, adjSameLevel });
  };

  const handleConfirmSynth = () => {
    if (!actionModal?.adjSameLevel) return;
    onSynthesize(actionModal.target.x, actionModal.target.y, actionModal.adjSameLevel.x, actionModal.adjSameLevel.y);
    setActionModal(null);
  };

  const handleConfirmCoinUpgrade = () => {
    if (!actionModal) return;
    onCoinUpgrade?.(actionModal.target.x, actionModal.target.y);
    setActionModal(null);
  };

  return (
    <div className="relative w-full h-full">
      <BattleCanvas
        state={state}
        dragCardId={dragCardId}
        dragCardRarity={dragCardRarity}
        onDropCard={onDropCard}
        onCellClick={handleCellClick}
      />
      {actionModal && (
        <ActionModal
          target={actionModal.target}
          adjSameLevel={actionModal.adjSameLevel}
          coins={state.coins}
          onCoinUpgrade={handleConfirmCoinUpgrade}
          onSynthesize={handleConfirmSynth}
          onCancel={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

function ActionModal({ target, adjSameLevel, coins, onCoinUpgrade, onSynthesize, onCancel }: {
  target: SynthTarget;
  adjSameLevel: SynthTarget | null;
  coins: number;
  onCoinUpgrade: () => void;
  onSynthesize: () => void;
  onCancel: () => void;
}) {
  const g = target.guardian;
  const template = CARD_TEMPLATES.find((t) => t.id === Number(g.cardId));
  const base = getBaseStats(g.rarity);
  const atMax = g.level >= 5;
  const upgradeCost = UPGRADE_COST[g.level] ?? null;
  const canAffordCoin = !atMax && upgradeCost !== null && coins >= upgradeCost;
  const newLevel = Math.min(g.level + 1, 5);
  const previewAtk = Math.round(calculateAttack(base.attack, newLevel));
  const previewHp = Math.round(calculateHp(base.hp, newLevel));
  const hasSynthTarget = adjSameLevel !== null && !atMax;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 rounded-xl">
      <div className="bg-gray-900/95 border border-blue-500 rounded-2xl p-5 w-64 shadow-2xl shadow-blue-900/50 text-sm backdrop-blur">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{template?.icon ?? '❓'}</span>
          <div>
            <div className="text-white font-bold">{template?.name ?? g.cardId}</div>
            <div className="text-gray-400 text-xs">Lv.{g.level}</div>
          </div>
        </div>

        {atMax && (
          <p className="text-red-400 text-center text-xs mb-3">已達最高等級（Lv5）</p>
        )}

        {/* Option 1: Coin Upgrade */}
        {!atMax && (
          <button
            onClick={onCoinUpgrade}
            disabled={!canAffordCoin}
            className="w-full mb-2 p-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={canAffordCoin
              ? { background: 'rgba(202,138,4,0.15)', borderColor: 'rgba(234,179,8,0.5)', color: '#fde047' }
              : { background: 'rgba(60,60,60,0.3)', borderColor: 'rgba(100,100,100,0.4)', color: '#9ca3af' }}
          >
            <div className="font-bold text-sm mb-1">💰 穩定升級（消耗金幣）</div>
            <div className="text-xs space-y-0.5">
              <div>費用：<span className={canAffordCoin ? 'text-yellow-300' : 'text-red-400'}>{upgradeCost} 金幣</span>
                {!canAffordCoin && upgradeCost !== null && <span className="text-red-400 ml-1">(不足)</span>}
              </div>
              <div>升至 Lv.{newLevel}：⚔ {previewAtk} / ❤ {previewHp}</div>
            </div>
          </button>
        )}

        {/* Option 2: Random Synthesis */}
        <button
          onClick={onSynthesize}
          disabled={!hasSynthTarget}
          className="w-full mb-3 p-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={hasSynthTarget
            ? { background: 'rgba(147,51,234,0.15)', borderColor: 'rgba(168,85,247,0.5)', color: '#d8b4fe' }
            : { background: 'rgba(60,60,60,0.3)', borderColor: 'rgba(100,100,100,0.4)', color: '#9ca3af' }}
        >
          <div className="font-bold text-sm mb-1">⚗️ 隨機合成（零成本）</div>
          <div className="text-xs">
            {hasSynthTarget
              ? '相鄰同等級守衛可合成，種類隨機'
              : atMax ? '已達最高等級' : '需相鄰同等級守衛'}
          </div>
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-xs transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
