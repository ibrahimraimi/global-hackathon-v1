import { z } from "zod";

export const monitorCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Monitor name is required")
    .max(100, "Monitor name must be less than 100 characters")
    .trim(),
  url: z
    .string()
    .url("Please enter a valid URL")
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, "URL must use HTTP or HTTPS protocol"),
  type: z.enum(["website", "api", "database", "webhook"], {
    errorMap: () => ({ message: "Please select a valid monitor type" }),
  }),
  method: z
    .enum(["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"])
    .default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  expected_status_code: z
    .number()
    .int("Status code must be an integer")
    .min(100, "Status code must be at least 100")
    .max(599, "Status code must be less than 600")
    .default(200),
  timeout: z
    .number()
    .int("Timeout must be an integer")
    .min(1, "Timeout must be at least 1 second")
    .max(300, "Timeout must be less than 300 seconds")
    .default(30),
  interval: z
    .number()
    .int("Interval must be an integer")
    .min(1, "Interval must be at least 1 minute")
    .max(1440, "Interval must be less than 1440 minutes (24 hours)")
    .default(5),
  enabled: z.boolean().default(true),
});

export const alertRuleCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Alert rule name is required")
    .max(100, "Alert rule name must be less than 100 characters")
    .trim(),
  monitor_id: z.string().uuid("Invalid monitor ID").optional(),
  condition: z.enum(["down", "slow", "status_code"], {
    errorMap: () => ({ message: "Please select a valid condition" }),
  }),
  threshold: z.number().min(0, "Threshold must be positive").optional(),
  notification_channels: z
    .array(z.enum(["email", "webhook", "slack"]))
    .default(["email"]),
  webhook_url: z.string().url("Please enter a valid webhook URL").optional(),
  enabled: z.boolean().default(true),
});

export const userProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters")
    .trim(),
  timezone: z.string().optional(),
  notification_preferences: z
    .object({
      email: z.boolean().default(true),
      webhook: z.boolean().default(false),
      slack: z.boolean().default(false),
    })
    .optional(),
});

export const authSignupSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const authLoginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// Type exports
export type MonitorCreateInput = z.infer<typeof monitorCreateSchema>;
export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type AuthSignupInput = z.infer<typeof authSignupSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
