# 設計文件：秘境防御战模式（Battle Defense Mode）

## 概覽

「秘境防御战」是純客戶端塔防模式，整合至現有《卡片秘境》單機架構。所有邏輯運行於瀏覽器，透過 IndexedDB 持久化，無需後端。

---

## 系統架構

```
client/src/
├── game/battle/
│   ├── BattleTypes.ts          # 核心型別定義
│   ├── BattleFSM.ts            # 有限狀態機
│   ├── BattleEngine.ts         # 遊戲迴圈與核心邏輯
│   ├── GuardianFactory.ts      # 守衛屬性工廠
│   ├── ObjectPool.ts           # 泛型物件池
│   ├── DeckValidator.ts        # 套牌驗證
│   ├── GameModeManager.ts      # 遊戲模式管理
│   ├── RewardCalculator.ts     # 獎勵計算
│   ├── BattleSerializer.ts     # 狀態序列化
│   └── PerformanceManager.ts   # 效能管理
└── components/battle/
    ├── DeckSelectPage.tsx       # 套牌選擇介面
    ├── BattleGrid.tsx           # 戰場網格渲染
    ├── BattleHUD.tsx            # 戰鬥抬頭顯示
    ├── BattleResultScreen.tsx   # 結算畫面
    └── BattlePage.tsx           # 主戰鬥頁面（整合）
```

---

## 核心型別（BattleTypes.ts）

```typescript
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
type Element = 'fire' | 'ice' | 'nature' | 'light' | 'shadow';
type SkillType = 'single' | 'aoe' | 'slow' | 'summon' | 'sp_regen' | 'special' | 'ultimate';
type BattleMode = 'daily_challenge' | 'endless' | 'boss_rush';

interface Guardian {
  id: string;           // 卡牌 ID
  cardId: string;
  level: number;        // 1–5
  rarity: Rarity;
  element: Element;
  attack: number;
  hp: number;
  maxHp: number;
  range: number;        // 格子數
  attackSpeed: number;  // 攻擊間隔（ms）
  skillType: SkillType;
  mythicUsed?: boolean; // 神話大招是否已使用
  gridX: number;
  gridY: number;
}

interface Enemy {
  id: string;
  hp: number;
  maxHp: number;
  speed: number;        // 格/秒
  reward: number;       // 擊殺 SP
  gridX: number;
  gridY: number;
  isBoss: boolean;
}

interface GridCell {
  x: number;
  y: number;
  guardian: Guardian | null;
}

interface BattleState {
  mode: BattleMode;
  wave: number;
  playerHp: number;
  sp: number;
  grid: GridCell[][];
  enemies: Enemy[];
  deck: Deck;
  activeBonuses: SeriesBonus[];
  rewards: BattleReward[];
}

interface Deck {
  cards: string[];      // 卡牌 ID 陣列，5–8 張
}

interface SeriesBonus {
  series: string;
  attackBonus: number;  // 0.1 = +10%
}

interface BattleReward {
  type: 'coin' | 'ticket' | 'material';
  amount: number;
  reason: string;
}
```

---

## 有限狀態機（BattleFSM）

### 狀態圖

```
Idle ──► Preparing ──► Fighting ──► BetweenWaves ──► Fighting
                           │               │
                           │               ├──► BossFight ──► BetweenWaves
                           │               │
                           │               └──► Victory
                           └──────────────────► Defeat
```

### 合法轉換表

| 來源狀態       | 目標狀態       | 觸發條件               |
|--------------|--------------|----------------------|
| Idle         | Preparing    | 玩家確認進入戰鬥         |
| Preparing    | Fighting     | 倒數結束               |
| Fighting     | BetweenWaves | 本波所有敵人消滅/到達終點  |
| Fighting     | Defeat       | 玩家 HP = 0           |
| BetweenWaves | Fighting     | 下一波開始              |
| BetweenWaves | BossFight    | 波數為 5 的倍數         |
| BetweenWaves | Victory      | Daily_Challenge 通關  |
| BossFight    | BetweenWaves | Boss 被擊敗            |
| BossFight    | Defeat       | 玩家 HP = 0           |

### 實作要點

- 非法轉換：`console.warn` 並忽略，不拋出例外
- 每次轉換觸發 `onExit(prevState)` 與 `onEnter(nextState)` 回調
- `toJSON()` / `fromJSON()` 支援往返序列化

---

## 守衛工廠（GuardianFactory）

### 稀有度基礎屬性

| 稀有度    | 攻擊力 | 生命值 | 射程 | 攻速(ms) | 技能類型          |
|---------|------|------|-----|---------|-----------------|
| common  | 10   | 100  | 2   | 1000    | single          |
| rare    | 18   | 160  | 3   | 900     | aoe / slow      |
| epic    | 28   | 240  | 3   | 800     | summon / sp_regen |
| legendary | 45 | 380  | 4   | 700     | special         |
| mythic  | 80   | 600  | 5   | 600     | ultimate (×1/場) |

### 等級加成公式

```
attack(level) = baseAttack × (1 + 0.5 × (level - 1))
hp(level)     = baseHp     × (1 + 0.5 × (level - 1))
```

### 系列元素映射

| 系列      | 元素    |
|---------|-------|
| 原始火山  | fire  |
| 寒冰紀元  | ice   |
| 神秘森林  | nature |
| 光明聖域  | light |
| 暗影深淵  | shadow |

---

## 物件池（ObjectPool）

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  acquire(): T { /* 從池取出或動態擴充 */ }
  release(obj: T): void { /* 歸還至池 */ }
}
```

- Enemy 池容量：單波最大敵人數 × 2
- 子彈池容量：Guardian 上限（20）× 3 = 60
- 容量不足時動態擴充，不丟棄請求

---

## 遊戲迴圈（BattleEngine）

### Tick 流程（requestAnimationFrame）

```
tick(deltaTime):
  1. 移動所有 Enemy（speed × deltaTime）
  2. 檢查 Enemy 到達終點 → 扣 HP，歸還物件池
  3. 批次處理 Guardian 攻擊判定（射程內最近 Enemy）
  4. 處理子彈命中 → 扣 Enemy HP，死亡給 SP
  5. 檢查波次結束條件 → 觸發 FSM 轉換
  6. 更新 React state（throttle 至 60fps）
```

### 波次難度公式

```
enemyCount(wave) = baseCount + floor(wave × 1.5)
enemyHp(wave)    = baseHp × (1.1 ^ wave)
```

### SP 系統

- 初始 SP = 10 + floor(galleryScore / 100) × 10
- 擊殺普通敵人：+1 SP；擊殺 Boss：+5 SP
- 召喚守衛費用：依稀有度（common=2, rare=3, epic=5, legendary=8, mythic=15）

---

## 套牌驗證（DeckValidator）

```typescript
validate(cardIds: string[], collection: Card[]): ValidationResult {
  // 1. 長度 5–8
  // 2. 神話卡 ≤ 1
  // 3. 所有卡牌存在於收藏中
  // 回傳 { valid: boolean, errors: string[] }
}
```

---

## 遊戲模式（GameModeManager）

### Daily Challenge
- localStorage key：`battle_daily_{YYYY-MM-DD}`
- 完成後寫入時間戳，同日再進入計算剩餘重置時間（隔日 00:00 重置）
- 固定波數：20 波

### Endless Mode
- 無波數上限，HP 歸零結束
- 里程碑：10 / 25 / 50 / 100 波

### Boss Rush
- 每波僅生成 Boss，無普通敵人
- Boss HP 與攻擊力依波數遞增

---

## 獎勵計算（RewardCalculator）

| 條件                        | 獎勵                    |
|---------------------------|------------------------|
| 任意模式完成（依存活波數）     | 金幣 = wave × 10        |
| Daily Challenge 勝利        | +1 抽卡券               |
| Endless 里程碑（10/25/50/100）| 稀有材料 ×1             |
| Boss 擊殺（即時）            | 金幣 50 或抽卡券 ×1（隨機）|

獎勵透過 `gameStore.softCurrency` 寫入，並呼叫 `dataService.saveGameState()` 持久化。

---

## 戰鬥狀態序列化（BattleSerializer）

```typescript
serialize(state: BattleState): string          // → JSON
deserialize(json: string): BattleState | Error // 格式錯誤回傳 Error
prettyPrint(state: BattleState): string        // JSON.stringify(state, null, 2)
```

- 缺少必要欄位時，錯誤訊息列出所有缺少欄位名稱
- 往返屬性：`deserialize(serialize(s))` 等價於 `s`

---

## 效能管理（PerformanceManager）

```typescript
isMobile(): boolean  // 螢幕寬度 < 768px || /Mobi/i.test(navigator.userAgent)
getParticleLimit(): number  // mobile: 50, desktop: 100
getGuardianLimit(): number  // 20（固定）
```

---

## 界面布局設計（需求 18、19）

### 分層架構：Three.js 場景 vs React UI

戰鬥界面採用 **Three.js + React 混合架構**，職責明確分離：

| 層級 | 技術 | 職責 |
|------|------|------|
| EnemyPathScene | Three.js（獨立 renderer） | 敵人路徑 mesh、敵人模型、攻擊特效 |
| PlayerBoardScene | Three.js（獨立 renderer） | 棋盤格子、守衛單位、合成動畫 |
| ControlPanel | React HTML/CSS | 召喚按鈕、商店、骰子合成控件、HUD 數值 |

每個 Three.js 區域擁有獨立的 `WebGLRenderer`，互不干擾：

```typescript
renderer.setSize(containerWidth, containerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
```

### GameLayout 組件結構

```
GameLayout（flex column，100vw × 100vh）
├── EnemyPathScene（Three.js canvas，height: 35%）
│     ├── Path mesh（CatmullRomCurve3 + TubeGeometry 或 Line）
│     ├── Enemy models（沿曲線行進）
│     └── 攻擊特效（粒子系統）
└── BottomArea（flex row，height: 65%）
      ├── PlayerBoardScene（Three.js canvas，flex: 7 ≈ 70%）
      │     ├── 5×3 Grid（PlaneGeometry，cellSize=1，gap=0.1）
      │     ├── Dice units（守衛模型）
      │     └── Merge animations（合成升級特效）
      └── ControlPanel（React HTML UI，flex: 3 ≈ 30%）
            ├── 召喚按鈕（⚡N SP）
            ├── 商店 / 骰子合成控件
            └── Series_Bonus 標籤、天賦標籤
```

### CSS 布局規格

```css
.game-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.enemy-path {
  height: 35%;          /* EnemyPathScene */
}

.bottom-area {
  height: 65%;
  display: flex;
}

.player-board {
  flex: 7;              /* ≈ 70% 寬度，PlayerBoardScene */
}

.control-panel {
  flex: 3;              /* ≈ 30% 寬度，ControlPanel React UI */
}
```

### Three.js 場景設置規格

**EnemyPathScene**
- 獨立 `WebGLRenderer`，掛載至 `.enemy-path` 容器
- 路徑：`CatmullRomCurve3` 定義曲線控制點，以 `TubeGeometry` 或 `Line` 渲染可見路徑 mesh
- 敵人模型沿曲線的 `pathProgress`（0–1）插值移動：`curve.getPoint(pathProgress)`
- 特效：粒子系統（`Points` + `BufferGeometry`），移動端限制至桌面版 50%

**PlayerBoardScene**
- 獨立 `WebGLRenderer`，掛載至 `.player-board` 容器
- 5×3 Grid：每格以 `PlaneGeometry(cellSize, cellSize)` 建立，`cellSize=1`，格間距 `gap=0.1`
- 格子世界座標：`x = col × (cellSize + gap)`，`y = row × (cellSize + gap)`
- 守衛單位（Dice units）：每格放置對應稀有度的 3D 模型或 Sprite
- 合成動畫：升級時播放粒子爆發特效（複用 `SynthesisEffect`）

### 響應式斷點

| 斷點 | 條件 | 布局調整 |
|------|------|---------|
| Desktop | 寬度 > 1200px | 標準布局，格子 ≥ 100×100px |
| Tablet | 768px–1199px | 標準布局，格子等比縮放 |
| Mobile | 寬度 < 768px | `.bottom-area` 改為 `flex-direction: column`；`.player-board` 高度 60%；`.control-panel` 高度 40%；格子 ≥ 60×60px |

移動端 CSS 覆寫：

```css
@media (max-width: 767px) {
  .bottom-area {
    flex-direction: column;
  }
  .player-board {
    flex: none;
    height: 60%;
  }
  .control-panel {
    flex: none;
    height: 40%;
  }
}
```

### 按鈕觸控規格

| 裝置類型 | 最小尺寸 | 間距 |
|--------|---------|------|
| 桌面端（≥ 768px） | 48×48px | 8px |
| 移動端（< 768px） | 56×56px | 8px |

適用範圍：召喚、合成、升級、確認、取消等所有可交互按鈕（`min-width: 48px; min-height: 48px; gap: 8px`）。

---

## UI 元件設計

### DeckSelectPage
- 顯示玩家收藏（複用 `GalleryGrid` 樣式）
- 點擊卡牌加入/移除套牌，即時顯示驗證錯誤
- 顯示 Gallery_Score 初始 SP 加成預覽

### BattleGrid（Three.js PlayerBoardScene + React overlay）

`BattleGrid` 包含兩層：

**PlayerBoardScene（Three.js canvas）**
- 以 `WebGLRenderer` 渲染 5×3 棋盤格子（`PlaneGeometry`，`cellSize=1`，`gap=0.1`）
- 每格渲染守衛 Sprite 或 3D 模型、等級徽章、HP 百分比條
- 點擊事件透過 `Raycaster` 偵測格子，觸發 React 層的操作 Modal

**React overlay（HTML/CSS）**
- 操作 Modal（穩定升級 / 隨機合成）以絕對定位疊加於 canvas 上
- 移動端按鈕尺寸放大至 ≥ 56×56px，間距 8px

### BattleHUD（React HTML UI，ControlPanel 區域）
- 頂部狀態欄：❤️ HP | ⚡ SP | 💰 Coins | 🌊 Wave N | ⏱ 倒數
- 底部標籤列：🎯 天賦名稱與效果 | Series_Bonus 標籤列表
- 「召喚守衛」按鈕：點擊觸發 Random_Summon（需求 13），顯示當前召喚費用（⚡N SP）
- 神話大招按鈕（已使用時 `disabled` + 提示）
- 所有按鈕 `min-width: 48px; min-height: 48px; gap: 8px`

### BattleResultScreen
- 勝利/失敗標題
- 獎勵明細列表
- 最高波數紀錄（與本場對比）
- 「再來一場」/ 「返回主頁」按鈕

---

## 整合點

- `App.tsx`：新增 `'battle'` 頁面路由
- `Layout.tsx`：導覽列加入「⚔️ 防御战」
- `HomePage.tsx`：快捷入口卡片
- `gameStore`：讀取 `softCurrency`、`collection`、`galleryScore`
- `IndexedDBDataService`：獎勵持久化

---

## 正確性屬性（Correctness Properties）

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 非法 FSM 轉換不改變狀態

*For any* BattleFSM state and any illegal transition request, the state after the request should equal the state before the request.

**Validates: Requirements 10.3**

### Property 2: FSM 序列化往返等價

*For any* valid BattleFSM state object, serializing then deserializing should produce an equivalent state object.

**Validates: Requirements 10.7**

### Property 3: 守衛等級加成單調遞增

*For any* guardian rarity and any two levels L1 < L2, the attack and HP values at L2 should be strictly greater than at L1.

**Validates: Requirements 4.4**

### Property 4: 物件池 acquire/release 不丟失物件

*For any* sequence of acquire and release operations on an ObjectPool, the total number of objects (in-use + in-pool) should remain constant.

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 5: 套牌驗證正確性

*For any* card list of length 5–8 with at most 1 mythic card, DeckValidator should return valid=true; for any list violating these constraints, it should return valid=false with non-empty errors.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 6: 戰鬥狀態序列化往返等價

*For any* valid BattleState object, serializing then deserializing should produce an equivalent BattleState object.

**Validates: Requirements 12.5**

### Property 7: 獎勵單調性

*For any* two wave counts W1 < W2, the wave reward for W2 should be greater than or equal to the wave reward for W1.

**Validates: Requirements 9.1**

### Property 8: 隨機召喚種類在 Deck 範圍內

*For any* Deck and any Random_Summon result, the summoned guardian's cardId should be one of the card IDs in the Deck.

**Validates: Requirements 13.1, 13.2**

### Property 9: 隨機合成結果等級與種類約束

*For any* two guardians of the same level L (where L < 5) and any Deck, the result of randomSynthesis should have level = L + 1 and a cardId that is one of the card IDs in the Deck.

**Validates: Requirements 14.1, 14.2**

### Property 10: 天賦抽取互不重複

*For any* talent pool of size ≥ 3, drawing 3 talents should always produce 3 distinct talent IDs.

**Validates: Requirements 17.7**

### Property 11: 攻擊型守衛可攻擊全圖任意敵人

*For any* attack-type guardian (skillType ∈ {single, aoe, special, ultimate}) and any enemy position on the grid, the guardian's selectTarget function should be able to return that enemy as a valid target.

**Validates: Requirements 15.1**

### Property 12: 布局比例符合規格

*For any* rendered GameLayout, the EnemyPathScene container height should be 35% ±5% of total viewport height, and the PlayerBoardScene (`.player-board`) width should be greater than the ControlPanel (`.control-panel`) width.

**Validates: Requirements 18.2, 18.3**

### Property 13: 敵人始終在曲線路徑上且不溢出場景

*For any* enemy with a `pathProgress` value in [0, 1], its world position computed via `CatmullRomCurve3.getPoint(pathProgress)` should lie within the EnemyPathScene bounds and never overflow outside the scene viewport.

**Validates: Requirements 5.1, 5.2, 18.3**

### Property 14: 移動端布局垂直排列且按鈕符合最小尺寸

*For any* viewport width < 768px, the `.bottom-area` flex direction should be `column`, and all interactive buttons should have a touch target area ≥ 44×44px (desktop ≥ 48×48px, mobile ≥ 56×56px).

**Validates: Requirements 19.3, 19.4**

---

## 屬性測試模組對照表

| 模組              | 屬性                                      |
|-----------------|------------------------------------------|
| BattleFSM       | 非法轉換不改變狀態；JSON 往返等價（Property 1, 2）|
| GuardianFactory | 等級加成單調遞增；屬性值 > 0（Property 3）      |
| ObjectPool      | acquire/release 不丟失物件；動態擴充正確（Property 4）|
| DeckValidator   | 5–8 張且 ≤1 神話 → valid；否則 → errors 非空（Property 5）|
| BattleSerializer| 往返屬性；格式錯誤回傳 Error 而非拋出例外（Property 6）|
| RewardCalculator| 波數越高獎勵越多（單調性）（Property 7）         |
| RandomSummon    | 隨機召喚結果種類始終在 Deck 範圍內（Property 8） |
| RandomSynthesis | 合成結果等級 = 原等級 + 1，種類在 Deck 範圍內（Property 9）|
| TalentSystem    | 抽取的 3 個天賦互不重複（Property 10）          |
| GlobalAttack    | 攻擊型守衛始終能攻擊到任意位置的敵人（Property 11）|
| BattleHUD       | 頂部狀態欄數值與戰鬥狀態一致（Property 12）      |
| BattleGrid/CSS  | EnemyPath 35% 高度、Board 寬度 > Control 寬度（Property 12）；敵人始終在曲線上不溢出（Property 13）|
| 所有按鈕         | 移動端垂直布局且觸控區域符合最小規格（Property 14）|

---

## Random Dice 核心機制擴充（需求 13–17）

### 型別擴充（BattleTypes.ts）

```typescript
// 新增天賦類型
type TalentType = 'sp_bonus' | 'attack_speed' | 'first_wave_reduction' | 'synthesis_luck' | 'coin_harvest';

// 新增天賦介面
interface Talent {
  id: string;
  name: string;
  description: string;
  type: TalentType;
  value: number;  // 效果數值（如 20 代表 +20 SP，0.1 代表 +10%）
}

// Guardian.range 改為可選（攻擊型守衛不使用射程限制）
interface Guardian {
  // ... 現有欄位 ...
  range?: number;  // 輔助型守衛使用；攻擊型守衛設為 Infinity 或省略
}

// BattleState 新增欄位
interface BattleState {
  // ... 現有欄位 ...
  activeTalent: Talent | null;  // 本場選擇的天賦
  coins: number;                // 金幣（雙軌成長系統）
}
```

---

### 隨機召喚服務（RandomSummonService）

**需求 13：召喚隨機性**

```typescript
interface SummonResult {
  guardian: Guardian;
  position: { x: number; y: number };
}

class RandomSummonService {
  // 從 Deck 隨機抽取種類，從空格隨機選取位置
  randomSummon(deck: Deck, grid: GridCell[][], sp: number): SummonResult | null
  
  // 合成後從 Deck 隨機抽取種類（需求 14）
  randomSynthesis(guardian1: Guardian, guardian2: Guardian, deck: Deck): Guardian
  
  private getEmptyCells(grid: GridCell[][]): GridCell[]
  private pickRandom<T>(arr: T[]): T
}
```

**召喚流程：**

```
randomSummon(deck, grid, sp):
  1. 從 deck.cards 隨機抽取一個 cardId
  2. 取得 grid 中所有空格 emptyCells
  3. IF emptyCells 為空 → 回傳 null（觸發「戰場已滿」提示）
  4. 從 emptyCells 隨機選取一格 position
  5. 呼叫 GuardianFactory.create(cardId, position) 建立 Guardian
  6. 回傳 { guardian, position }
```

**合成隨機換種類流程（需求 14）：**

```
randomSynthesis(guardian1, guardian2, deck):
  1. 確認 guardian1.level === guardian2.level（前置條件）
  2. 從 deck.cards 隨機抽取一個 cardId（可能與原種類相同，視為合法）
  3. newLevel = guardian1.level + 1
  4. IF newLevel > 5 → 拒絕，提示「已達最高等級」
  5. 呼叫 GuardianFactory.create(cardId, guardian1.position, newLevel)
  6. 回傳新 Guardian（種類隨機，等級 +1）
```

---

### 全圖攻擊（GuardianFactory 擴充）

**需求 15：攻擊型守衛無射程限制**

```typescript
// 判斷是否為攻擊型守衛
isAttackType(skillType: SkillType): boolean {
  return ['single', 'aoe', 'special', 'ultimate'].includes(skillType);
}

// 建立守衛時設定射程
create(cardId, position, level?): Guardian {
  const base = BASE_STATS[rarity];
  const range = isAttackType(base.skillType) ? Infinity : base.range;
  // ...
}
```

**攻擊目標選擇邏輯（BattleEngine 更新）：**

```
selectTarget(guardian, enemies):
  IF isAttackType(guardian.skillType):
    // 全圖攻擊：優先攻擊距終點最近（gridX 最大）的敵人
    RETURN enemies.sort(e => e.gridX DESC)[0]
  ELSE:
    // 輔助型：僅攻擊射程內最近的目標
    inRange = enemies.filter(e => distance(guardian, e) <= guardian.range)
    RETURN inRange.sort(e => distance(guardian, e) ASC)[0]
```

---

### 天賦系統（TalentSystem）

**需求 17：Roguelike 隨機天賦**

```typescript
// 天賦池定義（至少 5 種）
const TALENT_POOL: Talent[] = [
  { id: 'sp_bonus',            name: '初始 SP 加成',  type: 'sp_bonus',            value: 20,   description: '戰鬥開始時額外獲得 20 點 SP' },
  { id: 'attack_speed',        name: '攻速強化',      type: 'attack_speed',        value: 0.1,  description: '所有 Guardian 攻擊速度提升 10%' },
  { id: 'first_wave_reduction',name: '首波減員',      type: 'first_wave_reduction',value: 0.3,  description: '第一波敵人數量減少 30%' },
  { id: 'synthesis_luck',      name: '合成幸運',      type: 'synthesis_luck',      value: 0.2,  description: '合成時有 20% 機率保留原守衛種類' },
  { id: 'coin_harvest',        name: '金幣豐收',      type: 'coin_harvest',        value: 5,    description: '每波結束後額外獲得 wave × 5 金幣' },
];

class TalentSystem {
  // 從天賦池隨機抽取 count 個不重複天賦
  drawTalents(pool: Talent[], count: number): Talent[]
  
  // 將天賦效果套用至戰鬥狀態
  applyTalent(talent: Talent, battleState: BattleState): BattleState
}
```

**天賦效果套用邏輯：**

```
applyTalent(talent, battleState):
  SWITCH talent.type:
    CASE 'sp_bonus':
      battleState.sp += talent.value  // +20 SP
    CASE 'attack_speed':
      // 所有 Guardian attackSpeed × (1 - talent.value)（間隔縮短 = 速度提升）
      FOR each guardian IN battleState.grid:
        guardian.attackSpeed *= (1 - talent.value)
    CASE 'first_wave_reduction':
      // 標記首波減員，由 BattleEngine 在生成第 1 波時套用
      battleState.firstWaveReduction = talent.value
    CASE 'synthesis_luck':
      // 標記合成幸運機率，由 RandomSummonService.randomSynthesis 套用
      battleState.synthesisLuckChance = talent.value
    CASE 'coin_harvest':
      // 標記每波金幣加成，由 RewardCalculator 在波次結束時套用
      battleState.coinHarvestBonus = talent.value
  RETURN battleState
```

**天賦選擇流程（戰鬥準備階段）：**

```
Preparing 狀態進入時：
  1. drawTalents(TALENT_POOL, 3) → 取得 3 個不重複天賦
  2. 顯示天賦選擇 UI（3 張天賦卡，玩家必選 1 個）
  3. 玩家選擇後 → applyTalent(selected, battleState)
  4. 更新 battleState.activeTalent = selected
  5. 才允許進入 Fighting 狀態
```

---

### 雙軌成長系統（需求 16）

**金幣升級費用表：**

| 當前等級 → 目標等級 | 費用（金幣） |
|-----------------|------------|
| 1 → 2           | 50         |
| 2 → 3           | 100        |
| 3 → 4           | 200        |
| 4 → 5           | 400        |

```typescript
const UPGRADE_COST: Record<number, number> = {
  1: 50,
  2: 100,
  3: 200,
  4: 400,
};

// 金幣升級（穩定路徑）
coinUpgrade(guardian: Guardian, battleState: BattleState): BattleState | Error {
  const cost = UPGRADE_COST[guardian.level];
  if (!cost) return new Error('已達最高等級');
  if (battleState.coins < cost) return new Error(`金幣不足，需要 ${cost} 金幣`);
  battleState.coins -= cost;
  guardian.level += 1;
  // 重新計算屬性
  guardian.attack = GuardianFactory.calcAttack(guardian.rarity, guardian.level);
  guardian.hp = guardian.maxHp = GuardianFactory.calcHp(guardian.rarity, guardian.level);
  return battleState;
}
```

**BattleGrid UI 互動設計（格子點擊選項）：**

```
點擊已有守衛的格子 → 顯示操作 Modal：
  ┌─────────────────────────────────┐
  │  [守衛名稱] Lv.N                │
  │                                 │
  │  ① 穩定升級（消耗 N 金幣）       │
  │     確定升至 Lv.N+1             │
  │                                 │
  │  ② 隨機合成（零成本）            │
  │     需相鄰同等級守衛，種類隨機    │
  │                                 │
  │  [取消]                         │
  └─────────────────────────────────┘
```

**金幣來源：**
- 每波結束基礎金幣：`wave × 5`
- Boss 擊殺：50 金幣
- 天賦「金幣豐收」額外加成：`wave × talent.value`

---

### BattleHUD 更新

新增顯示項目：
- 💰 金幣數量（雙軌成長系統）
- 🎯 當前天賦名稱與效果（需求 17.6）

```
頂部 HUD：❤️ HP | ⚡ SP | 💰 Coins | 🌊 Wave N | ⏱ 倒數
底部 HUD：[天賦標籤] [Series_Bonus 標籤列表]
```

---

### DeckSelectPage 更新（天賦選擇流程）

在套牌確認後、戰鬥開始前插入天賦選擇步驟：

```
DeckSelectPage 流程：
  1. 玩家選擇 5–8 張卡牌（現有邏輯）
  2. 點擊「確認出戰」→ 驗證套牌（現有邏輯）
  3. 顯示天賦選擇畫面（新增）：
     - 展示 3 張隨機天賦卡
     - 每張顯示：天賦名稱、效果描述、數值
     - 玩家必選 1 個，不可跳過
  4. 選擇天賦後進入戰鬥準備倒數（現有邏輯）
```

---

### 架構更新（新增檔案）

```
client/src/game/battle/
├── RandomSummonService.ts   # 隨機召喚與隨機合成邏輯（需求 13、14）
└── TalentSystem.ts          # 天賦池定義、抽取、套用（需求 17）
```
