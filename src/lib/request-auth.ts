import { getAllowedTelegramIds, getRequiredEnv } from "./env";
import { validateTelegramInitData } from "./telegram-auth";

export function getInitDataFromRequest(request: Request) {
  const headerValue =
    request.headers.get("x-telegram-init-data") ??
    request.headers.get("authorization")?.replace(/^tma\s+/i, "");

  return headerValue?.trim() ?? "";
}

export function authenticateRequest(request: Request) {
  return validateTelegramInitData(getInitDataFromRequest(request), {
    allowedTelegramIds: getAllowedTelegramIds(),
    botToken: getRequiredEnv("BOT_TOKEN"),
  });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
