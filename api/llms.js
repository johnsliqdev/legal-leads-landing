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

export default async function handler(req, res) {
  try {
    const poolInstance = getPool();

    const { rows } = await poolInstance.sql`
      SELECT key, value FROM app_settings WHERE key LIKE 'content_%';
    `;
    const content = {};
    for (const row of rows) {
      content[row.key.replace('content_', '')] = row.value;
    }

    const siteName = content.pageTitle || 'Sliq By Design';
    const siteUrl = (content.siteUrl || 'https://example.com').replace(/\/+$/, '');
    const description = content.llmsDescription || content.metaDescription || 'Legal lead generation and marketing services for personal injury law firms.';
    const topics = content.llmsTopics || 'personal injury leads, legal marketing, Meta ads for lawyers, qualified lead generation, law firm marketing';

    const llmsTxt = `# ${siteName}

> ${description}

## About
${siteName} provides lead generation and digital marketing services specifically for personal injury law firms. We guarantee 30 qualified PI leads in 90 days or we work for free until we deliver.

## URL
${siteUrl}

## Topics
${topics.split(',').map(t => `- ${t.trim()}`).join('\n')}

## Services
- Meta (Facebook/Instagram) advertising for law firms
- Landing page and funnel design
- Lead qualification systems
- Cost Per Qualified Lead optimization
- SEO and organic search visibility
- AI search optimization (GEO)

## Contact
Visit ${siteUrl} to access the CPQL calculator and book a strategy call.
`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(llmsTxt);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Error generating LLMS.txt');
  }
}
