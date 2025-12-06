'use client';

import { useState, useEffect } from 'react';
import {
  Trophy, Medal, Crown, Star, TrendingUp,
  Clock, MessageSquare, Heart, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatNumber, formatPlaytime } from '@/lib/utils';

interface LeaderboardPlayer {
  id: number;
  username: string;
  minecraftUsername: string | null;
  xp: number;
  playtimeSeconds: number;
  level: number;
  role: string;
  title: string | null;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-400" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-300" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">#{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
    case 2:
      return 'bg-gradient-to-r from-gray-300/20 to-gray-400/10 border-gray-300/30';
    case 3:
      return 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30';
    default:
      return 'bg-secondary/50';
  }
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<'xp' | 'playtime'>('xp');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?type=${leaderboardType}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [leaderboardType]);

  // Calculate stats
  const totalXP = leaderboard.reduce((sum, user) => sum + (user.xp || 0), 0);
  const totalPlaytime = leaderboard.reduce((sum, user) => sum + (user.playtimeSeconds || 0), 0);
  const avgLevel = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((sum, user) => sum + (user.level || 1), 0) / leaderboard.length)
    : 1;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-orange/20 border border-neon-orange/50 mb-4">
          <Trophy className="w-10 h-10 text-neon-orange" />
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Leaderboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Top players ranked by {leaderboardType === 'xp' ? 'experience points' : 'playtime'}
        </p>
      </div>

      {/* Toggle Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant={leaderboardType === 'xp' ? 'gradient' : 'neon-outline'}
          onClick={() => setLeaderboardType('xp')}
          className="min-w-[140px]"
        >
          <Star className="w-4 h-4 mr-2" />
          XP Leaderboard
        </Button>
        <Button
          variant={leaderboardType === 'playtime' ? 'gradient' : 'neon-outline'}
          onClick={() => setLeaderboardType('playtime')}
          className="min-w-[140px]"
        >
          <Clock className="w-4 h-4 mr-2" />
          Playtime Leaderboard
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            {leaderboardType === 'xp' ? (
              <>
                <Star className="w-8 h-8 mx-auto mb-2 text-neon-cyan" />
                <p className="text-3xl font-bold">{formatNumber(totalXP)}</p>
                <p className="text-muted-foreground">Total Community XP</p>
              </>
            ) : (
              <>
                <Clock className="w-8 h-8 mx-auto mb-2 text-neon-cyan" />
                <p className="text-3xl font-bold">{formatPlaytime(totalPlaytime)}</p>
                <p className="text-muted-foreground">Total Playtime</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-neon-purple" />
            <p className="text-3xl font-bold">{avgLevel}</p>
            <p className="text-muted-foreground">Average Level</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-neon-orange" />
            <p className="text-3xl font-bold">{leaderboard.length}</p>
            <p className="text-muted-foreground">Ranked Players</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>
            {leaderboardType === 'xp' ? 'Top Players by XP' : 'Top Players by Playtime'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-secondary/80 ${getRankBg(index + 1)}`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-12 h-12" glow={index < 3}>
                    <AvatarImage
                      src={getMinecraftAvatarUrl(player.minecraftUsername || player.username)}
                      alt={player.username}
                    />
                    <AvatarFallback>
                      {getInitials(player.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{player.username}</span>
                      {player.role === 'admin' && (
                        <Badge variant="neon-pink">Admin</Badge>
                      )}
                      {player.role === 'moderator' && (
                        <Badge variant="neon-purple">Mod</Badge>
                      )}
                    </div>
                    {player.title && (
                      <p className="text-sm text-muted-foreground">{player.title}</p>
                    )}
                  </div>

                  {/* Level */}
                  <div className="text-center px-4">
                    <p className="text-lg font-bold text-neon-cyan">Lv. {player.level || 1}</p>
                  </div>

                  {/* XP or Playtime */}
                  <div className="text-right min-w-[100px]">
                    {leaderboardType === 'xp' ? (
                      <>
                        <p className="font-bold">{formatNumber(player.xp || 0)}</p>
                        <p className="text-xs text-muted-foreground">XP</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">{formatPlaytime(player.playtimeSeconds || 0)}</p>
                        <p className="text-xs text-muted-foreground">Playtime</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-bold mb-2">No Players Yet</h3>
              <p className="text-muted-foreground">
                Be the first to earn XP and climb the leaderboard!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Earn XP */}
      <Card variant="gradient" className="mt-8">
        <CardContent className="py-8">
          <h2 className="text-2xl font-bold text-center mb-6">How to Earn XP</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: 'Daily Login', xp: '+10 XP', desc: 'Log in every day' },
              { icon: MessageSquare, title: 'Forum Posts', xp: '+5 XP', desc: 'Create discussions' },
              { icon: Heart, title: 'Social Activity', xp: '+2 XP', desc: 'Like and comment' },
              { icon: Trophy, title: 'Achievements', xp: 'Varies', desc: 'Complete challenges' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-neon-cyan" />
                </div>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <Badge variant="neon" className="mb-2">{item.xp}</Badge>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
