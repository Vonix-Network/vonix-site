'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Clock, Heart, MessageSquare, Check, X } from 'lucide-react';

export type FriendshipStatus = 'none' | 'pending' | 'incoming' | 'friends';

interface FriendActionsProps {
  isOwnProfile: boolean;
  friendshipStatus: FriendshipStatus;
  profileUserId: number;
}

export function ProfileFriendActions({ isOwnProfile, friendshipStatus: initialStatus, profileUserId }: FriendActionsProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus);
  const router = useRouter();

  if (isOwnProfile) return null;

  const callAction = async (action: 'send' | 'cancel' | 'remove' | 'accept' | 'decline') => {
    setBusy(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profileUserId, action }),
      });

      if (!res.ok) {
        console.error('Friend API error', await res.text());
        return;
      }

      const data = await res.json();
      if (data.status === 'none' || data.status === 'pending' || data.status === 'friends') {
        setStatus(data.status);
      }
    } catch (err: any) {
      console.error('Friend action failed', err);
    } finally {
      setBusy(false);
    }
  };

  const handleAddFriend = async () => {
    await callAction('send');
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm('Remove this user from your friends list?')) return;
    await callAction('remove');
  };

  const handleCancelRequest = async () => {
    if (!window.confirm('Cancel this friend request?')) return;
    await callAction('cancel');
  };

  const handleAcceptRequest = async () => {
    await callAction('accept');
  };

  const handleDeclineRequest = async () => {
    await callAction('decline');
  };

  return (
    <div className="flex gap-2">
      {status === 'none' && (
        <Button variant="neon-outline" onClick={handleAddFriend} disabled={busy}>
          <User className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      )}
      {status === 'pending' && (
        <Button variant="glass" onClick={handleCancelRequest} disabled={busy}>
          <Clock className="w-4 h-4 mr-2" />
          Request Pending
        </Button>
      )}
      {status === 'incoming' && (
        <>
          <Button variant="neon" onClick={handleAcceptRequest} disabled={busy}>
            <Check className="w-4 h-4 mr-2" />
            Accept Request
          </Button>
          <Button variant="ghost" onClick={handleDeclineRequest} disabled={busy}>
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
        </>
      )}
      {status === 'friends' && (
        <Button variant="glass" onClick={handleRemoveFriend} disabled={busy}>
          <Heart className="w-4 h-4 mr-2" />
          Friends
        </Button>
      )}
      <Button
        variant="glass"
        disabled={busy}
        onClick={() => router.push(`/messages?withUserId=${profileUserId}`)}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Message
      </Button>
    </div>
  );
}


