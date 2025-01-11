import { Telegraf } from "telegraf";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";
import { escape as escapeHTML } from "html-escaper";

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const langToCountry = {
  en: "gb",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ms: "my",
};

// Message template
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

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Command handlers
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

// Message handler
bot.on("message", async (ctx) => {
  if (!ctx.message.text) return;

  try {
    let targetLang, targetFlag;

    // Check if replying to bot's previous translation
    if (
      ctx.message.reply_to_message?.from?.is_bot &&
      ctx.message.reply_to_message.from?.id === ctx.botInfo.id
    ) {
      const text = ctx.message.reply_to_message.text;
      const match = text?.match(
        /([\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF])\s*(\w+)\s*→/
      );
      if (match) {
        targetFlag = match[1];
        targetLang = match[2];
      }
    }

    // Detect source language
    const result = await translate(ctx.message.text, { from: "auto" });
    const isIndonesian = ["id", "ms"].includes(result.from.language.iso);
    if (!targetLang) targetLang = isIndonesian ? "en" : "id";

    // Perform translation
    const translated = await translate(ctx.message.text, {
      to: targetLang,
      from: result.from.language.iso,
      autoCorrect: true,
    });

    // Prepare response data
    const detectedLang = result.from.language.iso;
    const sourceCountry = languages[detectedLang] || detectedLang;
    const targetCountry = languages[targetLang] || targetLang;
    const sourceFlag = flag(langToCountry[detectedLang] || detectedLang) || "🇺🇳";
    if (!targetFlag) targetFlag = flag(langToCountry[targetLang] || targetLang) || "🇺🇳";

    // Send response
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
        link_preview_options: { is_disabled: true },
      }
    );
  } catch (error) {
    console.error("Translation error:", error);
    await ctx.reply("Sorry, translation failed.", {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});

// Start bot and handle shutdown
bot.launch().catch((err) => console.error("Bot launch error:", err));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
