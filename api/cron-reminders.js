import { createPool } from '@vercel/postgres';

const LEGACY_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/RZP0qqWcu4bX0Ca5wbMs/webhook-trigger/9319ec87-a2a6-4f54-8abf-de8de237d04e';

function getPool() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  if (!connectionString) throw new Error('Missing Postgres connection string');
  return createPool({ connectionString });
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // Vercel cron requests include this header automatically
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return json(res, 401, { error: 'unauthorized' });
  }

  const pool = getPool();

  // Find CPQL/LS leads created 2+ minutes ago that haven't had a reminder sent
  const { rows: leads } = await pool.sql`
    SELECT id, name, email, phone, website, funnel, ad_source,
           booking_reached, resume_token,
           situation, meta_budget_commitment, uses_crm, dedicated_intake
    FROM leads
    WHERE funnel IN ('CPQL Legal Funnel', 'Simple Legal Funnel')
      AND reminder_fired = FALSE
      AND created_at < NOW() - INTERVAL '2 minutes'
    ORDER BY created_at ASC;
  `;

  if (!leads.length) return json(res, 200, { fired: 0 });

  const host = req.headers.host || '';
  const proto = host.includes('localhost') ? 'http' : 'https';

  let fired = 0;

  for (const lead of leads) {
    const resumePath = lead.funnel === 'Simple Legal Funnel' ? '/legal-simplified' : '/cpql';
    const resumeUrl = lead.resume_token
      ? `${proto}://${host}${resumePath}?resume=${lead.resume_token}`
      : '';

    const payload = {
      name:                   lead.name || '',
      email:                  lead.email || '',
      phone:                  lead.phone || '',
      website:                lead.website || '',
      funnel:                 lead.funnel || '',
      ad_source:              lead.ad_source || '',
      booking_reached:        lead.booking_reached || false,
      funnel_stage:           lead.booking_reached ? 'completed_questionnaire' : 'submitted',
      situation:              lead.situation || '',
      meta_budget_commitment: lead.meta_budget_commitment || '',
      uses_crm:               lead.uses_crm || '',
      dedicated_intake:       lead.dedicated_intake || '',
      resume_url:             resumeUrl,
    };

    try {
      await fetch(LEGACY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await pool.sql`UPDATE leads SET reminder_fired = TRUE WHERE id = ${lead.id};`;
      fired++;
    } catch (err) {
      console.error(`Reminder webhook failed for lead ${lead.id}:`, err);
    }
  }

  return json(res, 200, { fired });
}
