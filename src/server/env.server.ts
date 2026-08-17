import '@tanstack/react-start/server-only'
import { z } from 'zod'

const envSchema = z.object({
  AICONDUCTOR_API_KEY: z.string().optional(),
  APP_ACCESS_PASSWORD: z.string().min(8).optional(),
  SESSION_SECRET: z.string().min(24).optional(),
  DATABASE_URL: z.string().default('file:./data/hongjian.db'),
  DATA_DIR: z.string().default('./data'),
  PLATFORM: z.enum(['node', 'cloudflare']).default('node'),
  XHS_PUBLISH_API_URL: z.string().url().default('https://plugin.aiconductor.fun/api/xhs_note_publish'),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_REGION: z.string().default('auto'),
  R2_PUBLIC_URL: z.string().url().optional(),
})

const normalizedEnvironment = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
)

export const env = envSchema.parse(normalizedEnvironment)
