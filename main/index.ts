import { Telegraf } from "telegraf"
import { message } from "telegraf/filters";

import { escape } from "html-escaper";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";

declare module "bun" {
    interface Env {
        BOT_TOKEN: string;
    }
}

const bot = new Telegraf(Bun.env.BOT_TOKEN).catch(console.error);

const refine = {
    en: "gb",
    zh: "cn",
    ja: "jp",
    ko: "kr",
}

type responseSchema = {
    sourceFlag: string;
    targetFlag: string;
    sourceCountry: string;
    targetCountry: string;
    original: string;
    translated: string;
    senderId: number;
}

const response = (data: responseSchema) => `
<blockquote expandable><b>${data.sourceFlag} ${data.sourceCountry} → ${data.targetFlag} ${data.targetCountry}</b>
<i>${escape(data.original)}</i></blockquote>

<code>${escape(data.translated)}</code>
<a href="tg://user?id=${data.senderId}">‎</a>
`.trim();

bot.start(async (ctx) => {
    // only private chats
    if (ctx.chat.type !== 'private') return

    await ctx.sendChatAction('choose_sticker')
    await ctx.reply('👋')
})

async function detect(text: string) {
    const res = await translate(text, { from: "auto" })
    const isIndo = ["id", "ms"].includes(res.from.language.iso)
    return {
        source: res.from.language.iso,
        target: isIndo ? "en" : "id",
    }
}

bot.on(message('text'), async (ctx) => {
    if (!ctx.message.text) return;

    try {
        const { source, target } = await detect(ctx.message.text);

        const translated = await translate(ctx.message.text, {
            to: target,
            from: source,
            autoCorrect: true,
        }).then(res => res.text);

        await ctx.reply(response({
            sourceFlag: flag(refine[source as keyof typeof refine] || source) || '🇺🇳',
            targetFlag: flag(refine[target as keyof typeof refine] || target) || '🇺🇳',
            sourceCountry: languages[source as keyof typeof languages] || source,
            targetCountry: languages[target as keyof typeof languages] || target,
            original: ctx.message.text,
            translated: translated,
            senderId: ctx.from.id,
        }), {
            parse_mode: "HTML",
            disable_notification: true,
            link_preview_options: { is_disabled: true },
        });

    } catch (err) {
        console.error(err);
        await ctx.reply('😵‍💫', {
            reply_parameters: { message_id: ctx.message.message_id },
        });
    }
});

bot.launch(() => console.log('Bot started'))

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))