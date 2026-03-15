import { Router, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../../config/database';
import { SocialService } from '../../services/socialService';
import { LeaderboardService } from '../../services/leaderboardService';
import { GalleryValidator } from '@shared/gallery/GalleryValidator';
import { LeaderboardType } from '@shared/types/leaderboard';

const router = Router();

/**
 * PUT /api/v1/social/gallery
 *
 * Update the authenticated player's gallery with a new set of card IDs.
 * Validates the card list (max 50), then persists the gallery and
 * recalculates all leaderboard scores.
 *
 * Validates Requirements:
 * - 4.1: Players can curate a gallery of up to 50 cards for public display
 */
router.put('/gallery', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cardIds } = req.body;

    // Validate that cardIds is present and is an array
    if (!cardIds || !Array.isArray(cardIds)) {
      throw new AppError(
        400,
        'INVALID_CARD_IDS',
        'cardIds must be an array of card ID strings',
        false
      );
    }

    // Validate gallery size constraint (max 50 cards)
    const validator = new GalleryValidator();
    const validationResult = validator.validateGalleryUpdate(cardIds);

    if (!validationResult.valid) {
      throw new AppError(
        400,
        'GALLERY_SIZE_EXCEEDED',
        validationResult.error ?? 'Gallery validation failed',
        false
      );
    }

    // Get authenticated player ID from auth middleware
    const playerId = req.user!.uid;

    // Update gallery and recalculate scores
    const socialService = new SocialService(getDatabase());
    const gallery = await socialService.updateGallery(playerId, cardIds);

    res.json({ success: true, gallery });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/social/gallery/:playerId
 *
 * Retrieve a player's public gallery and check if the authenticated viewer
 * can like it (hasn't liked in the last 24 hours).
 *
 * Validates Requirements:
 * - 4.2: Players can view other players' galleries
 * - 4.3: Players can like a gallery once per 24 hours
 */
router.get('/gallery/:playerId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.user!.uid;

    const socialService = new SocialService(getDatabase());

    const gallery = await socialService.getGallery(playerId);

    if (!gallery) {
      throw new AppError(404, 'GALLERY_NOT_FOUND', `Gallery for player ${playerId} not found`, false);
    }

    const canLike = await socialService.canLikeGallery(viewerId, playerId);
    // hasLikedToday is the inverse of canLike when the viewer is not the owner,
    // but we also need to handle the self-view case (owner can never like their own)
    const hasLikedToday = viewerId !== playerId ? !canLike : false;

    res.json({ gallery, canLike, hasLikedToday });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/social/gallery/:playerId/like
 *
 * Like a player's gallery. Enforces a 24-hour rate limit per viewer per gallery
 * and prevents self-likes. On success, grants soft currency to the gallery owner.
 *
 * Validates Requirements:
 * - 4.3: Players can like a gallery once per 24 hours
 * - 4.5: Gallery interactions grant soft currency rewards to the gallery owner
 */
router.post('/gallery/:playerId/like', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.user!.uid;

    // Prevent self-like before hitting the service
    if (viewerId === playerId) {
      throw new AppError(400, 'SELF_LIKE_NOT_ALLOWED', 'You cannot like your own gallery', false);
    }

    const socialService = new SocialService(getDatabase());

    try {
      await socialService.recordLike(viewerId, playerId);
    } catch (err: any) {
      if (err.message?.includes('rate limit') || err.message?.includes('once per 24 hours')) {
        throw new AppError(429, 'LIKE_RATE_LIMIT_EXCEEDED', err.message, false);
      }
      if (err.message?.includes('own gallery')) {
        throw new AppError(400, 'SELF_LIKE_NOT_ALLOWED', err.message, false);
      }
      throw err;
    }

    res.json({ success: true, rewardGranted: socialService.getLikeRewardAmount() });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/social/gallery/:playerId/comment
 *
 * Post a comment on a player's gallery. Grants soft currency to the gallery owner.
 *
 * Validates Requirements:
 * - 4.4: Players can comment on galleries
 * - 4.6: Gallery interactions grant soft currency rewards to the gallery owner
 */
router.post('/gallery/:playerId/comment', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const viewerId = req.user!.uid;
    const { text } = req.body;

    // Validate that text is present and non-empty
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new AppError(400, 'INVALID_COMMENT_TEXT', 'Comment text must be a non-empty string', false);
    }

    const socialService = new SocialService(getDatabase());
    const comment = await socialService.recordComment(viewerId, playerId, text.trim());

    res.json({ success: true, comment, rewardGranted: socialService.getCommentRewardAmount() });
  } catch (error) {
    next(error);
  }
});

export default router;

