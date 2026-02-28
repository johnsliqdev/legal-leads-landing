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

    const siteUrl = (content.siteUrl || 'https://example.com').trim().replace(/[^\x20-\x7E]/g, '').replace(/\/+$/, '');
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml');
    res.end(xml);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Error generating sitemap');
  }
}
