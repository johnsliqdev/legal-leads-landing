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
  if (!connectionString) {
    const present = Object.keys(process.env)
      .filter((k) => k.includes('POSTGRES') || k.includes('DATABASE'))
      .sort();
    throw new Error(
      `Missing Postgres connection string env var. Present keys: ${present.join(', ')}`
    );
  }

  if (!pool) {
    pool = createPool({ connectionString });
  }

  return pool;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'method_not_allowed' });
    }

    const poolInstance = getPool();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (!body.email) {
      return json(res, 400, { error: 'Email is required' });
    }

    // Update the most recent lead with this email to set requested_callback to true
    await poolInstance.sql`
      UPDATE leads
      SET requested_callback = ${body.requestedCallback || true}
      WHERE email = ${body.email}
      AND id = (
        SELECT id FROM leads
        WHERE email = ${body.email}
        ORDER BY created_at DESC
        LIMIT 1
      );
    `;

    return json(res, 200, { success: true });
  } catch (err) {
    console.error('Callback request error:', err);
    return json(res, 500, { error: String(err?.message || err) });
  }
}
