import { createPool } from '@vercel/postgres';

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getAdminToken(req) {
  const header = req.headers['x-admin-token'];
  if (Array.isArray(header)) return header[0];
  return header;
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
  if (!connectionString) {
    throw new Error('Missing Postgres connection string env var');
  }
  if (!pool) pool = createPool({ connectionString });
  return pool;
}

async function ensureSchema(poolInstance) {
  await poolInstance.sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  await poolInstance.sql`
    INSERT INTO app_settings (key, value)
    VALUES ('cpqlTarget', '700')
    ON CONFLICT (key) DO NOTHING;
  `;
}

export default async function handler(req, res) {
  try {
    const poolInstance = getPool();
    await ensureSchema(poolInstance);

    if (req.method === 'GET') {
      const { rows } = await poolInstance.sql`
        SELECT value FROM app_settings WHERE key = 'cpqlTarget' LIMIT 1;
      `;
      const value = rows?.[0]?.value ?? '700';
      return json(res, 200, { cpqlTarget: Number(value) });
    }

    const adminToken = process.env.ADMIN_API_TOKEN;
    const reqToken = getAdminToken(req);
    const authorized = adminToken && reqToken && reqToken === adminToken;

    if (req.method === 'PUT') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const next = Number(body.cpqlTarget);
      if (!Number.isFinite(next) || next < 0) {
        return json(res, 400, { error: 'invalid_cpql_target' });
      }

      await poolInstance.sql`
        INSERT INTO app_settings (key, value)
        VALUES ('cpqlTarget', ${String(next)})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `;

      return json(res, 200, { success: true, cpqlTarget: next });
    }

    res.setHeader('Allow', 'GET,PUT');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
