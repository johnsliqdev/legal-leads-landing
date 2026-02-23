import { createPool } from '@vercel/postgres';

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
  if (!connectionString) throw new Error('Missing Postgres connection string env var');
  if (!pool) pool = createPool({ connectionString });
  return pool;
}

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

async function isAuthorized(poolInstance, token) {
  if (!token) return false;
  const envToken = process.env.ADMIN_API_TOKEN;
  if (envToken && token === envToken) return true;
  const { rows } = await poolInstance.sql`
    SELECT value FROM app_settings WHERE key = 'adminPassword' LIMIT 1;
  `;
  const dbPassword = rows?.[0]?.value;
  return dbPassword && token === dbPassword;
}

const CONTENT_PREFIX = 'content_';

export default async function handler(req, res) {
  try {
    const poolInstance = getPool();

    if (req.method === 'GET') {
      const { rows } = await poolInstance.sql`
        SELECT key, value FROM app_settings WHERE key LIKE 'content_%';
      `;
      const content = {};
      for (const row of rows) {
        content[row.key.replace(CONTENT_PREFIX, '')] = row.value;
      }
      return json(res, 200, content);
    }

    if (req.method === 'PUT') {
      const token = getAdminToken(req);
      const authorized = await isAuthorized(poolInstance, token);
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      for (const [key, value] of Object.entries(body)) {
        const dbKey = CONTENT_PREFIX + key;
        await poolInstance.sql`
          INSERT INTO app_settings (key, value)
          VALUES (${dbKey}, ${String(value)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        `;
      }

      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,PUT');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
