import { createPool } from '@vercel/postgres';

const CPQL_LS_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/RZP0qqWcu4bX0Ca5wbMs/webhook-trigger/eead3f94-6a3f-4980-bdca-a3e23828f0dc';
const GC_WEBHOOK_URL      = 'https://services.leadconnectorhq.com/hooks/RZP0qqWcu4bX0Ca5wbMs/webhook-trigger/82be4a3f-8e2b-4ace-9814-54d5227592a5';

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

async function fireGhlWebhook(payload, urlOverride) {
  const target = urlOverride || process.env.GHL_WEBHOOK_URL;
  if (!target) return;
  try {
    await fetch(target, {
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
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_source TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_range TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS situation TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitors TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;`;
  await poolInstance.sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS booking_reached BOOLEAN DEFAULT FALSE;`;

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
          name, email, phone, website,
          calc_current_monthly_spend, calc_current_cpql, calc_guaranteed_cpql,
          calc_new_monthly_spend, calc_monthly_savings, calc_annual_savings,
          calc_cpql_reduction, calc_leads_count, calc_same_budget_leads,
          requested_callback, ad_source, funnel, revenue_range, situation, competitors,
          booking_reached
        ) VALUES (
          ${body.name || null}, ${body.email || null}, ${body.phone || null},
          ${body.website === '' ? '' : (body.website || null)},
          ${body.calcCurrentMonthlySpend || null}, ${body.calcCurrentCpql || null},
          ${body.calcGuaranteedCpql || null}, ${body.calcNewMonthlySpend || null},
          ${body.calcMonthlySavings || null}, ${body.calcAnnualSavings || null},
          ${body.calcCpqlReduction || null}, ${body.calcLeadsCount || null},
          ${body.calcSameBudgetLeads || null}, ${body.requestedCallback || false},
          ${body.ad_source || null}, ${body.funnel || null},
          ${body.revenue_range || null}, ${body.situation || null},
          ${body.competitors || null}, false
        )
        RETURNING id;
      `;

      const insertedId = rows[0].id;
      const isCpqlOrLs = body.funnel === 'CPQL Legal Funnel' || body.funnel === 'Simple Legal Funnel';

      if (isCpqlOrLs) {
        // Fire immediately on step 1 — basic contact info + booking_reached: false
        await fireGhlWebhook({
          name:           body.name || '',
          email:          body.email || '',
          phone:          body.phone || '',
          website:        body.website || '',
          funnel:         body.funnel || '',
          ad_source:      body.ad_source || '',
          booking_reached: false,
        }, CPQL_LS_WEBHOOK_URL);
      } else {
        // GC and other funnels
        await fireGhlWebhook({
          email:         body.email || '',
          phone:         body.phone || '',
          website:       body.website || '',
          ad_source:     body.ad_source || 'organic',
          funnel:        body.funnel || '',
          revenue_range: body.revenue_range || '',
          situation:     body.situation || '',
          competitors:   body.competitors || '',
        }, GC_WEBHOOK_URL);
      }

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
          requested_callback = COALESCE(${body.requestedCallback === undefined ? null : body.requestedCallback}, requested_callback),
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

      // When booking is reached, fire a second webhook with ALL accumulated fields
      if (body.bookingReached === true) {
        const { rows: leadRows } = await poolInstance.sql`SELECT * FROM leads WHERE id = ${id} LIMIT 1;`;
        const l = leadRows[0];
        if (l && (l.funnel === 'CPQL Legal Funnel' || l.funnel === 'Simple Legal Funnel')) {
          await fireGhlWebhook({
            name:                        l.name || '',
            email:                       l.email || '',
            phone:                       l.phone || '',
            website:                     l.website || '',
            funnel:                      l.funnel || '',
            ad_source:                   l.ad_source || '',
            booking_reached:             true,
            situation:                   l.situation || '',
            meta_budget_commitment:      l.meta_budget_commitment || '',
            dedicated_intake:            l.dedicated_intake || '',
            uses_crm:                    l.uses_crm || '',
            firm_differentiator:         l.firm_differentiator || '',
            calc_current_monthly_spend:  l.calc_current_monthly_spend || '',
            calc_current_cpql:           l.calc_current_cpql || '',
            calc_guaranteed_cpql:        l.calc_guaranteed_cpql || '',
            calc_new_monthly_spend:      l.calc_new_monthly_spend || '',
            calc_monthly_savings:        l.calc_monthly_savings || '',
            calc_annual_savings:         l.calc_annual_savings || '',
            calc_cpql_reduction:         l.calc_cpql_reduction || '',
            calc_leads_count:            l.calc_leads_count || '',
            requested_callback:          l.requested_callback || false,
            video_watch_seconds:         l.video_watch_seconds || 0,
            video_watch_percent:         l.video_watch_percent || 0,
          }, CPQL_LS_WEBHOOK_URL);
        }
      }

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
