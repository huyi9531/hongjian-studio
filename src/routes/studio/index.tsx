import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { NewWork } from '@/components/studio-workbench'
import { sessionFn } from '@/server/functions'
export const Route = createFileRoute('/studio/')({ beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) }, component: () => <AppShell><NewWork /></AppShell> })
