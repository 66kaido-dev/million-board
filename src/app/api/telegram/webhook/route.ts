import { getTelegramWebhookSecret } from "@/lib/env";
import { jsonError } from "@/lib/request-auth";
import { handleTelegramWebhook } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";

function verifyTelegramWebhookRequest(request: Request) {
  const secret = getTelegramWebhookSecret();

  if (!secret) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function GET() {
  return Response.json({
    ok: true,
    route: "/api/telegram/webhook",
    method: "POST",
  });
}

export async function POST(request: Request) {
  try {
    if (!verifyTelegramWebhookRequest(request)) {
      return jsonError("Unauthorized", 401);
    }

    const update = await request.json();
    const result = await handleTelegramWebhook(update);

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Telegram webhook failed";

    return jsonError(message, message.includes("environment variable") ? 500 : 400);
  }
}
