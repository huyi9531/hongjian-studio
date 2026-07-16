import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const viteEntry = resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
const port = '5187'
const child = spawn(process.execPath, [viteEntry, '--port', port, '--strictPort'], { stdio: 'ignore' })
const deadline = Date.now() + 30_000

async function check() {
  try {
    const response = await fetch(`http://localhost:${port}/login`)
    if (response.ok) {
      child.kill()
      process.exit(0)
    }
  } catch {}
  if (Date.now() >= deadline) {
    child.kill()
    process.exitCode = 1
    return
  }
  setTimeout(check, 500)
}

child.once('error', error => {
  console.error(`无法启动开发服务: ${error.message}`)
  process.exitCode = 1
})
void check()
