// Vercel Serverless Function — POST /api/apply
// Receives job application submissions and forwards them to Telegram.
//
// Required environment variables (set in Vercel project settings):
//   TELEGRAM_BOT_TOKEN  -> token from @BotFather, e.g. "123456:ABC-DEF..."
//   TELEGRAM_CHAT_ID    -> your chat / group / channel ID (e.g. "123456789" or "-1001234567890")
//
// Optional:
//   TELEGRAM_THREAD_ID  -> message_thread_id when posting to a specific forum topic

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const truncate = (str = '', max = 2000) =>
  str.length > max ? str.slice(0, max) + '…' : str;

const isValidEmail = (e = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_THREAD_ID;

  if (!token || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars');
    return res.status(500).json({ error: 'Server is not configured to receive applications.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const firstName = (body.firstName || '').toString().trim();
  const lastName  = (body.lastName  || '').toString().trim();
  const email     = (body.email     || '').toString().trim();
  const linkedin  = (body.linkedin  || '').toString().trim();
  const role      = (body.role      || 'Open Application').toString().trim();
  const message   = (body.message   || '').toString().trim();
  const pageUrl   = (body.pageUrl   || '').toString().trim();
  const userAgent = (body.userAgent || '').toString().trim();

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';

  const lines = [
    '<b>🚀 New Job Application — Arc Light Labs</b>',
    '',
    `<b>Role:</b> ${escapeHtml(role)}`,
    `<b>Name:</b> ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
    `<b>Email:</b> ${escapeHtml(email)}`,
    linkedin ? `<b>LinkedIn / Portfolio:</b> ${escapeHtml(linkedin)}` : null,
    '',
    '<b>Why Arc Light Labs?</b>',
    escapeHtml(truncate(message, 3500)),
    '',
    '<i>— Meta —</i>',
    pageUrl   ? `<b>Page:</b> ${escapeHtml(pageUrl)}`     : null,
    `<b>IP:</b> ${escapeHtml(ip)}`,
    userAgent ? `<b>UA:</b> ${escapeHtml(truncate(userAgent, 300))}` : null,
    `<b>Time:</b> ${escapeHtml(new Date().toISOString())}`,
  ].filter(Boolean).join('\n');

  const tgPayload = {
    chat_id: chatId,
    text: lines,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (threadId) tgPayload.message_thread_id = Number(threadId);

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgPayload),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ error: 'Failed to deliver notification.' });
    }
  } catch (err) {
    console.error('Telegram request failed:', err);
    return res.status(502).json({ error: 'Failed to reach Telegram.' });
  }

  return res.status(200).json({ ok: true });
}
