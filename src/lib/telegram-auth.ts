import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthenticatedUser, TelegramUser } from "./types";

type ValidateTelegramInitDataOptions = {
  botToken: string;
  allowedTelegramIds: string[];
  maxAgeSeconds?: number;
  nowSeconds?: number;
};

export type TelegramAuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; error: string };

function secureCompareHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function displayName(user: TelegramUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export function validateTelegramInitData(
  initData: string,
  options: ValidateTelegramInitDataOptions,
): TelegramAuthResult {
  if (!initData) {
    return { ok: false, error: "Missing Telegram initData" };
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    return { ok: false, error: "Missing Telegram signature" };
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData")
    .update(options.botToken)
    .digest();
  const expectedHash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (!secureCompareHex(receivedHash, expectedHash)) {
    return { ok: false, error: "Invalid Telegram signature" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) {
    return { ok: false, error: "Missing Telegram auth date" };
  }

  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds = options.maxAgeSeconds ?? 60 * 60 * 24;
  if (nowSeconds - authDate > maxAgeSeconds || authDate - nowSeconds > 300) {
    return { ok: false, error: "Telegram auth data is stale" };
  }

  const userValue = params.get("user");
  if (!userValue) {
    return { ok: false, error: "Missing Telegram user" };
  }

  let user: TelegramUser;
  try {
    const parsedUser = JSON.parse(userValue) as TelegramUser & {
      id: number | string;
    };
    user = {
      ...parsedUser,
      id: String(parsedUser.id),
    };
  } catch {
    return { ok: false, error: "Invalid Telegram user" };
  }

  if (!options.allowedTelegramIds.includes(user.id)) {
    return { ok: false, error: "Telegram user is not allowed" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      name: displayName(user) || user.username || user.id,
      username: user.username,
    },
  };
}
