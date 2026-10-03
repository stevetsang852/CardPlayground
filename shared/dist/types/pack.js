"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProbabilities = validateProbabilities;
exports.validateRarities = validateRarities;
exports.validatePackConfiguration = validatePackConfiguration;
/**
 * Valid card rarities that can be referenced in pack configurations
 */
const VALID_RARITIES = ['common', 'rare', 'epic', 'legendary'];
/**
 * Validates that probability values sum to 100% (1.0) within a small tolerance
 * Validates: Requirements 13.5
 */
function validateProbabilities(probabilities) {
    const errors = [];
    // Check that all probabilities are non-negative
    const entries = Object.entries(probabilities);
    for (const [rarity, probability] of entries) {
        if (probability < 0) {
            errors.push({
                field: `probabilities.${rarity}`,
                message: `Probability for ${rarity} must be non-negative, got ${probability}`
            });
        }
        if (probability > 1) {
            errors.push({
                field: `probabilities.${rarity}`,
                message: `Probability for ${rarity} must not exceed 1.0 (100%), got ${probability}`
            });
        }
    }
    // Calculate sum of probabilities
    const sum = entries.reduce((total, [_, prob]) => total + prob, 0);
    // Allow small floating-point tolerance (0.0001 = 0.01%)
    const tolerance = 0.0001;
    const expectedSum = 1.0;
    if (Math.abs(sum - expectedSum) > tolerance) {
        errors.push({
            field: 'probabilities',
            message: `Probabilities must sum to 100% (1.0), got ${(sum * 100).toFixed(2)}%`
        });
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Validates that all referenced card rarities exist in the CardRarity enumeration
 * Validates: Requirements 13.6
 */
function validateRarities(probabilities) {
    const errors = [];
    const rarityKeys = Object.keys(probabilities);
    for (const rarity of rarityKeys) {
        if (!VALID_RARITIES.includes(rarity)) {
            errors.push({
                field: `probabilities.${rarity}`,
                message: `Invalid rarity '${rarity}'. Must be one of: ${VALID_RARITIES.join(', ')}`
            });
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Validates a complete PackConfiguration
 * Validates: Requirements 1.1, 1.2, 1.4, 13.5, 13.6
 */
function validatePackConfiguration(config) {
    const errors = [];
    // Validate probabilities sum to 100%
    const probResult = validateProbabilities(config.probabilities);
    errors.push(...probResult.errors);
    // Validate rarity enumeration
    const rarityResult = validateRarities(config.probabilities);
    errors.push(...rarityResult.errors);
    return {
        valid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=pack.js.map