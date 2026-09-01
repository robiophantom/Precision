# Precision - Daily Timing Game

"How accurately can you measure time?"

Precision is a competitive daily mini-game where players attempt to tap as close to a target duration as possible over 5 rounds. 

## Features
- **Daily Challenges**: 5 new target times every single day.
- **Authoritative Scoring**: Uses a monotonic high-resolution client timer (`performance.now()`), but scores are verified and stored securely server-side.
- **Global & Friends Leaderboard**: Compete with the world or just your friends.
- **Daily Streak**: Keep coming back to build your consistency streak!
- **Anti-Cheat**: Single attempt allowed per day; basic suspicious-result flagging based on timestamps.

## Tech Stack
- **Frontend**: Next.js 15+ (App Router), React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes (RESTful design for future Android integration)
- **Database**: PostgreSQL (Prisma ORM with `@prisma/adapter-pg`)
- **Authentication**: Custom JWT in HTTP-Only cookies via `jose`
- **Testing**: Vitest (Unit) & Playwright (E2E)

## Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   You need a running PostgreSQL instance. Set your connection string in `.env`.
   ```env
   DATABASE_URL="postgres://postgres:postgres@localhost:5432/precision"
   JWT_SECRET="your_secret_key"
   ADMIN_USERNAME="admin"
   ```

3. **Migrate the Database**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

## Admin

To create a new daily challenge, log in with the username specified in `ADMIN_USERNAME`, then navigate to `/admin`.

## Android API Integration
The backend is completely decoupled from the Next.js UI using standard REST/JSON responses. 
Authentication is handled via standard POST requests returning HTTP-Only cookies.

## Deployment (Vercel)
1. Link the repository to Vercel.
2. Provide `DATABASE_URL`, `JWT_SECRET`, and `ADMIN_USERNAME` in Vercel Environment Variables.
3. The build command `npm run build` will automatically run type-checks and build the Next.js app.
