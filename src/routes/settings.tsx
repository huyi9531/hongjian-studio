import { createFileRoute, redirect } from '@tanstack/react-router'
import { Check, LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getStudioPreferencesFn, saveStudioPreferencesFn, sessionFn } from '@/server/functions'
import { seedreamModels, supportedSeedreamSizes } from '@/lib/studio-preferences'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => getStudioPreferencesFn(),
  component: SettingsPage,
})

const models = [
  { value: seedreamModels.pro, label: 'Seedream 5.0 Pro', description: '更新的图像理解与文字表现，支持 1K、2K' },
  { value: seedreamModels.standard, label: 'Seedream 4.5', description: '稳定的高分辨率生成，支持 2K、4K' },
]

function SettingsPage() {
  const initial = Route.useLoaderData()
  const [preferences, setPreferences] = useState(initial.preferences)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const sizes = supportedSeedreamSizes(preferences.imageModel)

  async function save() {
    setPending(true)
    setMessage('')
    try {
      setPreferences(await saveStudioPreferencesFn({ data: preferences }))
      setMessage('设置已保存，新作品将使用这些默认值。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setPending(false)
    }
  }

  return <AppShell><section className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-2xl font-semibold">设置</h1><p className="mt-2 text-sm text-muted-foreground">选择默认的图片模型和清晰度。</p></div><Button onClick={save} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}保存设置</Button></header>
    <div className="mt-10 grid gap-10">
      <section><div className="mb-4"><h2 className="text-base font-semibold">默认图片模型</h2><p className="mt-1 text-sm text-muted-foreground">生成作品配图时优先使用的模型。</p></div><div className="grid gap-3 sm:grid-cols-2">{models.map(model => <button key={model.value} type="button" aria-pressed={preferences.imageModel === model.value} onClick={() => setPreferences(current => ({ ...current, imageModel: model.value, imageSize: '2K' }))} className={cn('flex min-h-28 items-start justify-between rounded-2xl bg-muted p-5 text-left transition-[background-color,transform] hover:bg-[#f5f5f5] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30', preferences.imageModel === model.value && 'bg-[#fff1f3]')}><span><span className="block text-sm font-semibold">{model.label}</span><span className="mt-2 block max-w-[28ch] text-xs leading-5 text-muted-foreground">{model.description}</span></span>{preferences.imageModel === model.value && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-white"><Check className="size-4" aria-hidden="true" /></span>}</button>)}</div></section>
      <section><div className="mb-4"><h2 className="text-base font-semibold">默认清晰度</h2><p className="mt-1 text-sm text-muted-foreground">可选范围会随模型自动调整。</p></div><div className="inline-flex rounded-full bg-muted p-1">{sizes.map(size => <button key={size} type="button" aria-pressed={preferences.imageSize === size} onClick={() => setPreferences(current => ({ ...current, imageSize: size }))} className={cn('min-h-10 min-w-20 rounded-full px-5 text-sm font-semibold text-muted-foreground transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30', preferences.imageSize === size && 'bg-white text-foreground')}>{size}</button>)}</div></section>
      <section><div className="mb-4"><h2 className="text-base font-semibold">服务状态</h2><p className="mt-1 text-sm text-muted-foreground">凭证由服务端环境变量管理，页面不会读取或显示密钥。</p></div><div className="grid gap-2 sm:grid-cols-3">{Object.entries({ '文本模型': initial.capabilities.text, '图片模型': initial.capabilities.image, '扫码发布': initial.capabilities.publish }).map(([label, ready]) => <div key={label} className="flex min-h-14 items-center justify-between rounded-xl bg-muted px-4 text-sm"><span>{label}</span><span className={cn('text-xs font-medium', ready ? 'text-foreground' : 'text-[#999]')}>{ready ? '已配置' : '未配置'}</span></div>)}</div></section>
    </div>
    {message && <p className="mt-8 text-sm text-muted-foreground" role="status">{message}</p>}
  </section></AppShell>
}
