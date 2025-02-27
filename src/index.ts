import { Telegraf } from "telegraf"
import { message } from "telegraf/filters";

import { escape } from "html-escaper";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";

import { translate as tgtranslate } from "./mtproto";

declare module "bun" {
    interface Env {
        API_HASH: string;
        API_ID: number;
        BOT_TOKEN: string;
        SESSION: string;
    }
}

const bot = new Telegraf(Bun.env.BOT_TOKEN)

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

        const translated = await tgtranslate(ctx.message.text, target)
            .catch(async () => {
                return (await translate(ctx.message.text, { to: target })).text;
            });


        const scFlag = flag(refine[source as keyof typeof refine] || source) || '🇺🇳';
        const tcFlag = flag(refine[target as keyof typeof refine] || target) || '🇺🇳';

        const scCountry = languages[source as keyof typeof languages] || source;
        const tcCountry = languages[target as keyof typeof languages] || target;

        // max 4096 characters if larger than that, split it
        let reply = await ctx.reply(response({
            sourceFlag: scFlag, targetFlag: tcFlag,
            sourceCountry: scCountry, targetCountry: tcCountry,
            original: ctx.message.text.slice(0, 1000) + '...',
            translated: translated.slice(0, 2048),
            senderId: ctx.from.id,
        }), {
            parse_mode: "HTML",
            disable_notification: true,
            link_preview_options: { is_disabled: true },
        });

        if (translated.length > 2048) {
            const chunks = translated.match(/.{1,2048}/gs);
            if (!chunks) throw new Error('Failed to split the text');
            for (const chunk of chunks) {
                // skip index 1
                if (chunks.indexOf(chunk) === 0) continue;
                reply = await ctx.reply(`<code>${escape(chunk)}</code>`, {
                    parse_mode: "HTML",
                    disable_notification: true,
                    ...reply && { reply_to_message_id: reply.message_id },
                    link_preview_options: { is_disabled: true },
                });
            }
        }

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