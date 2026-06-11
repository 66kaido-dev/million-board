import { getParticipantById } from "./participants";
import type { EntryPayload } from "./types";

type EntryPayloadOptions = {
  partial?: boolean;
};

export function parseEntryPayload(
  body: unknown,
  options: EntryPayloadOptions = {},
) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON body");
  }

  const input = body as Partial<Record<keyof EntryPayload, unknown>>;
  const output: Partial<EntryPayload> = {};

  if (!options.partial || input.participantId !== undefined) {
    if (typeof input.participantId !== "string") {
      throw new Error("participantId is required");
    }

    const participant = getParticipantById(input.participantId);
    if (!participant) {
      throw new Error("Unknown participant");
    }

    output.participantId = participant.id;
  }

  if (!options.partial || input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("amount must be a positive integer");
    }

    output.amount = amount;
  }

  if (!options.partial || input.comment !== undefined) {
    if (typeof input.comment !== "string" || !input.comment.trim()) {
      throw new Error("comment is required");
    }

    output.comment = input.comment.trim();
  }

  if (!options.partial || input.entryDate !== undefined) {
    if (
      typeof input.entryDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)
    ) {
      throw new Error("entryDate must be YYYY-MM-DD");
    }

    output.entryDate = input.entryDate;
  }

  if (options.partial && Object.keys(output).length === 0) {
    throw new Error("No fields to update");
  }

  return output;
}
