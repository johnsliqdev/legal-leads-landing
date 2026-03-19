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
      meta_budget_commitment TEXT,
      dedicated_intake TEXT,
      uses_crm TEXT,
      firm_differentiator TEXT,
      video_watch_seconds INTEGER DEFAULT 0,
      video_watch_percent INTEGER DEFAULT 0
    );
  `;

  // Add columns if they don't exist (for existing databases)
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS calc_same_budget_leads TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_budget_commitment TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS dedicated_intake TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS uses_crm TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS firm_differentiator TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_watch_seconds INTEGER DEFAULT 0;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_watch_percent INTEGER DEFAULT 0;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_source TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_range TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS situation TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitors TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_reached BOOLEAN DEFAULT FALSE;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_token TEXT;`;
  await poolInstance.sql`ALTER TABLE leads DROP COLUMN IF EXISTS reminder_fired;`;
  await poolInstance.sql`ALTER TABLE leads DROP COLUMN IF EXISTS requested_callback;`;

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

      const resumeToken = crypto.randomUUID();

      const { rows } = await poolInstance.sql`
        INSERT INTO leads (
          name, email, phone, website,
          calc_current_monthly_spend, calc_current_cpql, calc_guaranteed_cpql,
          calc_new_monthly_spend, calc_monthly_savings, calc_annual_savings,
          calc_cpql_reduction, calc_leads_count, calc_same_budget_leads,
          ad_source, funnel, revenue_range, situation, competitors,
          booking_reached, resume_token
        ) VALUES (
          ${body.name || null}, ${body.email || null}, ${body.phone || null},
          ${body.website === '' ? '' : (body.website || null)},
          ${body.calcCurrentMonthlySpend || null}, ${body.calcCurrentCpql || null},
          ${body.calcGuaranteedCpql || null}, ${body.calcNewMonthlySpend || null},
          ${body.calcMonthlySavings || null}, ${body.calcAnnualSavings || null},
          ${body.calcCpqlReduction || null}, ${body.calcLeadsCount || null},
          ${body.calcSameBudgetLeads || null},
          ${body.ad_source || null}, ${body.funnel || null},
          ${body.revenue_range || null}, ${body.situation || null},
          ${body.competitors || null}, false, ${resumeToken}
        )
        RETURNING id;
      `;

      const insertedId = rows[0].id;
      return json(res, 200, { success: true, id: insertedId, resume_token: resumeToken });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!body.id) return json(res, 400, { error: 'id is required for PATCH' });

      const id = Number(body.id);
      const toVal = (v) => (v === undefined || v === '' ? null : v);
      const websiteVal = body.website === undefined ? null : body.website;

      await poolInstance.sql`
        UPDATE leads SET
          name = COALESCE(${toVal(body.name)}, name),
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
          situation = COALESCE(${toVal(body.situation)}, situation),
          meta_budget_commitment = COALESCE(${toVal(body.metaBudgetCommitment)}, meta_budget_commitment),
          dedicated_intake = COALESCE(${toVal(body.dedicatedIntake)}, dedicated_intake),
          uses_crm = COALESCE(${toVal(body.usesCRM)}, uses_crm),
          firm_differentiator = COALESCE(${toVal(body.firmDifferentiator)}, firm_differentiator),
          video_watch_seconds = COALESCE(${body.videoWatchSeconds === undefined ? null : Number(body.videoWatchSeconds)}, video_watch_seconds),
          video_watch_percent = COALESCE(${body.videoWatchPercent === undefined ? null : Number(body.videoWatchPercent)}, video_watch_percent),
          booking_reached = COALESCE(${body.bookingReached === undefined ? null : body.bookingReached}, booking_reached)
        WHERE id = ${id};
      `;


      return json(res, 200, { success: true });
    }

    // Public resume-token lookup (no auth required)
    if (req.method === 'GET') {
      const resumeUrl = new URL(req.url, `http://${req.headers.host}`);
      const resumeToken = resumeUrl.searchParams.get('resume_token');
      if (resumeToken) {
        const { rows: rRows } = await poolInstance.sql`
          SELECT name, email, phone, website, funnel, booking_reached,
                 situation, meta_budget_commitment, uses_crm, dedicated_intake
          FROM leads WHERE resume_token = ${resumeToken} LIMIT 1;
        `;
        if (!rRows.length) return json(res, 404, { error: 'not_found' });
        return json(res, 200, rRows[0]);
      }
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

      const url = new URL(req.url, `http://${req.headers.host}`);
      const funnelFilter = url.searchParams.get('funnel');

      let rows;
      if (funnelFilter === 'gc') {
        ({ rows } = await poolInstance.sql`
          SELECT * FROM leads WHERE funnel = 'GC Audit Funnel' ORDER BY created_at DESC;
        `);
      } else if (funnelFilter === 'ls') {
        ({ rows } = await poolInstance.sql`
          SELECT * FROM leads WHERE funnel = 'Simple Legal Funnel' ORDER BY created_at DESC;
        `);
      } else if (funnelFilter === 'cpql') {
        ({ rows } = await poolInstance.sql`
          SELECT * FROM leads WHERE funnel IS NULL OR funnel NOT IN ('GC Audit Funnel', 'Simple Legal Funnel') ORDER BY created_at DESC;
        `);
      } else {
        ({ rows } = await poolInstance.sql`
          SELECT * FROM leads ORDER BY created_at DESC;
        `);
      }

      return json(res, 200, rows);
    }

    if (req.method === 'DELETE') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const deleteUrl = new URL(req.url, `http://${req.headers.host}`);
      const id = deleteUrl.searchParams.get('id');
      const deleteFunnel = deleteUrl.searchParams.get('funnel');

      if (id) {
        await poolInstance.sql`DELETE FROM leads WHERE id = ${id};`;
        return json(res, 200, { success: true });
      }

      if (deleteFunnel === 'gc') {
        await poolInstance.sql`DELETE FROM leads WHERE funnel = 'GC Audit Funnel';`;
      } else if (deleteFunnel === 'ls') {
        await poolInstance.sql`DELETE FROM leads WHERE funnel = 'Simple Legal Funnel';`;
      } else if (deleteFunnel === 'cpql') {
        await poolInstance.sql`DELETE FROM leads WHERE funnel IS NULL OR funnel NOT IN ('GC Audit Funnel', 'Simple Legal Funnel');`;
      } else {
        await poolInstance.sql`TRUNCATE TABLE leads RESTART IDENTITY;`;
      }

      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
