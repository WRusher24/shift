# Shift (שיפט / شيفت) — Deployment & Local Development Guide

Production tracking & gamification platform for detergents filling/packaging lines.
Built with **Next.js (App Router)**, **Tailwind CSS v4**, **Drizzle ORM** and **PostgreSQL**
(works out of the box with Neon serverless Postgres in production).

---

## 1. Prerequisites

| Tool       | Version           | Notes                                   |
| ---------- | ----------------- | --------------------------------------- |
| Node.js    | 20.x or newer     | LTS recommended                         |
| npm        | 10.x or newer     | Ships with Node                         |
| PostgreSQL | 14+ (any flavour) | Local instance, Docker, or Neon account |

---

## 2. Local setup

### 2.1 Install dependencies

```bash
npm install
```

### 2.2 Configure environment variables

Create a `.env` file in the project root (or copy `.env.example` if present):

```bash
# Required — PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

Notes:

- The database must exist, but it may be **empty** — schema + seed are applied below.
- For Neon, paste the pooled connection string from the Neon dashboard
  (e.g. `postgresql://user:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require`).

### 2.3 Apply the database schema

```bash
npx drizzle-kit push
```

This creates all tables: `workers`, `products`, `races`, `batches`,
`batch_members`, `pauses`, `pallets`, `pallet_shares`
(including the unique constraint that enforces **one emoji per worker**).

### 2.4 Seed starter data (recommended)

```bash
npx tsx src/db/seed.ts
```

The script wipes the tables and inserts:

- 12 workers with distinct, unique emojis and names in Hebrew/Arabic/English
- 7 detergent products with size, units-per-carton, pallet options and point multipliers
- 2 races (one finished, one currently active)
- A realistic mock history: ~25 completed batches with memberships,
  mid-batch team changes, pauses, pallets and per-worker point shares

Re-running the seed is safe (it clears and re-inserts everything).

### 2.5 Run the development server

```bash
npm run dev
```

Open http://localhost:3000 — the station dashboard loads instantly,
ready for tapping pallets on the factory floor.

### 2.6 Production-style local check

```bash
npm run build
npm run start
```

Health check endpoint: `GET /api/health` → `{ "ok": true }`.

---

## 3. Deploying to Vercel

### 3.1 Database (Neon)

1. Create a project at https://neon.tech (free tier is fine).
2. Copy the pooled connection string.

### 3.2 Vercel project

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel → **Add New Project** → import the repository.
3. Add the environment variable before the first deploy:

   | Key            | Value                          |
   | -------------- | ------------------------------ |
   | `DATABASE_URL` | Your Neon pooled connection URL |

4. Deploy. All routes are dynamic by design, so no build-time database
   access is required — the build succeeds without a live DB, but the app
   needs `DATABASE_URL` at runtime.

### 3.3 Provision schema & seed on the production database

From your local machine (with `DATABASE_URL` in `.env` pointing at Neon):

```bash
npx drizzle-kit push      # creates tables on Neon
npx tsx src/db/seed.ts    # optional starter data (workers, products, mock history)
```

> Tip: on Neon you can push from a branch database and promote it later.

---

## 4. Useful npm scripts

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Dev server with hot-reload                 |
| `npm run build`     | Production build                           |
| `npm run start`     | Serve the production build                 |
| `npm run lint`      | ESLint                                     |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`)          |
| `npx drizzle-kit push`   | Sync Drizzle schema to the database   |
| `npx tsx src/db/seed.ts` | Reset & seed starter data             |

---

## 5. Security & operational notes

- `DATABASE_URL` is read **server-side only**; it is never exposed to the browser bundle.
- All mutations go through API routes under `src/app/api/**`; the browser never
  talks to the database directly.
- The dashboard polls `/api/state` every 2.5 seconds — trivially replaceable
  with WebSockets/SSE later without touching the data model.
- Point attribution is written to a ledger table (`pallet_shares`) at the moment
  a pallet is logged, so leaderboards stay correct even when teams change mid-batch.
