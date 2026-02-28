const PRODUCTION_HOST = 'cpql.sliqbydesign.com';

export default function handler(req, res) {
  const host = (req.headers.host || '').split(':')[0];
  const isProduction = host === PRODUCTION_HOST;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');

  if (isProduction) {
    res.end(`User-agent: *
Allow: /
Sitemap: https://${PRODUCTION_HOST}/sitemap.xml
`);
  } else {
    res.end(`User-agent: *
Disallow: /
`);
  }
}
