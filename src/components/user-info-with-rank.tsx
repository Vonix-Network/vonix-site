import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RankBadge, RoleBadge } from '@/components/rank-badge';
import { getMinecraftAvatarUrl, getInitials } from '@/lib/utils';

interface UserInfoWithRankProps {
  username: string;
  minecraftUsername?: string | null;
  role?: string;
  donationRank?: {
    id: string;
    name: string;
    color: string;
    textColor: string;
    icon: string | null;
    badge: string | null;
    glow: boolean;
  } | null;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
  badgeSize?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * UserInfoWithRank Component
 * Displays user information with their role and donation rank badges
 * Used across the site (forums, posts, leaderboards, etc.)
 */
export function UserInfoWithRank({
  username,
  minecraftUsername,
  role = 'user',
  donationRank,
  showAvatar = true,
  avatarSize = 'md',
  badgeSize = 'sm',
  layout = 'horizontal',
  className = '',
}: UserInfoWithRankProps) {
  const avatarSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  // Use minecraftUsername if available, otherwise username (which is now the MC username)
  const avatarName = minecraftUsername || username;

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {showAvatar && (
          <Avatar className={avatarSizes[avatarSize]}>
            <AvatarImage
              src={getMinecraftAvatarUrl(avatarName)}
              alt={username}
            />
            <AvatarFallback>{getInitials(username)}</AvatarFallback>
          </Avatar>
        )}
        <div className="text-center">
          <p className="font-medium">{username}</p>
          <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
            {role && role !== 'user' && <RoleBadge role={role} size={badgeSize} />}
            {donationRank && <RankBadge rank={donationRank} size={badgeSize} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showAvatar && (
        <Avatar className={avatarSizes[avatarSize]}>
          <AvatarImage
            src={getMinecraftAvatarUrl(avatarName)}
            alt={username}
          />
          <AvatarFallback>{getInitials(username)}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{username}</p>
          {role && role !== 'user' && <RoleBadge role={role} size={badgeSize} />}
          {donationRank && <RankBadge rank={donationRank} size={badgeSize} />}
        </div>
      </div>
    </div>
  );
}
