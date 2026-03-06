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
  return Array.isArray(header) ? header[0] : header;
}

async function fireWebhook(payload) {
  const webhookUrl = process.env.CONTRACTOR_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Contractor webhook error:', err);
  }
}

async function ensureSchema(poolInstance) {
  await poolInstance.sql`
    CREATE TABLE IF NOT EXISTS contractor_leads (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source_campaign TEXT NOT NULL DEFAULT 'general-contractors',
      selected_scenario TEXT,
      avg_project_value TEXT,
      budget_commitment TEXT,
      response_time TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      website TEXT
    );
  `;
  // Safe column additions for existing databases
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS selected_scenario TEXT;`;
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS avg_project_value TEXT;`;
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS budget_commitment TEXT;`;
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS response_time TEXT;`;
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS name TEXT;`;
  await poolInstance.sql`ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS website TEXT;`;
}

async function isAuthorized(req, poolInstance) {
  const reqToken = getAdminToken(req);
  if (!reqToken) return false;
  const envToken = process.env.ADMIN_API_TOKEN;
  if (envToken && reqToken === envToken) return true;
  const { rows } = await poolInstance.sql`
    SELECT value FROM app_settings WHERE key = 'adminPassword' LIMIT 1;
  `;
  return rows?.[0]?.value && reqToken === rows[0].value;
}

export default async function handler(req, res) {
  try {
    const poolInstance = getPool();
    await ensureSchema(poolInstance);

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      const { rows } = await poolInstance.sql`
        INSERT INTO contractor_leads (
          source_campaign, selected_scenario, avg_project_value,
          budget_commitment, response_time,
          name, email, phone, website
        ) VALUES (
          'general-contractors',
          ${body.selectedScenario || null},
          ${body.avgProjectValue || null},
          ${body.budgetCommitment || null},
          ${body.responseTime || null},
          ${body.name || null},
          ${body.email || null},
          ${body.phone || null},
          ${body.website || null}
        )
        RETURNING id;
      `;

      const insertedId = rows[0].id;

      await fireWebhook({
        source: 'general-contractors',
        id: insertedId,
        name: body.name || '',
        email: body.email || '',
        phone: body.phone || '',
        website: body.website || '',
        selectedScenario: body.selectedScenario || '',
        avgProjectValue: body.avgProjectValue || '',
        budgetCommitment: body.budgetCommitment || '',
        responseTime: body.responseTime || '',
        timestamp: new Date().toISOString(),
      });

      return json(res, 200, { success: true, id: insertedId });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!body.id) return json(res, 400, { error: 'id is required for PATCH' });

      const id = Number(body.id);
      const v = (x) => (x === undefined ? null : x || null);

      await poolInstance.sql`
        UPDATE contractor_leads SET
          selected_scenario = COALESCE(${v(body.selectedScenario)}, selected_scenario),
          avg_project_value  = COALESCE(${v(body.avgProjectValue)},  avg_project_value),
          budget_commitment  = COALESCE(${v(body.budgetCommitment)}, budget_commitment),
          response_time      = COALESCE(${v(body.responseTime)},     response_time),
          name               = COALESCE(${v(body.name)},             name),
          email              = COALESCE(${v(body.email)},            email),
          phone              = COALESCE(${v(body.phone)},            phone),
          website            = COALESCE(${v(body.website)},          website)
        WHERE id = ${id};
      `;

      return json(res, 200, { success: true });
    }

    const authorized = await isAuthorized(req, poolInstance);

    if (req.method === 'GET') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });
      const { rows } = await poolInstance.sql`
        SELECT * FROM contractor_leads ORDER BY created_at DESC;
      `;
      return json(res, 200, rows);
    }

    if (req.method === 'DELETE') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });
      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = url.searchParams.get('id');
      if (id) {
        await poolInstance.sql`DELETE FROM contractor_leads WHERE id = ${id};`;
      } else {
        await poolInstance.sql`TRUNCATE TABLE contractor_leads RESTART IDENTITY;`;
      }
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
