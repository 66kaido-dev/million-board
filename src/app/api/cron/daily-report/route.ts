import { getMoscowDateString } from "@/lib/dates";
import { getDailyReportSecrets } from "@/lib/env";
import { buildDailyReportMessage } from "@/lib/money";
import { jsonError } from "@/lib/request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendBoardChatMessage } from "@/lib/telegram-bot";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

type CronAuthResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

function verifyCronRequest(request: Request): CronAuthResult {
  const authHeader = request.headers.get("authorization");
  const secrets = getDailyReportSecrets();

  if (secrets.length === 0) {
    return { ok: false, message: "Cron secret is not configured", status: 500 };
  }

  if (!secrets.some((secret) => authHeader === `Bearer ${secret}`)) {
    return { ok: false, message: "Unauthorized", status: 401 };
  }

  return { ok: true };
}

async function handler(request: Request) {
  try {
    const cronAuth = verifyCronRequest(request);
    if (!cronAuth.ok) {
      return jsonError(cronAuth.message, cronAuth.status);
    }

    const today = getMoscowDateString();
    const { data, error } = await getSupabaseAdmin()
      .from("entries")
      .select("*")
      .eq("entry_date", today);

    if (error) {
      return jsonError(error.message, 500);
    }

    const message = buildDailyReportMessage((data ?? []) as Entry[], today);
    await sendBoardChatMessage(message);

    return Response.json({ ok: true, date: today });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Daily report failed";

    return jsonError(message, message.includes("environment variable") ? 500 : 400);
  }
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
