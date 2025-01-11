import { Telegraf } from "telegraf";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";
import { escape as escapeHTML } from "html-escaper";

// Language code to country code mapping (only for exceptions)
const langToCountry = {
  en: "gb",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ms: "my",
};

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply(
    "Welcome to Translation Bot! Send me any text to translate to Indonesian.",
    { reply_to_message_id: ctx.message.message_id }
  )
);
bot.help((ctx) =>
  ctx.reply(
    "Simply send me any text message and I'll translate it to Indonesian.",
    { reply_to_message_id: ctx.message.message_id }
  )
);
bot.command("ping", (ctx) =>
  ctx.reply("Pong!", { reply_to_message_id: ctx.message.message_id })
);

const RESPONSE_TEMPLATE = (
  sourceFlag,
  sourceCountry,
  originalText,
  targetFlag,
  targetCountry,
  translatedText,
  senderId
) => `
<blockquote expandable><b>${sourceFlag} ${sourceCountry} → ${targetFlag} ${targetCountry}</b>
<i>${escapeHTML(originalText)}</i></blockquote>

<code>${escapeHTML(translatedText)}</code>
<a href="tg://user?id=${senderId}">‎</a>
`;

bot.on("message", async (ctx) => {
  if (ctx.message.reply_to_message) return;
  if (ctx.message.text) {
    try {
      const result = await translate(ctx.message.text, {
        autoCorrect: true,
        from: "auto",
      });

      const isIndonesian = ["id", "ms"].includes(result.from.language.iso);
      const targetLang = isIndonesian ? "en" : "id";

      const translated = await translate(ctx.message.text, {
        to: targetLang,
        from: result.from.language.iso,
      });

      const detectedLang = result.from.language.iso;
      const sourceCountry = languages[detectedLang] || "Unknown";
      const targetCountry = languages[targetLang] || "Unknown";

      const sourceFlag = flag(langToCountry[detectedLang] || detectedLang);
      const targetFlag = flag(langToCountry[targetLang] || targetLang);

      await ctx.reply(
        RESPONSE_TEMPLATE(
          sourceFlag,
          sourceCountry,
          ctx.message.text,
          targetFlag,
          targetCountry,
          translated.text,
          ctx.message.from.id
        ),
        {
          parse_mode: "HTML",
          disable_notification: true,
          link_preview_options: {
            is_disabled: true,
          },
        }
      );
    } catch (error) {
      console.error("Translation error:", error);
      await ctx.reply("Sorry, translation failed.", {
        reply_to_message_id: ctx.message.message_id,
      });
    }
  }
});

// Start the bot
bot.launch().catch((err) => console.error("Bot launch error:", err));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
