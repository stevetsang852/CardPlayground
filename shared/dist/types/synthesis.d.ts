export type SynthesisType = 'normal' | 'advanced' | 'gambler' | 'legendary';
export interface SynthesisRecipe {
    type: SynthesisType;
    requiredCards: {
        count: number;
        mustBeIdentical: boolean;
        rarityRequirement?: string;
    };
    requiredMaterials?: {
        materialId: string;
        count: number;
    }[];
    outputRarity: string;
    baseSuccessRate: number;
    softCurrencyCost?: number;
}
//# sourceMappingURL=synthesis.d.ts.map