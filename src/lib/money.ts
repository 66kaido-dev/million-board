import { LEVEL_STEP, PARTICIPANTS, PERSONAL_GOAL } from "./participants";
import type { Entry } from "./types";

export type ParticipantSummary = {
  id: string;
  name: string;
  total: number;
  goal: number;
  remaining: number;
  percent: number;
  level: number;
  entriesCount: number;
  motivation: string;
};

export function formatRubles(amount: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  })
    .format(Math.round(amount))
    .replace(/\u00a0/g, " ")} ₽`;
}

export function calculateLevel(total: number) {
  return Math.max(0, Math.min(10, Math.floor(total / LEVEL_STEP)));
}

export function getMotivation(total: number, entriesCount: number) {
  if (total >= PERSONAL_GOAL) {
    return "Mission Million Completed";
  }

  if (total >= 700_000) {
    return "Вылетаем";
  }

  if (total >= 100_000) {
    return "Первая сотня пробита";
  }

  if (entriesCount === 1 && total > 0) {
    return "Пошла жара";
  }

  return `До первого миллиона осталось ${formatRubles(PERSONAL_GOAL - total)}`;
}

export function createParticipantSummaries(entries: Entry[]) {
  return PARTICIPANTS.map<ParticipantSummary>((participant) => {
    const participantEntries = entries.filter(
      (entry) => entry.participant_id === participant.id,
    );
    const total = participantEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
    const remaining = Math.max(0, PERSONAL_GOAL - total);
    const percent = Math.min(
      100,
      Math.round((total / PERSONAL_GOAL) * 1000) / 10,
    );

    return {
      id: participant.id,
      name: participant.name,
      total,
      goal: PERSONAL_GOAL,
      remaining,
      percent,
      level: calculateLevel(total),
      entriesCount: participantEntries.length,
      motivation: getMotivation(total, participantEntries.length),
    };
  });
}

export function buildNewEntryNotification(entry: Entry, isFirstEntry: boolean) {
  const title = isFirstEntry
    ? "Пошла жара."
    : "Новая запись в Million Board.";

  return [
    title,
    `${entry.participant_name} добавил ${formatRubles(entry.amount)}.`,
    `Комментарий: ${entry.comment}`,
  ].join("\n");
}

export function buildDailyReportMessage(entries: Entry[], date: string) {
  const dailyEntries = entries.filter((entry) => entry.entry_date === date);
  const summaries = createParticipantSummaries(dailyEntries);
  const total = dailyEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return [
    "Итог дня — Million Board",
    "",
    ...summaries.map(
      (summary) => `${summary.name}: ${formatRubles(summary.total)}`,
    ),
    "",
    `Всего за день: ${formatRubles(total)}`,
  ].join("\n");
}
