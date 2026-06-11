import { describe, expect, test } from "vitest";
import { buildMiniAppReplyMarkup, shouldSendMiniAppButton } from "./telegram-bot";

describe("Telegram bot integration", () => {
  test("uses a Web App inline button in private chats", () => {
    expect(buildMiniAppReplyMarkup("private", "https://million-board.vercel.app"))
      .toEqual({
        inline_keyboard: [
          [
            {
              text: "scoreboard",
              web_app: {
                url: "https://million-board.vercel.app",
              },
            },
          ],
        ],
      });
  });

  test("uses the Telegram Web App link in groups", () => {
    expect(buildMiniAppReplyMarkup("supergroup", "https://million-board.vercel.app"))
      .toEqual({
        inline_keyboard: [
          [
            {
              text: "scoreboard",
              url: "https://t.me/SCOREBOARDFORUNICORNMAKERSBOT/SCOREBOARD",
            },
          ],
        ],
      });
  });

  test("recognizes group start commands addressed to the bot", () => {
    expect(shouldSendMiniAppButton("/start@SCOREBOARDFORUNICORNMAKERSBOT"))
      .toBe(true);
    expect(shouldSendMiniAppButton("/start")).toBe(true);
    expect(shouldSendMiniAppButton("scoreboard")).toBe(true);
    expect(shouldSendMiniAppButton("hello")).toBe(false);
  });
});
