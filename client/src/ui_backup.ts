// Card Mystery Realm — UI layer (no Firebase required for demo mode)

// ── Demo state ──────────────────────────────────────────────────────────────
const state = {
  softCurrency: 1000,
  hardCurrency: 50,
  luckValue: 0,
  drawCount: 0,
  inventory: [] as Card[],
  consecutiveFailures: 0,
};

interface Card {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
}

// ── Card pool ────────────────────────────────────────────────────────────────
const CARD_POOL: Omit<Card, 'id'>[] = [
  { name: 'Shadow Wolf',    rarity: 'common',    icon: '🐺' },
  { name: 'Stone Golem',    rarity: 'common',    icon: '🗿' },
  { name: 'Fire Sprite',    rarity: 'common',    icon: '🔥' },
  { name: 'Ice Shard',      rarity: 'common',    icon: '❄️' },
  { name: 'Thunder Hawk',   rarity: 'rare',      icon: '⚡' },
  { name: 'Sea Serpent',    rarity: 'rare',      icon: '🐍' },
  { name: 'Moon Fairy',     rarity: 'rare',      icon: '🧚' },
  { name: 'Void Knight',    rarity: 'epic',      icon: '⚔️' },
  { name: 'Crystal Dragon', rarity: 'epic',      icon: '🐉' },
  { name: 'Celestial Phoenix', rarity: 'legendary', icon: '🦅' },
  { name: 'Eternal Titan',  rarity: 'legendary', icon: '👑' },
];

// ── Pack definitions ─────────────────────────────────────────────────────────
const PACKS = [
  { id: 'basic',     name: 'Basic Pack',     icon: '📦', cost: 100, currency: 'soft' as const, desc: 'Common & Rare cards', draws: 1,
    weights: { common: 70, rare: 25, epic: 5, legendary: 0 } },
  { id: 'premium',   name: 'Premium Pack',   icon: '🎁', cost: 300, currency: 'soft' as const, desc: 'Higher rare chance', draws: 1,
    weights: { common: 40, rare: 40, epic: 18, legendary: 2 } },
  { id: 'legendary', name: 'Legendary Pack', icon: '🌟', cost: 20,  currency: 'hard' as const, desc: 'Guaranteed Epic+', draws: 1,
    weights: { common: 0, rare: 20, epic: 60, legendary: 20 } },
  { id: 'multi',     name: '10x Multi Draw', icon: '💫', cost: 800, currency: 'soft' as const, desc: '10 cards at once!', draws: 10,
    weights: { common: 50, rare: 35, epic: 13, legendary: 2 } },
];

// ── Synthesis recipes ────────────────────────────────────────────────────────
const RECIPES = [
  { id: 'normal',    name: 'Normal Synthesis',    desc: '3 identical cards → 1 Rare',     rate: 100, cost: 3, outputRarity: 'rare' as const,      icon: '🔮' },
  { id: 'advanced',  name: 'Advanced Synthesis',  desc: '3 any cards → 1 Epic',           rate: 70,  cost: 3, outputRarity: 'epic' as const,      icon: '⚗️' },
  { id: 'gambler',   name: "Gambler's Synthesis",  desc: '2 any cards → 1 Epic (risky)',   rate: 50,  cost: 2, outputRarity: 'epic' as const,      icon: '🎲' },
  { id: 'legendary', name: 'Legendary Synthesis', desc: '5 Epic cards → 1 Legendary',     rate: 30,  cost: 5, outputRarity: 'legendary' as const, icon: '✨' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }

function weightedRandom(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    r -= w; if (r <= 0) return key;
  }
  return Object.keys(weights)[0];
}

function drawCard(weights: Record<string, number>, luckBoost = 0): Card {
  const boostedWeights = { ...weights };
  if (luckBoost > 0 && boostedWeights.legendary !== undefined) {
    const boost = Math.min(luckBoost * 0.5, 10);
    boostedWeights.legendary = (boostedWeights.legendary || 0) + boost;
  }
  const rarity = weightedRandom(boostedWeights) as Card['rarity'];
  const pool = CARD_POOL.filter(c => c.rarity === rarity);
  const template = pool[Math.floor(Math.random() * pool.length)] || CARD_POOL[0];
  return { ...template, id: uid() };
}

function toast(msg: string) {
  const el = document.getElementById('toast')!;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function updateCurrencyDisplay() {
  document.getElementById('soft-currency')!.textContent = state.softCurrency.toString();
  document.getElementById('hard-currency')!.textContent = state.hardCurrency.toString();
  document.getElementById('luck-value')!.textContent = state.luckValue.toString();
}

// ── Render packs ─────────────────────────────────────────────────────────────
function renderPacks() {
  const grid = document.getElementById('packs-grid')!;
  grid.innerHTML = PACKS.map(p => `
    <div class="pack-card" data-pack="${p.id}">
      <div class="pack-icon">${p.icon}</div>
      <h3>${p.name}</h3>
      <div class="pack-cost">${p.cost} ${p.currency === 'soft' ? '🪙' : '💎'}</div>
      <div class="pack-desc">${p.desc}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.pack-card').forEach(el => {
    el.addEventListener('click', () => {
      const pack = PACKS.find(p => p.id === (el as HTMLElement).dataset.pack)!;
      purchasePack(pack);
    });
  });
}

function purchasePack(pack: typeof PACKS[0]) {
  if (pack.currency === 'soft' && state.softCurrency < pack.cost) {
    toast('❌ Not enough coins!'); return;
  }
  if (pack.currency === 'hard' && state.hardCurrency < pack.cost) {
    toast('❌ Not enough gems!'); return;
  }

  if (pack.currency === 'soft') state.softCurrency -= pack.cost;
  else state.hardCurrency -= pack.cost;

  const drawn: Card[] = [];
  for (let i = 0; i < pack.draws; i++) {
    // Pity: guarantee epic+ after 50 draws
    const pityWeights = state.drawCount >= 50
      ? { ...pack.weights, common: 0, rare: 0, epic: Math.max(pack.weights.epic, 70), legendary: Math.max(pack.weights.legendary, 30) }
      : pack.weights;
    const card = drawCard(pityWeights, state.luckValue);
    drawn.push(card);
    state.inventory.push(card);
    state.drawCount++;
    if (card.rarity === 'legendary') { state.luckValue = 0; state.drawCount = 0; }
    else state.luckValue = Math.min(state.luckValue + 1, 100);
  }

  updateCurrencyDisplay();
  showDrawResult(drawn);
}

// ── Draw result overlay ───────────────────────────────────────────────────────
function showDrawResult(cards: Card[]) {
  const overlay = document.getElementById('draw-overlay')!;
  const container = document.getElementById('drawn-cards-container')!;
  container.innerHTML = cards.map((c, i) => `
    <div class="drawn-card ${c.rarity}" style="animation-delay:${i * 0.08}s">
      <div class="card-icon">${c.icon}</div>
      <div class="card-name">${c.name}</div>
      <div class="card-rarity">${c.rarity}</div>
    </div>
  `).join('');
  overlay.classList.add('show');

  const hasLegendary = cards.some(c => c.rarity === 'legendary');
  if (hasLegendary) toast('🌟 LEGENDARY CARD OBTAINED!');
  else if (cards.some(c => c.rarity === 'epic')) toast('⚔️ Epic card!');
}

document.getElementById('close-draw-overlay')!.addEventListener('click', () => {
  document.getElementById('draw-overlay')!.classList.remove('show');
  renderInventory();
});

// ── Inventory ────────────────────────────────────────────────────────────────
function renderInventory() {
  const grid = document.getElementById('inventory-grid')!;
  if (state.inventory.length === 0) {
    grid.innerHTML = '<div class="empty-state">No cards yet — go draw some!</div>';
    return;
  }
  const sorted = [...state.inventory].sort((a, b) => {
    const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return order[a.rarity] - order[b.rarity];
  });
  grid.innerHTML = sorted.map(c => `
    <div class="inv-card ${c.rarity}">
      <div class="card-icon">${c.icon}</div>
      <div class="card-name">${c.name}</div>
      <div class="card-rarity">${c.rarity}</div>
    </div>
  `).join('');
}

// ── Synthesis ────────────────────────────────────────────────────────────────
function renderSynthesis() {
  const section = document.getElementById('synth-section')!;
  section.innerHTML = RECIPES.map(r => {
    const canAfford = state.inventory.length >= r.cost;
    const actualRate = state.consecutiveFailures >= 3 ? Math.min(r.rate + 10, 100) : r.rate;
    return `
      <div class="synth-recipe">
        <h3>${r.icon} ${r.name}</h3>
        <p>${r.desc}</p>
        <div class="rate">Success: ${actualRate}%${state.consecutiveFailures >= 3 ? ' (+10% protection)' : ''}</div>
        <p style="color:#6050a0;font-size:0.8rem">Requires ${r.cost} cards from inventory</p>
        <button data-recipe="${r.id}" ${canAfford ? '' : 'disabled title="Not enough cards"'}>
          Synthesize
        </button>
      </div>
    `;
  }).join('');

  section.querySelectorAll('button[data-recipe]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipe = RECIPES.find(r => r.id === (btn as HTMLElement).dataset.recipe)!;
      performSynthesis(recipe);
    });
  });
}

function performSynthesis(recipe: typeof RECIPES[0]) {
  if (state.inventory.length < recipe.cost) {
    toast(`❌ Need ${recipe.cost} cards to synthesize`); return;
  }

  // Consume cards
  state.inventory.splice(0, recipe.cost);

  const actualRate = state.consecutiveFailures >= 3 ? Math.min(recipe.rate + 10, 100) : recipe.rate;
  const success = Math.random() * 100 < actualRate;

  if (success) {
    const pool = CARD_POOL.filter(c => c.rarity === recipe.outputRarity);
    const template = pool[Math.floor(Math.random() * pool.length)];
    const newCard: Card = { ...template, id: uid() };
    state.inventory.push(newCard);
    state.consecutiveFailures = 0;
    toast(`✅ Synthesis succeeded! Got ${newCard.icon} ${newCard.name}`);
  } else {
    state.consecutiveFailures++;
    const protection = state.consecutiveFailures >= 3 ? ' (failure protection active!)' : '';
    toast(`💥 Synthesis failed — cards consumed${protection}`);
  }

  renderSynthesis();
  renderInventory();
}

// ── Leaderboard (demo data) ───────────────────────────────────────────────────
function renderLeaderboard() {
  const players = [
    { name: 'DragonMaster99', score: 48200, legendaries: 12 },
    { name: 'CardWizard',     score: 41500, legendaries: 9  },
    { name: 'MysticCollector',score: 38900, legendaries: 8  },
    { name: 'You',            score: calcPlayerScore(), legendaries: state.inventory.filter(c => c.rarity === 'legendary').length },
    { name: 'StarSeeker',     score: 22100, legendaries: 4  },
  ].sort((a, b) => b.score - a.score);

  const tbody = document.getElementById('leaderboard-body')!;
  tbody.innerHTML = players.map((p, i) => `
    <tr class="${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}">
      <td>${i + 1}</td>
      <td>${p.name === 'You' ? '<strong style="color:#c8a0ff">You</strong>' : p.name}</td>
      <td>${p.score.toLocaleString()}</td>
      <td>${p.legendaries} 🌟</td>
    </tr>
  `).join('');
}

function calcPlayerScore() {
  return state.inventory.reduce((sum, c) => {
    return sum + ({ common: 10, rare: 50, epic: 200, legendary: 1000 }[c.rarity] || 0);
  }, 0);
}

// ── Season / Missions (demo) ──────────────────────────────────────────────────
const missions = [
  { id: 'm1', name: 'Draw 3 cards',       reward: '50 🪙', target: 3,  type: 'draws',     claimed: false },
  { id: 'm2', name: 'Collect a Rare card', reward: '100 🪙', target: 1, type: 'rare',      claimed: false },
  { id: 'm3', name: 'Attempt Synthesis',   reward: '30 🪙',  target: 1, type: 'synthesis', claimed: false },
];

function renderSeason() {
  const xp = Math.min(state.inventory.length * 10, 1000);
  const level = Math.floor(xp / 100) + 1;
  const progress = (xp % 100);

  const missionProgress = {
    draws: state.drawCount,
    rare: state.inventory.filter(c => c.rarity !== 'common').length,
    synthesis: state.consecutiveFailures > 0 || state.inventory.some(c => c.rarity === 'rare') ? 1 : 0,
  };

  document.getElementById('season-content')!.innerHTML = `
    <div class="season-card">
      <h3>🌟 Season 1: Mystic Origins</h3>
      <p style="color:#8070a0;font-size:0.85rem">Battle Pass Level ${level}</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <p style="color:#6050a0;font-size:0.8rem">${xp % 100}/100 XP to next level</p>
    </div>
    <div class="season-card">
      <h3>📋 Daily Missions</h3>
      <div class="missions-list">
        ${missions.map(m => {
          const prog = missionProgress[m.type as keyof typeof missionProgress] || 0;
          const done = prog >= m.target;
          return `
            <div class="mission-item">
              <div>
                <div class="mission-name">${m.name}</div>
                <div style="color:#6050a0;font-size:0.75rem">${Math.min(prog, m.target)}/${m.target}</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="mission-reward">${m.reward}</span>
                <button data-mission="${m.id}" ${!done || m.claimed ? 'disabled' : ''}>
                  ${m.claimed ? '✓ Done' : done ? 'Claim' : 'In Progress'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('button[data-mission]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = missions.find(x => x.id === (btn as HTMLElement).dataset.mission)!;
      if (!m.claimed) { m.claimed = true; state.softCurrency += 50; updateCurrencyDisplay(); toast('🎉 Mission reward claimed!'); renderSeason(); }
    });
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
const pages: Record<string, () => void> = {
  packs: renderPacks,
  inventory: renderInventory,
  synthesis: renderSynthesis,
  leaderboard: renderLeaderboard,
  season: renderSeason,
};

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    const pageId = (btn as HTMLElement).dataset.page!;
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${pageId}`)!.classList.add('active');
    pages[pageId]?.();
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
renderPacks();
updateCurrencyDisplay();
