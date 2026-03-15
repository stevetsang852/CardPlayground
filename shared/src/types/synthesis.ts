export type SynthesisType = 'normal' | 'advanced' | 'gambler' | 'legendary';

export interface SynthesisRecipe {
  type: SynthesisType;
  
  // Input requirements
  requiredCards: {
    count: number;
    mustBeIdentical: boolean;
    rarityRequirement?: string;
  };
  requiredMaterials?: {
    materialId: string;
    count: number;
  }[];
  
  // Output
  outputRarity: string;
  baseSuccessRate: number;
  
  // Costs
  softCurrencyCost?: number;
}
