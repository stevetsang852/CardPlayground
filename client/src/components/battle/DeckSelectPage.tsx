// DeckSelectPage.tsx — game-style card selection with card effects + drag-to-deck
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { useGameStore } from '../../store/gameStore';
import { CARD_TEMPLATES } from '../../cardData';
import { validate } from '../../game/battle/DeckValidator';
import { getBaseStats, getElementFromSeries } from '../../game/battle/GuardianFactory';
import { TalentSystem } from '../../game/battle/TalentSystem';
import type { Deck, Rarity, Talent } from '../../game/battle/BattleTypes';

const RARITY_SCORE: Record<Rarity, number> = { common: 1, rare: 2, epic: 5, legendary: 10, mythic: 20 };
const RARITY_GLOW: Record<Rarity, string> = {
  common: 'rgba(148,163,184,0.4)', rare: 'rgba(96,165,250,0.5)',
  epic: 'rgba(167,139,250,0.5)', legendary: 'rgba(251,191,36,0.6)', mythic: 'rgba(244,114,182,0.7)',
};
const RARITY_BORDER: Record<Rarity, string> = {
  common: '#94a3b8', rare: '#60a5fa', epic: '#a78bfa', legendary: '#fbbf24', mythic: '#f472b6',
};
const RARITY_COLOR_HEX: Record<Rarity, number> = {
  common: 0x94a3b8, rare: 0x60a5fa, epic: 0xa78bfa, legendary: 0xfbbf24, mythic: 0xf472b6,
};
const ELEMENT_ICON: Record<string, string> = { fire: '🔥', ice: '❄️', nature: '🌿', light: '✨', shadow: '🌑' };

type PagePhase = 'deck-select' | 'talent-select';

interface Props { onStartBattle: (deck: Deck, talent?: Talent) => void; onBack: () => void; }

// ── Three.js card select effect ───────────────────────────────────────────────
function spawnSelectEffect(container: HTMLElement, rarity: Rarity, selected: boolean) {
  const rect = container.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:9999;`;
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-rect.width / 2, rect.width / 2, rect.height / 2, -rect.height / 2, 0.1, 10);
  camera.position.z = 5;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(rect.width, rect.height);
  renderer.setClearColor(0x000000, 0);

  const color = RARITY_COLOR_HEX[rarity];
  const count = selected ? 40 : 20;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel: { vx: number; vy: number }[] = [];
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * rect.width * 0.6;
    pos[i * 3 + 1] = (Math.random() - 0.5) * rect.height * 0.6;
    pos[i * 3 + 2] = 0;
    const angle = Math.random() * Math.PI * 2;
    const spd = (selected ? 1.5 : 0.8) + Math.random() * 1.5;
    vel.push({ vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: selected ? 4 : 2.5, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  let t = 0;
  const posAttr = geo.attributes['position'] as THREE.BufferAttribute;
  let rafId: number;
  const lifetime = selected ? 0.6 : 0.35;
  const tick = () => {
    t += 0.016;
    if (t > lifetime) {
      cancelAnimationFrame(rafId);
      renderer.dispose(); canvas.remove(); scene.clear(); return;
    }
    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, posAttr.getX(i) + vel[i].vx, posAttr.getY(i) + vel[i].vy, 0);
    }
    posAttr.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - t / lifetime);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function DeckSelectPage({ onStartBattle, onBack }: Props) {
  const cards = useGameStore((s) => s.cards);
  const gallery = useGameStore((s) => s.gallery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragOverDeck, setDragOverDeck] = useState(false);
  const [pagePhase, setPagePhase] = useState<PagePhase>('deck-select');
  const [drawnTalents, setDrawnTalents] = useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [confirmedDeck, setConfirmedDeck] = useState<Deck | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const galleryScore = useMemo(() => {
    if (!gallery) return 0;
    return gallery.slots.reduce((t, slot) => {
      const c = cards.find((c) => c.id === slot.cardInstanceId);
      // rarity from DB instance, fallback to template
      const rarity = c?.rarity ?? CARD_TEMPLATES.find((t) => t.id === c?.cardId)?.rarity ?? 'common';
      return t + RARITY_SCORE[rarity as Rarity];
    }, 0);
  }, [gallery, cards]);

  // Build collection for DeckValidator — rarity from DB or template fallback
  const collection = useMemo(() => cards.map((c) => {
    const rarity = c.rarity ?? CARD_TEMPLATES.find((t) => t.id === c.cardId)?.rarity ?? 'common';
    return { id: String(c.cardId), rarity: rarity as Rarity };
  }), [cards]);

  // Unique owned templates — rarity from DB or template fallback
  const ownedTemplates = useMemo(() => {
    const seen = new Set<number>();
    return cards
      .filter((c) => { if (seen.has(c.cardId)) return false; seen.add(c.cardId); return true; })
      .map((c) => {
        const template = CARD_TEMPLATES.find((t) => t.id === c.cardId);
        if (!template) return null;
        // Prefer DB rarity, fall back to template rarity
        const rarity = (c.rarity ?? template.rarity) as Rarity;
        return { template, rarity };
      })
      .filter((x): x is { template: typeof CARD_TEMPLATES[0]; rarity: Rarity } => x !== null);
  }, [cards]);

  const validation = useMemo(() => validate(selectedIds, collection), [selectedIds, collection]);

  const toggleCard = useCallback((id: string, rarity: Rarity) => {
    setSelectedIds((prev) => {
      const isAdding = !prev.includes(id);
      const next = isAdding ? [...prev, id] : prev.filter((x) => x !== id);
      // Trigger effect
      const el = cardRefs.current.get(id);
      if (el) spawnSelectEffect(el, rarity, isAdding);
      return next;
    });
  }, []);

  const handleConfirmDeck = useCallback(() => {
    if (!validation.valid) return;
    const deck: Deck = { cards: selectedIds };
    const talents = new TalentSystem().drawTalents(3);
    setConfirmedDeck(deck);
    setDrawnTalents(talents);
    setSelectedTalent(null);
    setPagePhase('talent-select');
  }, [validation.valid, selectedIds]);

  // ── Talent selection phase ────────────────────────────────────────────────
  if (pagePhase === 'talent-select') {
    return (
      <div className="min-h-screen flex flex-col text-gray-100 items-center justify-center p-6 gap-6"
        style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)' }}>
        <h1 className="text-2xl font-bold text-yellow-400" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
          🎯 選擇天賦
        </h1>
        <p className="text-gray-400 text-sm">選擇一個天賦，效果將在整場戰鬥中持續生效</p>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          {drawnTalents.map((talent) => {
            const isChosen = selectedTalent?.id === talent.id;
            return (
              <button key={talent.id} onClick={() => setSelectedTalent(talent)}
                className="flex flex-col gap-1 px-5 py-4 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{
                  background: isChosen ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isChosen ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isChosen ? '0 0 20px rgba(59,130,246,0.4)' : 'none',
                }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-100">{talent.name}</span>
                  {isChosen && <span className="text-blue-400 text-sm">✓</span>}
                </div>
                <span className="text-sm text-gray-400">{talent.description}</span>
                <span className="text-xs text-yellow-300 mt-0.5">效果值：{talent.value}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => selectedTalent && confirmedDeck && onStartBattle(confirmedDeck, selectedTalent)}
          disabled={!selectedTalent}
          className="w-full max-w-sm py-3.5 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={selectedTalent
            ? { background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#1a0a00', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }
            : { background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
          {selectedTalent ? '⚔️ 開始戰鬥' : '請先選擇天賦'}
        </button>

        <button onClick={() => setPagePhase('deck-select')}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← 返回套牌選擇
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-gray-100"
      style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-yellow-400" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>⚔️ 選擇套牌</h1>
        <div className="text-sm text-gray-500">{selectedIds.length}/8</div>
      </div>

      {/* Gallery SP info */}
      <div className="mx-4 mb-3 px-3 py-2 rounded-xl flex justify-between text-xs"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-gray-400">畫廊評分 <span className="text-yellow-300 font-bold">{galleryScore}</span></span>
        <span className="text-gray-400">初始SP加成 <span className="text-green-400 font-bold">+{Math.floor(galleryScore / 100) * 10}</span></span>
      </div>

      {/* Selected deck strip — drop zone */}
      <div className="mx-4 mb-3 min-h-[52px] rounded-xl p-2 flex flex-wrap gap-1.5 items-center transition-all"
        onDragOver={(e) => { e.preventDefault(); setDragOverDeck(true); }}
        onDragLeave={() => setDragOverDeck(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOverDeck(false);
          const id = e.dataTransfer.getData('cardId');
          const rarity = e.dataTransfer.getData('cardRarity') as Rarity;
          if (id) toggleCard(id, rarity);
        }}
        style={{ background: dragOverDeck ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px dashed ${dragOverDeck ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }}>
        {selectedIds.length === 0 ? (
          <span className="text-gray-600 text-xs w-full text-center">拖曳卡牌到此處，或點擊選擇</span>
        ) : selectedIds.map((id) => {
          const t = CARD_TEMPLATES.find((t) => t.id === Number(id));
          const c = cards.find((c) => c.cardId === Number(id));
          const rarity = (c?.rarity ?? t?.rarity ?? 'common') as Rarity;
          if (!t) return null;
          return (
            <button key={id} onClick={() => toggleCard(id, rarity)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-70 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${RARITY_BORDER[rarity]}`, boxShadow: `0 0 8px ${RARITY_GLOW[rarity]}` }}>
              {t.icon} <span className="text-gray-200">{t.name}</span> <span className="text-gray-500 ml-0.5">✕</span>
            </button>
          );
        })}
      </div>

      {/* Validation errors */}
      {selectedIds.length > 0 && !validation.valid && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {validation.errors.map((e, i) => <p key={i} className="text-red-400 text-xs">⚠ {e}</p>)}
        </div>
      )}

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">我的卡牌（{ownedTemplates.length} 種）</p>
        {ownedTemplates.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">尚無卡牌 — 先去抽卡吧！</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ownedTemplates.map(({ template, rarity }) => {
              const id = String(template.id);
              const isSelected = selectedIds.includes(id);
              const stats = getBaseStats(rarity);
              const element = getElementFromSeries(template.series);
              return (
                <CardItem
                  key={template.id}
                  id={id}
                  template={template}
                  rarity={rarity}
                  isSelected={isSelected}
                  stats={stats}
                  element={element}
                  onToggle={toggleCard}
                  onRef={(el) => { if (el) cardRefs.current.set(id, el); else cardRefs.current.delete(id); }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Start button */}
      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleConfirmDeck} disabled={!validation.valid}
          className="w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={validation.valid
            ? { background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#1a0a00', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }
            : { background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
          {validation.valid ? '✅ 確認出戰' : `需再選 ${Math.max(0, 5 - selectedIds.length)} 張`}
        </button>
      </div>
    </div>
  );
}

// ── CardItem — individual card with hover/select animations ──────────────────
interface CardItemProps {
  id: string;
  template: typeof CARD_TEMPLATES[0];
  rarity: Rarity;
  isSelected: boolean;
  stats: ReturnType<typeof getBaseStats>;
  element: string;
  onToggle: (id: string, rarity: Rarity) => void;
  onRef: (el: HTMLDivElement | null) => void;
}

function CardItem({ id, template, rarity, isSelected, stats, element, onToggle, onRef }: CardItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRef(ref.current);
    return () => onRef(null);
  }, [onRef]);

  // GSAP float animation for legendary/mythic
  useEffect(() => {
    if (!ref.current) return;
    if (rarity === 'legendary' || rarity === 'mythic') {
      const tween = gsap.to(ref.current, {
        y: -4, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
      return () => { tween.kill(); };
    }
  }, [rarity]);

  const rarityLabel: Record<Rarity, string> = {
    common: '普通', rare: '稀有', epic: '史詩', legendary: '傳說', mythic: '神話',
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('cardId', id); e.dataTransfer.setData('cardRarity', rarity); }}
      onClick={() => onToggle(id, rarity)}
      className="relative flex flex-col items-center p-3 rounded-xl cursor-pointer select-none overflow-hidden"
      style={{
        background: isSelected
          ? `linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.15))`
          : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isSelected ? '#3b82f6' : RARITY_BORDER[rarity]}`,
        boxShadow: isSelected
          ? '0 0 20px rgba(59,130,246,0.5), inset 0 0 20px rgba(59,130,246,0.05)'
          : `0 0 10px ${RARITY_GLOW[rarity]}`,
        transition: 'all 0.2s ease',
        transform: isSelected ? 'translateY(-3px) scale(1.02)' : 'none',
      }}>

      {/* Mythic shimmer overlay */}
      {rarity === 'mythic' && (
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, transparent 30%, rgba(244,114,182,0.15) 50%, transparent 70%)',
            animation: 'shimmer 2s infinite',
          }} />
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
          style={{ background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.8)' }}>✓</span>
      )}

      {/* Card icon with glow for rare+ */}
      <div className="relative mb-1">
        <span className="text-3xl" style={rarity !== 'common' ? { filter: `drop-shadow(0 0 6px ${RARITY_BORDER[rarity]})` } : {}}>
          {template.icon}
        </span>
        {/* Rarity ring */}
        {(rarity === 'legendary' || rarity === 'mythic') && (
          <div className="absolute -inset-1 rounded-full pointer-events-none"
            style={{ border: `1px solid ${RARITY_BORDER[rarity]}`, opacity: 0.5, animation: 'pulse 2s infinite' }} />
        )}
      </div>

      <span className="text-xs font-semibold text-gray-200 text-center leading-tight mb-1">{template.name}</span>

      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: `${RARITY_BORDER[rarity]}22`, color: RARITY_BORDER[rarity], border: `1px solid ${RARITY_BORDER[rarity]}44` }}>
          {rarityLabel[rarity]}
        </span>
        <span className="text-[10px]">{ELEMENT_ICON[element] ?? '❓'}</span>
      </div>

      <div className="w-full text-[10px] text-gray-500 space-y-0.5">
        <div className="flex justify-between">
          <span>⚔ 攻擊</span>
          <span className="text-gray-300">{stats.attack}</span>
        </div>
        <div className="flex justify-between">
          <span>🎯 射程</span>
          <span className="text-gray-300">{stats.range}</span>
        </div>
        <div className="flex justify-between">
          <span>✦ 技能</span>
          <span className="text-gray-300">{stats.skillType}</span>
        </div>
      </div>
    </div>
  );
}
