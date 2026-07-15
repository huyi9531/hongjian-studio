import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sessionFn, signInFn } from '@/server/functions'

export const Route = createFileRoute('/login')({ loader: () => sessionFn(), component: Login })

function Login() {
  const { authenticated } = Route.useLoaderData()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  if (authenticated) void navigate({ to: '/studio' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await signInFn({ data: { password } })
      await navigate({ to: '/studio' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请重试')
    } finally {
      setPending(false)
    }
  }

  return <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
    <section className="hidden border-r px-12 py-10 lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><img src="/favicon.svg" alt="" className="size-10 rounded-xl" /><span className="text-lg font-semibold">红笺</span></div>
      <div className="max-w-xl pb-12"><p className="text-sm font-medium text-primary">中文图文创作工作台</p><h1 className="mt-5 text-5xl leading-[1.15] font-semibold text-balance">让内容保持清晰，<br />让创作自然发生。</h1><p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">从主题、大纲到配图与发布，所有步骤都保存在同一份作品里。</p></div>
      <span className="text-xs text-[#999]">单人自托管工作区</span>
    </section>
    <section className="grid place-items-center p-5 sm:p-10">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3 lg:hidden"><img src="/favicon.svg" alt="" className="size-10 rounded-xl" /><span className="text-lg font-semibold">红笺</span></div>
        <div className="mb-8"><span className="grid size-11 place-items-center rounded-full bg-muted text-foreground"><KeyRound size={19} aria-hidden="true" /></span><h2 className="mt-6 text-2xl font-semibold">进入工作台</h2><p className="mt-2 text-sm text-muted-foreground">输入访问密码继续创作。</p></div>
        <label className="grid gap-2 text-sm font-medium">访问密码<Input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(error)} className="h-12" /></label>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <Button className="mt-6 w-full" size="lg" type="submit" disabled={pending}>{pending && <LoaderCircle className="animate-spin" />}进入工作台</Button>
      </form>
    </section>
  </main>
}
