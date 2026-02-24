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

function getAdminToken(req) {
  const header = req.headers['x-admin-token'];
  if (Array.isArray(header)) return header[0];
  return header;
}

async function fireGhlWebhook(payload) {
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!ghlWebhookUrl) return;
  try {
    await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('GHL webhook error:', err);
  }
}

async function ensureSchema(poolInstance) {
  await poolInstance.sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      email TEXT,
      phone TEXT,
      website TEXT,
      calc_current_monthly_spend TEXT,
      calc_current_cpql TEXT,
      calc_guaranteed_cpql TEXT,
      calc_new_monthly_spend TEXT,
      calc_monthly_savings TEXT,
      calc_annual_savings TEXT,
      calc_cpql_reduction TEXT,
      calc_leads_count TEXT,
      calc_same_budget_leads TEXT,
      requested_callback BOOLEAN DEFAULT FALSE,
      meta_budget_commitment TEXT,
      dedicated_intake TEXT,
      uses_crm TEXT,
      firm_differentiator TEXT,
      video_watch_seconds INTEGER DEFAULT 0,
      video_watch_percent INTEGER DEFAULT 0
    );
  `;

  // Add columns if they don't exist (for existing databases)
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS requested_callback BOOLEAN DEFAULT FALSE;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS calc_same_budget_leads TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_budget_commitment TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS dedicated_intake TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS uses_crm TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS firm_differentiator TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_watch_seconds INTEGER DEFAULT 0;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_watch_percent INTEGER DEFAULT 0;`;

  // Drop unused columns (never collected)
  await poolInstance.sql`ALTER TABLE leads DROP COLUMN IF EXISTS first_name;`;
  await poolInstance.sql`ALTER TABLE leads DROP COLUMN IF EXISTS last_name;`;
  await poolInstance.sql`ALTER TABLE leads DROP COLUMN IF EXISTS law_firm;`;
}

export default async function handler(req, res) {
  try {
    const poolInstance = getPool();
    await ensureSchema(poolInstance);

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      const { rows } = await poolInstance.sql`
        INSERT INTO leads (
          email, phone, website,
          calc_current_monthly_spend, calc_current_cpql, calc_guaranteed_cpql,
          calc_new_monthly_spend, calc_monthly_savings, calc_annual_savings,
          calc_cpql_reduction, calc_leads_count, calc_same_budget_leads,
          requested_callback
        ) VALUES (
          ${body.email || null}, ${body.phone || null},
          ${body.website === '' ? '' : (body.website || null)},
          ${body.calcCurrentMonthlySpend || null}, ${body.calcCurrentCpql || null},
          ${body.calcGuaranteedCpql || null}, ${body.calcNewMonthlySpend || null},
          ${body.calcMonthlySavings || null}, ${body.calcAnnualSavings || null},
          ${body.calcCpqlReduction || null}, ${body.calcLeadsCount || null},
          ${body.calcSameBudgetLeads || null}, ${body.requestedCallback || false}
        )
        RETURNING id;
      `;

      const insertedId = rows[0].id;

      // Fire GHL webhook on every new lead (contact form submission)
      await fireGhlWebhook({
        email: body.email || '',
        phone: body.phone || '',
        website: body.website || '',
      });

      return json(res, 200, { success: true, id: insertedId });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!body.id) return json(res, 400, { error: 'id is required for PATCH' });

      const id = Number(body.id);
      const toVal = (v) => (v === undefined || v === '' ? null : v);
      const websiteVal = body.website === undefined ? null : body.website;

      await poolInstance.sql`
        UPDATE leads SET
          email = COALESCE(${toVal(body.email)}, email),
          phone = COALESCE(${toVal(body.phone)}, phone),
          website = COALESCE(${websiteVal}, website),
          calc_current_monthly_spend = COALESCE(${toVal(body.calcCurrentMonthlySpend)}, calc_current_monthly_spend),
          calc_current_cpql = COALESCE(${toVal(body.calcCurrentCpql)}, calc_current_cpql),
          calc_guaranteed_cpql = COALESCE(${toVal(body.calcGuaranteedCpql)}, calc_guaranteed_cpql),
          calc_new_monthly_spend = COALESCE(${toVal(body.calcNewMonthlySpend)}, calc_new_monthly_spend),
          calc_monthly_savings = COALESCE(${toVal(body.calcMonthlySavings)}, calc_monthly_savings),
          calc_annual_savings = COALESCE(${toVal(body.calcAnnualSavings)}, calc_annual_savings),
          calc_cpql_reduction = COALESCE(${toVal(body.calcCpqlReduction)}, calc_cpql_reduction),
          calc_leads_count = COALESCE(${toVal(body.calcLeadsCount)}, calc_leads_count),
          calc_same_budget_leads = COALESCE(${toVal(body.calcSameBudgetLeads)}, calc_same_budget_leads),
          requested_callback = COALESCE(${body.requestedCallback === undefined ? null : body.requestedCallback}, requested_callback),
          meta_budget_commitment = COALESCE(${toVal(body.metaBudgetCommitment)}, meta_budget_commitment),
          dedicated_intake = COALESCE(${toVal(body.dedicatedIntake)}, dedicated_intake),
          uses_crm = COALESCE(${toVal(body.usesCRM)}, uses_crm),
          firm_differentiator = COALESCE(${toVal(body.firmDifferentiator)}, firm_differentiator),
          video_watch_seconds = COALESCE(${body.videoWatchSeconds === undefined ? null : Number(body.videoWatchSeconds)}, video_watch_seconds),
          video_watch_percent = COALESCE(${body.videoWatchPercent === undefined ? null : Number(body.videoWatchPercent)}, video_watch_percent)
        WHERE id = ${id};
      `;

      return json(res, 200, { success: true });
    }

    const reqToken = getAdminToken(req);
    let authorized = false;
    if (reqToken) {
      const envToken = process.env.ADMIN_API_TOKEN;
      if (envToken && reqToken === envToken) {
        authorized = true;
      } else {
        const { rows: pwRows } = await poolInstance.sql`
          SELECT value FROM app_settings WHERE key = 'adminPassword' LIMIT 1;
        `;
        if (pwRows?.[0]?.value && reqToken === pwRows[0].value) authorized = true;
      }
    }

    if (req.method === 'GET') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const { rows } = await poolInstance.sql`
        SELECT * FROM leads
        ORDER BY created_at DESC;
      `;
      return json(res, 200, rows);
    }

    if (req.method === 'DELETE') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const url = new URL(req.url, `http://${req.headers.host}`);
      const id = url.searchParams.get('id');

      if (id) {
        await poolInstance.sql`DELETE FROM leads WHERE id = ${id};`;
        return json(res, 200, { success: true });
      }

      await poolInstance.sql`TRUNCATE TABLE leads RESTART IDENTITY;`;
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
