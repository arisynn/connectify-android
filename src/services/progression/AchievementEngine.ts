/**
 * Multi-Tier Achievement & Account Milestone Engine
 * Owned by: @progression-designer
 */

import {
  ACCOUNT_MILESTONES,
  ACHIEVEMENTS_CATALOG,
  type AccountMilestoneDefinition,
  type AchievementDefinition,
  type AchievementTierDefinition,
} from '../../config/progression.config';
import type { BoosterId, ConnectifySaveDataV1, GameModeId } from '../../types/persistence.types';

export interface ClaimableAchievementItem {
  definition: AchievementDefinition;
  tierIndex: number;
  tier: AchievementTierDefinition;
  progress: number;
}

export interface AchievementClaimOutcome {
  error: string | null;
  tierIndex: number;
  coinsDelta: number;
  xpDelta: number;
  unlockedTheme: string | null;
}

export function getClaimedTierCount(data: ConnectifySaveDataV1, achievementId: string): number {
  const raw = data.achievements.claimedTiers?.[achievementId] ?? 0;
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export function achievementsForGame(game: GameModeId | 'hub'): AchievementDefinition[] {
  return ACHIEVEMENTS_CATALOG.filter((a) => a.game === game);
}

export function isAchievementReady(data: ConnectifySaveDataV1, def: AchievementDefinition): boolean {
  const tierIndex = getClaimedTierCount(data, def.id);
  if (tierIndex >= def.tiers.length) return false;
  return def.getProgress(data) >= def.tiers[tierIndex].target;
}

export function getClaimableAchievements(data: ConnectifySaveDataV1): ClaimableAchievementItem[] {
  const items: ClaimableAchievementItem[] = [];
  for (const def of ACHIEVEMENTS_CATALOG) {
    const tierIndex = getClaimedTierCount(data, def.id);
    if (tierIndex >= def.tiers.length) continue;
    const progress = def.getProgress(data);
    const tier = def.tiers[tierIndex];
    if (progress >= tier.target) {
      items.push({ definition: def, tierIndex, tier, progress });
    }
  }
  return items;
}

export function getNewlyUnlockedAchievementIds(
  before: ConnectifySaveDataV1,
  after: ConnectifySaveDataV1,
): string[] {
  const beforeSet = new Set(
    getClaimableAchievements(before).map((a) => `${a.definition.id}:${a.tierIndex}`),
  );
  return getClaimableAchievements(after)
    .filter((a) => !beforeSet.has(`${a.definition.id}:${a.tierIndex}`))
    .map((a) => a.definition.id);
}

/**
 * Claims the next earned tier of an achievement.
 */
export function claimAchievementReward(
  draft: ConnectifySaveDataV1,
  achievementId: string,
  nowMs: number = Date.now(),
): AchievementClaimOutcome {
  const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === achievementId);
  if (!def) {
    return { error: 'ACHIEVEMENT_NOT_FOUND', tierIndex: 0, coinsDelta: 0, xpDelta: 0, unlockedTheme: null };
  }

  const tierIndex = getClaimedTierCount(draft, def.id);
  if (tierIndex >= def.tiers.length) {
    return { error: 'ACHIEVEMENT_MAXED', tierIndex, coinsDelta: 0, xpDelta: 0, unlockedTheme: null };
  }

  const tier = def.tiers[tierIndex];
  if (def.getProgress(draft) < tier.target) {
    return { error: 'ACHIEVEMENT_NOT_COMPLETE', tierIndex, coinsDelta: 0, xpDelta: 0, unlockedTheme: null };
  }

  draft.achievements.claimedTiers[def.id] = tierIndex + 1;
  draft.achievements.claimHistory[`${def.id}:${tierIndex}`] = nowMs;

  let unlockedTheme: string | null = null;
  if (tier.rewardTheme && !draft.inventory.unlockedThemes.includes(tier.rewardTheme)) {
    draft.inventory.unlockedThemes.push(tier.rewardTheme);
    if (!draft.inventory.unseenThemes.includes(tier.rewardTheme)) {
      draft.inventory.unseenThemes.push(tier.rewardTheme);
    }
    draft.statistics.totalThemesUnlocked = draft.inventory.unlockedThemes.length;
    unlockedTheme = tier.rewardTheme;
  }

  if (tier.rewardBoosters) {
    for (const [boosterId, qty] of Object.entries(tier.rewardBoosters) as Array<[BoosterId, number]>) {
      if (qty > 0) {
        draft.inventory.boosters[boosterId] = Math.min(999, (draft.inventory.boosters[boosterId] ?? 0) + qty);
      }
    }
  }

  return {
    error: null,
    tierIndex,
    coinsDelta: tier.rewardCoins,
    xpDelta: tier.rewardXp,
    unlockedTheme,
  };
}

/**
 * Grants any account-level milestone rewards newly reached by `draft.profile.level`.
 * Deduplicated against `draft.transactionLog.processedKeys` (`milestone:<id>`).
 */
export function evaluateAccountMilestones(draft: ConnectifySaveDataV1): {
  grantedMilestones: AccountMilestoneDefinition[];
  coinsDelta: number;
} {
  const grantedMilestones: AccountMilestoneDefinition[] = [];
  let coinsDelta = 0;

  for (const ms of ACCOUNT_MILESTONES) {
    if (draft.profile.level < ms.accountLevel) continue;
    const key = `milestone:${ms.id}`;
    if (draft.transactionLog.processedKeys.includes(key)) continue;

    draft.transactionLog.processedKeys = [key, ...draft.transactionLog.processedKeys].slice(0, 500);
    grantedMilestones.push(ms);
    coinsDelta += ms.rewardCoins;

    if (ms.rewardTheme && !draft.inventory.unlockedThemes.includes(ms.rewardTheme)) {
      draft.inventory.unlockedThemes.push(ms.rewardTheme);
      if (!draft.inventory.unseenThemes.includes(ms.rewardTheme)) {
        draft.inventory.unseenThemes.push(ms.rewardTheme);
      }
    }
    if (ms.rewardCosmetic && !draft.inventory.ownedCosmetics.includes(ms.rewardCosmetic)) {
      draft.inventory.ownedCosmetics.push(ms.rewardCosmetic);
    }
    if (ms.rewardAvatar && !draft.inventory.unlockedAvatars.includes(ms.rewardAvatar)) {
      draft.inventory.unlockedAvatars.push(ms.rewardAvatar);
    }
    if (ms.rewardBoosters) {
      for (const [boosterId, qty] of Object.entries(ms.rewardBoosters) as Array<[BoosterId, number]>) {
        if (qty > 0) {
          draft.inventory.boosters[boosterId] = Math.min(999, (draft.inventory.boosters[boosterId] ?? 0) + qty);
        }
      }
    }
  }

  draft.statistics.totalThemesUnlocked = draft.inventory.unlockedThemes.length;
  return { grantedMilestones, coinsDelta };
}
