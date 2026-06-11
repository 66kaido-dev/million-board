"use client";

import confetti from "canvas-confetti";
import {
  Coins,
  LayoutDashboard,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { getMoscowDateString } from "@/lib/dates";
import {
  createParticipantSummaries,
  formatRubles,
} from "@/lib/money";
import { PARTICIPANTS, PERSONAL_GOAL } from "@/lib/participants";
import type { Entry } from "@/lib/types";

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: {
      first_name?: string;
      id?: number;
      username?: string;
    };
  };
  expand?: () => void;
  ready?: () => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type View = "dashboard" | "add" | "history";
type Status = "checking" | "ready" | "denied" | "error";

type EntryFormState = {
  amount: string;
  comment: string;
  entryDate: string;
  participantId: string;
};

const defaultForm = (): EntryFormState => ({
  amount: "",
  comment: "",
  entryDate: getMoscowDateString(),
  participantId: PARTICIPANTS[0].id,
});

function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.Telegram?.WebApp;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function apiHeaders(initData: string) {
  return {
    "content-type": "application/json",
    "x-telegram-init-data": initData,
  };
}

export function MillionBoardApp() {
  const [initialInitData] = useState(() => getTelegramWebApp()?.initData ?? "");
  const initDataRef = useRef(initialInitData);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>(
    initialInitData ? "checking" : "denied",
  );
  const [view, setView] = useState<View>("dashboard");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<EntryFormState>(() => defaultForm());
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [celebrationName, setCelebrationName] = useState("");
  const [telegramName] = useState(
    () => getTelegramWebApp()?.initDataUnsafe?.user?.first_name ?? "",
  );

  const summaries = useMemo(() => createParticipantSummaries(entries), [entries]);
  const filteredEntries = useMemo(
    () =>
      filter === "all"
        ? entries
        : entries.filter((entry) => entry.participant_id === filter),
    [entries, filter],
  );

  const loadEntries = useCallback(async (initData = initDataRef.current) => {
    const response = await fetch("/api/entries", {
      headers: apiHeaders(initData),
    });

    if (response.status === 401 || response.status === 403) {
      setStatus("denied");
      return [];
    }

    if (!response.ok) {
      throw new Error("Не удалось загрузить записи");
    }

    const data = (await response.json()) as { entries: Entry[] };
    setEntries(data.entries);
    setStatus("ready");
    return data.entries;
  }, []);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready?.();
    webApp?.expand?.();
    webApp?.setHeaderColor?.("#f7f8f4");
    webApp?.setBackgroundColor?.("#f7f8f4");

    const initData = initDataRef.current || webApp?.initData || "";
    initDataRef.current = initData;

    if (!initData) {
      return;
    }

    loadEntries(initData).catch((error) => {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
      setStatus("error");
    });
  }, [loadEntries]);

  function showMillionCelebration(name: string) {
    setCelebrationName(name);
    confetti({
      colors: ["#111111", "#18a558", "#f7b731", "#2aa6b8", "#ffffff"],
      particleCount: 120,
      spread: 76,
      startVelocity: 42,
    });
    window.setTimeout(() => setCelebrationName(""), 4200);
  }

  function openAddForm() {
    setEditingEntry(null);
    setForm(defaultForm());
    setMessage("");
    setView("add");
  }

  function openEditForm(entry: Entry) {
    setEditingEntry(entry);
    setForm({
      amount: String(entry.amount),
      comment: entry.comment,
      entryDate: entry.entry_date,
      participantId: entry.participant_id,
    });
    setMessage("");
    setView("add");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const beforeSummaries = createParticipantSummaries(entries);
    const payload = {
      amount: Number(form.amount),
      comment: form.comment,
      entryDate: form.entryDate,
      participantId: form.participantId,
    };

    try {
      const endpoint = editingEntry
        ? `/api/entries/${editingEntry.id}`
        : "/api/entries";
      const response = await fetch(endpoint, {
        body: JSON.stringify(payload),
        headers: apiHeaders(initDataRef.current),
        method: editingEntry ? "PATCH" : "POST",
      });

      if (response.status === 401 || response.status === 403) {
        setStatus("denied");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось сохранить запись");
      }

      const nextEntries = await loadEntries();
      const nextSummaries = createParticipantSummaries(nextEntries);
      const participant = PARTICIPANTS.find(
        (item) => item.id === payload.participantId,
      );
      const beforeTotal =
        beforeSummaries.find((item) => item.id === payload.participantId)
          ?.total ?? 0;
      const afterTotal =
        nextSummaries.find((item) => item.id === payload.participantId)?.total ??
        0;

      if (!editingEntry && beforeTotal < PERSONAL_GOAL && afterTotal >= PERSONAL_GOAL) {
        showMillionCelebration(participant?.name ?? "Million Board");
      }

      setForm(defaultForm());
      setEditingEntry(null);
      setView("dashboard");
      setMessage(
        editingEntry ? "Запись обновлена" : "Запись добавлена в Million Board",
      );
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entry: Entry) {
    const confirmed = window.confirm("Удалить запись?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        headers: apiHeaders(initDataRef.current),
        method: "DELETE",
      });

      if (response.status === 401 || response.status === 403) {
        setStatus("denied");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Не удалось удалить запись");
      }

      await loadEntries();
      setMessage("Запись удалена");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Ошибка удаления");
    }
  }

  if (status === "checking") {
    return (
      <main className="app-shell center-state">
        <div className="coin-loader" />
        <p>Million Board</p>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="app-shell center-state">
        <h1>Million Board</h1>
        <p className="access-denied">Нет доступа</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {celebrationName ? (
        <div className="celebration" aria-live="polite">
          <div className="balloon balloon-a" />
          <div className="balloon balloon-b" />
          <div className="balloon balloon-c" />
          <div className="celebration-panel">
            <p>{celebrationName}</p>
            <strong>Mission Million Completed</strong>
          </div>
        </div>
      ) : null}

      <header className="topbar">
        <div>
          <p className="eyebrow">{telegramName || "Private board"}</p>
          <h1>Million Board</h1>
        </div>
        <button className="icon-button" type="button" onClick={openAddForm}>
          <Plus size={19} />
          <span>Добавить</span>
        </button>
      </header>

      <nav className="segmented" aria-label="Навигация">
        <button
          className={view === "dashboard" ? "active" : ""}
          type="button"
          onClick={() => setView("dashboard")}
        >
          <LayoutDashboard size={17} />
          Board
        </button>
        <button
          className={view === "history" ? "active" : ""}
          type="button"
          onClick={() => setView("history")}
        >
          <Coins size={17} />
          История
        </button>
      </nav>

      {message ? <p className="status-line">{message}</p> : null}
      {status === "error" ? <p className="status-line error">{message}</p> : null}

      {view === "dashboard" ? (
        <section className="dashboard-grid">
          {summaries.map((summary) => (
            <article className="participant-card" key={summary.id}>
              <div className="card-head">
                <div>
                  <h2>{summary.name}</h2>
                  <p>
                    {formatRubles(summary.total)} /{" "}
                    {formatRubles(summary.goal)}
                  </p>
                </div>
                <span className="pixel-coin">₽</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${summary.percent}%` }} />
              </div>
              <div className="card-stats">
                <span>{summary.percent}%</span>
                <span>Level {summary.level}</span>
              </div>
              <p className="remaining">
                Осталось {formatRubles(summary.remaining)}
              </p>
              <p className="motivation">{summary.motivation}</p>
            </article>
          ))}
        </section>
      ) : null}

      {view === "add" ? (
        <section className="form-panel">
          <div className="section-head">
            <h2>{editingEntry ? "Редактировать запись" : "Добавить деньги"}</h2>
            <button
              className="plain-icon"
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setView("dashboard");
              }}
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <label>
              Кто получил
              <select
                value={form.participantId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    participantId: event.target.value,
                  }))
                }
              >
                {PARTICIPANTS.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Сумма
              <input
                inputMode="numeric"
                min="1"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Комментарий
              <textarea
                rows={3}
                value={form.comment}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Дата
              <input
                type="date"
                value={form.entryDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    entryDate: event.target.value,
                  }))
                }
              />
            </label>
            <button className="submit-button" disabled={isSaving} type="submit">
              <Save size={18} />
              {isSaving ? "Сохраняем" : "Сохранить"}
            </button>
          </form>
        </section>
      ) : null}

      {view === "history" ? (
        <section className="history">
          <div className="filters">
            <button
              className={filter === "all" ? "active" : ""}
              type="button"
              onClick={() => setFilter("all")}
            >
              Все
            </button>
            {PARTICIPANTS.map((participant) => (
              <button
                className={filter === participant.id ? "active" : ""}
                key={participant.id}
                type="button"
                onClick={() => setFilter(participant.id)}
              >
                {participant.name}
              </button>
            ))}
          </div>

          <div className="history-list">
            {filteredEntries.length === 0 ? (
              <p className="empty-state">Записей пока нет</p>
            ) : null}
            {filteredEntries.map((entry) => (
              <article className="entry-row" key={entry.id}>
                <div className="entry-main">
                  <div>
                    <p className="entry-date">{entry.entry_date}</p>
                    <h3>{entry.participant_name}</h3>
                  </div>
                  <strong>{formatRubles(entry.amount)}</strong>
                </div>
                <p className="entry-comment">{entry.comment}</p>
                <p className="entry-meta">
                  Внёс: {entry.created_by_name || entry.created_by_telegram_id}
                  <br />
                  Создано: {formatCreatedAt(entry.created_at)}
                </p>
                <div className="row-actions">
                  <button type="button" onClick={() => openEditForm(entry)}>
                    <Pencil size={16} />
                    Изменить
                  </button>
                  <button type="button" onClick={() => handleDelete(entry)}>
                    <Trash2 size={16} />
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
