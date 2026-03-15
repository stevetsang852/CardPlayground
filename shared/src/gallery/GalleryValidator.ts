/**
 * Maximum number of cards allowed in a gallery
 */
export const MAX_GALLERY_SIZE = 50;

/**
 * Result of a gallery validation
 */
export interface GalleryValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates gallery operations according to game rules
 */
export class GalleryValidator {
  /**
   * Validate that a gallery update respects the maximum size constraint
   * 
   * @param cardIds - Array of card IDs to be set in the gallery
   * @returns Validation result indicating success or failure with error message
   */
  validateGallerySize(cardIds: string[]): GalleryValidationResult {
    if (cardIds.length > MAX_GALLERY_SIZE) {
      return {
        valid: false,
        error: `Gallery cannot contain more than ${MAX_GALLERY_SIZE} cards. Attempted to add ${cardIds.length} cards.`,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Validate a gallery update attempt
   * This is the main validation method that should be called before updating a gallery
   * 
   * @param cardIds - Array of card IDs to be set in the gallery
   * @returns Validation result indicating success or failure with error message
   */
  validateGalleryUpdate(cardIds: string[]): GalleryValidationResult {
    // Currently only validates size, but can be extended with other validations
    return this.validateGallerySize(cardIds);
  }
}
