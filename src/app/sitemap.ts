import { MetadataRoute } from 'next';
import { db } from '@/db';
import { servers, forumCategories, forumPosts, users, socialPosts } from '@/db/schema';
import { desc, isNotNull, gt } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vonix.network';
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // 1. Static Routes
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/rules`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
        { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
        { url: `${baseUrl}/donate`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/hosting`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
        { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
        { url: `${baseUrl}/forum`, lastModified: new Date(), changeFrequency: 'always', priority: 0.9 },
        { url: `${baseUrl}/servers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/users`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
        { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    ];

    // 2. Dynamic Content Parsing
    // We fetch minimal data to keep generation fast
    const [
        dbServers,
        dbCategories,
        dbPosts,
        dbUsers,
        dbSocial
    ] = await Promise.all([
        // Servers
        db.select({ id: servers.id, updatedAt: servers.updatedAt }).from(servers),

        // Forum Categories
        db.select({ slug: forumCategories.slug }).from(forumCategories),

        // Forum Posts (Limit 2000 most recent)
        db.select({ id: forumPosts.id, updatedAt: forumPosts.updatedAt })
            .from(forumPosts)
            .orderBy(desc(forumPosts.updatedAt))
            .limit(2000),

        // Users (Limit 2000 most recently active/updated)
        db.select({ username: users.username, updatedAt: users.updatedAt })
            .from(users)
            .where(isNotNull(users.username))
            .orderBy(desc(users.updatedAt))
            .limit(2000),

        // Social Posts (Limit 1000 most recent)
        db.select({ id: socialPosts.id, updatedAt: socialPosts.updatedAt })
            .from(socialPosts)
            .orderBy(desc(socialPosts.updatedAt))
            .limit(1000)
    ]);

    // Generators
    const serverRoutes: MetadataRoute.Sitemap = dbServers.map((s: any) => ({
        url: `${baseUrl}/servers/${s.id}`,
        lastModified: s.updatedAt || new Date(),
        changeFrequency: 'hourly',
        priority: 0.8
    }));

    const categoryRoutes: MetadataRoute.Sitemap = dbCategories.map((c: any) => ({
        url: `${baseUrl}/forum/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8
    }));

    const postRoutes: MetadataRoute.Sitemap = dbPosts.map((p: any) => ({
        url: `${baseUrl}/forum/post/${p.id}`,
        lastModified: p.updatedAt || new Date(),
        changeFrequency: 'weekly',
        priority: 0.7
    }));

    const userRoutes: MetadataRoute.Sitemap = dbUsers.map((u: any) => ({
        url: `${baseUrl}/profile/${u.username}`,
        lastModified: u.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.6
    }));

    const socialRoutes: MetadataRoute.Sitemap = dbSocial.map((s: any) => ({
        url: `${baseUrl}/social/post/${s.id}`,
        lastModified: s.updatedAt || new Date(),
        changeFrequency: 'daily',
        priority: 0.6
    }));

    return [
        ...staticRoutes,
        ...serverRoutes,
        ...categoryRoutes,
        ...postRoutes,
        ...userRoutes,
        ...socialRoutes,
    ];
}
