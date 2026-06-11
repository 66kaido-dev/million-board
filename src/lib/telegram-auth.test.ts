import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { validateTelegramInitData } from "./telegram-auth";

const botToken = "123456:test-token";
const allowedIds = ["8477263540", "655435297"];

function signedInitData(params: Record<string, string>, token = botToken) {
  const searchParams = new URLSearchParams(params);
  const dataCheckString = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  searchParams.set("hash", hash);
  return searchParams.toString();
}

describe("Telegram initData validation", () => {
  test("accepts signed initData for an allowed Telegram user", () => {
    const initData = signedInitData({
      auth_date: "1770000000",
      query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
      user: JSON.stringify({
        id: 8477263540,
        first_name: "Владимир",
        username: "kaido",
      }),
    });

    const result = validateTelegramInitData(initData, {
      allowedTelegramIds: allowedIds,
      botToken,
      nowSeconds: 1770000100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("8477263540");
      expect(result.user.first_name).toBe("Владимир");
    }
  });

  test("rejects tampered initData", () => {
    const initData = signedInitData({
      auth_date: "1770000000",
      user: JSON.stringify({ id: 8477263540, first_name: "Владимир" }),
    }).replace("%D0%92%D0%BB%D0%B0%D0%B4%D0%B8%D0%BC%D0%B8%D1%80", "Alan");

    const result = validateTelegramInitData(initData, {
      allowedTelegramIds: allowedIds,
      botToken,
      nowSeconds: 1770000100,
    });

    expect(result).toEqual({ ok: false, error: "Invalid Telegram signature" });
  });

  test("rejects signed initData for users outside the allowlist", () => {
    const initData = signedInitData({
      auth_date: "1770000000",
      user: JSON.stringify({ id: 111, first_name: "Guest" }),
    });

    const result = validateTelegramInitData(initData, {
      allowedTelegramIds: allowedIds,
      botToken,
      nowSeconds: 1770000100,
    });

    expect(result).toEqual({ ok: false, error: "Telegram user is not allowed" });
  });

  test("rejects stale initData", () => {
    const initData = signedInitData({
      auth_date: "1770000000",
      user: JSON.stringify({ id: 8477263540, first_name: "Владимир" }),
    });

    const result = validateTelegramInitData(initData, {
      allowedTelegramIds: allowedIds,
      botToken,
      maxAgeSeconds: 60,
      nowSeconds: 1770000200,
    });

    expect(result).toEqual({ ok: false, error: "Telegram auth data is stale" });
  });
});
