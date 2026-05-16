# LavAlpha

Crypto intelligence dashboard. Track alpha calls, KOL signals, and smart-follower activity across chains in one dense dashboard.

## What it does

- Aggregates alpha calls from Twitter/X callers
- Tracks new project mentions (fresh + KOL sources)
- Surfaces smart-follower overlap on projects
- Pulls token / NFT discovery data
- Stores everything in SQLite via Prisma

## Stack

- **Frontend:** Next.js 15 App Router, React 19, Tailwind v4, TypeScript
- **Backend:** Next.js API routes, Prisma ORM
- **DB:** SQLite (`prisma/dev.db`)
- **Scraper:** Python daemon (`scraper/daemon.py`) writes to the same DB

## Quickstart

```bash
# install
npm install

# generate prisma client + migrate
npx prisma generate
npx prisma db push

# dev mode
npm run dev

# production
npm run build
npm start
```

App runs on port 3000 by default. To use 3333:

```bash
npx next start -p 3333
```

## Project layout

```
src/
  app/                  Next.js App Router pages
    page.tsx            Dashboard
    projects/           Tracked projects
    alpha-calls/        Call feed
    callers/            KOL leaderboard
    discover/           Token / NFT discovery
    targets/            Watchlist
    api/                API routes
  components/           Shared UI
prisma/
  schema.prisma         DB schema
scraper/
  daemon.py             Python scraping daemon
```

## Design

Dark mode, dense data tables, small typography (12-13px body), no neon, no purple gradients. JetBrains Mono for numbers, Inter for body. Accent: teal `#2dd4bf` used sparingly.

## License

Private. Not for redistribution yet.
