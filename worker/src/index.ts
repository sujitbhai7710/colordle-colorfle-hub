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

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

async function initDB(db: D1Database): Promise<void> {
  try {
    await db.prepare('SELECT 1 FROM colordle_answers LIMIT 1').first();
  } catch {
    await db.exec(SCHEMA_SQL);
  }
  // Try to add columns if they don't exist (for existing databases)
  try {
    await db.exec(`ALTER TABLE colorfle_answers ADD COLUMN normal_names TEXT`);
  } catch {}
  try {
    await db.exec(`ALTER TABLE colorfle_answers ADD COLUMN hard_names TEXT`);
  } catch {}
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

async function runDailyScrape(db: D1Database): Promise<void> {
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
        let result = await env.DB.prepare(
          'SELECT * FROM colordle_answers WHERE date = ?'
        ).bind(today).first();
        if (!result) {
          const scrapeResult = await scrapeColordle(env.DB, new Date());
          if (scrapeResult.success) {
            result = await env.DB.prepare(
              'SELECT * FROM colordle_answers WHERE date = ?'
            ).bind(today).first();
          }
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Could not compute answer' }, 500);
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
        ).bind(today).first() as any;
        if (!result) {
          await scrapeColorfle(env.DB, new Date());
          result = await env.DB.prepare(
            'SELECT * FROM colorfle_answers WHERE date = ?'
          ).bind(today).first() as any;
        }
        // Add names if missing from old records
        if (result && !result.normal_names) {
          const answer = getColorfleAnswer(new Date());
          result.normal_names = JSON.stringify(answer.normalNames);
          result.hard_names = JSON.stringify(answer.hardNames);
        }
        return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
      }

      // Colorfle by date
      const colorfleDateMatch = path.match(/^\/api\/colorfle\/date\/(\d{4}-\d{2}-\d{2})$/);
      if (colorfleDateMatch) {
        const date = colorfleDateMatch[1];
        let result = await env.DB.prepare(
          'SELECT * FROM colorfle_answers WHERE date = ?'
        ).bind(date).first() as any;
        if (!result) {
          const d = new Date(date + 'T00:00:00Z');
          await scrapeColorfle(env.DB, d);
          result = await env.DB.prepare(
            'SELECT * FROM colorfle_answers WHERE date = ?'
          ).bind(date).first() as any;
        }
        // Add names if missing
        if (result && !result.normal_names) {
          const answer = getColorfleAnswer(new Date(date + 'T17:00:00Z'));
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
        const results = await env.DB.prepare(
          'SELECT * FROM colorfle_answers WHERE date >= ? AND date <= ? ORDER BY date DESC'
        ).bind(from, to).all();
        return jsonResponse(results.results);
      }

      // Verification endpoint - computes answers on-the-fly and compares with D1
      if (path === '/api/verify') {
        const results: any[] = [];
        const today = new Date();
        
        // Verify last 7 days of Colordle
        const { allColors, poolColors, blocklist } = await fetchColordleData();
        for (let i = 0; i < 7; i++) {
          const d = addDays(today, -i);
          const dateStr = formatDate(d);
          const dayNumber = getColordleDayNumber(d);
          const computedName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
          const computedHex = computedName ? getColorHex(computedName) : null;
          
          const dbResult = await env.DB.prepare(
            'SELECT * FROM colordle_answers WHERE date = ?'
          ).bind(dateStr).first() as any;
          
          const match = dbResult ? dbResult.color_name === computedName : false;
          results.push({
            game: 'colordle',
            date: dateStr,
            day_number: dayNumber,
            computed: { color_name: computedName, color_hex: computedHex },
            database: dbResult ? { color_name: dbResult.color_name, color_hex: dbResult.color_hex } : null,
            match,
          });
        }

        // Verify last 7 days of Colorfle
        for (let i = 0; i < 7; i++) {
          const d = addDays(today, -i);
          const dateStr = formatDate(d);
          const computed = getColorfleAnswer(d);
          
          const dbResult = await env.DB.prepare(
            'SELECT * FROM colorfle_answers WHERE date = ?'
          ).bind(dateStr).first() as any;
          
          const dbNormal = dbResult ? JSON.parse(dbResult.normal_answer || '[]') : [];
          const dbHard = dbResult ? JSON.parse(dbResult.hard_answer || '[]') : [];
          const normalMatch = JSON.stringify(dbNormal) === JSON.stringify(computed.normal);
          const hardMatch = JSON.stringify(dbHard) === JSON.stringify(computed.hard);
          
          results.push({
            game: 'colorfle',
            date: dateStr,
            day_number: computed.dayNumber,
            computed: { normal: computed.normal, hard: computed.hard, normalNames: computed.normalNames, hardNames: computed.hardNames },
            database: dbResult ? { normal: dbNormal, hard: dbHard } : null,
            match: normalMatch && hardMatch,
          });
        }

        const allMatch = results.every(r => r.match);
        return jsonResponse({ verified: allMatch, results, timestamp: new Date().toISOString() });
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

      // Backfill - compute all missing days (using corrected epoch)
      if (path === '/api/backfill' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
        const startDate = new Date('2023-08-07'); // Corrected epoch
        const endDate = new Date();
        let colordleCount = 0;
        let colorfleCount = 0;
        
        // Backfill Colordle
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
              colordleCount++;
            }
          }
        }

        // Backfill Colorfle
        const colorfleStart = new Date('2022-04-25');
        for (let d = new Date(colorfleStart); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = formatDate(d);
          const existing = await env.DB.prepare(
            'SELECT date FROM colorfle_answers WHERE date = ?'
          ).bind(dateStr).first();
          if (!existing) {
            const answer = getColorfleAnswer(d);
            await env.DB.prepare(
              'INSERT OR REPLACE INTO colorfle_answers (date, day_number, normal_answer, hard_answer, normal_names, hard_names) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(
              dateStr, answer.dayNumber,
              JSON.stringify(answer.normal), JSON.stringify(answer.hard),
              JSON.stringify(answer.normalNames), JSON.stringify(answer.hardNames)
            ).run();
            colorfleCount++;
          }
        }

        return jsonResponse({ 
          success: true, 
          message: `Backfilled ${colordleCount} colordle + ${colorfleCount} colorfle answers` 
        });
      }

      // Recompute - fix all existing D1 records with corrected algorithm
      if (path === '/api/recompute' && request.method === 'POST') {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${env.SCRAPE_SECRET}`) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
        let colordleFixed = 0;
        let colorfleFixed = 0;

        // Recompute all Colordle answers
        const { allColors, poolColors, blocklist } = await fetchColordleData();
        const colordleRows = await env.DB.prepare(
          'SELECT date, day_number FROM colordle_answers ORDER BY date'
        ).all();
        
        for (const row of colordleRows.results as any[]) {
          const d = new Date(row.date + 'T00:00:00Z');
          const dayNumber = getColordleDayNumber(d);
          const colorName = getColordleAnswer(dayNumber, allColors, poolColors, blocklist);
          if (colorName && (row.day_number !== dayNumber)) {
            const colorHex = getColorHex(colorName);
            await env.DB.prepare(
              'UPDATE colordle_answers SET day_number = ?, color_name = ?, color_hex = ? WHERE date = ?'
            ).bind(dayNumber, colorName, colorHex, row.date).run();
            colordleFixed++;
          }
        }

        // Recompute all Colorfle answers
        const colorfleRows = await env.DB.prepare(
          'SELECT date FROM colorfle_answers ORDER BY date'
        ).all();
        
        for (const row of colorfleRows.results as any[]) {
          const d = new Date(row.date + 'T17:00:00Z');
          const answer = getColorfleAnswer(d);
          await env.DB.prepare(
            'UPDATE colorfle_answers SET day_number = ?, normal_answer = ?, hard_answer = ?, normal_names = ?, hard_names = ? WHERE date = ?'
          ).bind(
            answer.dayNumber,
            JSON.stringify(answer.normal), JSON.stringify(answer.hard),
            JSON.stringify(answer.normalNames), JSON.stringify(answer.hardNames),
            row.date
          ).run();
          colorfleFixed++;
        }

        return jsonResponse({ 
          success: true, 
          message: `Fixed ${colordleFixed} colordle + ${colorfleFixed} colorfle answers` 
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    }

    // Default: return info
    return jsonResponse({
      name: 'Colordle & Colorfle Answers API',
      version: '2.0.0',
      endpoints: [
        'GET /api/colordle/today',
        'GET /api/colordle/date/:date',
        'GET /api/colordle/range?from=&to=',
        'GET /api/colorfle/today',
        'GET /api/colorfle/date/:date',
        'GET /api/colorfle/range?from=&to=',
        'GET /api/verify',
        'POST /api/scrape (auth required)',
        'POST /api/backfill (auth required)',
        'POST /api/recompute (auth required)',
      ],
    });
  },

  // Cron handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await initDB(env.DB);
    ctx.waitUntil(runDailyScrape(env.DB));
  },
};
