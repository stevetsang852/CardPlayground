import type { CardTemplate, Rarity } from '../cardData';

const ART = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;

export interface PtcgTemplate extends CardTemplate {
  imageUrl: string;
  dex: number;
}

const rows: Array<[number, string, Rarity, number]> = [
  [1001, '蛋蛋', 'common', 102],
  [1002, '阿羅拉 椰蛋樹', 'common', 103],
  [1003, '電螢蟲', 'common', 313],
  [1004, '甜甜螢', 'common', 314],
  [1005, '彩粉蝶', 'rare', 666],
  [1006, '火焰鳥', 'rare', 146],
  [1007, '鳳王', 'epic', 250],
  [1008, '萊希拉姆', 'epic', 643],
  [1009, '呆火鱷ex', 'epic', 909],
  [1010, '呆呆獸', 'common', 79],
  [1011, '拉普拉斯', 'rare', 131],
  [1012, '急凍鳥', 'rare', 144],
  [1013, '蓋歐卡', 'epic', 382],
  [1014, '帕路奇亞', 'epic', 484],
  [1015, '甲賀忍蛙ex', 'epic', 658],
  [1017, '皮卡丘', 'rare', 25],
  [1047, '皮卡丘ex', 'legendary', 25],
  [1055, '超夢ex', 'legendary', 150],
  [1057, '夢幻ex', 'legendary', 151],
  [1059, '仙子伊布ex', 'legendary', 700],
  [1076, '耿鬼ex', 'epic', 94],
  [1081, '基拉祈ex', 'epic', 385],
  [1088, '暴飛龍ex', 'epic', 373],
  [1097, '洛奇亞', 'legendary', 249],
  [1126, '皮卡丘ex', 'legendary', 25],
  [1135, '夢幻ex', 'legendary', 151],
  [1137, '噴火龍', 'legendary', 6],
  [1142, '洛奇亞', 'legendary', 249],
  [1150, '耿鬼', 'epic', 94],
  [1163, '夢幻VMAX', 'legendary', 151],
  [1164, '阿爾宙斯VSTAR', 'legendary', 493],
  [1165, '鯉魚王', 'rare', 129],
  [1018, '閃電鳥', 'rare', 145],
  [1019, '捷克羅姆', 'epic', 644],
  [1020, '霸王花', 'rare', 869],
  [1021, '伊布', 'common', 133],
  [1022, '百變怪', 'common', 132],
  [1023, '喵喵', 'common', 52],
  [1024, '卡比獸', 'rare', 143],
];

export const PTCG_TEMPLATES: PtcgTemplate[] = rows.map(([id, name, rarity, dex]) => ({
  id,
  name,
  rarity,
  icon: '🃏',
  series: 'M6a 30th CELEBRATION',
  imageUrl: ART(dex),
  dex,
}));

export function findPtcgTemplate(cardId: number): PtcgTemplate | undefined {
  return PTCG_TEMPLATES.find(t => t.id === cardId);
}

export function ptcgPoolByRarity(rarity: Rarity): PtcgTemplate[] {
  return PTCG_TEMPLATES.filter(t => t.rarity === rarity);
}
