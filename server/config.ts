import { config as loadEnvironmentFile } from "dotenv";
import { z } from "zod";

loadEnvironmentFile({ path: ".env.local", quiet: true });
loadEnvironmentFile({ quiet: true });

const configSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    SUPABASE_URL:
      environment.SUPABASE_URL ??
      environment.NEXT_PUBLIC_SUPABASE_URL ??
      environment.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY:
      environment.SUPABASE_ANON_KEY ??
      environment.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      environment.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY || undefined,
    APP_URL: environment.APP_URL,
    API_PORT: environment.API_PORT,
    ALLOWED_ORIGINS: environment.ALLOWED_ORIGINS,
    NODE_ENV: environment.NODE_ENV,
  });
}
