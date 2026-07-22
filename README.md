# Color Answers Hub

Daily answers for [Colordle](https://colordle.ryantanen.com/) and [Colorfle](https://colorfle.com/) color guessing games. Updated every day with verified, algorithm-accurate solutions.

**Live site:** [colordleanswer.me](https://colordleanswer.me)

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│  Cloudflare Worker   │     │  Astro + Svelte (SSG)    │
│  (cron + API)        │     │  (static site)           │
│                      │     │                          │
│  • 3 daily crons     │────▶│  • Built at deploy time  │
│  • Scrapes answers   │     │  • Data embedded in HTML │
│  • Stores in D1      │     │  • No runtime fetches    │
│  • Triggers rebuild  │     │  • Archive: API on click │
└─────────────────────┘     └──────────────────────────┘
         │                            │
         ▼                            ▼
   Cloudflare D1              Cloudflare Pages
   (SQLite database)          (static hosting)
```

## How It Works

### Data Pipeline

1. **Cloudflare Worker** runs on 3 cron schedules (1:30 AM JST, 8 AM IST, 11 AM IST)
2. Computes Colordle and Colorfle answers for today + 2 days ahead using the same algorithms as the original games
3. Stores results in **Cloudflare D1** database
4. Triggers a **GitHub Actions** workflow to rebuild and deploy the static site

### Static Site Generation

- All pages are **statically built at deploy time** (Astro SSG)
- Data is fetched from the Worker API during build, embedded directly in HTML
- No client-side data fetching on today pages or home page
- **Archive pages**: Calendar date clicks fetch from API on demand (old dates aren't pre-built)
- This approach is optimal for SEO, indexing speed, and Core Web Vitals

### Build Trigger Flow

```
Cron fires → Worker scrapes → D1 updated → GitHub Actions triggered → Astro build → Pages deploy
```

You can also manually trigger this with:
```bash
curl -X POST https://color-answers-worker.colordle.workers.dev/api/trigger-cron \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Project Structure

```
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Base layout (header, footer, meta, JSON-LD)
│   ├── pages/
│   │   ├── index.astro           # Home page
│   │   ├── colordle-answer-today.astro
│   │   ├── colorfle-answer-today.astro
│   │   ├── colordle-archive.astro
│   │   ├── colorfle-archive.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── privacy-policy.astro
│   ├── components/
│   │   └── Calendar.svelte       # Interactive calendar for archives
│   └── styles/
│       └── global.css
├── worker/
│   ├── src/
│   │   ├── index.ts              # Worker entry (API + cron)
│   │   ├── colordle.ts           # Colordle algorithm
│   │   ├── colorfle.ts           # Colorfle algorithm
│   │   └── color-names.ts        # Color hex mapping
│   └── wrangler.toml             # Worker config
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── astro.config.mjs
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml            # CI/CD: build + deploy to Pages
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/colordle/today` | No | Today's Colordle answer |
| GET | `/api/colordle/date/:date` | No | Answer for specific date (YYYY-MM-DD) |
| GET | `/api/colordle/range?from=&to=` | No | Answers in date range |
| GET | `/api/colorfle/today` | No | Today's Colorfle answer |
| GET | `/api/colorfle/date/:date` | No | Answer for specific date |
| GET | `/api/colorfle/range?from=&to=` | No | Answers in date range |
| GET | `/api/verify` | No | Verify DB matches algorithm |
| POST | `/api/scrape` | SCRAPE_SECRET | Run daily scrape |
| POST | `/api/trigger-cron` | CRON_SECRET | Full cron: scrape + build |
| POST | `/api/backfill` | SCRAPE_SECRET | Backfill all historical data |
| POST | `/api/recompute` | SCRAPE_SECRET | Recompute all DB records |

## Development

### Prerequisites

- Node.js 22+ (required by Astro 6)
- npm

### Setup

```bash
# Install frontend dependencies
npm install

# Install worker dependencies
cd worker && npm install && cd ..

# Run dev server
npm run dev
```

### Build

```bash
# Build static site
PUBLIC_API_URL=https://color-answers-worker.colordle.workers.dev npm run build

# Deploy worker
cd worker && npx wrangler deploy
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `PUBLIC_API_URL` | Astro build | Worker API base URL |
| `SCRAPE_SECRET` | Worker secret | Auth for /api/scrape, /api/backfill, /api/recompute |
| `CRON_SECRET` | Worker secret | Auth for /api/trigger-cron |
| `GITHUB_TOKEN` | Worker secret | GitHub PAT for triggering Actions workflow |

Set worker secrets with:
```bash
cd worker && echo "secret_value" | npx wrangler secret put SECRET_NAME
```

## Deployment

### Frontend (Cloudflare Pages)

Deployed via GitHub Actions on push to `main`. The workflow:
1. Checks out code
2. Installs Node 22 + dependencies
3. Builds Astro site with `PUBLIC_API_URL` env var
4. Deploys `dist/` to Cloudflare Pages using Wrangler

### Worker (Cloudflare Workers)

Deployed manually:
```bash
cd worker && npx wrangler deploy
```

### Cron Schedule

| Time | Timezone | Purpose |
|------|----------|---------|
| 1:30 AM | JST (UTC+9) | Primary scrape (game resets at midnight JST) |
| 8:00 AM | IST (UTC+5:30) | Backup scrape for IST users |
| 11:00 AM | IST (UTC+5:30) | Second backup scrape |

All 3 runs trigger a site rebuild via GitHub Actions.

## SEO Features

- Static site generation for instant loading and full indexability
- Proper heading hierarchy (single H1 per page, logical H2/H3 structure)
- 1500+ words of unique content per page
- JSON-LD structured data (WebSite, Organization, BreadcrumbList, WebPage)
- Open Graph + Twitter Card meta tags
- Canonical URLs on every page
- Sitemap + robots.txt with AI crawler allowance
- Mobile-responsive design with hamburger menu
- Core Web Vitals optimized (no JS rendering, preloaded fonts)

## AdSense Readiness

- ✅ Privacy Policy page with detailed data handling info
- ✅ Contact page with functional form
- ✅ About page explaining the site
- ✅ Original, substantial content (1500+ words per page)
- ✅ Clean navigation and site structure
- ✅ HTTPS enforced via Cloudflare
- ✅ Mobile-friendly responsive design
- ✅ No misleading UI or deceptive content

## License

MIT
