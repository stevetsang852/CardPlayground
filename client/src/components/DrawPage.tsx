import { useCallback, useEffect, useState } from 'react';
import { PackSeal } from './PackSeal';
import { useGameStore } from '../store/gameStore';
import { drawCards, PACK_CONFIGS, type PackConfig, type DrawResult, type OpenedPack } from '../game/DrawService';
import { type Rarity } from '../cardData';
import { findPtcgTemplate } from '../game/ptcgPool';
import type { ICardInstance } from '../db';
import { foilForCard, gradeForFoil } from '../game/foilMap';
import { playPackTone } from '../game/packSound';

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

function bestPack(result: DrawResult): OpenedPack | null {
  return result.packs.reduce<OpenedPack | null>((best, pack) => {
    if (!best) return pack;
    return (HIT_RANK[pack.hitKind] ?? 0) > (HIT_RANK[best.hitKind] ?? 0) ? pack : best;
  }, null);
}

function CardResultItem({ card, hit, fill }: { card: ICardInstance; hit?: boolean; fill?: boolean }) {
  const template = findPtcgTemplate(card.cardId);
  const style = RARITY_STYLES[card.rarity];
  const grade = gradeForFoil(card.foil || foilForCard(undefined, card.rarity));
  return (
    <div className={`card-container ${hit ? 'hit-card' : ''} ${fill ? 'w-full' : ''}`}>
      <div className={`drawn-card ptcg-card ${fill ? '' : 'ptcg-card-sm'} ${card.rarity} ${hit ? 'ring-2 ring-atelier-warm' : ''}`} data-grade={grade}>
        <img src={template?.imageUrl} alt={template?.name ?? 'card'} className="scan-img" />
      </div>
      <p className={`scan-caption ${style.text}`}>{hit ? 'HIT · ' : ''}{template?.name ?? `#${card.cardId}`}</p>
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
  const [step, setStep] = useState(6);
  const [torn, setTorn] = useState(false);
  const [skipMotion, setSkipMotion] = useState(() => localStorage.getItem('cardplayground.skipReveal') === '1');
  const [muted, setMuted] = useState(() => localStorage.getItem('cardplayground.muted') === '1');

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
    setTorn(false);
    setLastCount(packCount);
    const result = drawCards(selectedPack, packCount, player, activeEvents);
    setPlayer(result.updatedPlayer);
    await addCards(result.cards);
    incrementActionCount();
    const best = bestPack(result);
    const rank = best ? HIT_RANK[best.hitKind] ?? 0 : 0;
    const reduced = skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTorn(reduced);
    setLastResult(result);
    setShowReveal(true);
    setStep(reduced ? 6 : 0);
    if (reduced) {
      playPackTone(rank >= 6 ? 'chase' : rank >= 5 ? 'hit' : 'tick', muted);
      setIsDrawing(false);
    }
  }, [canAfford, isDrawing, selectedPack, player, activeEvents, setPlayer, addCards, incrementActionCount, skipMotion, muted]);

  useEffect(() => {
    if (sessionStorage.getItem('cardplayground.autoOpen') !== '1') return;
    sessionStorage.removeItem('cardplayground.autoOpen');
    void handleDraw(1);
  }, [handleDraw]);

  useEffect(() => {
    if (!showReveal || !lastResult || !torn) return;
    const reduced = skipMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStep(6);
      setIsDrawing(false);
      return;
    }
    const marks = [0, 420, 780, 1140, 1500, 2100, 2500];
    let start = 0;
    let frame = 0;
    let last = -1;
    const loop = (t: number) => {
      if (!start) start = t;
      const elapsed = t - start;
      let next = 0;
      for (let i = 0; i < marks.length; i += 1) if (elapsed >= marks[i]!) next = i;
      if (next !== last) {
        last = next;
        setStep(next);
        if (next === 5) {
          const shown = bestPack(lastResult);
          const shownRank = shown ? HIT_RANK[shown.hitKind] ?? 0 : 0;
          playPackTone(shownRank >= 6 ? 'chase' : shownRank >= 5 ? 'hit' : 'tick', muted);
        }
        if (next === 6) setIsDrawing(false);
      }
      if (next < 6) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [showReveal, lastResult, skipMotion, torn, muted]);

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
  const spotlight = lastResult?.packs[0];

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-atelier-muted">Pack stage</p>
          <h2 className="display text-3xl text-white">拆包櫃檯</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              localStorage.setItem('cardplayground.muted', next ? '1' : '0');
            }}
            className="min-h-11 rounded-full bg-white/10 px-3 text-xs text-atelier-muted"
          >
            聲音 {muted ? '關' : '開'}
          </button>
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
            跳過動畫 {skipMotion ? '開' : '關'}
          </button>
        </div>
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
        <p className="text-center text-xs text-rose-300">錢包不夠，還差 {shortfall.toLocaleString()}。可回櫃檯領津貼，或去商店。</p>
      ) : (
        <p className="text-center text-[11px] text-atelier-muted">開包後按住頂部打橫掃開。電腦可按 1 / 0。</p>
      )}

      {showReveal && lastResult && !torn && (
        <PackSeal
          tone={selectedPack.id === 'premium' ? 'tone-night' : selectedPack.id === 'legendary' ? 'tone-ember' : 'tone-foil'}
          title={selectedPack.name.replace('JP ', '')}
          onOpen={() => setTorn(true)}
        />
      )}

      {showReveal && torn && lastResult && best && spotlight && (
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
          {lastResult.packs.length === 1 || step < 6 ? (
            <div className="grid grid-cols-5 gap-2">
              {spotlight.cards.map((card, index) => (
                step > index ? (
                  <CardResultItem key={`${card.cardId}-${index}`} card={card} hit={index === spotlight.cards.length - 1 && step >= 5} fill />
                ) : (
                  <div key={`back-${index}`} className="stage-back">封</div>
                )
              ))}
            </div>
          ) : null}
          {step >= 6 ? (
            <>
              <button
                type="button"
                onClick={() => handleDraw(lastCount)}
                disabled={!canAfford(lastCount) || isDrawing}
                className="glow-press min-h-12 w-full rounded-2xl bg-white font-semibold text-black"
              >
                再拆 {lastCount} 包 · {selectedPack.cost * lastCount}
              </button>
              {lastResult.packs.length > 1 ? (
                lastResult.packs.map((pack, i) => (
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
                ))
              ) : null}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
