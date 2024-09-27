import { Message, PermissionsBitField } from "discord.js";
import envs from "./envs";
import { emailSchema } from "./schema";
import { saveDeleteAfterMessages } from "./deleteAfterMessages";
import { getAllActiveSubs } from "./hotmart";
import { User } from "./db";

export async function handleDM(message: Message<boolean>) {
    
}

export async function handleOther(message: Message<boolean>) {
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
        `${message.author} El email ya fue reclamado en el pasado.`,
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
}