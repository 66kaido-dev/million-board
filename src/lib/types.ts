export type Participant = {
  id: string;
  name: string;
};

export type Entry = {
  id: string;
  participant_id: string;
  participant_name: string;
  amount: number;
  comment: string;
  entry_date: string;
  created_by_telegram_id: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EntryPayload = {
  participantId: string;
  amount: number;
  comment: string;
  entryDate: string;
};

export type TelegramUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type AuthenticatedUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  name: string;
  username?: string;
};
