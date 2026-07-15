import '@tanstack/react-start/server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { env } from './env.server'

const cookieName = 'hongjian_session'

function sign(value: string) {
  return createHmac('sha256', env.SESSION_SECRET ?? 'development-session-secret-change-me').update(value).digest('base64url')
}

export function isAuthenticated() {
  const token = getCookie(cookieName)
  if (!token || !env.SESSION_SECRET) return false
  const [value, signature] = token.split('.')
  if (!value || !signature) return false
  const expected = sign(value)
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && value === 'owner'
}

export function requireAuth() {
  if (!isAuthenticated()) throw new Error('未登录或会话已失效')
}

export function signIn(password: string) {
  if (!env.APP_ACCESS_PASSWORD || !env.SESSION_SECRET) throw new Error('访问密码或会话密钥尚未配置')
  const actual = Buffer.from(password)
  const expected = Buffer.from(env.APP_ACCESS_PASSWORD)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('访问密码错误')
  const value = 'owner'
  setCookie(cookieName, `${value}.${sign(value)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 14 })
}
