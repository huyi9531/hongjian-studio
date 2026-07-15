import '@tanstack/react-start/server-only'
import { z } from 'zod'

const envSchema = z.object({
  TEXT_PROVIDER: z.enum(['openai_compatible', 'google_gemini']).default('openai_compatible'),
  TEXT_API_KEY: z.string().optional(),
  TEXT_BASE_URL: z.string().url().optional(),
  TEXT_MODEL: z.string().optional(),
  TEXT_ENDPOINT: z.string().default('/v1/chat/completions'),
  VOLCENGINE_API_KEY: z.string().optional(),
  AICONDUCTOR_API_KEY: z.string().optional(),
  APP_ACCESS_PASSWORD: z.string().min(8).optional(),
  SESSION_SECRET: z.string().min(24).optional(),
  DATABASE_URL: z.string().default('file:./data/hongjian.db'),
  DATA_DIR: z.string().default('./data'),
  XHS_PUBLISH_API_URL: z.string().url().default('https://plugin.aiconductor.fun/api/xhs_note_publish'),
})

const normalizedEnvironment = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
)

export const env = envSchema.parse(normalizedEnvironment)

export function configuredCapabilities() {
  return {
    text: Boolean(env.TEXT_API_KEY && env.TEXT_BASE_URL && env.TEXT_MODEL),
    image: Boolean(env.VOLCENGINE_API_KEY),
    publish: Boolean(env.AICONDUCTOR_API_KEY),
    auth: Boolean(env.APP_ACCESS_PASSWORD && env.SESSION_SECRET),
  }
}
