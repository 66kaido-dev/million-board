import { describe, expect, test } from "vitest";
import {
  buildDailyReportMessage,
  buildNewEntryNotification,
  calculateLevel,
  createParticipantSummaries,
  getMotivation,
} from "./money";
import type { Entry } from "./types";

const baseEntry = {
  id: "entry-1",
  comment: "Project",
  entry_date: "2026-06-11",
  created_by_telegram_id: "8477263540",
  created_by_name: "Vladimir",
  created_at: "2026-06-11T10:00:00.000Z",
  updated_at: "2026-06-11T10:00:00.000Z",
} satisfies Omit<Entry, "participant_id" | "participant_name" | "amount">;

describe("money domain logic", () => {
  test("calculates levels in 100 000 ruble steps and caps at level 10", () => {
    expect(calculateLevel(0)).toBe(0);
    expect(calculateLevel(99_999)).toBe(0);
    expect(calculateLevel(100_000)).toBe(1);
    expect(calculateLevel(999_999)).toBe(9);
    expect(calculateLevel(1_000_000)).toBe(10);
    expect(calculateLevel(1_500_000)).toBe(10);
  });

  test("chooses the requested motivation phrase by progress state", () => {
    expect(getMotivation(50_000, 1)).toBe("Пошла жара");
    expect(getMotivation(50_000, 2)).toBe(
      "До первого миллиона осталось 950 000 ₽",
    );
    expect(getMotivation(100_000, 2)).toBe("Первая сотня пробита");
    expect(getMotivation(700_000, 3)).toBe("Вылетаем");
    expect(getMotivation(1_000_000, 4)).toBe("Mission Million Completed");
  });

  test("builds participant summaries in the fixed dashboard order", () => {
    const entries: Entry[] = [
      {
        ...baseEntry,
        id: "entry-1",
        participant_id: "8477263540",
        participant_name: "Владимир",
        amount: 150_000,
      },
      {
        ...baseEntry,
        id: "entry-2",
        participant_id: "655435297",
        participant_name: "Алан",
        amount: 40_000,
      },
    ];

    const summaries = createParticipantSummaries(entries);

    expect(summaries.map((summary) => summary.name)).toEqual([
      "Владимир",
      "Алан",
      "Владислав",
    ]);
    expect(summaries.map((summary) => summary.total)).toEqual([
      150_000, 40_000, 0,
    ]);
    expect(summaries[0].level).toBe(1);
    expect(summaries[2].remaining).toBe(1_000_000);
  });

  test("builds the exact new-entry notification variants", () => {
    const entry: Entry = {
      ...baseEntry,
      participant_id: "8477263540",
      participant_name: "Владимир",
      amount: 50_000,
      comment: "Рестайл сайта сервисного центра.",
    };

    expect(buildNewEntryNotification(entry, true)).toBe(
      "Пошла жара.\nВладимир добавил 50 000 ₽.\nКомментарий: Рестайл сайта сервисного центра.",
    );
    expect(buildNewEntryNotification(entry, false)).toBe(
      "Новая запись в Million Board.\nВладимир добавил 50 000 ₽.\nКомментарий: Рестайл сайта сервисного центра.",
    );
  });

  test("builds daily report for entries on the selected entry date", () => {
    const entries: Entry[] = [
      {
        ...baseEntry,
        id: "entry-1",
        participant_id: "8477263540",
        participant_name: "Владимир",
        amount: 50_000,
        entry_date: "2026-06-11",
      },
      {
        ...baseEntry,
        id: "entry-2",
        participant_id: "1671095454",
        participant_name: "Владислав",
        amount: 25_000,
        entry_date: "2026-06-11",
      },
      {
        ...baseEntry,
        id: "entry-3",
        participant_id: "655435297",
        participant_name: "Алан",
        amount: 99_000,
        entry_date: "2026-06-10",
      },
    ];

    expect(buildDailyReportMessage(entries, "2026-06-11")).toBe(
      "Итог дня — Million Board\n\nВладимир: 50 000 ₽\nАлан: 0 ₽\nВладислав: 25 000 ₽\n\nВсего за день: 75 000 ₽",
    );
  });

  test("does not build a daily report when nobody earned money that day", () => {
    const entries: Entry[] = [
      {
        ...baseEntry,
        id: "entry-1",
        participant_id: "8477263540",
        participant_name: "Владимир",
        amount: 50_000,
        entry_date: "2026-06-10",
      },
    ];

    expect(buildDailyReportMessage(entries, "2026-06-11")).toBeNull();
  });
});
