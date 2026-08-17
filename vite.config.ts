import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 默认（dev / 普通 build）运行在 node（本地 SQLite）；仅 --mode cloudflare 构建时启用 Cloudflare Worker 目标
export default defineConfig(({ mode }) => ({
  plugins: [mode === 'cloudflare' ? cloudflare({ viteEnvironment: { name: 'ssr' } }) : null, tanstackStart(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
