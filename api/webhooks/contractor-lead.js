/**
 * Inbound webhook endpoint: /api/webhooks/contractor-lead
 *
 * Accepts POST with contractor lead payload and forwards to the
 * configured CONTRACTOR_WEBHOOK_URL (or GHL_WEBHOOK_URL fallback).
 * Useful for testing, manual retriggers, or external system integrations.
 */

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const webhookUrl = process.env.CONTRACTOR_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('No CONTRACTOR_WEBHOOK_URL or GHL_WEBHOOK_URL configured');
      return json(res, 200, { success: true, forwarded: false });
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown';

    const payload = {
      source: 'general-contractors',
      timestamp: new Date().toISOString(),
      ip,
      ...body,
    };

    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return json(res, 200, { success: true, forwarded: true, upstreamStatus: upstream.status });
  } catch (err) {
    console.error('Webhook forward error:', err);
    return json(res, 500, { error: String(err?.message || err) });
  }
}
