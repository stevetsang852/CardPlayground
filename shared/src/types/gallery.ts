export interface Gallery {
  playerId: string;
  cardIds: string[];             // Max 50
  
  // Social metrics
  totalLikes: number;
  totalComments: number;
  
  // Scores for leaderboards
  totalScore: number;            // Sum of card scores
  rarityScore: number;           // Weighted by rarity
  creativityScore: number;       // Based on likes + comments
  
  // Customization
  skinId?: string;               // Cosmetic gallery skin
  layout?: string;               // Display layout preference
  
  updatedAt: string;
}

export interface GalleryInteraction {
  id: string;
  galleryPlayerId: string;
  interactingPlayerId: string;
  type: 'like' | 'comment';
  
  // For comments
  text?: string;
  
  createdAt: string;
}
