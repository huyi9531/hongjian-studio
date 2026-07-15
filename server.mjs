import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import app from './dist/server/server.js'

const port = Number(process.env.PORT ?? 12398)
const clientDir = resolve('dist/client')
const contentTypes = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' }

function toRequest(request) {
  const origin = `http://${request.headers.host ?? `127.0.0.1:${port}`}`
  const method = request.method ?? 'GET'
  return new Request(new URL(request.url ?? '/', origin), {
    method,
    headers: request.headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(request),
    duplex: 'half',
  })
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const file = resolve(clientDir, `.${pathname}`)
    if (file.startsWith(`${clientDir}${sep}`)) {
      try {
        if ((await stat(file)).isFile()) {
          const extension = file.slice(file.lastIndexOf('.')).toLowerCase()
          response.writeHead(200, { 'content-type': contentTypes[extension] ?? 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' })
          return response.end(await readFile(file))
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
    }
    const result = await app.fetch(toRequest(request))
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()))
    if (!result.body) return response.end()
    Readable.fromWeb(result.body).pipe(response)
  } catch (error) {
    console.error('Unhandled request error', error)
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('服务器暂时无法处理该请求')
  }
}).listen(port, '0.0.0.0', () => console.log(`红笺已在 http://0.0.0.0:${port} 启动`))
