import { sql } from '@vercel/postgres';

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

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      law_firm TEXT,
      calc_current_monthly_spend TEXT,
      calc_current_cpql TEXT,
      calc_guaranteed_cpql TEXT,
      calc_new_monthly_spend TEXT,
      calc_monthly_savings TEXT,
      calc_annual_savings TEXT,
      calc_cpql_reduction TEXT,
      calc_leads_count TEXT
    );
  `;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      await sql`
        INSERT INTO leads (
          first_name,
          last_name,
          email,
          phone,
          law_firm,
          calc_current_monthly_spend,
          calc_current_cpql,
          calc_guaranteed_cpql,
          calc_new_monthly_spend,
          calc_monthly_savings,
          calc_annual_savings,
          calc_cpql_reduction,
          calc_leads_count
        ) VALUES (
          ${body.firstName || ''},
          ${body.lastName || ''},
          ${body.email || ''},
          ${body.phone || ''},
          ${body.lawFirm || ''},
          ${body.calcCurrentMonthlySpend || ''},
          ${body.calcCurrentCpql || ''},
          ${body.calcGuaranteedCpql || ''},
          ${body.calcNewMonthlySpend || ''},
          ${body.calcMonthlySavings || ''},
          ${body.calcAnnualSavings || ''},
          ${body.calcCpqlReduction || ''},
          ${body.calcLeadsCount || ''}
        );
      `;

      return json(res, 200, { success: true });
    }

    const adminToken = process.env.ADMIN_API_TOKEN;
    const reqToken = getAdminToken(req);
    const authorized = adminToken && reqToken && reqToken === adminToken;

    if (req.method === 'GET') {
      if (!authorized) return json(res, 401, { error: 'unauthorized' });

      const { rows } = await sql`
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
        await sql`DELETE FROM leads WHERE id = ${id};`;
        return json(res, 200, { success: true });
      }

      await sql`TRUNCATE TABLE leads RESTART IDENTITY;`;
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET,POST,DELETE');
    return json(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
