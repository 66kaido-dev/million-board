import type { Participant } from "./types";

export const PERSONAL_GOAL = 1_000_000;
export const LEVEL_STEP = 100_000;

export const PARTICIPANTS = [
  { id: "8477263540", name: "Владимир" },
  { id: "655435297", name: "Алан" },
  { id: "1671095454", name: "Владислав" },
] as const satisfies readonly Participant[];

export const DEFAULT_ALLOWED_TELEGRAM_IDS = PARTICIPANTS.map(
  (participant) => participant.id,
);

export function getParticipantById(id: string) {
  return PARTICIPANTS.find((participant) => participant.id === id) ?? null;
}
