export type PackType = 'basic' | 'premium' | 'legendary';
export type CurrencyType = 'soft' | 'hard';
export interface PackConfiguration {
    id: string;
    name: string;
    type: PackType;
    cost: number;
    currencyType: CurrencyType;
    probabilities: {
        legendary: number;
        epic: number;
        rare: number;
        common: number;
    };
    guaranteedEpicAfter?: number;
    guaranteedLegendaryAfter?: number;
    purchaseLimit?: number;
    limitResetPeriod?: 'daily' | 'weekly' | 'monthly';
    availableFrom?: string;
    availableUntil?: string;
    seasonExclusive?: boolean;
}
export interface PackValidationError {
    field: string;
    message: string;
}
export interface PackValidationResult {
    valid: boolean;
    errors: PackValidationError[];
}
/**
 * Validates that probability values sum to 100% (1.0) within a small tolerance
 * Validates: Requirements 13.5
 */
export declare function validateProbabilities(probabilities: PackConfiguration['probabilities']): PackValidationResult;
/**
 * Validates that all referenced card rarities exist in the CardRarity enumeration
 * Validates: Requirements 13.6
 */
export declare function validateRarities(probabilities: PackConfiguration['probabilities']): PackValidationResult;
/**
 * Validates a complete PackConfiguration
 * Validates: Requirements 1.1, 1.2, 1.4, 13.5, 13.6
 */
export declare function validatePackConfiguration(config: PackConfiguration): PackValidationResult;
//# sourceMappingURL=pack.d.ts.map