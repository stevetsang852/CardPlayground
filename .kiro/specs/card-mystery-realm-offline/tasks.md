# 《卡片秘境》单机版 — 实现任务列表

## Phase 1: 基础架构

### Task 1: 安装依赖
- [x] 1.1 在 `client/package.json` 中添加 Dexie.js、Zustand、React、React DOM、TailwindCSS、React Three Fiber、@react-three/drei 依赖
- [x] 1.2 在 `client/package.json` 中添加对应 TypeScript 类型声明和开发依赖（@types/react、@types/react-dom、postcss、autoprefixer 等）
- [x] 1.3 更新 `client/vite.config.ts` 支持 React（添加 @vitejs/plugin-react）
- [x] 1.4 创建 `client/tailwind.config.js` 和 `client/postcss.config.js`
- [x] 1.5 更新 `client/index.html` 引入 React 根节点 `<div id="root">`

### Task 2: 本地数据库（IndexedDB via Dexie）
- [x] 2.1 创建 `client/src/db/CardGameDB.ts` — 定义 Dexie 数据库类，包含以下表：
  - `cards`：玩家拥有的卡片实例（`++id, cardId, rarity, level, obtainedAt`）
  - `gallery`：画廊布局（`userId`，单机固定为 `'local'`）
  - `achievements`：成就进度（`id, unlocked`）
  - `settings`：配置项（`key`）
  - `market`：系统商店列表（`++id, cardId, price, expiresAt`）
  - `operationLog`：操作日志（`++id, type, timestamp, data`，用于未来联机迁移）
- [x] 2.2 在 `client/src/db/CardGameDB.ts` 中定义对应的 TypeScript 接口：`ICardInstance`、`IGallery`、`IAchievementProgress`、`ISetting`、`IMarketListing`、`IOperationLog`
- [x] 2.3 创建 `client/src/db/index.ts` 导出单例数据库实例

### Task 3: 数据服务抽象层
- [x] 3.1 创建 `client/src/services/IDataService.ts` — 定义抽象接口，包含：
  - `getCards(): Promise<ICardInstance[]>`
  - `saveCard(card: ICardInstance): Promise<void>`
  - `deleteCard(id: number): Promise<void>`
  - `getGallery(): Promise<IGallery | undefined>`
  - `saveGallery(gallery: IGallery): Promise<void>`
  - `getAchievements(): Promise<IAchievementProgress[]>`
  - `saveAchievement(achievement: IAchievementProgress): Promise<void>`
  - `getSetting(key: string): Promise<string | undefined>`
  - `saveSetting(key: string, value: string): Promise<void>`
  - `getMarketListings(): Promise<IMarketListing[]>`
  - `saveMarketListings(listings: IMarketListing[]): Promise<void>`
  - `exportSave(): Promise<string>` （导出 JSON 字符串）
  - `importSave(json: string): Promise<void>` （从 JSON 恢复）
  - `resetGame(): Promise<void>`
- [x] 3.2 创建 `client/src/services/IndexedDBDataService.ts` — 实现 `IDataService`，使用 Dexie 操作
- [x] 3.3 创建 `client/src/services/index.ts` 导出服务实例

### Task 4: Zustand 状态管理
- [x] 4.1 创建 `client/src/store/gameStore.ts` — 定义 Zustand store，包含：
  - 玩家状态（软货币、硬货币、幸运值、连续失败次数、登录天数）
  - 卡片集合（`cards: ICardInstance[]`）
  - 画廊状态（`gallery: IGallery | null`）
  - 成就列表（`achievements: IAchievementProgress[]`）
  - 当前活跃事件（`activeEvents: ActiveEvent[]`）
  - 系统商店（`marketListings: IMarketListing[]`）
  - 赛季状态（`seasonDay: number`，`seasonMissions: Mission[]`）
  - 加载/保存动作（`loadFromDB`, `syncToDB`）
- [x] 4.2 在 store 中实现 IndexedDB 持久化中间件（每次状态变更后异步写入 DB）
- [x] 4.3 创建 `client/src/store/index.ts` 导出 store

---

## Phase 2: 核心游戏逻辑（客户端）

### Task 5: 客户端随机数生成
- [x] 5.1 创建 `client/src/game/CryptoRandom.ts` — 封装 `crypto.getRandomValues`，提供：
  - `nextFloat(): number` — 返回 [0, 1) 的随机浮点数
  - `nextInt(min: number, max: number): number` — 返回整数
  - `shuffle<T>(arr: T[]): T[]` — Fisher-Yates 洗牌
- [x] 5.2 为 `CryptoRandom` 编写单元测试 `client/src/game/CryptoRandom.test.ts`，验证：
  - 输出范围在 [0, 1)
  - 大量采样分布均匀（卡方检验）

### Task 6: 抽卡服务（客户端）
- [x] 6.1 创建 `client/src/game/DrawService.ts`，复用 `shared/src/drawing/CardDrawGenerator.ts` 逻辑，但使用 `CryptoRandom` 替代服务器种子：
  - `drawCards(packConfig: PackConfiguration, count: number, playerState: PlayerState): DrawResult`
  - 支持保底机制（pity system）
  - 支持幸运值加成
  - 抽卡后更新 `drawsSinceLastLegendary`、`luckValue`
  - 将结果写入 IndexedDB（通过 store）
- [x] 6.2 创建 `client/src/game/DrawService.test.ts`，验证：
  - 保底机制在达到阈值时触发
  - 幸运值加成正确应用
  - 抽卡结果写入 store

### Task 7: 合成服务（客户端）
- [x] 7.1 创建 `client/src/game/SynthesisService.ts`，复用 `shared/src/synthesis/SynthesisCalculator.ts`：
  - `synthesize(recipe: SynthesisRecipe, playerState: PlayerState): SynthesisResult`
  - 支持连续失败保护（3次失败后+10%）
  - 合成成功后消耗材料卡片，生成新卡片
  - 更新 `consecutiveSynthesisFailures`
- [x] 7.2 创建 `client/src/game/SynthesisService.test.ts`，验证：
  - 失败保护在第3次失败后激活
  - 成功后材料卡片被消耗
  - 成功率上限为100%

### Task 8: 随机事件服务（客户端）
- [x] 8.1 创建 `client/src/game/EventService.ts`：
  - `checkEventTrigger(actionType: string, playerState: PlayerState): ActiveEvent | null`
  - 每次操作（抽卡、合成、登录）后检查是否触发事件
  - 事件持续时间用"游戏内行动次数"衡量（非真实时间，防作弊）
  - 支持事件类型：`lucky`（幸运时刻）、`double_drop`（双倍掉落）、`synthesis_boost`（合成加成）
- [x] 8.2 创建 `client/src/game/EventService.test.ts`，验证：
  - 触发概率在合理范围内
  - 事件持续行动次数正确递减
  - 同类事件不重复叠加

### Task 9: 成就服务（客户端）
- [x] 9.1 创建 `client/src/game/AchievementService.ts`：
  - `checkAchievements(playerState: PlayerState, cards: ICardInstance[]): IAchievementProgress[]`
  - 检测并解锁成就（首次抽卡、收集N张、合成成功、画廊摆满等）
  - 解锁时给予软货币奖励
  - 进度实时写入 IndexedDB
- [x] 9.2 创建 `client/src/game/AchievementService.test.ts`，验证：
  - 成就在满足条件时正确解锁
  - 已解锁成就不重复解锁
  - 奖励货币正确发放

### Task 10: 系统商店（替代交易市场）
- [x] 10.1 创建 `client/src/game/SystemShop.ts`：
  - `refreshDailyShop(playerState: PlayerState, cards: ICardInstance[]): IMarketListing[]`
  - 每日刷新（基于本地日期），生成5-8个商品
  - 价格根据玩家已有卡片数量动态调整（本地计算）
  - `purchaseItem(listingId: number, playerState: PlayerState): PurchaseResult`
  - 购买后扣除软货币，将卡片加入收藏
- [x] 10.2 创建 `client/src/game/SystemShop.test.ts`，验证：
  - 每日刷新生成正确数量商品
  - 购买后软货币正确扣除
  - 货币不足时购买失败

### Task 11: 赛季服务（客户端）
- [x] 11.1 创建 `client/src/game/SeasonService.ts`：
  - 赛季进度基于"玩家活跃度"（完成任务数）而非真实时间（方案A）
  - `checkDailyLogin(playerState: PlayerState): LoginResult` — 每次启动检测是否新的一天
  - `completeMission(missionId: string, playerState: PlayerState): MissionResult`
  - `getSeasonProgress(playerState: PlayerState): SeasonProgress`
  - 赛季奖励（软货币、特殊卡片）在达到里程碑时发放
- [x] 11.2 创建 `client/src/game/SeasonService.test.ts`，验证：
  - 每日登录奖励正确发放（不重复）
  - 任务完成后进度正确更新
  - 赛季里程碑奖励正确触发

---

## Phase 3: UI 组件（React）

### Task 12: 应用入口与路由
- [x] 12.1 创建 `client/src/App.tsx` — React 应用根组件，包含：
  - 路由（React Router 或简单状态路由）：主页、抽卡、合成、画廊、商店、成就、设置
  - 全局状态初始化（从 IndexedDB 加载）
  - 加载动画
- [x] 12.2 更新 `client/src/main.ts` → `client/src/main.tsx`，挂载 React 应用到 `#root`
- [x] 12.3 创建 `client/src/components/Layout.tsx` — 通用布局（导航栏、底部菜单）

### Task 13: 主页与玩家状态面板
- [x] 13.1 创建 `client/src/components/HomePage.tsx`：
  - 显示玩家软货币、硬货币、幸运值
  - 显示当前活跃事件（如"幸运时刻"倒计时）
  - 快捷入口按钮（抽卡、合成、画廊）
  - 每日登录奖励弹窗
- [x] 13.2 创建 `client/src/components/CurrencyDisplay.tsx` — 货币显示组件（可复用）

### Task 14: 抽卡界面
- [x] 14.1 创建 `client/src/components/DrawPage.tsx`：
  - 卡包选择（基础包、高级包、传说包）
  - 单抽/十连按钮
  - 调用 `DrawService` 执行抽卡
  - 触发 Three.js 抽卡动画（复用 `CardAnimations`）
  - 显示抽卡结果（卡片列表、稀有度高亮）
- [x] 14.2 创建 `client/src/components/CardRevealModal.tsx` — 抽卡结果弹窗，含动画

### Task 15: 合成界面
- [x] 15.1 创建 `client/src/components/SynthesisPage.tsx`：
  - 材料卡片选择（从收藏中选择）
  - 显示当前成功率（含事件加成、失败保护）
  - 合成按钮，触发 `SynthesisService`
  - 触发合成动画（复用 `SynthesisAnimations`）
  - 显示合成结果

### Task 16: 3D 画廊界面
- [x] 16.1 创建 `client/src/components/GalleryPage.tsx`：
  - 使用 React Three Fiber 渲染 3D 画廊网格
  - 支持拖拽卡片到网格位置
  - 显示画廊评分（复用 `shared/src/gallery/GalleryScoreCalculator.ts`）
  - 保存画廊布局到 IndexedDB
- [x] 16.2 创建 `client/src/components/GalleryGrid.tsx` — 3D 网格组件（React Three Fiber）
- [x] 16.3 创建 `client/src/components/NPCGallery.tsx` — NPC 画廊查看器（预置3个NPC画廊，参观可获得软货币奖励）

### Task 17: 系统商店界面
- [x] 17.1 创建 `client/src/components/ShopPage.tsx`：
  - 显示每日商品列表（卡片图片、价格、稀有度）
  - 购买按钮（调用 `SystemShop.purchaseItem`）
  - 显示剩余刷新时间（距下次每日刷新）
  - 软货币余额显示

### Task 18: 成就界面
- [x] 18.1 创建 `client/src/components/AchievementsPage.tsx`：
  - 成就列表（已解锁/未解锁）
  - 进度条显示
  - 解锁动画
  - 个人历史记录（替代排行榜）

### Task 19: 设置与存档管理
- [x] 19.1 创建 `client/src/components/SettingsPage.tsx`：
  - 音量设置（音效、背景音乐）
  - 画质设置（高/中/低）
  - 存档管理：导出存档（JSON 文件下载）、导入存档（文件上传）、重置游戏
  - 调用 `IDataService.exportSave()` / `importSave()` / `resetGame()`

---

## Phase 4: PWA 与打包

### Task 20: PWA 配置
- [x] 20.1 创建 `client/public/manifest.json` — PWA manifest（应用名、图标、主题色、display: standalone）
- [x] 20.2 创建 `client/src/sw.ts` — Service Worker，缓存所有静态资源（Workbox 或手写）
- [x] 20.3 在 `client/vite.config.ts` 中集成 `vite-plugin-pwa`（或手动注册 Service Worker）
- [x] 20.4 在 `client/index.html` 中注册 Service Worker 和 manifest

### Task 21: 桌面版（Tauri，可选）
- [ ] 21.1 初始化 Tauri 项目（`src-tauri/` 目录）
- [ ] 21.2 配置 `tauri.conf.json`（应用名、窗口大小、图标）
- [ ] 21.3 实现 Tauri 文件系统 API 用于存档导出到文档目录

### Task 22: 最终检查点
- [x] 22.1 运行完整测试套件（`npm test --run`），确保所有单元测试通过
- [x] 22.2 验证 IndexedDB 读写在浏览器中正常工作（手动测试或 Playwright）
- [x] 22.3 验证 PWA 离线功能（Service Worker 缓存验证）
- [x] 22.4 验证存档导出/导入功能（导出 JSON，清空数据，重新导入，数据一致）
- [x] 22.5 验证抽卡→合成→画廊完整游戏循环可正常运行
