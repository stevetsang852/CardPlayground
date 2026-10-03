/** Public KADO pages only: https://www.kado.hk/database and /database/tw/M6a (2026-09-25). */
export const KADO_PACKS = [
  { id: 'kado-m6a', name: '擴充包「30th CELEBRATION」', sourceUrl: 'https://www.kado.hk/database/tw/M6a', cardCount: 168, locale: 'tw', type: 'basic', cost: 100, currencyType: 'soft' },
  { id: 'kado-30th-jp', name: '30th CELEBRATION', sourceUrl: 'https://www.kado.hk/set/9f21c00e-4e89-42d7-b56a-1173d1974cee', cardCount: 176, locale: 'jp', type: 'basic', cost: 100, currencyType: 'soft' },
  { id: 'kado-storm', name: 'Storm Emeralda', sourceUrl: 'https://www.kado.hk/set/7f8f91f2-a580-412c-8cd9-4335cacbc3e2', cardCount: 113, locale: 'jp', type: 'basic', cost: 100, currencyType: 'soft' },
];

const PACK = 'kado-m6a';
const u = (id: string) => `https://www.kado.hk/card/tw/${id}`;

export const KADO_M6A_CARDS: Array<{ id: string; name: string; number: string; packId: string; sourceUrl: string }> = [
  ['68d517a2-ae26-4965-a47a-c6ec5262a8cd', '001', '蛋蛋'],
  ['de5755f4-d953-45b5-9349-87f685e14b3d', '002', '阿羅拉 椰蛋樹'],
  ['41c2cd1d-677a-46e9-b110-e1a3b2c1e87a', '003', '電螢蟲'],
  ['5ce92fad-527c-4d28-b52c-197c9afa3fe1', '004', '甜甜螢'],
  ['6d3c810e-6ae5-4bf8-9002-c63510cc8183', '005', '彩粉蝶'],
  ['511f2220-912a-4a3f-9c07-7de9f0b022f2', '006', '火焰鳥'],
  ['317ba150-7755-4083-8c6f-d30cb42e9b0f', '007', '鳳王'],
  ['ec7d8806-ece0-4dad-a68e-8a8aad11b81b', '008', '萊希拉姆'],
  ['df0ceff2-a9cb-48a0-bc23-ccef4c4b5afb', '009', '呆火鱷ex'],
  ['a9fccfc9-969a-44dd-a24e-56097fa61056', '010', '呆呆獸'],
  ['d70d1eb3-e926-40e4-be8c-fb1e13e67550', '011', '拉普拉斯'],
  ['711524da-04b9-48ec-998d-f7a2242dd269', '012', '急凍鳥'],
  ['ffcd1fb3-6f57-41ab-b3a4-3022956a2d16', '013', '蓋歐卡'],
  ['e23f770a-a17e-4c75-bfe2-d3bdcc40ac0e', '014', '帕路奇亞'],
  ['7aead714-07fe-4ef5-bf63-1a7118fe212e', '015', '甲賀忍蛙ex'],
  ['664ff74b-e61c-42a2-a3fe-79374630b3cb', '017', '皮卡丘'],
  ['044c47cd-0174-4ecb-9b66-4564b86c1539', '047', '皮卡丘ex'],
  ['d999b850-3321-488e-8e5c-196cc2b31c10', '055', '超夢ex'],
  ['532a7341-ecbd-4217-8d8a-604ab9ee2138', '057', '夢幻ex'],
  ['97e60841-bc9d-40a6-a141-bf01014861ba', '059', '仙子伊布ex'],
  ['6400214c-0f8f-43f8-8226-d66311dbb494', '076', '耿鬼ex'],
  ['bff8e877-9b85-41a8-84af-c015ed993b13', '081', '基拉祈ex'],
  ['74e62204-ab52-4aff-83af-a94467af6818', '088', '暴飛龍ex'],
  ['44ab703d-20a1-4154-8940-35f3e665cc02', '097', '洛奇亞'],
  ['aed79bd2-4e51-4675-b025-4d480db626af', '126', '皮卡丘ex'],
  ['ff8eddac-3bf2-41d4-b42d-b9d2ef10eecb', '135', '夢幻ex'],
  ['9683982f-bbbf-4fa4-8310-7ad900126365', '137', '噴火龍'],
  ['937a2de7-9b92-4ee9-805c-50ae1ac7c5b4', '142', '洛奇亞'],
  ['256b4a7d-6ecd-490c-aa10-3ce67c28cfcb', '150', '耿鬼'],
  ['e003022c-89cc-4dc1-88a6-d80646196b62', '163', '夢幻VMAX'],
  ['b20c7fe8-5d90-418a-90fa-6cb48cb30834', '164', '阿爾宙斯VSTAR'],
  ['93d00992-ad1e-448c-956a-c25fde7072be', '165', '鯉魚王'],
].map(([id, number, name]) => ({
  id: `tw_${id}`,
  name,
  number,
  packId: PACK,
  sourceUrl: u(id),
}));
