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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const name       = body.first_name && body.last_name
                       ? `${body.first_name} ${body.last_name}`.trim()
                       : (body.full_name || body.name || null);
    const email      = body.email || null;
    const phone      = body.phone || null;
    const website    = body.website || null;
    const competitor = body.competitor || body.competitor_website || null;

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
        audit_status TEXT DEFAULT 'pending',
        raw_payload  TEXT
      );
    `;
    await p.sql`ALTER TABLE gc_audits ADD COLUMN IF NOT EXISTS raw_payload TEXT;`;

    await p.sql`
      INSERT INTO gc_audits (name, email, phone, website, competitor, raw_payload)
      VALUES (${name}, ${email}, ${phone}, ${website}, ${competitor}, ${JSON.stringify(body)});
    `;

    return json(res, 200, { success: true });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
