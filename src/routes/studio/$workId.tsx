import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { Workbench } from '@/components/studio-workbench'
import { getStudioPreferencesFn, getWorkFn, sessionFn } from '@/server/functions'
export const Route = createFileRoute('/studio/$workId')({ beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) }, loader: async ({ params }) => { const [work, settings] = await Promise.all([getWorkFn({ data: { workId: params.workId } }), getStudioPreferencesFn()]); return { work, preferences: settings.preferences } }, component: () => { const data = Route.useLoaderData(); return <AppShell><Workbench initialWork={data.work} preferences={data.preferences} /></AppShell> } })
