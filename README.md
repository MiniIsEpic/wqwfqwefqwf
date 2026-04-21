# Arc Light Labs — Website

Marketing site + Vercel serverless backend. Job application submissions are
delivered straight to Telegram via a bot.

## Project layout

```
.
├── index.html           # The full marketing site (static)
├── arc-light-logo.png   # Logo asset
├── api/
│   └── apply.js         # Vercel serverless function — POST /api/apply
├── vercel.json          # Vercel routing / headers / function config
├── package.json         # Node engines + dev script
└── .env.example         # Required env vars for local dev
```

## 1. Create your Telegram bot

1. Open Telegram and message **@BotFather**.
2. Send `/newbot` and follow the prompts. Save the **bot token** it gives you.
3. Start a chat with your new bot (or add it to the group / channel where you
   want notifications delivered) and send it any message.
4. Get your **chat ID**:
   - DM: message **@userinfobot** — it replies with your numeric user ID.
   - Group / channel: add **@RawDataBot** (or **@getidsbot**) to get the
     chat ID (group IDs usually start with `-100…`).
   - Or: visit `https://api.telegram.org/bot<TOKEN>/getUpdates` after sending
     the bot a message and read `result[0].message.chat.id`.

## 2. Local development

```bash
npm install -g vercel
cp .env.example .env.local
# fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
vercel dev
```

Open http://localhost:3000, submit the job-application form, and you should
receive a Telegram message immediately.

## 3. Deploying to Vercel

1. Push this folder to a Git repo (GitHub / GitLab / Bitbucket).
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: **Other** (nothing to build — pure static + /api).
4. Under **Environment Variables**, add:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - (optional) `TELEGRAM_THREAD_ID` — only for forum-topic groups.
5. Click **Deploy**. Done.

You can also deploy from the CLI:

```bash
vercel           # preview deploy
vercel --prod    # production deploy
```

## How notifications work

- The form in `index.html` POSTs JSON to `/api/apply`.
- `api/apply.js` validates the payload, then calls Telegram's
  `sendMessage` endpoint using the bot token + chat ID from env vars.
- Submissions are formatted with role, name, email, LinkedIn/portfolio,
  the applicant's message, plus IP / user-agent / timestamp metadata.

## Notes

- No secrets live in the repo — everything sensitive is an env var.
- The serverless function has a 10-second timeout (see `vercel.json`).
- `index.html` is served at `/` automatically; Vercel handles that without
  extra routing config.
