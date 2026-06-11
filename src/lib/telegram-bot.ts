import { getAppUrl, getRequiredEnv } from "./env";

type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<Record<string, unknown>>>;
};

const TELEGRAM_BOT_USERNAME = "SCOREBOARDFORUNICORNMAKERSBOT";
const MINI_APP_START_PARAM = "scoreboard";

type TelegramChatType = "private" | "group" | "supergroup" | "channel" | string;

type TelegramUpdate = {
  message?: {
    chat: {
      id: number | string;
      type?: TelegramChatType;
    };
    text?: string;
  };
};

async function callTelegramApi<T>(
  method: string,
  payload: Record<string, unknown>,
) {
  const token = getRequiredEnv("BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as { ok: boolean; description?: string } & T;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API error: ${method}`);
  }

  return data;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  return callTelegramApi("sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
    text,
  });
}

export function buildMiniAppReplyMarkup(
  chatType: TelegramChatType | undefined,
  appUrl: string,
): TelegramReplyMarkup {
  const miniAppDeepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?startapp=${MINI_APP_START_PARAM}`;
  const button =
    chatType === "private"
      ? {
          text: "scoreboard",
          web_app: {
            url: appUrl,
          },
        }
      : {
          text: "scoreboard",
          url: miniAppDeepLink,
        };

  return {
    inline_keyboard: [
      [
        button,
      ],
    ],
  };
}

export function shouldSendMiniAppButton(text?: string) {
  const normalizedText = text?.trim().toLowerCase();

  return (
    !normalizedText ||
    normalizedText.startsWith("/start") ||
    normalizedText.includes("scoreboard")
  );
}

export async function sendMiniAppButton(
  chatId: string | number,
  chatType?: TelegramChatType,
) {
  return sendTelegramMessage(
    chatId,
    "Million Board",
    buildMiniAppReplyMarkup(chatType, getAppUrl()),
  );
}

export async function sendBoardChatMessage(text: string) {
  return sendTelegramMessage(getRequiredEnv("TELEGRAM_CHAT_ID"), text);
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const chat = update.message?.chat;
  const chatId = chat?.id;
  const text = update.message?.text;

  if (!chatId) {
    return { handled: false };
  }

  if (shouldSendMiniAppButton(text)) {
    await sendMiniAppButton(chatId, chat.type);
    return { handled: true };
  }

  return { handled: false };
}
