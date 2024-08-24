import mongoose from "mongoose";
import { z } from "zod";

export interface IUser extends mongoose.Document {
  discordId: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
}

export const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, required: true },
  isActive: { type: Boolean, required: true },
});

export interface IDeleteAfterMessage extends mongoose.Document {
  messageId: string;
  channelId: string;
  createdAt: Date;
  toBeDeletedAt: Date;
}

export const deleteAfterMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  channelId: { type: String, required: true },
  createdAt: { type: Date, required: true },
  toBeDeletedAt: { type: Date, required: true },
});

export const emailSchema = z.string().email();

export const subscriptionsSchema = z.object({
  page_info: z.object({
    next_page_token: z.string().optional(),
  }),
  items: z.array(z.object({
    subscriber: z.object({
      email: emailSchema,
    }),
  })).optional(),
});
