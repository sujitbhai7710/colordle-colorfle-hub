import { getColordleDayNumber, getColordleAnswer, fetchColordleData } from './colordle';
import { getColorfleDayNumber, getColorfleAnswer } from './colorfle';
import { getColorHex } from './color-names';

interface Env {
  DB: D1Database;
  SCRAPE_SECRET: string;
}

// Schema SQL for initialization
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

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

async function initDB(db: D1Database): Promise<void> {
  // Tables already created via wrangler d1 execute
  // Just verify they exist by running a simple query
  try {
    await db.prepare('SELECT 1 FROM colordle_answers LIMIT 1').first();
  } catch {
    // If table doesn't exist, create it
    await db.exec(SCHEMA_SQL);
  }
}

async function scrapeColordle(db: D1Database, targetDate: Date): Promise<{ success: boolean; message: string }> {
  try {
    const { allColors, poolColors, blocklist } = await fetchColordleData();
    const dayNumber = getColordleDayNumber(targetDate);
    const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);

    if (!colorName) {
      return { success: false, message: `Could not compute answer for day ${dayNumber}` };
    }

    const colorHex = getColorHex(colorName);
    const dateStr = formatDate(targetDate);

    await db.prepare(
      'INSERT OR REPLACE INTO colordle_answers (date, day_number, color_name, color_hex) VALUES (?, ?, ?, ?)'
    ).bind(dateStr, dayNumber, colorName, colorHex).run();

    return { success: true, message: `Day ${dayNumber}: ${colorName} (${colorHex})` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function scrapeColorfle(db: D1Database, targetDate: Date): Promise<{ success: boolean; message: string }> {
  try {
    const answer = getColorfleAnswer(targetDate);
    const dateStr = formatDate(targetDate);

    await db.prepare(
      'INSERT OR REPLACE INTO colorfle_answers (date, day_number, normal_answer, hard_answer) VALUES (?, ?, ?, ?)'
    ).bind(dateStr, answer.dayNumber, JSON.stringify(answer.normal), JSON.stringify(answer.hard)).run();

    return { success: true, message: `Day ${answer.dayNumber}: Normal=${answer.normalNames.join(',')} | Hard=${answer.hardNames.join(',')}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function runDailyScrape(db: D1Database): Promise<void> {
  // Scrape today + next 2 days for both games
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const targetDate = addDays(today, i);
    const colordleResult = await scrapeColordle(db, targetDate);
    await db.prepare(
      'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
    ).bind(`colordle-${formatDate(targetDate)}`, colordleResult.success ? 'success' : 'error', colordleResult.message).run();

    const colorfleResult = await scrapeColorfle(db, targetDate);
    await db.prepare(
      'INSERT INTO scrape_log (source, status, message) VALUES (?, ?, ?)'
    ).bind(`colorfle-${formatDate(targetDate)}`, colorfleResult.success ? 'success' : 'error', colorfleResult.message).run();
  }
}

// CORS headers
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
  // HTTP handler
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await initDB(env.DB);

    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (path.startsWith('/api/')) {
      // Colordle today
      if (path === '/api/colordle/today') {
        const today = formatDate(new Date());
        const result = await env.DB.prepare(
          'SELECT * FROM colordle_answers WHERE date = ?'
        ).bind(today).first();
        if (!result) {
          // Compute on the fly if not in DB
          const scrapeResult = await scrapeColordle(env.DB, new Date());
          if (scrapeResult.success) {
            const fresh = await env.DB.prepare(
              'SELECT * FROM colordle_answers WHERE date = ?'
            ).bind(today).first();
            return jsonResponse(fresh);
          }
          return jsonResponse({ error: 'Could not compute answer' }, 500);
        }
        return jsonResponse(result);
      }

      // Colordle by date
      const colordleDateMatch = path.match(/^\/api\/colordle\/date\/(\d{4}-\d{2}-\d{2})$/);
      if (colordleDateMatch) {
        const date = colordleDateMatch[1];
        let result = await env.DB.prepare(
          'SELECT * FROM colordle_answers WHERE date = ?'
        ).bind(date).first();
        if (!result) {
          const d = new Date(date + 'T00:00:00Z');
          await scrapeColordle(env.DB, d);
          result = await env.DB.prepare(
            'SELECT * FROM colordle_answers WHERE date = ?'
          ).bind(date).first();
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colordle range
      if (path === '/api/colordle/range') {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (!from || !to) return jsonResponse({ error: 'Missing from/to params' }, 400);
        const results = await env.DB.prepare(
          'SELECT * FROM colordle_answers WHERE date >= ? AND date <= ? ORDER BY date DESC'
        ).bind(from, to).all();
        return jsonResponse(results.results);
      }

      // Colorfle today
      if (path === '/api/colorfle/today') {
        const today = formatDate(new Date());
        let result = await env.DB.prepare(
          'SELECT * FROM colorfle_answers WHERE date = ?'
        ).bind(today).first();
        if (!result) {
          await scrapeColorfle(env.DB, new Date());
          result = await env.DB.prepare(
            'SELECT * FROM colorfle_answers WHERE date = ?'
          ).bind(today).first();
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colorfle by date
      const colorfleDateMatch = path.match(/^\/api\/colorfle\/date\/(\d{4}-\d{2}-\d{2})$/);
      if (colorfleDateMatch) {
        const date = colorfleDateMatch[1];
        let result = await env.DB.prepare(
          'SELECT * FROM colorfle_answers WHERE date = ?'
        ).bind(date).first();
        if (!result) {
          const d = new Date(date + 'T00:00:00Z');
          await scrapeColorfle(env.DB, d);
          result = await env.DB.prepare(
            'SELECT * FROM colorfle_answers WHERE date = ?'
          ).bind(date).first();
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colorfle range
      if (path === '/api/colorfle/range') {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        if (!from || !to) return jsonResponse({ error: 'Missing from/to params' }, 400);
        const results = await env.DB.prepare(
          'SELECT * FROM colorfle_answers WHERE date >= ? AND date <= ? ORDER BY date DESC'
        ).bind(from, to).all();
        return jsonResponse(results.results);
      }

      // Manual scrape trigger
      if (path === '/api/scrape' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
        await runDailyScrape(env.DB);
        return jsonResponse({ success: true, message: 'Scrape completed' });
      }

      // Backfill - compute all missing days
      if (path === '/api/backfill' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
        const startDate = new Date('2022-03-26');
        const endDate = new Date();
        let count = 0;
        const { allColors, poolColors, blocklist } = await fetchColordleData();
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = formatDate(d);
          const existing = await env.DB.prepare(
            'SELECT date FROM colordle_answers WHERE date = ?'
          ).bind(dateStr).first();
          if (!existing) {
            const dayNumber = getColordleDayNumber(d);
            const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
            if (colorName) {
              const colorHex = getColorHex(colorName);
              await env.DB.prepare(
                'INSERT OR REPLACE INTO colordle_answers (date, day_number, color_name, color_hex) VALUES (?, ?, ?, ?)'
              ).bind(dateStr, dayNumber, colorName, colorHex).run();
              count++;
            }
          }
        }
        return jsonResponse({ success: true, message: `Backfilled ${count} colordle answers` });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    }

    // Default: return info
    return jsonResponse({
      name: 'Colordle & Colorfle Answers API',
      version: '1.0.0',
      endpoints: [
        'GET /api/colordle/today',
        'GET /api/colordle/date/:date',
        'GET /api/colordle/range?from=&to=',
        'GET /api/colorfle/today',
        'GET /api/colorfle/date/:date',
        'GET /api/colorfle/range?from=&to=',
        'POST /api/scrape (auth required)',
      ],
    });
  },

  // Cron handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await initDB(env.DB);
    ctx.waitUntil(runDailyScrape(env.DB));
  },
};
