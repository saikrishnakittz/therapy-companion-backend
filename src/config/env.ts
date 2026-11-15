import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:8081'),
  SUPABASE_URL: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || val.startsWith('https://'),
      {
        message: 'SUPABASE_URL must be a valid HTTPS URL (e.g. https://xyzcompany.supabase.co)',
      }
    ),
  SUPABASE_ANON_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

/**
 * Checks whether Supabase environment variables are provided and non-empty.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof env.SUPABASE_URL === 'string' &&
    env.SUPABASE_URL.trim().length > 0 &&
    typeof env.SUPABASE_ANON_KEY === 'string' &&
    env.SUPABASE_ANON_KEY.trim().length > 0
  );
};

/**
 * Returns validated Supabase configuration or throws a helpful configuration error.
 */
export const getSupabaseConfig = (): { supabaseUrl: string; supabaseAnonKey: string } => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Missing Supabase configuration: SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env'
    );
  }
  return {
    supabaseUrl: env.SUPABASE_URL as string,
    supabaseAnonKey: env.SUPABASE_ANON_KEY as string,
  };
};

/**
 * Returns the currently active AI provider ('mock' or 'openai').
 */
export const getAiProvider = (): 'mock' | 'openai' => {
  return env.AI_PROVIDER;
};

/**
 * Checks whether the OpenAI API key is configured.
 */
export const isOpenAiConfigured = (): boolean => {
  return (
    typeof env.OPENAI_API_KEY === 'string' &&
    env.OPENAI_API_KEY.trim().length > 0 &&
    !env.OPENAI_API_KEY.includes('your-openai-api-key')
  );
};

/**
 * Returns validated OpenAI configuration or throws a configuration error.
 */
export const getOpenAiConfig = (): { apiKey: string; model: string } => {
  if (!isOpenAiConfigured()) {
    throw new Error(
      'Missing OpenAI configuration: OPENAI_API_KEY must be set in backend/.env or Render environment variables'
    );
  }
  return {
    apiKey: env.OPENAI_API_KEY as string,
    model: env.OPENAI_MODEL,
  };
};
