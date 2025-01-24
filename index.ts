import { Telegraf, Context } from "telegraf";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";
import { escape as escapeHTML } from "html-escaper";

// Types
interface LangToCountry {
    [key: string]: string;
}

interface TranslationResult {
    text: string;
    from: {
        language: {
            iso: string;
        };
    };
}

// Configuration
const BOT_TOKEN: string = process.env.BOT_TOKEN || '';
const langToCountry: LangToCountry = {
    en: "gb",
    zh: "cn",
    ja: "jp",
    ko: "kr",
    ms: "my",
};

// Message template
const RESPONSE_TEMPLATE = (
    sourceFlag: string,
    sourceCountry: string,
    originalText: string,
    targetFlag: string,
    targetCountry: string,
    translatedText: string,
    senderId: number
): string => `
<blockquote expandable><b>${sourceFlag} ${sourceCountry} → ${targetFlag} ${targetCountry}</b>
<i>${escapeHTML(originalText)}</i></blockquote>

<code>${escapeHTML(translatedText)}</code>
<a href="tg://user?id=${senderId}">‎</a>
`;

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Command handlers
bot.start((ctx: Context) =>
    ctx.reply(
        "Welcome to Translation Bot! Send me any text to translate to Indonesian.",
        ctx.message?.message_id ? { reply_parameters: { message_id: ctx.message.message_id } } : {}
    )
);

bot.help((ctx: Context) =>
    ctx.reply(
        "Simply send me any text message and I'll translate it to Indonesian.",
        ctx.message?.message_id ? { reply_parameters: { message_id: ctx.message.message_id } } : {}
    )
);

bot.command("ping", (ctx: Context) =>
    ctx.reply("Pong!", ctx.message?.message_id ? { reply_parameters: { message_id: ctx.message.message_id } } : {})
);

// Message handler
bot.on("message", async (ctx: Context) => {
    if (!ctx.message || !('text' in ctx.message)) return;

    try {
        let targetLang: string = '', targetFlag: string | undefined;

        // Check if replying to bot's previous translation
        if (
            ctx.message.reply_to_message?.from?.is_bot &&
            ctx.message.reply_to_message.from?.id === ctx.botInfo?.id
        ) {
            const text = 'text' in ctx.message.reply_to_message ? ctx.message.reply_to_message.text : undefined;
            const match = text?.match(
                /([\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF])\s*(\w+)\s*→/
            );
            if (match) {
                targetFlag = match[1];
                targetLang = match[2];
            }
        }

        // Detect source language
        const result = await translate(ctx.message.text, { from: "auto" }) as TranslationResult;
        const isIndonesian = ["id", "ms"].includes(result.from.language.iso);
        if (!targetLang) targetLang = isIndonesian ? "en" : "id";

        // Perform translation
        const translated = await translate(ctx.message.text, {
            to: targetLang,
            from: result.from.language.iso,
            autoCorrect: true,
        }) as TranslationResult;

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
            reply_parameters: { message_id: ctx.message?.message_id },
        });
    }
});

// Start bot and handle shutdown
bot.launch().catch((err: Error) => console.error("Bot launch error:", err));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
