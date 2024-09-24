import z from "zod";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const stringToBooleanSchema = z.preprocess((x) => x === "true", z.boolean())

const envsSchema = z.object({
  PRODUCTION: stringToBooleanSchema.default(false),

  HOTMART_API_CLIENT_ID: z.string().min(1),
  HOTMART_API_CLIENT_SECRET: z.string().min(1),
  HOTMART_API_TOKEN: z.string().min(1),
  HOTMART_PLAN_ID: z.string().min(1),

  MONGO_DB_CONN_STRING: z.string().min(1),
  MONGO_DB_NAME: z.string().min(1),

  DISCORD_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_GUEST_ROLE_ID: z.string().min(1),
  DISCORD_LINK_ROLE_ID: z.string().min(1),
  DISCORD_MEMBER_ROLE_ID: z.string().min(1),
  DISCORD_LINK_CHANNEL_ID: z.string().min(1),
  DISCORD_ALLOW_ADMIN_WRITE_IN_LINK_CHANEL: stringToBooleanSchema.default(false),
});

const envs = envsSchema.parse(process.env);

export default envs;
