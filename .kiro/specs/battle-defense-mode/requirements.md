# 需求文件：秘境防御战模式（Battle Defense Mode）

## 簡介

「秘境防御战」是《卡片秘境》單機版的塔防玩法擴充模式，借鑒《Random Dice》的塔防加自走棋機制。玩家從自身卡牌收藏中選出出戰套牌，將卡牌化身為「守衛者」部署於戰場網格，自動抵禦不斷來襲的怪物波次。本模式純客戶端實現，無需後端，並與現有收藏系統、畫廊評分及卡牌系列深度聯動。

## 詞彙表

- **Battle_Defense_System**：管理整個秘境防御战模式的核心系統
- **Battle_FSM**：以有限狀態機管理戰鬥流程的子系統（狀態：準備、戰鬥中、波次間、Boss戰、勝利、失敗）
- **Guardian**：卡牌在戰場上的化身，擁有攻擊力、攻擊速度、射程、特殊技能等屬性
- **Grid**：戰場網格，尺寸為 3×5 或 3×8，守衛與敵人在此互動
- **Enemy**：從網格左側向右側行進的怪物單位，到達終點扣除玩家生命值
- **Wave**：一輪敵人進攻，每波結束後進入波次間準備階段
- **Boss**：每第 5 波出現的強化敵人，擊敗後給予額外獎勵
- **SP**：戰鬥資源點數（Skill Points），擊殺敵人獲得，用於召喚新守衛
- **Deck**：玩家戰前選擇的 5–8 張出戰卡牌組合
- **Synthesis_Upgrade**：兩個相同守衛相鄰時消耗資源合成為更高等級的操作（1 級→5 級）
- **Object_Pool**：管理敵人與子彈物件的重用池，避免頻繁記憶體分配
- **Series_Bonus**：集齊特定系列卡牌後激活的系列加成效果
- **Gallery_Score**：玩家畫廊評分，影響戰鬥初始資源
- **Daily_Challenge**：每日一次、固定波數的挑戰模式
- **Endless_Mode**：無限波數的挑戰模式
- **Boss_Rush**：連續 Boss 戰的特殊模式

## 需求列表

### 需求 1：戰前準備與套牌選擇

**用戶故事：** 身為玩家，我希望在進入戰鬥前從我的卡牌收藏中選擇出戰套牌，以便決定戰場上可用的守衛種類。

#### 驗收標準

1. THE Battle_Defense_System SHALL 允許玩家從已收藏的卡牌中選擇 5 至 8 張組成 Deck
2. WHEN 玩家嘗試選擇超過 8 張卡牌時，THE Battle_Defense_System SHALL 拒絕該操作並顯示「套牌上限為 8 張」的提示訊息
3. WHEN 玩家嘗試選擇少於 5 張卡牌並確認出戰時，THE Battle_Defense_System SHALL 拒絕該操作並顯示「套牌至少需要 5 張」的提示訊息
4. THE Battle_Defense_System SHALL 限制每個 Deck 中神話卡（mythic）的數量不超過 1 張
5. WHEN 玩家嘗試將第 2 張神話卡加入 Deck 時，THE Battle_Defense_System SHALL 拒絕該操作並顯示「每場限帶 1 張神話卡」的提示訊息
6. THE Battle_Defense_System SHALL 在套牌選擇介面顯示每張卡牌對應的守衛屬性預覽（攻擊力、射程、特殊技能）
7. WHEN 玩家的 Gallery_Score 大於 0 時，THE Battle_Defense_System SHALL 根據 Gallery_Score 計算並顯示初始 SP 加成數值

### 需求 2：戰場網格與守衛部署

**用戶故事：** 身為玩家，我希望在網格戰場上部署守衛，以便建立防線抵禦敵人。

#### 驗收標準

1. THE Battle_Defense_System SHALL 提供 3×5 或 3×8 的 Grid 作為戰場，格子數量依遊戲模式而定
2. WHEN 一回合開始時，THE Battle_Defense_System SHALL 從 Deck 中隨機抽取一張卡牌並嘗試將對應 Guardian 放置於 Grid 的隨機空格
3. IF Grid 中無空格可用，THEN THE Battle_Defense_System SHALL 跳過本回合的守衛召喚並通知玩家「戰場已滿」
4. THE Battle_Defense_System SHALL 限制同時存在於 Grid 上的 Guardian 總數不超過 20 個
5. WHEN 玩家消耗 SP 手動召喚守衛時，THE Battle_Defense_System SHALL 將守衛放置於玩家指定的空格
6. IF 玩家指定的格子已有守衛，THEN THE Battle_Defense_System SHALL 拒絕該操作並提示「該格子已被佔用」
7. THE Battle_Defense_System SHALL 在每個 Grid 格子上顯示守衛的等級與當前生命值百分比

### 需求 3：守衛屬性與稀有度能力

**用戶故事：** 身為玩家，我希望不同稀有度的卡牌化身為具有不同能力的守衛，以便體驗多樣化的戰術組合。

#### 驗收標準

1. WHEN 普通卡（common）化身為 Guardian 時，THE Battle_Defense_System SHALL 賦予其基礎單體攻擊能力與簡單輔助技能
2. WHEN 稀有卡（rare）化身為 Guardian 時，THE Battle_Defense_System SHALL 賦予其範圍攻擊能力或減速 Debuff 技能
3. WHEN 史詩卡（epic）化身為 Guardian 時，THE Battle_Defense_System SHALL 賦予其召喚物能力或資源產生（SP 回收）技能
4. WHEN 傳說卡（legendary）化身為 Guardian 時，THE Battle_Defense_System SHALL 賦予其強力特效技能，可改變局部戰況
5. WHEN 神話卡（mythic）化身為 Guardian 時，THE Battle_Defense_System SHALL 賦予其全屏大招技能，且每場戰鬥僅可觸發一次
6. WHEN 神話卡的全屏大招已在本場觸發過，THE Battle_Defense_System SHALL 禁用該技能按鈕並顯示「本場已使用」提示
7. THE Battle_Defense_System SHALL 依照卡牌所屬系列賦予對應的元素屬性（火焰、冰霜、自然、聖光、暗影）

### 需求 4：守衛合成升級

**用戶故事：** 身為玩家，我希望將相鄰的相同守衛合成升級，以便獲得更強大的守衛單位。

#### 驗收標準

1. WHEN Grid 上兩個相同卡牌 ID 且相同等級的 Guardian 相鄰（上下左右）時，THE Battle_Defense_System SHALL 顯示合成升級提示
2. WHEN 玩家確認合成且擁有足夠資源時，THE Battle_Defense_System SHALL 消耗兩個 Guardian 及對應 SP，在其中一個格子生成等級加 1 的同種 Guardian
3. IF 合成後等級超過 5 級，THEN THE Battle_Defense_System SHALL 拒絕合成並提示「已達最高等級」
4. THE Battle_Defense_System SHALL 依照等級（1–5）線性提升 Guardian 的攻擊力與生命值，每級提升幅度為基礎值的 50%
5. WHEN 合成成功時，THE Battle_Defense_System SHALL 播放升級粒子特效動畫
6. THE Battle_Defense_System SHALL 在合成提示中顯示合成所需 SP 費用與升級後的屬性預覽

### 需求 5：敵人行進與戰鬥流程

**用戶故事：** 身為玩家，我希望敵人按照固定路徑行進並被守衛自動攻擊，以便體驗塔防核心玩法。

#### 驗收標準

1. THE Battle_Defense_System SHALL 使 Enemy 從 Grid 最左列向最右列逐格行進
2. WHEN Enemy 到達 Grid 最右列終點時，THE Battle_Defense_System SHALL 扣除玩家 1 點生命值並移除該 Enemy
3. WHEN 玩家生命值降至 0 時，THE Battle_Defense_System SHALL 觸發 Battle_FSM 進入失敗狀態並結束戰鬥
4. WHILE Guardian 的射程內有 Enemy 時，THE Battle_Defense_System SHALL 使 Guardian 自動攻擊射程內最近的 Enemy
5. WHEN Enemy 生命值降至 0 時，THE Battle_Defense_System SHALL 移除該 Enemy 並給予玩家對應 SP 獎勵
6. THE Battle_Defense_System SHALL 使用 Object_Pool 管理 Enemy 與子彈物件，避免每波次重新分配記憶體
7. WHEN 移動端裝置偵測到效能不足時，THE Battle_Defense_System SHALL 自動降低粒子特效數量至標準值的 50%

### 需求 6：波次管理與 Boss 戰

**用戶故事：** 身為玩家，我希望面對逐漸增強的敵人波次與 Boss，以便體驗遞進式的挑戰難度。

#### 驗收標準

1. THE Battle_Defense_System SHALL 在每波次開始前顯示倒數計時（10 秒），讓玩家進行準備
2. WHEN 一波次的所有 Enemy 被消滅或到達終點後，THE Battle_Defense_System SHALL 觸發 Battle_FSM 進入波次間狀態
3. THE Battle_Defense_System SHALL 在每波次中依照波數公式增加 Enemy 的數量與基礎生命值（每波增加 10%）
4. WHEN 波數為 5 的倍數時，THE Battle_Defense_System SHALL 生成 Boss 並觸發 Battle_FSM 進入 Boss 戰狀態
5. WHEN Boss 被擊敗時，THE Battle_Defense_System SHALL 給予玩家額外獎勵（金幣或抽卡券）並繼續下一波
6. WHEN 玩家在 Daily_Challenge 模式中通過所有固定波數時，THE Battle_Defense_System SHALL 觸發 Battle_FSM 進入勝利狀態
7. WHILE Endless_Mode 進行中，THE Battle_Defense_System SHALL 持續生成波次直到玩家生命值歸零

### 需求 7：遊戲模式

**用戶故事：** 身為玩家，我希望選擇不同的遊戲模式，以便根據時間與目標選擇適合的挑戰方式。

#### 驗收標準

1. THE Battle_Defense_System SHALL 提供 Daily_Challenge 模式，每位玩家每天限玩一次，波數固定
2. WHEN 玩家嘗試在同一天第二次進入 Daily_Challenge 時，THE Battle_Defense_System SHALL 拒絕並顯示剩餘重置時間
3. THE Battle_Defense_System SHALL 提供 Endless_Mode，無波數上限，以玩家生命值歸零為結束條件
4. THE Battle_Defense_System SHALL 提供 Boss_Rush 模式，僅生成 Boss 敵人，無普通波次
5. WHEN 玩家完成 Daily_Challenge 時，THE Battle_Defense_System SHALL 記錄完成狀態至本地儲存，防止當日重複遊玩
6. THE Battle_Defense_System SHALL 在模式選擇介面顯示各模式的最高波數紀錄與最高分數

### 需求 8：收藏系統聯動

**用戶故事：** 身為玩家，我希望我的卡牌收藏與畫廊評分能影響戰鬥表現，以便感受收藏深度帶來的實質回報。

#### 驗收標準

1. WHEN 戰鬥開始時，THE Battle_Defense_System SHALL 依照玩家 Gallery_Score 計算初始 SP 加成，每 100 分 Gallery_Score 提供 10 點額外初始 SP
2. THE Battle_Defense_System SHALL 在戰鬥開始時計算玩家 Deck 中的系列組成，並激活符合條件的 Series_Bonus
3. WHEN Deck 中同一系列的卡牌數量達到 3 張或以上時，THE Battle_Defense_System SHALL 激活該系列的 Series_Bonus（對應系列守衛攻擊力 +10%）
4. THE Battle_Defense_System SHALL 支援以下五個系列的 Series_Bonus：原始火山、寒冰紀元、神秘森林、光明聖域、暗影深淵
5. WHEN 多個 Series_Bonus 同時激活時，THE Battle_Defense_System SHALL 將所有加成效果疊加計算
6. THE Battle_Defense_System SHALL 在戰鬥 HUD 中顯示當前激活的所有 Series_Bonus 及其效果

### 需求 9：戰鬥獎勵系統

**用戶故事：** 身為玩家，我希望完成戰鬥後獲得有意義的獎勵，以便持續推進遊戲進度。

#### 驗收標準

1. WHEN 玩家在任意模式中完成戰鬥（勝利或失敗）時，THE Battle_Defense_System SHALL 依照存活波數計算並發放金幣獎勵
2. WHEN 玩家在 Daily_Challenge 中獲得勝利時，THE Battle_Defense_System SHALL 額外發放 1 張抽卡券
3. WHEN 玩家在 Endless_Mode 中達到波數里程碑（10、25、50、100 波）時，THE Battle_Defense_System SHALL 發放稀有材料獎勵
4. WHEN Boss 被擊敗時，THE Battle_Defense_System SHALL 立即發放 Boss 擊殺獎勵（金幣或抽卡券），不等待戰鬥結束
5. THE Battle_Defense_System SHALL 將所有獎勵寫入現有的 gameStore 狀態，並透過 IndexedDBDataService 持久化至本地儲存
6. WHEN 戰鬥結算畫面顯示時，THE Battle_Defense_System SHALL 列出本場所有獲得的獎勵明細

### 需求 10：有限狀態機戰鬥流程管理

**用戶故事：** 身為開發者，我希望使用有限狀態機管理戰鬥流程，以便確保狀態轉換的正確性與可預測性。

#### 驗收標準

1. THE Battle_FSM SHALL 定義以下合法狀態：Idle（閒置）、Preparing（準備）、Fighting（戰鬥中）、BetweenWaves（波次間）、BossFight（Boss 戰）、Victory（勝利）、Defeat（失敗）
2. THE Battle_FSM SHALL 僅允許以下合法狀態轉換：Idle→Preparing、Preparing→Fighting、Fighting→BetweenWaves、Fighting→Defeat、BetweenWaves→Fighting、BetweenWaves→BossFight、BossFight→BetweenWaves、BossFight→Defeat、BetweenWaves→Victory
3. IF Battle_FSM 收到非法狀態轉換請求，THEN THE Battle_FSM SHALL 忽略該請求並記錄警告至控制台
4. FOR ALL 狀態轉換，THE Battle_FSM SHALL 觸發對應的進入與離開回調函式
5. THE Battle_FSM SHALL 提供序列化方法，將當前狀態輸出為 JSON 格式
6. THE Battle_FSM SHALL 提供反序列化方法，從 JSON 格式還原狀態
7. FOR ALL 合法的 Battle_FSM 狀態物件，序列化後再反序列化 SHALL 產生等價的狀態物件（往返屬性）

### 需求 11：效能管理

**用戶故事：** 身為玩家，我希望遊戲在移動端也能流暢運行，以便在各種裝置上享受遊戲。

#### 驗收標準

1. THE Battle_Defense_System SHALL 使用 Object_Pool 預先分配 Enemy 物件，池容量不少於單波最大敵人數量的 2 倍
2. THE Battle_Defense_System SHALL 使用 Object_Pool 預先分配子彈物件，池容量不少於 Guardian 數量上限的 3 倍
3. WHEN Object_Pool 中無可用物件時，THE Battle_Defense_System SHALL 動態擴充池容量而非丟棄請求
4. THE Battle_Defense_System SHALL 限制 Grid 上同時存在的 Guardian 總數不超過 20 個
5. WHEN 裝置為移動端（螢幕寬度小於 768px 或 User-Agent 為行動裝置）時，THE Battle_Defense_System SHALL 將粒子特效數量上限設為桌面版的 50%
6. THE Battle_Defense_System SHALL 在每個遊戲更新幀（game loop tick）中，批次處理所有 Guardian 的攻擊判定，避免逐一查詢

### 需求 12：戰鬥狀態序列化與解析

**用戶故事：** 身為開發者，我希望能序列化與解析戰鬥狀態，以便支援存檔、讀檔及除錯功能。

#### 驗收標準

1. WHEN 提供合法的戰鬥狀態物件時，THE Battle_Defense_System SHALL 將其序列化為合法的 JSON 字串
2. WHEN 提供合法的戰鬥狀態 JSON 字串時，THE Battle_Defense_System SHALL 將其解析為等價的戰鬥狀態物件
3. WHEN 提供格式錯誤的 JSON 字串時，THE Battle_Defense_System SHALL 回傳描述性錯誤訊息而非拋出未捕獲的例外
4. WHEN 提供缺少必要欄位的 JSON 物件時，THE Battle_Defense_System SHALL 回傳列出所有缺少欄位的錯誤訊息
5. FOR ALL 合法的戰鬥狀態物件，序列化後再解析 SHALL 產生等價的戰鬥狀態物件（往返屬性）
6. THE Battle_Defense_System SHALL 提供格式化輸出方法，將戰鬥狀態物件輸出為人類可讀的 JSON 格式（含縮排）
