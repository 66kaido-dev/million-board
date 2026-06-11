# Million Board

Private Telegram Mini App for three partners. Each partner manually records incoming money and everyone sees progress toward a personal goal of 1 000 000 ₽.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Telegram WebApp SDK
- Telegram Bot API
- Vercel Cron

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill real values there only:

```bash
cp .env.example .env.local
```

`BOT_TOKEN` goes into `.env.local` for local testing and into Vercel Environment Variables for production. Do not paste it into code files.

3. Create the Supabase table by running [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL Editor.

4. Start the app:

```bash
npm run dev
```

The Mini App expects Telegram `initData`, so full auth testing should be done inside Telegram after deploying or through a tunnel configured as the bot Web App URL.

## Environment Variables

```bash
BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_CHAT_ID=
ALLOWED_TELEGRAM_IDS=655435297,8477263540,1671095454
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=
DAILY_REPORT_CRON_SECRET=
CRON_SECRET=
TZ=Europe/Moscow
```

Use the same random value for `DAILY_REPORT_CRON_SECRET` and `CRON_SECRET`. Vercel Cron automatically sends `CRON_SECRET` as the `Authorization` bearer token.

## Supabase

The table is `public.entries`:

- `id uuid primary key default gen_random_uuid()`
- `participant_id text not null`
- `participant_name text not null`
- `amount integer not null`
- `comment text not null`
- `entry_date date not null`
- `created_by_telegram_id text not null`
- `created_by_name text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

RLS is enabled and no public policies are created. The frontend talks only to Next.js API routes, and those routes use `SUPABASE_SERVICE_ROLE_KEY` server-side.

## API Routes

- `GET /api/entries`
- `POST /api/entries`
- `PATCH /api/entries/:id`
- `DELETE /api/entries/:id`
- `POST /api/telegram/webhook`
- `GET/POST /api/cron/daily-report`

All `/api/entries` routes validate Telegram WebApp `initData` and the allowlist.

The Telegram webhook route accepts `POST /api/telegram/webhook`. If `TELEGRAM_WEBHOOK_SECRET` is set, the route requires Telegram's `X-Telegram-Bot-Api-Secret-Token` header to match it.

## Vercel Deploy

Free path:

1. Push this repository to GitHub.
2. Open Vercel and import the GitHub repository.
3. Add all environment variables from `.env.example`.
4. Set `CRON_SECRET` to the same value as `DAILY_REPORT_CRON_SECRET`.
5. Deploy to production.
6. Copy the production HTTPS URL, for example `https://million-board.vercel.app`.
7. Set `APP_URL` in Vercel to that exact URL and redeploy.

The cron job is configured in [vercel.json](./vercel.json):

```json
{
  "path": "/api/cron/daily-report",
  "schedule": "0 19 * * *"
}
```

`0 19 * * *` is 19:00 UTC, which is 22:00 Moscow time.

## Telegram Webhook

After production deploy and after setting `APP_URL`, configure the bot webhook:

```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://million-board.vercel.app/api/telegram/webhook",
    "drop_pending_updates": true,
    "allowed_updates": ["message"],
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'"
  }'
```

Check webhook status:

```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

Add the bot to the private group and send:

```text
/start@SCOREBOARDFORUNICORNMAKERSBOT
```

The bot replies with:

```text
Million Board
```

In private bot chats, the `scoreboard` button is sent as a Telegram `web_app` button. In group chats, Telegram Bot API does not support `web_app` inline buttons, so the bot sends the same `scoreboard` button as a normal URL button to the BotFather Web App link:

```text
https://t.me/SCOREBOARDFORUNICORNMAKERSBOT/SCOREBOARD
```

## BotFather Mini App / Menu Button

1. Open `@BotFather`.
2. Send `/mybots`.
3. Choose `@SCOREBOARDFORUNICORNMAKERSBOT`.
4. Open `Bot Settings`.
5. Open `Menu Button`.
6. Choose `Configure menu button`.
7. Text: `scoreboard`.
8. URL: your Vercel `APP_URL`.
9. Create or edit the bot Web App in BotFather with URL `https://million-board.vercel.app` and short name `SCOREBOARD`.
10. Add the bot to the private partners chat.
11. Send `/start` or `scoreboard` so the bot sends the Mini App open button.

## Checks

```bash
npm test
npm run lint
npm run build
```
