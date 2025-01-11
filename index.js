import { Telegraf, Markup } from "telegraf";

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('"BOT_TOKEN" env var is required!');
const bot = new Telegraf(BOT_TOKEN);

const keyboard = Markup.inlineKeyboard([
  Markup.button.callback("Delete", "delete"),
]);

bot.start((ctx) => ctx.reply("Welcome..."));
bot.help((ctx) => ctx.reply("Help message"));
bot.on("message", (ctx) => ctx.copyMessage(ctx.message.chat.id, keyboard));
bot.action("delete", (ctx) => ctx.deleteMessage());

bot.launch();
