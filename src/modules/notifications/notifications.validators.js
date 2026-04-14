import { z } from "zod";

const dataValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.null(),
]);

const notificationDataSchema = z
  .record(z.string().min(1).max(64), dataValueSchema)
  .refine((value) => Object.keys(value).length <= 50, {
    message: "Data payload cannot exceed 50 keys",
  });

export const sendAccidentNotificationSchema = z
  .object({
    accidentId: z.string().uuid(),
    userIds: z.array(z.string().uuid()).min(1).max(500),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    streetName: z.string().max(200).optional(),
    data: notificationDataSchema.optional(),
  })
  .strict();

