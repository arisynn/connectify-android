/**
 * Milestone Visual Rewards Evaluation Service
 * Owned by @art-director
 *
 * Determines which Milestone Reward Themes & Cosmetics a player has earned
 * from Onet/Match 3 level progression, achievements, and login streaks.
 */

import type { ConnectifySaveDataV1 } from '@/types/persistence.types';
import type { ArtRewardUnlockItem } from '@/types/theme.types';

export const ART_REWARDS_CATALOG: readonly ArtRewardUnlockItem[] = [
  {
    id: 'reward_sakura',
    targetType: 'theme',
    name: 'Sakura Reward',
    ruleType: 'level_any',
    threshold: 3,
    description: 'Capai Level 3 di Onet Connect atau Match 3',
    previewUrl: '/art/sakura/0.webp',
  },
  {
    id: 'reward_bakery',
    targetType: 'theme',
    name: 'Bakery Reward',
    ruleType: 'level_any',
    threshold: 5,
    description: 'Capai Level 5 di Onet Connect atau Match 3',
    previewUrl: '/art/bakery/0.webp',
  },
  {
    id: 'reward_galaxy',
    targetType: 'theme',
    name: 'Galaxy Reward',
    ruleType: 'achievements',
    threshold: 3,
    description: 'Klaim 3 tier Prestasi apapun',
    previewUrl: '/art/galaxy/0.webp',
  },
  {
    id: 'reward_meadow',
    targetType: 'theme',
    name: 'Meadow Reward',
    ruleType: 'login_streak',
    threshold: 3,
    description: 'Login 3 hari beruntun',
    previewUrl: '/art/meadow/0.webp',
  },
  {
    id: 'reward_fruit',
    targetType: 'theme',
    name: 'Fruit Reward',
    ruleType: 'login_streak',
    threshold: 7,
    description: 'Login 7 hari beruntun',
    previewUrl: '/art/fruit/0.webp',
  },
  {
    id: 'reward_arrow_mint',
    targetType: 'surface',
    name: 'Panah Mint',
    ruleType: 'total_wins',
    threshold: 5,
    description: 'Menangkan 5 level total',
    previewUrl: '/art/skins/arrow_mint.webp',
  },
  {
    id: 'reward_arrow_sunset',
    targetType: 'surface',
    name: 'Panah Senja',
    ruleType: 'total_wins',
    threshold: 15,
    description: 'Menangkan 15 level total',
    previewUrl: '/art/skins/arrow_sunset.webp',
  },
  {
    id: 'reward_arrow_night',
    targetType: 'surface',
    name: 'Panah Malam',
    ruleType: 'total_wins',
    threshold: 30,
    description: 'Menangkan 30 level total',
    previewUrl: '/art/skins/arrow_night.webp',
  },
];

export function isArtRewardSatisfied(
  item: ArtRewardUnlockItem,
  saveData: Readonly<ConnectifySaveDataV1>,
): boolean {
  const maxGameLevel = Math.max(
    saveData.progression.onet.highestUnlockedLevel,
    saveData.progression.match3.highestUnlockedLevel,
  );
  const totalAchievementsClaimed = Object.keys(saveData.achievements.claimedTiers).length;
  const bestStreak = Math.max(
    saveData.profile.loginStreak.currentStreak,
    saveData.profile.loginStreak.bestStreak,
  );
  const totalWins = saveData.statistics.totalWins;

  switch (item.ruleType) {
    case 'level_any':
      return maxGameLevel >= item.threshold;
    case 'achievements':
      return totalAchievementsClaimed >= item.threshold;
    case 'login_streak':
      return bestStreak >= item.threshold;
    case 'total_wins':
      return totalWins >= item.threshold;
    default:
      return false;
  }
}

export function getNewlyEarnedRewardThemes(
  saveData: Readonly<ConnectifySaveDataV1>,
): ArtRewardUnlockItem[] {
  const ownedThemes = new Set(saveData.inventory.unlockedThemes);
  const ownedCosmetics = new Set(saveData.inventory.ownedCosmetics);

  return ART_REWARDS_CATALOG.filter((item) => {
    if (!isArtRewardSatisfied(item, saveData)) return false;
    if (item.targetType === 'theme') return !ownedThemes.has(item.id);
    return !ownedCosmetics.has(item.id);
  });
}
