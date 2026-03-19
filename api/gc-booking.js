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

    const name    = body.first_name && body.last_name
                    ? `${body.first_name} ${body.last_name}`.trim()
                    : (body.full_name || body.name || null);
    const email   = body.email || null;
    const phone   = body.phone || null;
    const website = body.website || null;
    const competitor = body.competitor || body.competitor_website || null;

    const p = getPool();

    await p.sql`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;
    `;

    await p.sql`
      INSERT INTO leads (name, email, phone, website, competitors, funnel, source, booking_reached)
      VALUES (
        ${name}, ${email}, ${phone}, ${website}, ${competitor},
        'GC Audit Funnel', 'gc-booking-webhook', true
      );
    `;

    return json(res, 200, { success: true });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
