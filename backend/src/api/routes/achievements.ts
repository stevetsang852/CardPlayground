import { Router, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../../config/database';
import { AchievementService } from '../../services/achievementService';

const router = Router();

/**
 * GET /api/v1/achievements
 *
 * Return all achievements enriched with the authenticated player's progress.
 * Secret achievements that are not yet unlocked have their requirement hidden.
 *
 * Validates Requirements:
 * - 6.1: Players can earn achievements for completing card series
 * - 6.2: Players can earn achievements for collecting legendary cards
 * - 6.3: Players can earn achievements for gallery likes
 * - 6.4: Players can earn achievements for merchant streaks
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.uid;
    const achievementService = new AchievementService(getDatabase());

    const achievements = await achievementService.getAchievements(playerId);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const totalCount = achievements.length;

    res.json({ achievements, unlockedCount, totalCount });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/achievements/:achievementId
 *
 * Return a single achievement with the authenticated player's progress details.
 *
 * Validates Requirements:
 * - 6.5: Players can view progress toward each achievement as a percentage
 */
router.get('/:achievementId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { achievementId } = req.params;
    const playerId = req.user!.uid;
    const achievementService = new AchievementService(getDatabase());

    const achievements = await achievementService.getAchievements(playerId);
    const achievement = achievements.find((a) => a.id === achievementId);

    if (!achievement) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', `Achievement ${achievementId} not found`, false);
    }

    const progress = await achievementService.getAchievementProgress(playerId, achievementId);
    const maxProgress = achievement.requirement?.target ?? 1;
    const unlocked = achievement.unlocked ?? false;

    res.json({ achievement, progress, maxProgress, unlocked });
  } catch (error) {
    next(error);
  }
});

export default router;
