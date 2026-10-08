import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { drawCards, PACK_CONFIGS, type PackConfig, type DrawResult, type OpenedPack } from '../game/DrawService';
import { type Rarity } from '../cardData';
import { findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db';
import { PackOpenAnimation, type DrawnCardInfo } from '../animations';
import { foilForCard, gradeForFoil } from '../game/foilMap';

const PACK_TONE: Record<string, string> = {
  basic: '',
  premium: 'cool',
  legendary: 'myth',
};

const HIT_RANK: Record<string, number> = {
  c: 0, u: 1, r: 2, rr: 3, ar: 4, sr: 5, sar: 6, ur: 7,
};

const HIT_LABEL: Record<string, string> = {
  r: 'R', rr: 'RR', ar: 'AR', sr: 'SR', sar: 'SAR', ur: 'UR',
};

const RARITY_STYLES: Record<Rarity, { text: string; label: string }> = {
  common:    { text: 'text-gray-300',   label: 'C' },
  rare:      { text: 'text-blue-300',   label: 'R' },
  epic:      { text: 'text-purple-300', label: 'SR' },
  legendary: { text: 'text-yellow-300', label: 'SAR' },
  mythic:    { text: 'text-pink-300',   label: 'UR' },
};

function toInfo(card: ICardInstance): DrawnCardInfo {
  const template = findPtcgTemplate(card.cardId);
  return {
    icon: template?.icon ?? template?.name ?? 'card',
    name: template?.name ?? `#${card.cardId}`,
    rarity: card.rarity,
    imageUrl: template?.imageUrl,
  };
}

function bestPack(result: DrawResult): OpenedPack | null {
  return result.packs.reduce<OpenedPack | null>((best, pack) => {
    if (!best) return pack;
    return (HIT_RANK[pack.hitKind] ?? 0) > (HIT_RANK[best.hitKind] ?? 0) ? pack : best;
  }, null);
}

function CardResultItem({ card, hit }: { card: ICardInstance; hit?: boolean }) {
  const template = findPtcgTemplate(card.cardId);
  const style = RARITY_STYLES[card.rarity];
  const foil = card.foil || foilForCard(undefined, card.rarity);
  const grade = gradeForFoil(foil);
  return (
    <div className={`card-container ${hit ? 'hit-card' : ''}`}>
      <div className={`card drawn-card ptcg-card ptcg-card-sm ${card.rarity} ${hit ? 'ring-2 ring-atelier-warm' : ''}`} data-rarity={foil} data-grade={grade}>
        <div className="card__shine" />
        <div className="card__glare" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 10, overflow: 'hidden' }}>
          {template?.imageUrl ? (
            <img src={template.imageUrl} alt={template.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, background: '#0e1830' }} />
          ) : null}
          <span className={`relative font-bold ${style.text}`} style={{ fontSize: 8, zIndex: 6, background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 4 }}>
            {hit ? 'HIT · ' : ''}{template?.name ?? `#${card.cardId}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DrawPage() {
  const { player, activeEvents, addCards, setPlayer, incrementActionCount } = useGameStore();
  const [selectedPack, setSelectedPack] = useState<PackConfig>(() => {
    const saved = localStorage.getItem('cardplayground.pack');
    return PACK_CONFIGS.find((pack) => pack.id === saved) ?? PACK_CONFIGS[0]!;
  });
  const [lastCount, setLastCount] = useState(1);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [skipMotion, setSkipMotion] = useState(() => localStorage.getItem('cardplayground.skipReveal') === '1');

  const canAfford = useCallback(
    (count: number) => player.softCurrency >= selectedPack.cost * count,
    [player.softCurrency, selectedPack.cost]
  );

  const choosePack = (pack: PackConfig) => {
    setSelectedPack(pack);
    localStorage.setItem('cardplayground.pack', pack.id);
  };

  const handleDraw = useCallback(async (packCount: number) => {
    if (!canAfford(packCount) || isDrawing) return;
    setIsDrawing(true);
    setShowReveal(false);
    setLastCount(packCount);
    const result = drawCards(selectedPack, packCount, player, activeEvents);
    setPlayer(result.updatedPlayer);
    await addCards(result.cards);
    incrementActionCount();
    const firstPack = result.packs[0]?.cards ?? result.cards.slice(0, 5);
    const finish = () => {
      setLastResult(result);
      setShowReveal(true);
      setIsDrawing(false);
    };
    const reduced = skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }
    new PackOpenAnimation().play(selectedPack.icon, firstPack.map(toInfo), finish);
  }, [canAfford, isDrawing, selectedPack, player, activeEvents, setPlayer, addCards, incrementActionCount, skipMotion]);

  useEffect(() => {
    if (sessionStorage.getItem('cardplayground.autoOpen') !== '1') return;
    sessionStorage.removeItem('cardplayground.autoOpen');
    void handleDraw(1);
  }, [handleDraw]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === '1') void handleDraw(1);
      if (event.key === '0') void handleDraw(10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDraw]);

  const pityMax = selectedPack.pityLegendaryAt;
  const since = player.drawsSinceLastLegendary;
  const pityPct = Math.min(100, Math.round((since / Math.max(pityMax, 1)) * 100));
  const pityLeft = Math.max(pityMax - since, 0);
  const best = lastResult ? bestPack(lastResult) : null;
  const chase = best ? (HIT_RANK[best.hitKind] ?? 0) >= 5 : false;
  const shortfall = selectedPack.cost - player.softCurrency;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-atelier-muted">Pack stage</p>
          <h2 className="display text-3xl text-white">拆包櫃檯</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !skipMotion;
            setSkipMotion(next);
            localStorage.setItem('cardplayground.skipReveal', next ? '1' : '0');
          }}
          className={`min-h-11 rounded-full px-3 text-xs ${
            skipMotion ? 'bg-white text-black' : 'bg-white/10 text-atelier-muted'
          }`}
        >
          {跳過動畫} {skipMotion ? '開' : '關'}
        </button>
      </header>

      <section className="glass rounded-3xl p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-atelier-muted">SAR / UR 保底</span>
          <span className={pityPct >= 80 ? 'font-semibold text-rose-300' : 'text-white'}>
            {pityLeft === 0 ? '下一包保底' : `仲差 ${pityLeft} 包`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40" aria-valuenow={pityPct} aria-valuemin={0} aria-valuemax={100} role="progressbar">
          <div className={`pity-fill ${pityPct >= 80 ? 'hot' : ''}`} style={{ width: `${pityPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-atelier-muted">已累積 {since} / {pityMax} · 錢包 {player.softCurrency.toLocaleString()}</p>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {PACK_CONFIGS.map((pack) => {
          const isSelected = selectedPack.id === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => choosePack(pack)}
              className={`min-h-11 rounded-2xl p-2 text-left ${
                isSelected ? 'bg-white/10 ring-2 ring-atelier-warm' : 'bg-white/5'
              }`}
            >
              <div className={`booster ${PACK_TONE[pack.id] ?? ''} ${isSelected ? 'pack-float' : ''}`}>
                <span className="booster-seal">{pack.cost}</span>
                {isSelected ? <span className="booster-sheen" /> : null}
              </div>
              <div className="mt-2 text-xs font-semibold text-white">{pack.name.replace('JP ', '')}</div>
              <div className="text-[11px] text-atelier-muted">保底 {pack.pityLegendaryAt}</div>
            </button>
          );
        })}
      </div>

      <div className="draw-dock glass grid grid-cols-2 gap-2 rounded-3xl p-2">
        <button type="button" onClick={() => handleDraw(1)} disabled={!canAfford(1) || isDrawing} className="glow-press min-h-12 rounded-2xl bg-white/10 font-semibold text-white">
          {isDrawing ? '拆開中…' : `拆 1 · ${selectedPack.cost}`}
        </button>
        <button type="button" onClick={() => handleDraw(10)} disabled={!canAfford(10) || isDrawing} className="glow-press min-h-12 rounded-2xl bg-atelier-warm font-semibold text-black">
          {isDrawing ? '拆開中…' : `拆 10 · ${selectedPack.cost * 10}`}
        </button>
      </div>
      {!canAfford(1) ? (
        <p className="text-center text-xs text-rose-300">錢包不夠，還差 {shortfall.toLocaleString()}。可去商店或做賽季任務。</p>
      ) : (
        <p className="text-center text-[11px] text-atelier-muted">電腦可按 1 / 0 快速拆 1 包或 10 包</p>
      )}

      {showReveal && lastResult && best && (
        <section className="glass space-y-4 rounded-3xl p-4">
          <div className={`hit-banner rounded-2xl px-4 py-3 ${
            chase ? 'bg-gradient-to-r from-amber-400/30 to-fuchsia-400/20' : 'bg-white/5'
          }`}>
            <div className="text-[11px] uppercase tracking-[0.22em] text-atelier-muted">
              {lastResult.packs.length} 包 · {lastResult.cards.length} 張
            </div>
            <div className="display text-2xl text-white">
              {chase ? '追逐命中' : '這輪最佳'} · {HIT_LABEL[best.hitKind] ?? best.hitKind.toUpperCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDraw(lastCount)}
            disabled={!canAfford(lastCount) || isDrawing}
            className="glow-press min-h-12 w-full rounded-2xl bg-white font-semibold text-black"
          >
            再拆 {lastCount} 包 · {selectedPack.cost * lastCount}
          </button>
          {lastResult.packs.map((pack, i) => (
            <div key={i} className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-atelier-warm">
                第 {i + 1} 包 · {HIT_LABEL[pack.hitKind] ?? pack.hitKind.toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-3">
                {pack.cards.map((card, j) => (
                  <CardResultItem key={`${i}-${j}`} card={card} hit={j === pack.cards.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
