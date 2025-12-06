import { db } from '@/db';
import { users, achievements, userAchievements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLevelForXp, XP_CURVE_MULTIPLIER } from './xp-math';

// Re-export math functions for convenience in server-side code
export * from './xp-math';

// ==========================================
// DATABASE ACTIONS
// ==========================================

/**
 * Awards XP to a user for a specific action.
 */
export async function addWebsiteXp(
  userId: number,
  amount: number,
  source: string,
  description?: string
) {
  /*
  // 1. Record transaction
  // xpTransactions table missing in schema
  
  // 2. Get current user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      websiteXp: true,
      minecraftXp: true,
    }
  });
  
  if (!user) return;
  
  // 3. Calculate new totals
  const newWebsiteXp = (user.websiteXp || 0) + amount;
  const totalXp = newWebsiteXp + (user.minecraftXp || 0);
  const newLevel = getLevelForXp(totalXp);
  
  // 4. Update user
  await db.update(users)
    .set({ 
      websiteXp: newWebsiteXp,
      xp: totalXp,
      level: newLevel,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
    
  // 5. Check achievements (async, don't wait)
  checkXpAchievements(userId, newLevel);
  
  return { newLevel, totalXp };
  */
  console.warn('addWebsiteXp is currently disabled due to schema mismatches');
  return { newLevel: 1, totalXp: 0 };
}

/**
 * Checks if user unlocked any leveling achievements
 */
async function checkXpAchievements(userId: number, level: number) {
  /*
  // Find uncompleted leveling achievements
  // achievements.category column missing
  const levelingAchievements = await db.query.achievements.findMany({
    where: eq(achievements.category, 'leveling') 
  });
  
  for (const achievement of levelingAchievements) {
    // Basic check: if requirement is a number (level)
    // achievements.requirement column missing
    const reqLevel = parseInt(achievement.requirement);
    if (!isNaN(reqLevel) && level >= reqLevel) {
      // Check if already completed
      const existing = await db.query.userAchievements.findFirst({
        where: (ua, { and, eq }) => and(
          eq(ua.userId, userId),
          eq(ua.achievementId, achievement.id)
        )
      });
      
      if (!existing || !existing.completed) {
        // Unlock!
        if (existing) {
          await db.update(userAchievements)
            .set({ completed: true, completedAt: new Date(), progress: 100 })
            .where(eq(userAchievements.id, existing.id));
        } else {
          await db.insert(userAchievements).values({
            userId,
            achievementId: achievement.id,
            completed: true,
            completedAt: new Date(),
            progress: 100
          });
        }
        
        // Award achievement XP bonus?
        if ((achievement.xpReward || 0) > 0) {
          // Recursive call, but strictly for achievement to avoid infinite loops
          // Ideally handle this carefully
        }
      }
    }
  }
  */
}
