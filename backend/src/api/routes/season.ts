import { Router, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../../config/database';
import { SeasonService } from '../../services/seasonService';

const router = Router();

/**
 * GET /api/v1/season/current
 *
 * Returns the current active season, the authenticated player's battle pass
 * progress, and the number of days remaining in the season.
 *
 * Validates Requirements:
 * - 7.1: New season every 3 months with exclusive content
 * - 7.3: Battle pass with free and paid reward tracks
 */
router.get('/current', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.uid;
    const service = new SeasonService(getDatabase());

    const season = await service.getCurrentSeason();
    if (!season) {
      throw new AppError(404, 'NO_ACTIVE_SEASON', 'No active season found', false);
    }

    const battlePass = await service.getBattlePassProgress(playerId);

    const now = new Date();
    const endDate = new Date(season.endDate);
    const msRemaining = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    res.json({ season, battlePass, daysRemaining });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/season/missions
 *
 * Returns the authenticated player's daily and weekly missions along with
 * the next reset times (daily at midnight UTC, weekly on Monday UTC).
 *
 * Validates Requirements:
 * - 8.3: Generate 3 daily missions at midnight UTC
 * - 8.4: Generate 3 weekly missions at week start
 */
router.get('/missions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.uid;
    const service = new SeasonService(getDatabase());

    const [dailyMissions, weeklyMissions] = await Promise.all([
      service.generateDailyMissions(playerId),
      service.generateWeeklyMissions(playerId),
    ]);

    // Calculate next daily reset (next midnight UTC)
    const now = new Date();
    const nextDailyReset = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ));

    // Calculate next weekly reset (next Monday UTC)
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
    const nextWeeklyReset = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
    ));

    res.json({
      dailyMissions,
      weeklyMissions,
      resetTimes: {
        daily: nextDailyReset.toISOString(),
        weekly: nextWeeklyReset.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/season/missions/:missionId/claim
 *
 * Claims the reward for a completed mission. Validates the mission is
 * completed and not yet claimed, grants rewards, and adds battle pass XP.
 *
 * Validates Requirements:
 * - 8.5: Players can claim rewards for completed missions
 * - 8.6: Claimed missions grant battle pass XP
 */
router.post('/missions/:missionId/claim', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { missionId } = req.params;
    const playerId = req.user!.uid;
    const service = new SeasonService(getDatabase());

    const { rewards, newBattlePassXP } = await service.claimMission(playerId, missionId);

    res.json({ success: true, rewards, newBattlePassXP });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Mission is not yet completed') {
        return next(new AppError(400, 'MISSION_NOT_COMPLETED', error.message, false));
      }
      if (error.message === 'Mission rewards already claimed') {
        return next(new AppError(409, 'MISSION_ALREADY_CLAIMED', error.message, false));
      }
      if (error.message.includes('not found')) {
        return next(new AppError(404, 'MISSION_NOT_FOUND', error.message, false));
      }
    }
    next(error);
  }
});

/**
 * GET /api/v1/season/login-rewards
 *
 * Returns the player's consecutive login day count, whether today's reward
 * has been claimed, and what the next reward will be.
 *
 * Validates Requirements:
 * - 8.1: Daily login rewards with increasing value for consecutive days
 */
router.get('/login-rewards', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.uid;
    const db = getDatabase();

    const playerDoc = await db.collection('players').doc(playerId).get();
    if (!playerDoc.exists) {
      throw new AppError(404, 'PLAYER_NOT_FOUND', `Player ${playerId} not found`, false);
    }

    const player = playerDoc.data() as any;
    const consecutiveDays: number = player.consecutiveLoginDays || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysClaimed: boolean = player.lastLoginRewardDate === todayStr;

    // Calculate next reward based on what the streak will be when claimed
    const nextStreak = todaysClaimed ? consecutiveDays + 1 : consecutiveDays + 1;
    const baseAmount = 50;
    const bonusPerDay = 25;
    const maxBonus = 500;
    const nextQuantity = Math.min(baseAmount + (nextStreak - 1) * bonusPerDay, maxBonus);
    const nextReward = { type: 'soft_currency' as const, quantity: nextQuantity };

    res.json({ consecutiveDays, todaysClaimed, nextReward });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/season/login-rewards/claim
 *
 * Claims the daily login reward for the authenticated player. Updates the
 * consecutive login streak counter.
 *
 * Validates Requirements:
 * - 8.1: Daily login rewards with increasing value for consecutive days
 * - 8.2: Reset streak if player misses a day
 */
router.post('/login-rewards/claim', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.user!.uid;
    const service = new SeasonService(getDatabase());

    const { reward, newStreak, alreadyClaimed } = await service.claimLoginReward(playerId);

    if (alreadyClaimed) {
      return next(new AppError(409, 'ALREADY_CLAIMED', 'Login reward already claimed today', false));
    }

    res.json({ success: true, reward, newStreak });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return next(new AppError(404, 'PLAYER_NOT_FOUND', error.message, false));
    }
    next(error);
  }
});

export default router;
