// ==========================================
// XP CONFIGURATION
// ==========================================

// Multiplier for the XP curve.
// 1.0 = Standard Minecraft
// 2.0 = Levels require 2x more XP (slower leveling)
export const XP_CURVE_MULTIPLIER = 2.0;

export const XP_REWARDS = {
  DAILY_LOGIN: 50,
  FORUM_POST: 20,
  FORUM_REPLY: 5,
  SOCIAL_POST: 10,
  SOCIAL_COMMENT: 2,
  LIKE_RECEIVED: 1,
  REFERRAL: 100,
};

// ==========================================
// XP FORMULAS
// ==========================================

/**
 * Calculates the level for a given amount of XP using the modern Minecraft formula.
 * Adjusted by XP_CURVE_MULTIPLIER.
 */
export function getLevelForXp(xp: number): number {
  // Adjust XP to the base curve
  const baseXp = xp / XP_CURVE_MULTIPLIER;
  
  // Solving the quadratic equations for Level
  // 0-16: XP = L^2 + 6L
  // 17-31: XP = 2.5L^2 - 40.5L + 360
  // 32+: XP = 4.5L^2 - 162.5L + 2220

  let level = 0;
  
  // For L <= 16: L^2 + 6L - XP = 0
  // L = (-6 + sqrt(36 + 4*XP)) / 2
  const levelLow = (-6 + Math.sqrt(36 + 4 * baseXp)) / 2;
  
  if (levelLow <= 16) {
    return Math.floor(levelLow);
  }
  
  // For 17 <= L <= 31: 2.5L^2 - 40.5L + (360 - XP) = 0
  // L = (40.5 + sqrt(40.5^2 - 4*2.5*(360 - XP))) / 5
  const discMid = 10 * baseXp - 1959.75;
  if (discMid >= 0) {
    const levelMid = (40.5 + Math.sqrt(discMid)) / 5;
    if (levelMid <= 31) {
      return Math.floor(levelMid);
    }
  }
  
  // For L >= 32: 4.5L^2 - 162.5L + (2220 - XP) = 0
  // L = (162.5 + sqrt(162.5^2 - 4*4.5*(2220 - XP))) / 9
  const discHigh = 18 * baseXp - 13553.75;
  if (discHigh >= 0) {
    const levelHigh = (162.5 + Math.sqrt(discHigh)) / 9;
    return Math.floor(levelHigh);
  }
  
  return 0;
}

/**
 * Calculates the total XP required to reach a specific level.
 */
export function getXpForLevel(level: number): number {
  let baseXp = 0;
  
  if (level <= 16) {
    baseXp = Math.pow(level, 2) + 6 * level;
  } else if (level <= 31) {
    baseXp = 2.5 * Math.pow(level, 2) - 40.5 * level + 360;
  } else {
    baseXp = 4.5 * Math.pow(level, 2) - 162.5 * level + 2220;
  }
  
  return Math.floor(baseXp * XP_CURVE_MULTIPLIER);
}

/**
 * Calculates progress to next level (0-100).
 */
export function getLevelProgress(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  const level = getLevelForXp(xp);
  const startXp = getXpForLevel(level);
  const nextXp = getXpForLevel(level + 1);
  
  const levelXp = xp - startXp;
  const requiredXp = nextXp - startXp;
  
  // Prevent division by zero
  if (requiredXp === 0) return { level, currentXp: xp, nextLevelXp: nextXp, progress: 100 };
  
  const progress = (levelXp / requiredXp) * 100;
  
  return {
    level,
    currentXp: xp,
    nextLevelXp: nextXp,
    progress: Math.min(100, Math.max(0, progress))
  };
}
