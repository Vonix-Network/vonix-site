# Changelog

All notable changes to the Vonix Network website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2024-12-22

### Added
- Complete website rebuild with Next.js 15 and App Router
- Neon Rainbow theme with glassmorphism effects
- User authentication with NextAuth.js v5
- Minecraft-first registration system with UUID validation
- Forum system with categories and nested posts
- Social feed with posts and comments
- Server status monitoring with real-time updates
- Donation system with Stripe and Ko-Fi support
- Discord integration with OAuth, ticket threading, and role management
- Admin dashboard with comprehensive management tools
- XP and leveling system with website/Minecraft sync
- Leaderboards and user profiles
- Helpdesk system with guest ticket support
- API for Minecraft mod integration

### Security
- Government-grade security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on authentication endpoints
- Account lockout after failed login attempts
- CSRF protection and input validation with Zod
- Secure session management

### Technical
- SQLite with Drizzle ORM (Turso-compatible for production)
- TanStack Query for client-side state management
- Zustand for global state
- TypeScript throughout the codebase
- Tailwind CSS with custom theme tokens
