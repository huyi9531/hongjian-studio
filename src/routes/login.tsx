import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sessionFn, signInFn } from '@/server/functions'

export const Route = createFileRoute('/login')({ loader: () => sessionFn(), component: Login })
function Login() {
  const { authenticated } = Route.useLoaderData(); const navigate = useNavigate(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  if (authenticated) void navigate({ to: '/studio' })
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(''); try { await signInFn({ data: { password } }); await navigate({ to: '/studio' }) } catch (cause) { setError(cause instanceof Error ? cause.message : '登录失败，请重试') } finally { setPending(false) } }
  return <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_right,oklch(0.92_0.04_25),transparent_34%)] p-5"><form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-card p-7 shadow-[0_1px_2px_rgb(0_0_0_/_0.06),0_16px_36px_rgb(73_15_25_/_0.09)]"><div className="mb-8 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground"><KeyRound aria-hidden="true" /></div><div><h1 className="text-xl font-semibold text-balance">红笺</h1><p className="text-sm text-muted-foreground">输入访问密码进入工作台</p></div></div><label className="grid gap-2 text-sm font-medium">访问密码<Input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(error)} /></label>{error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}<Button className="mt-6 w-full" type="submit" disabled={pending}>{pending && <LoaderCircle className="animate-spin" />}进入工作台</Button></form></main>
}
