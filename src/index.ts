import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildMember,
  Partials,
  PermissionsBitField,
} from "discord.js";

import envs from "./envs";
import { getAllActiveSubs } from "./hotmart";
import { emailSchema } from "./schema";
import {
  processDeleteAfterMessages,
  saveDeleteAfterMessages,
} from "./deleteAfterMessages";
import { User } from "./db";

export const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

bot.on("guildMemberAdd", async (member) => {
  try {
    const roleId = envs.DISCORD_LINK_ROLE_ID;
    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
      throw new Error(`No role with id ${roleId} found`);
    }

    const channel = member.guild.channels.cache.get(
      envs.DISCORD_LINK_CHANNEL_ID,
    );
    if (!channel) {
      throw new Error(
        `No channel with id ${envs.DISCORD_LINK_CHANNEL_ID} found`,
      );
    }

    if (channel.type !== ChannelType.GuildText) {
      throw new Error(`${channel.name} channel is not GuildText`);
    }

    await member.roles.add(role);

    const messages = [
      `Bienvenido ${member.displayName}!`,
      "Debes escribir aquí el email usado a la hora de realizar el pago.",
    ];

    const messageContent = messages.join("\n");
    await member.send(messageContent);
    await channel.send(messageContent);
  } catch (error) {
    console.error(`guildMemberAdd error:`, error);
  }
});

bot.on("messageCreate", async (message) => {
  try {
    if (!message.guild) {
      return;
    }
    if (message.channel.id !== envs.DISCORD_LINK_CHANNEL_ID) {
      return;
    }
    if (message.author.bot) {
      return;
    }
    const isAdmin = message.member?.permissions.has(
      PermissionsBitField.Flags.Administrator,
    );

    if (!envs.DISCORD_ALLOW_ADMIN_WRITE_IN_LINK_CHANEL && isAdmin) {
      return;
    }

    await message.delete();

    const trim = message.content.trim();
    const emailValidation = emailSchema.safeParse(trim);
    if (!emailValidation.success) {
      const m = await message.channel.send(
        `${message.author} **Formato del email inválido**. Escribe el email con el que realizaste el pago. *Ejemplo: jack@horas.com*`,
      );
      await saveDeleteAfterMessages(m, 300);
      return;
    }

    const email = emailValidation.data;
    const emailsWithSub = await getAllActiveSubs(envs.HOTMART_PLAN_ID);
    if (!emailsWithSub.includes(email)) {
      const m = await message.channel.send(
        `${message.author} Pago no encontrado con el email.`,
      );
      await saveDeleteAfterMessages(m, 300);
      return;
    }

    const found = await User.findOne({
      email: email,
    });

    if (found) {
      const m = await message.channel.send(
        `${message.author} El email **${email}** ya fue reclamado en el pasado.`,
      );
      await saveDeleteAfterMessages(m, 300);
      return;
    }

    const user = new User({
      discordId: message.author.id,
      email: email,
      createdAt: new Date(),
      isActive: true,
    });
    await user.save();

    const roleId = envs.DISCORD_MEMBER_ROLE_ID;
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      throw new Error(`No role with id ${roleId} found`);
    }
    if (!message.member) {
      throw new Error(`No member on message ${message.id}`);
    }
    await message.member.roles.add(role);
  } catch (error) {
    console.error(`messageCreate error:`, error);
    const m = await message.channel.send(
      `${message.author} Error interno, prueba de nuevo. Si el error persiste contacta con un administrador.`,
    );
    await saveDeleteAfterMessages(m, 300);
    return;
  }
});

async function reviewSubs() {
  try {
    const guildId = envs.DISCORD_GUILD_ID;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) {
      console.error(`No guild with id ${guild} found`);
      return;
    }

    const members = await guild.members.fetch();
    const emailsWithSub = await getAllActiveSubs(envs.HOTMART_PLAN_ID);

    const users = await User.find({
      isActive: true,
    });

    for (const user of users) {
      try {
        if (!emailsWithSub.includes(user.email)) {
          const member = guild.members.cache.get(user.discordId);
          if (!member) {
            console.error(
              `Member with ID ${user.discordId} not found in the guild.`,
            );
            return;
          }

          if (member.roles.cache.has(envs.DISCORD_GUEST_ROLE_ID)) {
            continue;
          }

          await member.roles.remove(envs.DISCORD_MEMBER_ROLE_ID);

          user.isActive = false;
          await user.save();
        }
      } catch (error) {
        console.error(`reviewSubs member ${user.discordId} error`, error);
      }
    }
  } catch (error) {
    console.error("reviewSubs error", error);
  }
}

bot.once("ready", async () => {
  console.log(`Bot started as ${bot.user?.tag}`);

  const every6hours = 21_600_000;
  setInterval(async () => {
    await reviewSubs();
  }, every6hours);

  const every30min = 1_800_000;
  setInterval(async () => {
    await processDeleteAfterMessages(bot);
  }, every30min);
});

bot.login(envs.DISCORD_TOKEN);
