import mongoose from "mongoose";
import { Client, GatewayIntentBits, Partials } from "discord.js";

import envs from "./envs";
import {
  deleteAfterMessageSchema,
  IDeleteAfterMessage,
  IUser,
  userSchema,
} from "./schema";

mongoose.connect(envs.MONGO_DB_CONN_STRING, {
  dbName: envs.MONGO_DB_NAME,
});

export const User = mongoose.model<IUser>("users", userSchema);
export const DeleteAfterMessages = mongoose.model<IDeleteAfterMessage>(
  "deleteAfterMessages",
  deleteAfterMessageSchema,
);
