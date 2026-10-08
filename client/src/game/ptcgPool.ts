import type { CardTemplate, Rarity } from '../cardData';
import { OLDER_CARDS } from './olderCards';

/** Full TCG card scans (frame, HP, attacks), not creature artwork. Public KADO card images for M6a. */
const CARD = (file: string) =>
  `https://nyqehdzrfeoutdzpwzit.supabase.co/storage/v1/object/public/card-images/tw-cards/${file}.png`;

export interface PtcgTemplate extends CardTemplate {
  imageUrl: string;
  dex: number;
}

/** [id, name, rarity, dex, image file]. Ids are 1000 + printed number. */
const rows: Array<[number, string, Rarity, number, string]> = [
  [1001, '蛋蛋', 'common', 102, '19913'],
  [1002, '阿羅拉 椰蛋樹', 'common', 103, '19914'],
  [1003, '電螢蟲', 'common', 313, '19915'],
  [1004, '甜甜螢', 'common', 314, '19916'],
  [1005, '彩粉蝶', 'rare', 666, '19917'],
  [1006, '火焰鳥', 'rare', 146, '19918'],
  [1007, '鳳王', 'epic', 250, '19919'],
  [1008, '萊希拉姆', 'epic', 643, '19920'],
  [1009, '呆火鱷ex', 'epic', 909, '19921'],
  [1010, '呆呆獸', 'common', 79, '19922'],
  [1011, '拉普拉斯', 'rare', 131, '19923'],
  [1012, '急凍鳥', 'rare', 144, '19924'],
  [1013, '蓋歐卡', 'epic', 382, '19925'],
  [1014, '帕路奇亞', 'epic', 484, '19926'],
  [1015, '甲賀忍蛙ex', 'epic', 658, '19927'],
  [1017, '皮卡丘', 'rare', 25, '19929'],
  [1018, '閃電鳥', 'rare', 145, '19961'],
  [1019, '捷克羅姆', 'epic', 644, '19962'],
  [1021, '伊布', 'common', 133, '20006'],
  [1022, '百變怪', 'common', 132, '20005'],
  [1023, '喵喵', 'common', 52, '20004'],
  [1024, '卡比獸', 'rare', 143, '20007'],
  [1047, '皮卡丘ex', 'legendary', 25, '19959'],
  [1055, '超夢ex', 'legendary', 150, '19967'],
  [1057, '夢幻ex', 'legendary', 151, '19969'],
  [1059, '仙子伊布ex', 'legendary', 700, '19971'],
  [1076, '耿鬼ex', 'epic', 94, '19988'],
  [1081, '基拉祈ex', 'epic', 385, '19993'],
  [1088, '暴飛龍ex', 'epic', 373, '20000'],
  [1097, '洛奇亞', 'legendary', 249, '20009'],
  [1126, '皮卡丘ex', 'legendary', 25, '20037'],
  [1135, '夢幻ex', 'legendary', 151, '20043'],
  [1137, '噴火龍', 'legendary', 6, '20045'],
  [1142, '洛奇亞', 'legendary', 249, '20050'],
  [1150, '耿鬼', 'epic', 94, '20058'],
  [1163, '夢幻VMAX', 'legendary', 151, '20070'],
  [1164, '阿爾宙斯VSTAR', 'legendary', 493, '20071'],
  [1165, '鯉魚王', 'rare', 129, '20072'],
];

/** 霸王花 is not in the M6a public list; use a full Jungle Vileplume card scan. */
const VILEPLUME_CARD = 'https://images.pokemontcg.io/base2/15.png';

export const PTCG_TEMPLATES: PtcgTemplate[] = [
  ...rows.map(([id, name, rarity, dex, file]) => ({
    id,
    name,
    rarity,
    icon: '🃏',
    series: 'M6a 30th CELEBRATION',
    imageUrl: CARD(file),
    dex,
  })),
  {
    id: 1020,
    name: '霸王花',
    rarity: 'rare',
    icon: '🃏',
    series: 'M6a 30th CELEBRATION',
    imageUrl: VILEPLUME_CARD,
    dex: 45,
  },
  ...OLDER_CARDS.map(([id, name, rarity, dex, imageUrl, series]) => ({
    id,
    name,
    rarity,
    icon: '🃏',
    series,
    imageUrl,
    dex,
  })),
];

export function findPtcgTemplate(cardId: number): PtcgTemplate | undefined {
  return PTCG_TEMPLATES.find(t => t.id === cardId);
}

export function ptcgPoolByRarity(rarity: Rarity): PtcgTemplate[] {
  return PTCG_TEMPLATES.filter(t => t.rarity === rarity);
}
