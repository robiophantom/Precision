# Precision

Precision is a playful daily timing game: start the timer, stop it as close as possible to the target, and compare your score with the world or your friends.

## What is included

- Five-round daily challenge with one competitive attempt per player.
- Server-calculated scoring, duplicate-round protection, and basic suspicious-result detection.
- Daily streaks with longest-streak tracking.
- Global and friends-only leaderboards.
- Username friend requests and accept/reject flow.
- Password authentication with secure HTTP-only JWT cookies, Gmail verification, and password recovery.
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

## Gmail email setup

Verification and password-reset emails are sent through Gmail SMTP using Nodemailer. Use a dedicated Gmail account if possible:

1. Enable 2-Step Verification at https://myaccount.google.com/security.
2. Open https://myaccount.google.com/apppasswords.
3. Create an app password named `Precision`.
4. Copy the generated 16-character password. Spaces are accepted in `.env` and removed automatically.
5. Set these values in `.env`:

```env
GMAIL_USER="precision.sender@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
EMAIL_FROM="Precision <precision.sender@gmail.com>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`GMAIL_USER` must be the Gmail account that generated the app password. `EMAIL_FROM` should use that same address. Never use your normal Gmail password and never commit `.env`.

If Gmail returns `535-5.7.8 Username and Password not accepted`, regenerate the App Password while signed into the exact account in `GMAIL_USER`, replace `GMAIL_APP_PASSWORD` in `.env`, and restart Next.js. The App Password is not the regular Gmail password.

Restart `npm run dev` after changing environment variables.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign seven-day session cookies |
| `ADMIN_USERNAME` | Yes | Backwards-compatible bootstrap admin username |
| `GMAIL_USER` | Yes for email flows | Gmail account used by Nodemailer |
| `GMAIL_APP_PASSWORD` | Yes for email flows | Gmail App Password, not the normal account password |
| `EMAIL_FROM` | Yes for email flows | Sender name and Gmail address |
| `NEXT_PUBLIC_APP_URL` | Yes for email flows | Public app URL used in verification/reset links |

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
