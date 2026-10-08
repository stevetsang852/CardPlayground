import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'zh-Hant' | 'en';

const STORAGE_KEY = 'cmr-locale';

const zhHant: Record<string, string> = {
  'app.title': '卡牌秘境',
  'app.tagline': '開包 · 收藏 · 對戰',
  'app.loading': '正在開啟卡牌秘境…',
  'nav.home': '首頁',
  'nav.draw': '抽卡',
  'nav.synthesis': '合成',
  'nav.inventory': '背包',
  'nav.battle': '防禦戰',
  'nav.shop': '商店',
  'nav.achievements': '成就',
  'nav.settings': '設定',
  'nav.admin': '管理',
  'home.currency': '金幣',
  'home.luck': '幸運值',
  'home.draws': '抽卡次數',
  'home.collection': '收藏',
  'home.collectionCount': '{n} 張',
  'home.events': '進行中的活動',
  'home.event.lucky': '幸運時刻',
  'home.event.double_drop': '雙倍掉落',
  'home.event.synthesis_boost': '合成加成',
  'home.actionsLeft': '剩餘 {n} 次',
  'home.season': '賽季進度',
  'home.missions': '{done} / {total} 任務',
  'home.nextReward': '下一獎勵：{n}',
  'home.draw': '抽卡',
  'home.synthesis': '合成',
  'home.battle': '防禦戰',
  'home.shop': '商店',
  'home.achievements': '成就',
  'home.settings': '設定',
  'home.legendPity': '傳說保底：{n} 抽',
  'home.mythicPity': '神話保底：{n} 抽',
  'draw.title': '開啟卡包',
  'draw.subtitle': 'M6a 30 週年卡池，卡面會在開包動畫中顯示。',
  'draw.balance': '餘額',
  'draw.since': '距上次 SAR/UR',
  'draw.pity': '保底',
  'draw.pityPacks': '{n} 包',
  'draw.opening': '開包中…',
  'draw.one': '1 包 — {cost}',
  'draw.ten': '10 包 — {cost}',
  'draw.result': '{packs} 包 · {cards} 張',
  'draw.hit': '第 {n} 包 · {kind} → {rarity}',
  'rarity.common': '普通',
  'rarity.rare': '稀有',
  'rarity.epic': '史詩',
  'rarity.legendary': '傳說',
  'rarity.mythic': '神話',
  'pack.basic.name': '擴充包',
  'pack.basic.description': '5 張 · M6a 30 週年卡池',
  'pack.premium.name': '高級包',
  'pack.premium.description': '同樣 5 張，保底更短',
  'pack.legendary.name': '展示包',
  'pack.legendary.description': '更高追逐機率的示範包',
  'settings.title': '設定',
  'settings.language': '語言',
  'settings.languageHint': '介面文字會立刻切換。',
  'settings.volume': '音量',
  'settings.sfx': '音效 {n}',
  'settings.bgm': '音樂 {n}',
  'settings.graphics': '畫面品質',
  'settings.quality.high': '高',
  'settings.quality.medium': '中',
  'settings.quality.low': '低',
  'settings.save': '存檔',
  'settings.export': '匯出存檔',
  'settings.import': '匯入存檔',
  'settings.reset': '重置遊戲',
  'settings.dev': '開發工具',
  'settings.devHint': '僅供測試，會灌入大量資源和卡牌。',
  'settings.seed': '灌入測試資源',
  'settings.exported': '存檔已匯出。',
  'settings.exportFailed': '匯出失敗。',
  'settings.imported': '存檔已匯入。',
  'settings.importFailed': '匯入失敗，檔案不正確。',
  'settings.resetOk': '遊戲已重置。',
  'settings.resetFailed': '重置失敗。',
  'settings.seeded': '已灌入測試資源。',
  'settings.resetAsk': '重置遊戲？',
  'settings.resetWarn': '進度會永久刪除，無法復原。',
  'settings.yesReset': '確定重置',
  'settings.cancel': '取消',
  'inv.title': '收藏',
  'inv.count': '{owned} / {total} 張',
  'inv.inventory': '持有',
  'inv.catalog': '圖鑑',
  'inv.search': '搜尋…',
  'inv.all': '全部稀有度',
  'inv.recent': '最近',
  'inv.rarity': '稀有度',
  'inv.name': '名稱',
  'synth.title': '卡牌合成',
  'synth.balance': '餘額',
  'shop.title': '每日商店',
  'shop.refresh': '{time} 後刷新',
  'achieve.title': '成就',
  'achieve.count': '{done} / {total} 已解鎖',
  'admin.title': '管理後台',
  'admin.hint': '編輯抽卡用的卡牌和卡包。變更只存在這個瀏覽器。',
  'admin.restore': '還原預設',
  'admin.cards': '卡牌 ({n})',
  'admin.packs': '卡包 ({n})',
  'admin.search': '搜尋名稱、編號、稀有度',
  'admin.addCard': '新增卡牌',
  'admin.addPack': '新增卡包',
  'admin.id': '編號',
  'admin.name': '名稱',
  'admin.rarity': '稀有度',
  'admin.dex': '圖鑑編號',
  'admin.image': '圖片網址',
  'admin.series': '系列',
  'admin.icon': '圖示',
  'admin.cost': '價格',
  'admin.perPack': '每包張數',
  'admin.pity': '保底（包數）',
  'admin.description': '說明',
  'admin.saveCard': '儲存卡牌',
  'admin.savePack': '儲存卡包',
  'admin.cancel': '取消',
  'admin.edit': '編輯',
  'admin.delete': '刪除',
  'admin.saved': '已儲存，抽卡會使用這份清單。',
  'admin.cardInvalid': '請填正整數編號、名稱和圖片網址。',
  'admin.cardTaken': '編號 {id} 已經用過。',
  'admin.packInvalid': '卡包需要編號、名稱、價格，而且至少 1 張卡。',
  'admin.packTaken': '卡包編號 {id} 已經用過。',
  'admin.keepPack': '至少保留一個卡包。',
  'admin.restored': '已還原內建卡牌和卡包。',
  'admin.meta': '#{id} · {rarity} · 圖鑑 {dex}',
  'admin.packMeta': '{cost} 金幣 · {count} 張 · 保底 {pity}',
};

const en: Record<string, string> = {
  'app.title': 'Card Mystery Realm',
  'app.tagline': 'Open · Collect · Battle',
  'app.loading': 'Opening Card Mystery Realm…',
  'nav.home': 'Home',
  'nav.draw': 'Draw',
  'nav.synthesis': 'Synthesis',
  'nav.inventory': 'Binder',
  'nav.battle': 'Defense',
  'nav.shop': 'Shop',
  'nav.achievements': 'Goals',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'home.currency': 'Coins',
  'home.luck': 'Luck',
  'home.draws': 'Draws',
  'home.collection': 'Collection',
  'home.collectionCount': '{n} cards',
  'home.events': 'Active events',
  'home.event.lucky': 'Lucky moment',
  'home.event.double_drop': 'Double drop',
  'home.event.synthesis_boost': 'Synthesis boost',
  'home.actionsLeft': '{n} left',
  'home.season': 'Season progress',
  'home.missions': '{done} / {total} missions',
  'home.nextReward': 'Next reward: {n}',
  'home.draw': 'Draw cards',
  'home.synthesis': 'Synthesis',
  'home.battle': 'Defense battle',
  'home.shop': 'Shop',
  'home.achievements': 'Achievements',
  'home.settings': 'Settings',
  'home.legendPity': 'Legendary pity: {n}',
  'home.mythicPity': 'Mythic pity: {n}',
  'draw.title': 'Open packs',
  'draw.subtitle': 'M6a 30th celebration pool. Card scans show in the opening animation.',
  'draw.balance': 'Balance',
  'draw.since': 'Since SAR/UR',
  'draw.pity': 'Pity',
  'draw.pityPacks': '{n} packs',
  'draw.opening': 'Opening…',
  'draw.one': '1 pack — {cost}',
  'draw.ten': '10 packs — {cost}',
  'draw.result': '{packs} packs · {cards} cards',
  'draw.hit': 'Pack {n} · {kind} → {rarity}',
  'rarity.common': 'Common',
  'rarity.rare': 'Rare',
  'rarity.epic': 'Epic',
  'rarity.legendary': 'Legendary',
  'rarity.mythic': 'Mythic',
  'pack.basic.name': 'Expansion pack',
  'pack.basic.description': '5 cards · M6a 30th celebration pool',
  'pack.premium.name': 'High class pack',
  'pack.premium.description': 'Same 5-card structure, shorter pity',
  'pack.legendary.name': 'Showcase pack',
  'pack.legendary.description': 'Demo pack with higher chase odds',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageHint': 'Interface text switches immediately.',
  'settings.volume': 'Volume',
  'settings.sfx': 'SFX {n}',
  'settings.bgm': 'Music {n}',
  'settings.graphics': 'Graphics',
  'settings.quality.high': 'High',
  'settings.quality.medium': 'Medium',
  'settings.quality.low': 'Low',
  'settings.save': 'Save data',
  'settings.export': 'Export save',
  'settings.import': 'Import save',
  'settings.reset': 'Reset game',
  'settings.dev': 'Dev tools',
  'settings.devHint': 'Testing only. Adds a large amount of resources and cards.',
  'settings.seed': 'Seed test resources',
  'settings.exported': 'Save exported.',
  'settings.exportFailed': 'Export failed.',
  'settings.imported': 'Save imported.',
  'settings.importFailed': 'Import failed. Invalid file.',
  'settings.resetOk': 'Game reset.',
  'settings.resetFailed': 'Reset failed.',
  'settings.seeded': 'Test resources added.',
  'settings.resetAsk': 'Reset game?',
  'settings.resetWarn': 'This permanently deletes your progress.',
  'settings.yesReset': 'Yes, reset',
  'settings.cancel': 'Cancel',
  'inv.title': 'Collection',
  'inv.count': '{owned} / {total}',
  'inv.inventory': 'Owned',
  'inv.catalog': 'Catalog',
  'inv.search': 'Search…',
  'inv.all': 'All rarities',
  'inv.recent': 'Recent',
  'inv.rarity': 'Rarity',
  'inv.name': 'Name',
  'synth.title': 'Card synthesis',
  'synth.balance': 'Balance',
  'shop.title': 'Daily shop',
  'shop.refresh': 'Refreshes in {time}',
  'achieve.title': 'Achievements',
  'achieve.count': '{done} / {total} unlocked',
  'admin.title': 'Admin portal',
  'admin.hint': 'Edit the cards and packs used by Draw. Changes stay in this browser.',
  'admin.restore': 'Restore defaults',
  'admin.cards': 'Cards ({n})',
  'admin.packs': 'Packs ({n})',
  'admin.search': 'Search name, id, rarity',
  'admin.addCard': 'Add card',
  'admin.addPack': 'Add pack',
  'admin.id': 'Id',
  'admin.name': 'Name',
  'admin.rarity': 'Rarity',
  'admin.dex': 'Dex',
  'admin.image': 'Image URL',
  'admin.series': 'Series',
  'admin.icon': 'Icon',
  'admin.cost': 'Cost',
  'admin.perPack': 'Cards per pack',
  'admin.pity': 'Pity (packs)',
  'admin.description': 'Description',
  'admin.saveCard': 'Save card',
  'admin.savePack': 'Save pack',
  'admin.cancel': 'Cancel',
  'admin.edit': 'Edit',
  'admin.delete': 'Delete',
  'admin.saved': 'Saved. Draw uses this list.',
  'admin.cardInvalid': 'Card needs a positive id, a name, and an image URL.',
  'admin.cardTaken': 'Card id {id} is already used.',
  'admin.packInvalid': 'Pack needs an id, a name, a cost, and at least 1 card.',
  'admin.packTaken': 'Pack id {id} is already used.',
  'admin.keepPack': 'Keep at least one pack.',
  'admin.restored': 'Restored the built-in card and pack lists.',
  'admin.meta': '#{id} · {rarity} · dex {dex}',
  'admin.packMeta': '{cost} coins · {count} cards · pity {pity}',
};

const tables: Record<Locale, Record<string, string>> = { 'zh-Hant': zhHant, en };

function fill(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)),
    text,
  );
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>) {
  return fill(tables[locale][key] ?? tables.en[key] ?? key, vars);
}

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-Hant') return saved;
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en';
  } catch {
    return 'zh-Hant';
  }
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-Hant' ? 'zh-Hant' : 'en';
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LocaleProvider');
  return value;
}

export function localizedPack(locale: Locale, pack: { id: string; name: string; description: string }) {
  const nameKey = `pack.${pack.id}.name`;
  const descKey = `pack.${pack.id}.description`;
  const name = tables[locale][nameKey] ?? tables.en[nameKey];
  const description = tables[locale][descKey] ?? tables.en[descKey];
  return {
    name: name ?? pack.name,
    description: description ?? pack.description,
  };
}
