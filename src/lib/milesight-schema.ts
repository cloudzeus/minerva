import { z } from "zod";

export const milesightSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  enabled: z.boolean().default(true),
  baseUrl: z
    .string()
    .url("Must be a valid URL")
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

export type MilesightSettingsFormData = z.infer<typeof milesightSettingsSchema>;

