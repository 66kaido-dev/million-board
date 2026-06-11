import { getAppUrl, getRequiredEnv } from "./env";

type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<Record<string, unknown>>>;
};

type TelegramUpdate = {
  message?: {
    chat: {
      id: number | string;
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
    parse_mode: "HTML",
    reply_markup: replyMarkup,
    text,
  });
}

export async function sendMiniAppButton(chatId: string | number) {
  return sendTelegramMessage(chatId, "Million Board", {
    inline_keyboard: [
      [
        {
          text: "scoreboard",
          web_app: {
            url: getAppUrl(),
          },
        },
      ],
    ],
  });
}

export async function sendBoardChatMessage(text: string) {
  return sendTelegramMessage(getRequiredEnv("TELEGRAM_CHAT_ID"), text);
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim().toLowerCase();

  if (!chatId) {
    return { handled: false };
  }

  if (!text || text.startsWith("/start") || text.includes("scoreboard")) {
    await sendMiniAppButton(chatId);
    return { handled: true };
  }

  return { handled: false };
}
