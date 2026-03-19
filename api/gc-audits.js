import { createPool } from '@vercel/postgres';

let pool;
function getPool() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  if (!connectionString) throw new Error('Missing Postgres connection string');
  if (!pool) pool = createPool({ connectionString });
  return pool;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getAdminToken(req) {
  const h = req.headers['x-admin-token'];
  return Array.isArray(h) ? h[0] : h;
}

export default async function handler(req, res) {
  try {
    const p = getPool();

    await p.sql`
      CREATE TABLE IF NOT EXISTS gc_audits (
        id           SERIAL PRIMARY KEY,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        name         TEXT,
        email        TEXT,
        phone        TEXT,
        website      TEXT,
        competitor   TEXT,
        audit_status TEXT DEFAULT 'pending'
      );
    `;

    const reqToken = getAdminToken(req);
    let authorized = false;
    if (reqToken) {
      const envToken = process.env.ADMIN_API_TOKEN;
      if (envToken && reqToken === envToken) {
        authorized = true;
      } else {
        const { rows } = await p.sql`SELECT value FROM app_settings WHERE key = 'adminPassword' LIMIT 1;`;
        if (rows?.[0]?.value && reqToken === rows[0].value) authorized = true;
      }
    }

    if (!authorized) return json(res, 401, { error: 'unauthorized' });

    if (req.method === 'GET') {
      const { rows } = await p.sql`SELECT * FROM gc_audits ORDER BY created_at DESC;`;
      return json(res, 200, rows);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = url.searchParams.get('id');
      if (id) {
        await p.sql`DELETE FROM gc_audits WHERE id = ${id};`;
      } else {
        await p.sql`TRUNCATE TABLE gc_audits RESTART IDENTITY;`;
      }
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
