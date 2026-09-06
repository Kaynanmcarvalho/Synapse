import { z } from 'zod';
import { NOTIFICATION_EVENTS } from '../notification.types';
export const deviceSchema = z.object({
  token: z.string().min(20),
  platform: z.enum(['web', 'android']),
});
export const preferenceSchema = z.object({
  event: z.enum(NOTIFICATION_EVENTS),
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});
export const publishSchema = z.object({
  userId: z.string().min(1),
  event: z.enum(NOTIFICATION_EVENTS),
  title: z.string().min(2),
  body: z.string().min(2),
  entityKey: z.string().min(1),
  recipientEmail: z.string().email().optional(),
});
export type DeviceInput = z.infer<typeof deviceSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
export type PublishInput = z.infer<typeof publishSchema>;
