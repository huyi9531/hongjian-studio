import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// vitest 在 node 环境运行，不加载 @cloudflare/vite-plugin（其 Worker 环境校验与 vitest 冲突）
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
