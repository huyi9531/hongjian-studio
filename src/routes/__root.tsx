import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import '@/styles/globals.css'

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: '红笺' }, { name: 'description', content: '专注图文创作与发布的工作台' }], links: [{ rel: 'icon', href: '/favicon.svg' }] }),
  component: Root,
})

function Root() {
  return <html lang="zh-CN" suppressHydrationWarning><head><HeadContent /></head><body><Outlet /><Scripts /></body></html>
}
