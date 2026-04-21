/**
 * POST /api/apply
 *
 * Receives job application JSON and forwards it to Telegram.
 *
 * Required env vars (set in Vercel → Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN   — from @BotFather
 *   TELEGRAM_CHAT_ID     — your numeric user/group/channel ID
 *
 * Optional:
 *   TELEGRAM_THREAD_ID   — topic ID for forum-enabled supergroups
 */
 
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  // ── Validate env vars ──────────────────────────────────────────────────────
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_THREAD_ID } = process.env;
 
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[apply] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars');
    return res.status(503).json({
      error:
        'Applications are temporarily unavailable — please email careers@arclightlabs.xyz directly.',
    });
  }
 
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
 
  const {
    firstName = '',
    lastName  = '',
    email     = '',
    linkedin  = '',
    role      = '',
    message   = '',
    submittedAt,
    pageUrl,
    userAgent,
  } = body;
 
  // Basic required field check
  if (!firstName || !email || !role || !message) {
    return res.status(422).json({ error: 'Missing required fields' });
  }
 
  // ── Build Telegram message (MarkdownV2) ────────────────────────────────────
  const esc = s =>
    String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
 
  const lines = [
    `🚀 *New Application — ${esc(role)}*`,
    '',
    `👤 *Name:*   ${esc(firstName)} ${esc(lastName)}`,
    `📧 *Email:*  ${esc(email)}`,
    linkedin ? `🔗 *LinkedIn/Portfolio:* ${esc(linkedin)}` : null,
    `📋 *Role:*   ${esc(role)}`,
    '',
    `💬 *Message:*`,
    esc(message),
    '',
    `🕒 ${esc(submittedAt ?? new Date().toISOString())}`,
    pageUrl ? `🌐 ${esc(pageUrl)}` : null,
  ]
    .filter(l => l !== null)
    .join('\n');
 
  // ── Send to Telegram ───────────────────────────────────────────────────────
  const tgBody = {
    chat_id:    TELEGRAM_CHAT_ID,
    text:       lines,
    parse_mode: 'MarkdownV2',
  };
  if (TELEGRAM_THREAD_ID) {
    tgBody.message_thread_id = parseInt(TELEGRAM_THREAD_ID, 10);
  }
 
  let tgRes;
  try {
    tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(tgBody),
      }
    );
  } catch (err) {
    console.error('[apply] Telegram fetch failed:', err);
    return res.status(502).json({ error: 'Failed to reach Telegram — please try again.' });
  }
 
  if (!tgRes.ok) {
    const tgErr = await tgRes.json().catch(() => ({}));
    console.error('[apply] Telegram API error:', tgErr);
    // Don't expose the raw TG error to the browser
    return res.status(502).json({ error: 'Notification delivery failed — please try again.' });
  }
 
  return res.status(200).json({ ok: true });
}
