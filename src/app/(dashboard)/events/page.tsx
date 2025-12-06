import { db } from '@/db';
import { events, users } from '@/db/schema';
import { desc, eq, sql, gte } from 'drizzle-orm';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, Plus,
  CalendarDays, ChevronRight, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatRelativeTime, getMinecraftAvatarUrl, getInitials } from '@/lib/utils';

async function getUpcomingEvents() {
  try {
    const now = new Date();
    return await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        coverImage: events.banner,
        creatorId: events.hostId,
        creatorUsername: users.username,
        creatorMinecraft: users.minecraftUsername,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .where(gte(events.startTime, now))
      .orderBy(events.startTime)
      .limit(10);
  } catch {
    return [];
  }
}

async function getPastEvents() {
  try {
    const now = new Date();
    return await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
      })
      .from(events)
      .where(sql`${events.startTime} < ${now}`)
      .orderBy(desc(events.startTime))
      .limit(5);
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const [upcomingEvents, pastEvents] = await Promise.all([
    getUpcomingEvents(),
    getPastEvents(),
  ]);

  const displayEvents = upcomingEvents;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Community Events
          </h1>
          <p className="text-muted-foreground">
            Join exciting events and activities
          </p>
        </div>
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Events */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-neon-cyan" />
              Upcoming Events
            </h2>

            {displayEvents.length > 0 ? (
              <div className="space-y-4">
                {displayEvents.map((event: any) => (
                  <Card key={event.id} variant="glass" hover>
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* Date Box */}
                        <div className="shrink-0 w-16 text-center">
                          <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-2">
                            <p className="text-xs text-neon-cyan uppercase">
                              {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-2xl font-bold">
                              {new Date(event.startTime).getDate()}
                            </p>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold">{event.title}</h3>
                            <Badge variant="neon">
                              <Users className="w-3 h-3 mr-1" />
                              {event.attendees || 0}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                {event.creatorMinecraft ? (
                                  <AvatarImage
                                    src={getMinecraftAvatarUrl(event.creatorMinecraft)}
                                    alt={event.creatorUsername}
                                  />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {getInitials(event.creatorUsername || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                Hosted by {event.creatorUsername}
                              </span>
                            </div>
                            <Button variant="neon-outline" size="sm">
                              Join Event
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card variant="glass" className="text-center py-12">
                <CardContent>
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-bold mb-2">No Upcoming Events</h3>
                  <p className="text-muted-foreground mb-4">
                    Check back soon for new events!
                  </p>
                  <Button variant="neon-outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create an Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calendar Widget */}
          <Card variant="neon-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neon-cyan" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">
                  {displayEvents.length}
                </p>
                <p className="text-muted-foreground">Events Scheduled</p>
              </div>
            </CardContent>
          </Card>

          {/* Event Types */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Build Competitions', color: 'bg-neon-cyan' },
                { name: 'PvP Tournaments', color: 'bg-neon-pink' },
                { name: 'Community Nights', color: 'bg-neon-purple' },
                { name: 'Special Events', color: 'bg-neon-orange' },
              ].map((type) => (
                <div key={type.name} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${type.color}`} />
                  <span className="text-sm">{type.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Past Events */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Past Events</CardTitle>
            </CardHeader>
            <CardContent>
              {pastEvents.length > 0 ? (
                <div className="space-y-3">
                  {pastEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-secondary/50"
                    >
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.startTime)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No past events yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Create Event CTA */}
          <Card variant="gradient">
            <CardContent className="py-6 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-neon-cyan" />
              <h3 className="font-bold mb-2">Host Your Own Event</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create and manage community events
              </p>
              <Button variant="glass" className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
