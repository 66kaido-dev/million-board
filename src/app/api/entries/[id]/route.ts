import { parseEntryPayload } from "@/lib/entry-validation";
import { getParticipantById } from "@/lib/participants";
import { authenticateRequest, jsonError } from "@/lib/request-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { EntryPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function authFailureStatus(error: string) {
  return error.includes("not allowed") ? 403 : 401;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.ok) {
      return jsonError(auth.error, authFailureStatus(auth.error));
    }

    const { id } = await context.params;
    const payload = parseEntryPayload(await request.json(), {
      partial: true,
    }) as Partial<EntryPayload>;
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.participantId) {
      const participant = getParticipantById(payload.participantId);
      if (!participant) {
        return jsonError("Unknown participant", 400);
      }
      update.participant_id = participant.id;
      update.participant_name = participant.name;
    }

    if (payload.amount !== undefined) {
      update.amount = payload.amount;
    }

    if (payload.comment !== undefined) {
      update.comment = payload.comment;
    }

    if (payload.entryDate !== undefined) {
      update.entry_date = payload.entryDate;
    }

    const { data, error } = await getSupabaseAdmin()
      .from("entries")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Entry not found", 404);
    }

    return Response.json({ entry: data });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Invalid request";
    return jsonError(message, message.includes("environment variable") ? 500 : 400);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.ok) {
      return jsonError(auth.error, authFailureStatus(auth.error));
    }

    const { id } = await context.params;
    const { data, error } = await getSupabaseAdmin()
      .from("entries")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Entry not found", 404);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError("Server configuration error", 500);
  }
}
