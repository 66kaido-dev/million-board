import { parseEntryPayload } from "@/lib/entry-validation";
import { buildNewEntryNotification } from "@/lib/money";
import { getParticipantById } from "@/lib/participants";
import { authenticateRequest, jsonError } from "@/lib/request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendBoardChatMessage } from "@/lib/telegram-bot";
import type { Entry, EntryPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

function authFailureStatus(error: string) {
  return error.includes("not allowed") ? 403 : 401;
}

export async function GET(request: Request) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.ok) {
      return jsonError(auth.error, authFailureStatus(auth.error));
    }

    const { data, error } = await getSupabaseAdmin()
      .from("entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({ entries: (data ?? []) as Entry[] });
  } catch (error) {
    console.error(error);
    return jsonError("Server configuration error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.ok) {
      return jsonError(auth.error, authFailureStatus(auth.error));
    }

    const payload = parseEntryPayload(
      await request.json(),
    ) as Required<EntryPayload>;
    const participant = getParticipantById(payload.participantId);
    if (!participant) {
      return jsonError("Unknown participant", 400);
    }

    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("entries")
      .select("id", { count: "exact", head: true });
    if (countError) {
      return jsonError(countError.message, 500);
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({
        amount: payload.amount,
        comment: payload.comment,
        created_by_name: auth.user.name,
        created_by_telegram_id: auth.user.id,
        entry_date: payload.entryDate,
        participant_id: participant.id,
        participant_name: participant.name,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    const entry = data as Entry;
    const isFirstEntry = count === 0;
    let notificationSent = false;
    try {
      await sendBoardChatMessage(buildNewEntryNotification(entry, isFirstEntry));
      notificationSent = true;
    } catch (notificationError) {
      console.error(notificationError);
    }

    return Response.json(
      {
        entry,
        isFirstEntry,
        notificationSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Invalid request";
    return jsonError(message, message.includes("environment variable") ? 500 : 400);
  }
}
