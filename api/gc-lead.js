import { createPool } from '@vercel/postgres';

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.DATABASE_URL_UNPOOLED ||
    ''
  );
}

let pool;
function getPool() {
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error('Missing Postgres connection string');
  if (!pool) pool = createPool({ connectionString });
  return pool;
}

async function ensureSchema(db) {
  await db.sql`
    CREATE TABLE IF NOT EXISTS gc_leads (
      id SERIAL PRIMARY KEY,
      session_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      name TEXT,
      email TEXT,
      phone TEXT,
      revenue_range TEXT,
      website TEXT,
      competitor TEXT,
      source TEXT,
      audit_status TEXT DEFAULT 'pending',
      booked_call BOOLEAN DEFAULT FALSE
    );
  `;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS booked_call BOOLEAN DEFAULT FALSE;`;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS utm_source TEXT;`;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;`;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;`;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS utm_content TEXT;`;
  await db.sql`ALTER TABLE gc_leads ADD COLUMN IF NOT EXISTS utm_term TEXT;`;
  await db.sql`
    CREATE TABLE IF NOT EXISTS gc_sessions (
      id SERIAL PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      source TEXT,
      time_on_page INTEGER DEFAULT 0,
      sections_viewed TEXT DEFAULT '[]',
      reached_form BOOLEAN DEFAULT FALSE,
      started_form BOOLEAN DEFAULT FALSE,
      completed_form BOOLEAN DEFAULT FALSE,
      form_step_dropped INTEGER,
      revenue_selected TEXT
    );
  `;
}

async function isAuthorized(token, db) {
  if (!token) return false;
  const env = process.env.ADMIN_API_TOKEN;
  if (env && token === env) return true;
  const { rows } = await db.sql`SELECT value FROM app_settings WHERE key = 'adminPassword' LIMIT 1;`;
  const dbPassword = rows?.[0]?.value;
  return dbPassword && token === dbPassword;
}

export default async function handler(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);

    const type = req.query?.type || 'lead';

    // ── Session tracking (type=session) ──────────────────────────────────────
    if (type === 'session') {
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const {
          session_id, time_on_page, sections_viewed, reached_form,
          started_form, completed_form, form_step_dropped, revenue_selected, source
        } = body;

        if (!session_id) return json(res, 400, { error: 'session_id required' });

        const sectionsStr = Array.isArray(sections_viewed) ? JSON.stringify(sections_viewed) : (sections_viewed || '[]');

        await db.sql`
          INSERT INTO gc_sessions (session_id, source, time_on_page, sections_viewed, reached_form, started_form, completed_form, form_step_dropped, revenue_selected)
          VALUES (${session_id}, ${source || null}, ${time_on_page || 0}, ${sectionsStr},
                  ${reached_form || false}, ${started_form || false}, ${completed_form || false},
                  ${form_step_dropped || null}, ${revenue_selected || null})
          ON CONFLICT (session_id) DO UPDATE SET
            last_seen = NOW(),
            time_on_page = GREATEST(gc_sessions.time_on_page, EXCLUDED.time_on_page),
            sections_viewed = EXCLUDED.sections_viewed,
            reached_form = gc_sessions.reached_form OR EXCLUDED.reached_form,
            started_form = gc_sessions.started_form OR EXCLUDED.started_form,
            completed_form = gc_sessions.completed_form OR EXCLUDED.completed_form,
            form_step_dropped = CASE WHEN EXCLUDED.completed_form THEN NULL ELSE COALESCE(EXCLUDED.form_step_dropped, gc_sessions.form_step_dropped) END,
            revenue_selected = COALESCE(EXCLUDED.revenue_selected, gc_sessions.revenue_selected);
        `;
        return json(res, 200, { success: true });
      }

      if (req.method === 'GET') {
        const token = req.headers['x-admin-token'];
        if (!await isAuthorized(token, db)) return json(res, 401, { error: 'unauthorized' });

        const { rows } = await db.sql`
          SELECT
            COUNT(*) FILTER (WHERE TRUE)                         AS total_sessions,
            COUNT(*) FILTER (WHERE reached_form)                 AS reached_form,
            COUNT(*) FILTER (WHERE started_form)                 AS started_form,
            COUNT(*) FILTER (WHERE completed_form)               AS completed_form,
            COUNT(*) FILTER (WHERE started_form AND NOT completed_form AND form_step_dropped = 1) AS dropped_step1,
            COUNT(*) FILTER (WHERE started_form AND NOT completed_form AND form_step_dropped = 2) AS dropped_step2,
            COUNT(*) FILTER (WHERE started_form AND NOT completed_form AND form_step_dropped = 3) AS dropped_step3,
            COUNT(*) FILTER (WHERE started_form AND NOT completed_form AND form_step_dropped = 4) AS dropped_step4,
            ROUND(AVG(time_on_page))                             AS avg_time_on_page
          FROM gc_sessions;
        `;
        const { rows: bookingRows } = await db.sql`
          SELECT COUNT(*) AS booked_calls FROM gc_leads WHERE booked_call = TRUE;
        `;
        return json(res, 200, { analytics: { ...rows[0], booked_calls: bookingRows[0].booked_calls } });
      }

      res.setHeader('Allow', 'GET,POST');
      return json(res, 405, { error: 'method_not_allowed' });
    }

    // ── Resume URL (public, no auth) ─────────────────────────────────────────
    if (req.method === 'GET' && req.query?.resume) {
      const { rows } = await db.sql`
        SELECT name, email, phone, revenue_range, website, competitor
        FROM gc_leads WHERE session_id = ${req.query.resume} LIMIT 1;
      `;
      if (!rows.length) return json(res, 404, { error: 'not_found' });
      return json(res, 200, { lead: rows[0] });
    }

    // ── Lead opt-in: POST (create on step 1) ─────────────────────────────────
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { session_id, name, email, phone, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body;

      if (!email && !phone) return json(res, 400, { error: 'email or phone required' });

      await db.sql`
        INSERT INTO gc_leads (session_id, name, email, phone, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
        VALUES (${session_id || null}, ${name || null}, ${email || null}, ${phone || null}, ${source || null},
                ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null}, ${utm_content || null}, ${utm_term || null})
        ON CONFLICT DO NOTHING;
      `;
      return json(res, 200, { success: true });
    }

    // ── Lead opt-in: PATCH (increment fields as they progress) ───────────────
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { session_id, revenue_range, website, competitor, booked_call } = body;

      if (!session_id) return json(res, 400, { error: 'session_id required' });

      if (revenue_range !== undefined) {
        await db.sql`UPDATE gc_leads SET revenue_range = ${revenue_range} WHERE session_id = ${session_id};`;
      }
      if (website !== undefined) {
        await db.sql`UPDATE gc_leads SET website = ${website}, competitor = ${competitor || null} WHERE session_id = ${session_id};`;
      }
      if (booked_call !== undefined) {
        await db.sql`UPDATE gc_leads SET booked_call = ${booked_call} WHERE session_id = ${session_id};`;
      }
      return json(res, 200, { success: true });
    }

    const token = req.headers['x-admin-token'];

    if (req.method === 'GET') {
      if (!await isAuthorized(token, db)) return json(res, 401, { error: 'unauthorized' });
      const { rows } = await db.sql`SELECT * FROM gc_leads ORDER BY created_at DESC LIMIT 200;`;
      return json(res, 200, { leads: rows });
    }

    if (req.method === 'DELETE') {
      if (!await isAuthorized(token, db)) return json(res, 401, { error: 'unauthorized' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (body.id) {
        await db.sql`DELETE FROM gc_leads WHERE id = ${body.id};`;
      } else {
        await db.sql`TRUNCATE gc_leads;`;
      }
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
