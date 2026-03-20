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
      audit_status TEXT DEFAULT 'pending'
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

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { session_id, name, email, phone, revenue_range, website, competitor, source } = body;

      if (!email && !phone) return json(res, 400, { error: 'email or phone required' });

      await db.sql`
        INSERT INTO gc_leads (session_id, name, email, phone, revenue_range, website, competitor, source)
        VALUES (${session_id || null}, ${name || null}, ${email || null}, ${phone || null},
                ${revenue_range || null}, ${website || null}, ${competitor || null}, ${source || null});
      `;
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

    res.setHeader('Allow', 'GET,POST,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
