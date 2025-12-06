'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, User, UserPlus, Search, MessageSquare, 
  Check, X, Clock, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMinecraftAvatarUrl, getInitials, formatRelativeTime } from '@/lib/utils';

interface Friend {
  id: number;
  username: string;
  minecraftUsername: string | null;
  status: 'online' | 'offline';
  lastSeen: string | null; // ISO string from API
}

interface PendingRequest {
  id: number;
  username: string;
  minecraftUsername: string | null;
  type: 'incoming' | 'outgoing';
}

interface FriendSearchResult {
  id: number;
  username: string;
  minecraftUsername: string | null;
  status: 'none' | 'pending' | 'friends';
}

type Tab = 'friends' | 'pending' | 'search';

export default function FriendsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const reloadFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends');
      if (!res.ok) {
        setError('Failed to load friends');
        return;
      }
      const data = await res.json();
      setFriends((data.friends || []) as Friend[]);
      setPendingRequests((data.pending || []) as PendingRequest[]);
    } catch (err) {
      console.error('Error loading friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadFriends();
  }, []);

  const onlineFriends = friends.filter((f) => f.status === 'online');
  const offlineFriends = friends.filter((f) => f.status === 'offline');

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        console.error('Failed to search users', await res.text());
        return;
      }
      const data = await res.json();
      setSearchResults((data.results || []) as FriendSearchResult[]);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Friends</h1>
          <p className="text-muted-foreground">
            Manage your friends and connections
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => {
            setActiveTab('search');
            setTimeout(() => {
              const el = document.getElementById('friend-search-input');
              if (el) el.focus();
            }, 0);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'friends', label: 'Friends', count: friends.length },
          { id: 'pending', label: 'Pending', count: pendingRequests.length },
          { id: 'search', label: 'Find Friends', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Error / Loading */}
      {loading && (
        <p className="text-center text-muted-foreground py-8">Loading friends...</p>
      )}
      {error && !loading && (
        <p className="text-center text-error py-4">{error}</p>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {/* Online Friends */}
          {onlineFriends.length > 0 && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Online — {onlineFriends.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {onlineFriends.map((friend) => (
                  <div 
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage 
                            src={getMinecraftAvatarUrl(friend.minecraftUsername || friend.username)} 
                            alt={friend.username} 
                          />
                          <AvatarFallback>
                            {getInitials(friend.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                      </div>
                      <div>
                        <p className="font-medium">{friend.username}</p>
                        <p className="text-sm text-success">Online</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/messages?withUserId=${friend.id}`)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Offline Friends */}
          {offlineFriends.length > 0 && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Offline — {offlineFriends.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {offlineFriends.map((friend) => (
                  <div 
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors opacity-75"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage 
                          src={getMinecraftAvatarUrl(friend.minecraftUsername || friend.username)} 
                          alt={friend.username} 
                        />
                        <AvatarFallback>
                          {getInitials(friend.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {friend.lastSeen
                            ? `Last seen ${formatRelativeTime(new Date(friend.lastSeen))}`
                            : 'Last seen recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {friends.length === 0 && (
            <Card variant="glass" className="text-center py-12">
              <CardContent>
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Friends Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start connecting with other players!
                </p>
                <Button variant="neon-outline" onClick={() => setActiveTab('search')}>
                  <Search className="w-4 h-4 mr-2" />
                  Find Friends
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage 
                        src={getMinecraftAvatarUrl(request.minecraftUsername || request.username)} 
                        alt={request.username} 
                      />
                      <AvatarFallback>
                        {getInitials(request.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.username}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {request.type === 'incoming' ? 'Wants to be your friend' : 'Request sent'}
                      </p>
                    </div>
                  </div>
                  {request.type === 'incoming' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="neon"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/friends', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ targetUserId: request.id, action: 'accept' }),
                            });
                            if (res.ok) {
                              await reloadFriends();
                            }
                          } catch (err) {
                            console.error('Failed to accept friend request', err);
                          }
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/friends', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ targetUserId: request.id, action: 'decline' }),
                            });
                            if (res.ok) {
                              await reloadFriends();
                            }
                          } catch (err) {
                            console.error('Failed to decline friend request', err);
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No pending requests
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Find Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Input
                id="friend-search-input"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch();
                }}
              />
              <Button variant="neon" onClick={runSearch} disabled={searchLoading}>
                <Search className="w-4 h-4 mr-2" />
                {searchLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {searchResults.length === 0 && !searchLoading && !searchQuery.trim() && (
              <p className="text-center text-muted-foreground py-8">
                Enter a username to find players
              </p>
            )}
            {searchResults.length === 0 && !searchLoading && searchQuery.trim() && (
              <p className="text-center text-muted-foreground py-8">
                No users found for "{searchQuery}"
              </p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={getMinecraftAvatarUrl(user.minecraftUsername || user.username)}
                          alt={user.username}
                        />
                        <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        {user.minecraftUsername && (
                          <p className="text-sm text-muted-foreground">{user.minecraftUsername}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      {user.status === 'none' && (
                        <Button
                          variant="neon-outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/friends', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ targetUserId: user.id, action: 'send' }),
                              });
                              if (res.ok) {
                                setSearchResults((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id ? { ...u, status: 'pending' } : u,
                                  ),
                                );
                                await reloadFriends();
                              }
                            } catch (err) {
                              console.error('Failed to send friend request', err);
                            }
                          }}
                        >
                          <User className="w-4 h-4 mr-1" />
                          Add Friend
                        </Button>
                      )}
                      {user.status === 'pending' && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {user.status === 'friends' && (
                        <Badge variant="success">Friends</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

