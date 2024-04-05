import { addDocument, updateDocumentById } from "@/firebase";
import { StoredGroup } from "@/types";
import { cleanUpBotMessage, onlyAdmin } from "@/utils/bot";
import { BOT_USERNAME } from "@/utils/env";
import { isValidEthAddress } from "@/utils/web3";
import { syncProjectGroups, projectGroups } from "@/vars/projectGroups";
import { CommandContext, Context } from "grammy";

export async function startBot(ctx: CommandContext<Context>) {
  const { match: token } = ctx;
  const { id: chatId, type } = ctx.chat;
  let text = `*Welcome to ${BOT_USERNAME}!!!*\n\n`;

  if (type === "private") {
    text += `What can this bot do?

@${BOT_USERNAME} is to be added to your project telegram. By adding @${BOT_USERNAME} to your project, you will be able to view  the buys, marketcap and transactions real time. Hype your project with a dedicated buy bot today!

◦ /start : To start the bot
◦ /settings : Opens the menu to add a token, gif, telegram group link and adjust any available settings for the buy bot

Pass a token address in the bot chat to get an AI generated token report in real time.`;

    return ctx.reply(cleanUpBotMessage(text), { parse_mode: "MarkdownV2" });
  }

  const isAdmin = await onlyAdmin(ctx);
  if (!isAdmin) return false;

  if (token) {
    if (!isValidEthAddress(token)) {
      return ctx.reply("Please pass a valid ETH token address");
    }

    text = `This ${type} would now get updates for \`${token}\` buys. Each time the bot detects a buy for your token, a message would be sent in this group with some data about it.

To configure bot;
type /settings`;

    const projectData = projectGroups.find(
      ({ chatId: storedChatId }) => storedChatId === chatId
    );

    if (projectData) {
      ctx.reply(cleanUpBotMessage(text), { parse_mode: "MarkdownV2" });
      const updates = { token };
      updateDocumentById({
        updates,
        collectionName: "project_groups",
        id: projectData.id || "",
      }).then(() => syncProjectGroups());

      return;
    }

    ctx.reply(cleanUpBotMessage(text), { parse_mode: "MarkdownV2" });
    addDocument<StoredGroup>({
      data: { chatId, token },
      collectionName: "project_groups",
    }).then(() => syncProjectGroups());
    return;
  }

  text += `To start the buy, add \\@${BOT_USERNAME} as an admin \\(this allows the bot to send messages\\) and then do /start in the below format -\n/start _token address_.`;

  return ctx.reply(cleanUpBotMessage(text), { parse_mode: "MarkdownV2" });
}
