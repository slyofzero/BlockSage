import { TokenData } from "@/types";
import { apiFetcher } from "@/utils/api";
import { TOKEN_API } from "@/utils/constants";
import { auditToken } from "@/utils/web3";
import { CommandContext, Context } from "grammy";
import { openai } from "..";
import { BOT_USERNAME } from "@/utils/env";

export async function getTokenData(ctx: CommandContext<Context>) {
  const { type } = ctx.chat;

  if (type !== "private") {
    return ctx.reply(
      `The token market report feature can only be used in private chat. Message @${BOT_USERNAME} with the token address.`
    );
  }

  const token = ctx.message?.text || ctx.channelPost?.text || "";
  const tokenData = (await apiFetcher<TokenData>(`${TOKEN_API}/${token}`)).data;
  const tokenPairs = tokenData?.pairs;
  const firstPair = tokenPairs?.at(0);

  if (!firstPair) {
    return ctx.reply("No pairs found for this token");
  }

  const generationMessage = await ctx.reply(
    "Generating report for this token..."
  );
  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(ctx.chat.id, "typing");
  }, 4000);
  const tokenAudit = await auditToken(firstPair.pairAddress);

  const prompt = `Token audit - ${JSON.stringify(
    tokenAudit
  )} and token market data - ${JSON.stringify(
    tokenPairs
  )}. These two are an Ethereum token's token audit and current market data. Use both the audit data and market data to create a report. Make a list of 3 positive and 3 negative things about the token, then give a short overview of it all in one paragraph. Don't use ** to highlight things, use relevant emojis. Also include a score out of 100 like 'Token score - 100/100' between the negatives list and the overview. Token being locked in dead address is a good thing. Don't use any special characters to highlight certain things. Just keep them simple.`;

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4-turbo-preview",
  });

  for (const choice of chatCompletion.choices) {
    const shillText = `${choice.message.content}\n\nGenerated by @${BOT_USERNAME}`;
    ctx.reply(shillText);
    await ctx.deleteMessages([generationMessage.message_id]);
  }

  clearInterval(typingInterval);
}
