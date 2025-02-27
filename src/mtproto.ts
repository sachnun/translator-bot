import { Snake, Raw } from "tgsnake";

const client = new Snake({
    apiHash: Bun.env.API_HASH,
    apiId: Bun.env.API_ID,
    logLevel: 'error',
    login: {
        session: Bun.env.SESSION,
        forceDotSession: false,
    }
});

await client.run() // connect first

export async function translate(text: string, target: string) {
    return await client.api.invoke(new Raw.messages.TranslateText({
        toLang: target,
        text: [new Raw.TextWithEntities({
            text: text,
            entities: []
        })],
    })).then((res) => res.result[0].text)
}