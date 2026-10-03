// BattlePage.tsx  Top-level battle orchestrator
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BattleEngine } from '../../game/battle/BattleEngine';
import { GameModeManager } from '../../game/battle/GameModeManager';
import { RewardCalculator } from '../../game/battle/RewardCalculator';
import { DeckSelectPage } from './DeckSelectPage';
import { BattleHUD } from './BattleHUD';
import BattleResultScreen from './BattleResultScreen';
import { GameLayout } from './GameLayout';
import { EnemyPathScene } from './EnemyPathScene';
import { PlayerBoardScene } from './PlayerBoardScene';
import type { BattleMode, Deck, BattleState, Guardian, Talent } from '../../game/battle/BattleTypes';
import { TalentSystem } from '../../game/battle/TalentSystem';
import { CARD_TEMPLATES } from '../../cardData';

type Phase = 'mode-select' | 'deck-select' | 'battle' | 'result';
interface BattlePageProps { onBack: () => void; }

const MODES: { mode: BattleMode; label: string; icon: string; desc: string }[] = [
  { mode: 'daily_challenge', label: '\u6bcf\u65e5\u6311\u6230', icon: '\ud83d\udcc5', desc: '\u56fa\u5b9a 20 \u6ce2\uff0c\u6bcf\u65e5\u4e00\u6b21' },
  { mode: 'endless',         label: '\u7121\u76e1\u6a21\u5f0f', icon: '\u267e',       desc: '\u7121\u9650\u6ce2\u6b21\uff0c\u6311\u6230\u6700\u9ad8\u7d00\u9304' },
  { mode: 'boss_rush',       label: 'Boss \u885d\u95dc',        icon: '\ud83d\udc79', desc: '\u50c5 Boss \u6ce2\uff0c\u9ad8\u98a8\u96aa\u9ad8\u5831\u916c' },
];

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;
const COUNTDOWN_SECONDS = 10;

const RARITY_COLOR: Record<string, string> = {
  common: '#8090a0', rare: '#4488ff', epic: '#aa44ff',
  legendary: '#ffd700', mythic: '#ff44cc',
};

const SUMMON_COSTS: Record<string, number> = {
  common: 2, rare: 3, epic: 5, legendary: 8, mythic: 15,
};

const gameModeManager = new GameModeManager();
const rewardCalculator = new RewardCalculator();

export function BattlePage({ onBack }: BattlePageProps) {
  const cards = useGameStore((s) => s.cards);
  const gallery = useGameStore((s) => s.gallery);
  const player = useGameStore((s) => s.player);
  const setPlayer = useGameStore((s) => s.setPlayer);

  const [phase, setPhase] = useState<Phase>('mode-select');
  const [selectedMode, setSelectedMode] = useState<BattleMode>('daily_challenge');
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isVictory, setIsVictory] = useState(false);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragCardRarity, setDragCardRarity] = useState<string | null>(null);

  const engineRef = useRef<BattleEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownActiveRef = useRef(false);

  const galleryScore = useMemo(() => {
    if (!gallery) return 0;
    const RARITY_SCORE: Record<string, number> = { common: 1, rare: 2, epic: 5, legendary: 10, mythic: 20 };
    return gallery.slots.reduce((total, slot) => {
      const card = cards.find((c) => c.id === slot.cardInstanceId);
      return card ? total + (RARITY_SCORE[card.rarity] ?? 0) : total;
    }, 0);
  }, [gallery, cards]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (countdownIntervalRef.current !== null) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    countdownActiveRef.current = false;
  }, []);

  const finishBattle = useCallback((victory: boolean, engine: BattleEngine) => {
    stopLoop();
    setIsVictory(victory);
    const rewards = [...engine.state.rewards];
    rewards.push(rewardCalculator.calculateWaveReward(engine.state.wave));
    if (victory && engine.state.mode === 'daily_challenge') {
      rewards.push(rewardCalculator.calculateDailyChallengeBonus());
      gameModeManager.completeDailyChallenge();
    }
    const milestoneReward = rewardCalculator.calculateMilestoneReward(engine.state.wave);
    if (milestoneReward) rewards.push(milestoneReward);
    engine.state.rewards = rewards;
    rewardCalculator.applyRewards(rewards, { player, setPlayer });
    gameModeManager.setHighScore(engine.state.mode, engine.state.wave);
    setBattleState({ ...engine.state });
    setPhase('result');
  }, [stopLoop, player, setPlayer]);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    lastTimeRef.current = performance.now();
    accRef.current = 0;
    const loop = (now: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accRef.current += delta;
      if (accRef.current >= FRAME_MS) {
        const dt = accRef.current / 1000;
        accRef.current = 0;
        engine.tick(dt);
        setBattleState({ ...engine.state });
        const fsmState = engine.fsm.getState();
        if (fsmState === 'Victory' || fsmState === 'Defeat') { finishBattle(fsmState === 'Victory', engine); return; }
        if (fsmState === 'BetweenWaves') { cancelAnimationFrame(rafRef.current!); rafRef.current = null; return; }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [finishBattle]);

  const startCountdown = useCallback((engine: BattleEngine) => {
    if (countdownActiveRef.current) return;
    countdownActiveRef.current = true;
    setCountdown(COUNTDOWN_SECONDS);
    if (countdownIntervalRef.current !== null) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          countdownActiveRef.current = false;
          const nextWave = engine.state.wave + 1;
          if (engine.state.mode === 'daily_challenge' && nextWave > 20) {
            engine.fsm.transition('Victory');
            finishBattle(true, engine);
            return 0;
          }
          engine.spawnWave(nextWave);
          setBattleState({ ...engine.state });
          startLoop();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [startLoop, finishBattle]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || phase !== 'battle') return;
    if (engine.fsm.getState() === 'BetweenWaves' && !countdownActiveRef.current) {
      startCountdown(engine);
    }
  }, [phase, battleState, startCountdown]);

  useEffect(() => { return () => stopLoop(); }, [stopLoop]);

  const handleModeSelect = (mode: BattleMode) => {
    if (mode === 'daily_challenge') {
      const check = gameModeManager.checkDailyChallenge();
      if (!check.allowed) {
        const mins = check.remainingMs ? Math.ceil(check.remainingMs / 60000) : 0;
        alert('\u4eca\u65e5\u6311\u6230\u5df2\u5b8c\u6210\uff01\u8ddd\u96e2\u91cd\u7f6e\u9084\u6709 ' + mins + ' \u5206\u9418\u3002');
        return;
      }
    }
    setSelectedMode(mode);
    setPhase('deck-select');
  };

  const handleDeckSelected = (deck: Deck, talent?: Talent) => {
    const engine = new BattleEngine(selectedMode, deck, galleryScore);
    if (talent) {
      new TalentSystem().applyTalent(talent, engine.state);
      engine.state.activeTalent = talent;
    }
    engineRef.current = engine;
    engine.fsm.transition('Preparing');
    engine.spawnWave(1);
    setBattleState({ ...engine.state });
    setCountdown(COUNTDOWN_SECONDS);
    setPhase('battle');
    startLoop();
  };

  const handleDropCard = useCallback((gridX: number, gridY: number) => {
    const engine = engineRef.current;
    if (!engine || !dragCardId) return;
    const card = cards.find((c) => String(c.cardId) === dragCardId);
    if (!card) { setDragCardId(null); setDragCardRarity(null); return; }
    const template = CARD_TEMPLATES.find((t) => t.id === card.cardId);
    const series = template?.series ?? '';
    const success = engine.summonGuardian(dragCardId, card.rarity, series, gridX, gridY);
    if (success) setBattleState({ ...engine.state });
    setDragCardId(null);
    setDragCardRarity(null);
  }, [dragCardId, cards]);

  const handleCoinUpgrade = (x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.coinUpgrade(x, y);
    setBattleState({ ...engine.state });
  };

  const handleSynthesize = (x1: number, y1: number, x2: number, y2: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.synthesize(x1, y1, x2, y2);
    setBattleState({ ...engine.state });
  };

  const handlePlayAgain = () => {
    stopLoop();
    engineRef.current = null;
    setBattleState(null);
    setDragCardId(null);
    setDragCardRarity(null);
    setPhase('mode-select');
  };

  const mythicGuardian = useMemo((): Guardian | null => {
    if (!battleState) return null;
    for (const row of battleState.grid)
      for (const cell of row)
        if (cell.guardian?.rarity === 'mythic') return cell.guardian;
    return null;
  }, [battleState]);

  const handleMythicUltimate = () => {
    const engine = engineRef.current;
    if (!engine || !mythicGuardian) return;
    mythicGuardian.mythicUsed = true;
    engine.state.enemies.forEach((e) => { e.hp -= mythicGuardian.attack * 5; });
    engine.state.enemies = engine.state.enemies.filter((e) => e.hp > 0);
    setBattleState({ ...engine.state });
  };

  const deckHand = useMemo(() => {
    if (!battleState) return [];
    const seen = new Set<string>();
    return battleState.deck.cards
      .filter((id) => { if (seen.has(id)) return false; seen.add(id); return true; })
      .map((id) => {
        const card = cards.find((c) => String(c.cardId) === id);
        const template = CARD_TEMPLATES.find((t) => t.id === Number(id));
        const rarity = card?.rarity ?? template?.rarity ?? 'common';
        return { id, icon: template?.icon ?? '?', name: template?.name ?? id, rarity, cost: SUMMON_COSTS[rarity] ?? 2 };
      });
  }, [battleState, cards]);

  //  Render 

  if (phase === 'mode-select') {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 gap-6">
        <button onClick={onBack} className="self-start px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
          {'\u2190 \u8fd4\u56de'}
        </button>
        <h1 className="text-3xl font-bold text-yellow-400">{'\u2694\ufe0f \u79d8\u5883\u9632\u5fa1\u6218'}</h1>
        <p className="text-gray-400 text-sm">{'\u9078\u64c7\u9047\u6232\u6a21\u5f0f'}</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {MODES.map(({ mode, label, icon, desc }) => (
            <button key={mode} onClick={() => handleModeSelect(mode)}
              className="flex items-center gap-4 px-5 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 rounded-xl transition-all text-left">
              <span className="text-3xl">{icon}</span>
              <div>
                <div className="font-bold text-gray-100">{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'deck-select') {
    return <DeckSelectPage onStartBattle={handleDeckSelected} onBack={() => setPhase('mode-select')} />;
  }

  if (phase === 'battle' && battleState) {
    const fsmState = engineRef.current?.fsm.getState();
    const isBetweenWaves = fsmState === 'BetweenWaves';
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // ControlPanel: HUD + summon hand + between-waves notice + abandon button
    const controlPanelContent = (
      <div className="flex flex-col h-full text-gray-100 text-sm">
        <BattleHUD
          playerHp={battleState.playerHp} maxHp={20} sp={battleState.sp}
          coins={battleState.coins}
          wave={battleState.wave} countdown={isBetweenWaves ? countdown : 0}
          activeBonuses={battleState.activeBonuses}
          mythicGuardian={mythicGuardian} onMythicUltimate={handleMythicUltimate}
          activeTalent={battleState.activeTalent}
        />
        {isBetweenWaves && (
          <div className="mx-2 mt-1 text-center py-1.5 bg-blue-900/40 border border-blue-600 rounded-xl text-blue-300 font-semibold text-xs">
            {'\u23f3 \u4e0b\u4e00\u6ce2\u5373\u5c07\u5230\u4f86\u2026 '}{countdown}s
          </div>
        )}
        {/* Summon hand */}
        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 p-2">
          {deckHand.map((card) => {
            const canAfford = battleState.sp >= card.cost;
            const isDragging = dragCardId === card.id;
            return (
              <div key={card.id} draggable
                onDragStart={() => { if (!canAfford) return; setDragCardId(card.id); setDragCardRarity(card.rarity); }}
                onDragEnd={() => { setDragCardId(null); setDragCardRarity(null); }}
                style={{ borderColor: RARITY_COLOR[card.rarity] ?? '#555', opacity: canAfford ? 1 : 0.4, transform: isDragging ? 'scale(1.05)' : 'scale(1)', cursor: canAfford ? 'grab' : 'not-allowed' }}
                className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 border-2 rounded-xl transition-transform select-none"
                title={card.name + ' \u2014 ' + card.cost + ' SP'}
              >
                <span className="text-xl">{card.icon}</span>
                <span className="text-xs text-gray-300 flex-1 truncate">{card.name}</span>
                <span className="text-xs font-bold" style={{ color: RARITY_COLOR[card.rarity] }}>{'\u26a1'}{card.cost}</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => { stopLoop(); engineRef.current?.fsm.transition('Defeat'); setIsVictory(false); setPhase('result'); }}
          className="m-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
          {'\u653e\u68c4'}
        </button>
      </div>
    );

    return (
      <GameLayout
        enemyPath={
          <EnemyPathScene enemies={battleState.enemies} isMobile={isMobile} />
        }
        playerBoard={
          <PlayerBoardScene
            grid={battleState.grid}
            onCellClick={(col, row) => {
              // Clicking a cell with a guardian opens the action modal via handleDropCard
              // For empty cells, attempt to drop the currently dragged card
              if (dragCardId) {
                handleDropCard(col, row);
              }
            }}
          />
        }
        controlPanel={controlPanelContent}
      />
    );
  }

  if (phase === 'result' && battleState) {
    return (
      <BattleResultScreen
        victory={isVictory} wave={battleState.wave}
        highScore={gameModeManager.getHighScore(battleState.mode)}
        rewards={battleState.rewards}
        onPlayAgain={handlePlayAgain} onHome={onBack}
      />
    );
  }

  return null;
}