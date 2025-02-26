import { Snake, Raw } from "tgsnake";

import { escape } from "html-escaper";
import { translate, languages } from "google-translate-api-x";
import { flag } from "country-emoji";

declare module "bun" {
    interface Env {
        API_HASH: string;
        API_ID: number;
        BOT_TOKEN: string;
    }
}

const bot = new Snake({
    apiHash: Bun.env.API_HASH,
    apiId: Bun.env.API_ID,
    logLevel: 'error',
    login: {
        botToken: Bun.env.BOT_TOKEN,
        // sessionName: 'bot',
    }
});

const client = new Snake({
    apiHash: Bun.env.API_HASH,
    apiId: Bun.env.API_ID,
    logLevel: 'error',
    login: {
        session: Bun.env.SESSION,
        sessionName: 'client',
    }
});

async function detect(text: string) {
    const res = await translate(text, { from: "auto" })
    const isIndo = ["id", "ms"].includes(res.from.language.iso)
    return {
        source: isIndo ? "id" : res.from.language.iso,
        target: isIndo ? "en" : "id",
    }
}


type responseSchema = {
    sourceFlag: string;
    targetFlag: string;
    sourceCountry: string;
    targetCountry: string;
    original: string;
    translated: string;
    senderId: bigint | undefined;
}

const refine = {
    en: "gb",
    zh: "cn",
    ja: "jp",
    ko: "kr",
}

const response = (data: responseSchema) => `
<blockquote expandable><b>${data.sourceFlag} ${data.sourceCountry} → ${data.targetFlag} ${data.targetCountry}</b>
<i>${escape(data.original)}</i></blockquote>

<code>${escape(data.translated)}</code>
<a href="tg://user?id=${data.senderId}">‎</a>
`.trim();

bot.command('start', async (ctx) => {
    await ctx.msg?.reply('👋')
});

bot.on('msg.text', async (ctx) => {
    if (ctx.msg && ctx.msg.text) {
        try {
            const { source, target } = await detect(ctx.msg.text);
            const translate = new Raw.messages.TranslateText({
                toLang: target,
                text: [new Raw.TextWithEntities({
                    text: ctx.msg.text,
                    entities: []
                })],
            });
            const translated = (await client.api.invoke(translate)).result[0].text;
            const res = response({
                sourceFlag: flag(refine[source as keyof typeof refine] || source) || '🇺🇳',
                targetFlag: flag(refine[target as keyof typeof refine] || target) || '🇺🇳',
                sourceCountry: languages[source as keyof typeof languages] || source,
                targetCountry: languages[target as keyof typeof languages] || target,
                original: ctx.msg.text,
                translated: translated,
                senderId: ctx.msg.senderChat?.id,
            });
            ctx.msg.respond(res, {
                parseMode: 'html',
                disableNotification: true,
                disableWebPagePreview: true,
            });
        } catch (err) {
            console.error(err);
            await ctx.msg.reply('😵‍💫')
        }
    }
});

client.run().then(() => console.log('client ready'));
bot.run().then(() => console.log('bot ready'));
