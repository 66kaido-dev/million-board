import { jsonError } from "@/lib/request-auth";
import { handleTelegramWebhook } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
