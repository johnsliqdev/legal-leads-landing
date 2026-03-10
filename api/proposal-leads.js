import { createPool } from '@vercel/postgres';

function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    ''
  );
}

let pool;
function getPool() {
  const cs = getConnectionString();
  if (!cs) throw new Error('Missing Postgres connection string');
  if (!pool) pool = createPool({ connectionString: cs });
  return pool;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // Allow only GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  // Auth: accept either the ADMIN_API_TOKEN or the proposal password
  const token = req.headers['x-proposal-token'];
  const proposalPassword = process.env.PROPOSAL_PASSWORD || 'sliq@proposal1234';
  const adminToken = process.env.ADMIN_API_TOKEN;

  const authorized =
    (adminToken && token === adminToken) ||
    token === proposalPassword;

  if (!authorized) return json(res, 401, { error: 'unauthorized' });

  try {
    const poolInstance = getPool();

    // Only return leads that have CPQL calculator data
    const { rows } = await poolInstance.sql`
      SELECT
        id,
        created_at,
        email,
        phone,
        website,
        calc_current_monthly_spend,
        calc_current_cpql,
        calc_guaranteed_cpql,
        calc_new_monthly_spend,
        calc_monthly_savings,
        calc_annual_savings,
        calc_cpql_reduction,
        calc_leads_count,
        calc_same_budget_leads,
        meta_budget_commitment,
        dedicated_intake,
        uses_crm
      FROM leads
      WHERE calc_current_cpql IS NOT NULL
        AND calc_current_cpql != ''
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    return json(res, 200, rows);
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) });
  }
}
