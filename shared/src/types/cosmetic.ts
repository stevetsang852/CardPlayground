export type CosmeticType = 'gallery_skin' | 'card_back' | 'visual_effect';

export interface CosmeticItem {
  id: string;
  name: string;
  type: CosmeticType;
  cost: number; // in hard currency
  description: string;
}
