import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { Workbench } from '@/components/studio-workbench'
import { getWorkFn, sessionFn } from '@/server/functions'
export const Route = createFileRoute('/studio/$workId')({ beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) }, loader: ({ params }) => getWorkFn({ data: { workId: params.workId } }), component: () => <AppShell><Workbench initialWork={Route.useLoaderData()} /></AppShell> })
