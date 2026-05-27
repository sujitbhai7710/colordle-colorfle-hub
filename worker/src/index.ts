import { getColordleDayNumber, getColordleAnswer, fetchColordleData } from './colordle';
import { getColorfleDayNumber, getColorfleAnswer } from './colorfle';
import { getColorHex } from './color-names';

interface Env {
  DB: D1Database;
  SCRAPE_SECRET: string;
  CRON_SECRET: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  GITHUB_TOKEN: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS colordle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS colorfle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  normal_answer TEXT NOT NULL,
  hard_answer TEXT NOT NULL,
  normal_names TEXT,
  hard_names TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_colordle_day ON colordle_answers(day_number);
CREATE INDEX IF NOT EXISTS idx_colorfle_day ON colorfle_answers(day_number);
`;

// ── TIMEZONE: Use JST (UTC+9) for date string determination ──
// Primary update runs at 1:30 AM JST, so we determine "today" based on
// Japan Standard Time. This ensures answers update when the game refreshes
// for Japan timezone players. Backup crons at 8 AM and 11 AM IST ensure
// IST players also get fresh answers.
//
// Key principle: Use JST for determining the date string (e.g., "2026-05-23").
// For algorithm computation (day numbers, seeds), always use UTC dates
// created from those date strings.

function formatDateJST(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function initDB(db: D1Database): Promise<void> {
  try {
    await db.prepare('SELECT 1 FROM colordle_answers LIMIT 1').first();
  } catch {
    await db.exec(SCHEMA_SQL);
  }
  try { await db.exec(`ALTER TABLE colorfle_answers ADD COLUMN normal_names TEXT`); } catch {}
  try { await db.exec(`ALTER TABLE colorfle_answers ADD COLUMN hard_names TEXT`); } catch {}
}

async function scrapeColordle(db: D1Database, dateStr: string): Promise<{ success: boolean; message: string }> {
  try {
    const { allColors, poolColors, blocklist } = await fetchColordleData();
    // Create a UTC date from the date string for algorithm computation
    const utcDate = new Date(dateStr + 'T00:00:00Z');
    const dayNumber = getColordleDayNumber(utcDate);
    const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);

    if (!colorName) {
      return { success: false, message: `Could not compute answer for day ${dayNumber}` };
    }

    const colorHex = getColorHex(colorName);

    await db.prepare(
      'INSERT OR REPLACE INTO colordle_answers (date, day_number, color_name, color_hex) VALUES (?, ?, ?, ?)'
    ).bind(dateStr, dayNumber, colorName, colorHex).run();

    return { success: true, message: `Day ${dayNumber}: ${colorName} (${colorHex})` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function scrapeColorfle(db: D1Database, dateStr: string): Promise<{ success: boolean; message: string }> {
  try {
    // Create a UTC date from the date string for algorithm computation
    // Use noon UTC to avoid 5PM boundary issues
    const utcDate = new Date(dateStr + 'T12:00:00Z');
    const answer = getColorfleAnswer(utcDate);

    await db.prepare(
      'INSERT OR REPLACE INTO colorfle_answers (date, day_number, normal_answer, hard_answer, normal_names, hard_names) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      dateStr, answer.dayNumber,
      JSON.stringify(answer.normal), JSON.stringify(answer.hard),
      JSON.stringify(answer.normalNames), JSON.stringify(answer.hardNames)
    ).run();

    return { success: true, message: `Day ${answer.dayNumber}: Normal=${answer.normalNames.join(',')} | Hard=${answer.hardNames.join(',')}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function triggerPagesBuild(env: Env): Promise<{ success: boolean; message: string }> {
  // This project uses direct-upload (not Git-connected), so we cannot use the
  // Cloudflare Pages deployment API (it requires a manifest for direct uploads).
  // Instead, we trigger a GitHub Actions workflow that builds and deploys.
  // This is handled by triggerGitHubActionsBuild().
  // This function is kept as a fallback / secondary trigger using retry on latest deployment.

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const projectName = 'color-answers';

  if (!accountId || !apiToken) {
    return { success: false, message: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN' };
  }

  try {
    // Get the latest deployment to retry
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const listResult = await listResponse.json() as any;
    if (!listResult.success || !listResult.result?.length) {
      return { success: false, message: 'Could not list deployments' };
    }
    const latestDeploymentId = listResult.result[0].id;

    // Try to retry the latest deployment
    const retryResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/${latestDeploymentId}/retry`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const retryResult = await retryResponse.json() as any;
    if (retryResult.success) {
      return { success: true, message: `Retry triggered for deployment ${latestDeploymentId}` };
    } else {
      return { success: false, message: `Retry failed: ${JSON.stringify(retryResult.errors)}` };
    }
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

async function triggerGitHubActionsBuild(env: Env): Promise<{ success: boolean; message: string }> {
  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) {
    return { success: false, message: 'Missing GITHUB_TOKEN' };
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/sujitbhai7710/colordle-colorfle-hub/actions/workflows/deploy.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'color-answers-worker',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );
    if (response.ok) {
      return { success: true, message: 'GitHub Actions workflow dispatch accepted' };
    } else {
      const text = await response.text();
      return { success: false, message: `Failed (${response.status}): ${text}` };
    }
  } catch (err: any) {
    return { success: false, message: `Error: ${err.message}` };
  }
}

async function runDailyScrape(db: D1Database): Promise<void> {
  // Get today's date in JST
  const todayJST = formatDateJST(new Date());
  // Compute answers for today + next 2 days
  for (let i = 0; i < 3; i++) {
    const dateStr = addDaysToDateStr(todayJST, i);
    const colordleResult = await scrapeColordle(db, dateStr);
    await db.prepare(
      'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
    ).bind(`colordle-${dateStr}`, colordleResult.success ? 'success' : 'error', colordleResult.message).run();

    const colorfleResult = await scrapeColorfle(db, dateStr);
    await db.prepare(
      'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
    ).bind(`colorfle-${dateStr}`, colorfleResult.success ? 'success' : 'error', colorfleResult.message).run();
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await initDB(env.DB);
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path.startsWith('/api/')) {
      // ── Colordle today ──
      if (path === '/api/colordle/today') {
        const today = formatDateJST(new Date());
        let result = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date = ?').bind(today).first();
        if (!result) {
          await scrapeColordle(env.DB, today);
          result = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date = ?').bind(today).first();
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Could not compute answer' }, 500);
      }

      // Colordle by date
      const colordleDateMatch = path.match(/^\/api\/colordle\/date\/(\d{4}-\d{2}-\d{2})$/);
      if (colordleDateMatch) {
        const date = colordleDateMatch[1];
        let result = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date = ?').bind(date).first();
        if (!result) {
          await scrapeColordle(env.DB, date);
          result = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date = ?').bind(date).first();
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colordle range
      if (path === '/api/colordle/range') {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (!from || !to) return jsonResponse({ error: 'Missing from/to params' }, 400);
        const results = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date >= ? AND date <= ? ORDER BY date DESC').bind(from, to).all();
        return jsonResponse(results.results);
      }

      // ── Colorfle today ──
      if (path === '/api/colorfle/today') {
        const today = formatDateJST(new Date());
        let result = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date = ?').bind(today).first() as any;
        if (!result) {
          await scrapeColorfle(env.DB, today);
          result = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date = ?').bind(today).first() as any;
        }
        if (result && !result.normal_names) {
          const utcDate = new Date(today + 'T12:00:00Z');
          const answer = getColorfleAnswer(utcDate);
          result.normal_names = JSON.stringify(answer.normalNames);
          result.hard_names = JSON.stringify(answer.hardNames);
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colorfle by date
      const colorfleDateMatch = path.match(/^\/api\/colorfle\/date\/(\d{4}-\d{2}-\d{2})$/);
      if (colorfleDateMatch) {
        const date = colorfleDateMatch[1];
        let result = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date = ?').bind(date).first() as any;
        if (!result) {
          await scrapeColorfle(env.DB, date);
          result = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date = ?').bind(date).first() as any;
        }
        if (result && !result.normal_names) {
          const utcDate = new Date(date + 'T12:00:00Z');
          const answer = getColorfleAnswer(utcDate);
          result.normal_names = JSON.stringify(answer.normalNames);
          result.hard_names = JSON.stringify(answer.hardNames);
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colorfle range
      if (path === '/api/colorfle/range') {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (!from || !to) return jsonResponse({ error: 'Missing from/to params' }, 400);
        const results = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date >= ? AND date <= ? ORDER BY date DESC').bind(from, to).all();
        return jsonResponse(results.results);
      }

      // ── Verify endpoint ──
      if (path === '/api/verify') {
        const results: any[] = [];
        const todayIST = formatDateJST(new Date());

        const { allColors, poolColors, blocklist } = await fetchColordleData();
        for (let i = 0; i < 7; i++) {
          const dateStr = addDaysToDateStr(todayIST, -i);
          const utcDate = new Date(dateStr + 'T00:00:00Z');
          const dayNumber = getColordleDayNumber(utcDate);
          const computedName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
          const computedHex = computedName ? getColorHex(computedName) : null;
          const dbResult = await env.DB.prepare('SELECT * FROM colordle_answers WHERE date = ?').bind(dateStr).first() as any;
          const match = dbResult ? dbResult.color_name === computedName : false;
          results.push({
            game: 'colordle', date: dateStr, day_number: dayNumber,
            computed: { color_name: computedName, color_hex: computedHex },
            database: dbResult ? { color_name: dbResult.color_name, color_hex: dbResult.color_hex } : null,
            match, hex_match: dbResult ? dbResult.color_hex === computedHex : false,
          });
        }

        for (let i = 0; i < 7; i++) {
          const dateStr = addDaysToDateStr(todayIST, -i);
          const utcDate = new Date(dateStr + 'T12:00:00Z');
          const computed = getColorfleAnswer(utcDate);
          const dbResult = await env.DB.prepare('SELECT * FROM colorfle_answers WHERE date = ?').bind(dateStr).first() as any;
          const dbNormal = dbResult ? JSON.parse(dbResult.normal_answer || '[]') : [];
          const dbHard = dbResult ? JSON.parse(dbResult.hard_answer || '[]') : [];
          results.push({
            game: 'colorfle', date: dateStr, day_number: computed.dayNumber,
            computed: { normal: computed.normal, hard: computed.hard },
            database: dbResult ? { normal: dbNormal, hard: dbHard } : null,
            match: JSON.stringify(dbNormal) === JSON.stringify(computed.normal) && JSON.stringify(dbHard) === JSON.stringify(computed.hard),
          });
        }

        return jsonResponse({ verified: results.every(r => r.match), results, timestamp: new Date().toISOString() });
      }

      // ── Manual scrape trigger ──
      if (path === '/api/scrape' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) return jsonResponse({ error: 'Unauthorized' }, 401);
        await runDailyScrape(env.DB);
        return jsonResponse({ success: true, message: 'Scrape completed' });
      }

      // ── Manual cron trigger (scrape + build) ──
      // Protected with the CRON_SECRET key "BloggingIo@7"
      // Usage: POST /api/trigger-cron with header "Authorization: Bearer BloggingIo@7"
      if (path === '/api/trigger-cron' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        const cronSecret = env.CRON_SECRET || 'BloggingIo@7';
        if (auth !== `Bearer ${cronSecret}`) {
          return jsonResponse({ error: 'Unauthorized', hint: 'Use Authorization: Bearer <secret>' }, 401);
        }

        const startTime = Date.now();
        const scrapeResults: string[] = [];

        try {
          // Run the daily scrape
          const todayJST = formatDateJST(new Date());
          for (let i = 0; i < 3; i++) {
            const dateStr = addDaysToDateStr(todayJST, i);
            const colordleResult = await scrapeColordle(env.DB, dateStr);
            await env.DB.prepare(
              'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
            ).bind(`colordle-${dateStr}`, colordleResult.success ? 'success' : 'error', colordleResult.message).run();
            scrapeResults.push(`colordle-${dateStr}: ${colordleResult.message}`);

            const colorfleResult = await scrapeColorfle(env.DB, dateStr);
            await env.DB.prepare(
              'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
            ).bind(`colorfle-${dateStr}`, colorfleResult.success ? 'success' : 'error', colorfleResult.message).run();
            scrapeResults.push(`colorfle-${dateStr}: ${colorfleResult.message}`);
          }

          // Trigger Pages build (retry latest deployment)
          const pagesBuildResult = await triggerPagesBuild(env);

          // Trigger GitHub Actions build (primary mechanism)
          const githubBuildResult = await triggerGitHubActionsBuild(env);

          const elapsed = Date.now() - startTime;
          return jsonResponse({
            success: true,
            message: 'Cron job triggered manually',
            elapsed_ms: elapsed,
            today_jst: todayJST,
            scrape_results: scrapeResults,
            pages_build: pagesBuildResult,
            github_actions: githubBuildResult,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          return jsonResponse({
            success: false,
            error: err.message,
            partial_results: scrapeResults,
            elapsed_ms: Date.now() - startTime,
          }, 500);
        }
      }

      // ── Backfill from game start ──
      if (path === '/api/backfill' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) return jsonResponse({ error: 'Unauthorized' }, 401);

        const colordleStartStr = '2022-03-26';
        const endStr = formatDateJST(new Date());
        let colordleCount = 0;
        let colorfleCount = 0;

        const { allColors, poolColors, blocklist } = await fetchColordleData();
        for (let dateStr = colordleStartStr; dateStr <= endStr; dateStr = addDaysToDateStr(dateStr, 1)) {
          const existing = await env.DB.prepare('SELECT date FROM colordle_answers WHERE date = ?').bind(dateStr).first();
          if (!existing) {
            const utcDate = new Date(dateStr + 'T00:00:00Z');
            const dayNumber = getColordleDayNumber(utcDate);
            const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
            if (colorName) {
              const colorHex = getColorHex(colorName);
              await env.DB.prepare('INSERT OR REPLACE INTO colordle_answers (date, day_number, color_name, color_hex) VALUES (?, ?, ?, ?)').bind(dateStr, dayNumber, colorName, colorHex).run();
              colordleCount++;
            }
          }
        }

        const colorfleStartStr = '2022-04-25';
        for (let dateStr = colorfleStartStr; dateStr <= endStr; dateStr = addDaysToDateStr(dateStr, 1)) {
          const existing = await env.DB.prepare('SELECT date FROM colorfle_answers WHERE date = ?').bind(dateStr).first();
          if (!existing) {
            const utcDate = new Date(dateStr + 'T12:00:00Z');
            const answer = getColorfleAnswer(utcDate);
            await env.DB.prepare('INSERT OR REPLACE INTO colorfle_answers (date, day_number, normal_answer, hard_answer, normal_names, hard_names) VALUES (?, ?, ?, ?, ?, ?)').bind(
              dateStr, answer.dayNumber, JSON.stringify(answer.normal), JSON.stringify(answer.hard), JSON.stringify(answer.normalNames), JSON.stringify(answer.hardNames)
            ).run();
            colorfleCount++;
          }
        }

        return jsonResponse({ success: true, message: `Backfilled ${colordleCount} colordle + ${colorfleCount} colorfle answers`, colordleCount, colorfleCount });
      }

      // ── Recompute all D1 records ──
      if (path === '/api/recompute' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) return jsonResponse({ error: 'Unauthorized' }, 401);
        let colordleFixed = 0;
        let colorfleFixed = 0;

        const { allColors, poolColors, blocklist } = await fetchColordleData();
        const colordleRows = await env.DB.prepare('SELECT date, day_number, color_name, color_hex FROM colordle_answers ORDER BY date').all();
        for (const row of colordleRows.results as any[]) {
          const utcDate = new Date(row.date + 'T00:00:00Z');
          const dayNumber = getColordleDayNumber(utcDate);
          const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
          if (colorName) {
            const colorHex = getColorHex(colorName);
            if (row.day_number !== dayNumber || row.color_name !== colorName || row.color_hex !== colorHex) {
              await env.DB.prepare('UPDATE colordle_answers SET day_number = ?, color_name = ?, color_hex = ? WHERE date = ?').bind(dayNumber, colorName, colorHex, row.date).run();
              colordleFixed++;
            }
          }
        }

        const colorfleRows = await env.DB.prepare('SELECT date FROM colorfle_answers ORDER BY date').all();
        for (const row of colorfleRows.results as any[]) {
          const utcDate = new Date(row.date + 'T12:00:00Z');
          const answer = getColorfleAnswer(utcDate);
          await env.DB.prepare('UPDATE colorfle_answers SET day_number = ?, normal_answer = ?, hard_answer = ?, normal_names = ?, hard_names = ? WHERE date = ?').bind(
            answer.dayNumber, JSON.stringify(answer.normal), JSON.stringify(answer.hard), JSON.stringify(answer.normalNames), JSON.stringify(answer.hardNames), row.date
          ).run();
          colorfleFixed++;
        }

        return jsonResponse({ success: true, message: `Fixed ${colordleFixed} colordle + ${colorfleFixed} colorfle answers`, colordleFixed, colorfleFixed });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    }

    return jsonResponse({
      name: 'Colordle & Colorfle Answers API',
      version: '3.1.0',
      timezone: 'JST (UTC+9)',
      endpoints: [
        'GET /api/colordle/today', 'GET /api/colordle/date/:date', 'GET /api/colordle/range?from=&to=',
        'GET /api/colorfle/today', 'GET /api/colorfle/date/:date', 'GET /api/colorfle/range?from=&to=',
        'GET /api/verify', 'POST /api/scrape (auth)', 'POST /api/trigger-cron (auth)', 'POST /api/backfill (auth)', 'POST /api/recompute (auth)',
      ],
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await initDB(env.DB);
    await runDailyScrape(env.DB);
    // Trigger rebuilds after scraping - ALL 3 cron runs should trigger a build
    // GitHub Actions is the primary build mechanism (it builds + deploys to Pages)
    ctx.waitUntil((async () => {
      const pagesResult = await triggerPagesBuild(env);
      console.log('Pages build trigger:', JSON.stringify(pagesResult));
      const ghResult = await triggerGitHubActionsBuild(env);
      console.log('GitHub Actions trigger:', JSON.stringify(ghResult));
    })());
  },
};
