# Precision

Precision is a playful daily timing game: start the timer, stop it as close as possible to the target, and compare your score with the world or your friends.

## What is included

- Five-round daily challenge with one competitive attempt per player.
- Server-calculated scoring, duplicate-round protection, and basic suspicious-result detection.
- Daily streaks with longest-streak tracking.
- Global and friends-only leaderboards.
- Username friend requests and accept/reject flow.
- Password authentication with secure HTTP-only JWT cookies.
- Admin challenge creation plus user CRUD controls (ban/unban, promote/demote, delete).
- A Prisma schema designed to add more game types without changing the user, streak, friend, or leaderboard foundations.

Google OAuth and phone OTP are intentionally not enabled in this first runnable version: both require provider credentials and phone infrastructure. The auth boundary is isolated so either provider can be added later.

## Run locally

### Requirements

- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
npm install
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL and a long JWT_SECRET
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

Open http://localhost:3000.

The first account whose username matches `ADMIN_USERNAME` can access `/admin`. Additional administrators can be promoted from the admin dashboard.

### Create today's challenge

Sign in as an administrator, open `/admin`, choose a date, and enter five target durations in milliseconds. A challenge must be published for the current UTC date before players can start it.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign seven-day session cookies |
| `ADMIN_USERNAME` | Yes | Backwards-compatible bootstrap admin username |

See [.env.example](./.env.example) for a copyable template. Never commit `.env`.

## Useful commands

```bash
npm run dev       # development server
npm run build     # production build and type check
npm run lint      # ESLint
npx prisma studio # inspect local data
```

## API shape

The UI uses REST endpoints under `/api`, so a future mobile client can reuse the same game and social flows:

- `/api/auth/*`, `/api/me`
- `/api/challenge/today`, `/api/challenge/start`, `/api/round/result`, `/api/challenge/complete`
- `/api/leaderboard/global`, `/api/leaderboard/friends`
- `/api/friends`, `/api/friends/request`, `/api/friends/respond`
- `/api/admin/challenge`, `/api/admin/users`
