import { Channel, ChannelType, Client, Message } from "discord.js";
import { DeleteAfterMessages } from "./db";

export async function processDeleteAfterMessages(bot: Client<boolean>) {
  const hash = new Map<string, Channel>();
  const deleteAfterMessages = await DeleteAfterMessages.find();
  const now = new Date();
  for (const deleteAfter of deleteAfterMessages) {
    try {
      if (deleteAfter.toBeDeletedAt > now) {
        continue;
      }

      let channel: Channel | undefined | null = hash.get(deleteAfter.channelId);
      if (!channel) {
        channel = await bot.channels.fetch(deleteAfter.channelId);
        if (!channel) {
          console.error(`Channel id not found ${deleteAfter.channelId}`);
          continue;
        }
        hash.set(deleteAfter.channelId, channel);
      }

      if (channel.type !== ChannelType.GuildText) {
        console.error(
          `Channel ${deleteAfter.channelId} is not ChannelType.GuildText`,
        );
        continue;
      }

      const message = await channel.messages.fetch(deleteAfter.messageId);
      await message.delete();
      await deleteAfter.deleteOne();
    } catch (error) {
      console.error("processDeleteAfterMessages", error);
    }
  }
}

export async function saveDeleteAfterMessages(
  message: Message<true> | Message<false>,
  ttl: number,
) {
  const toBeDeletedAt = new Date();
  toBeDeletedAt.setSeconds(toBeDeletedAt.getSeconds() + ttl);
  const deleteAfterMessages = new DeleteAfterMessages({
    messageId: message.id,
    channelId: message.channel.id,
    toBeDeletedAt: toBeDeletedAt,
    createdAt: new Date(),
  });
  await deleteAfterMessages.save();
}
