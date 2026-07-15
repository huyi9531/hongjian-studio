import { createFileRoute, redirect } from '@tanstack/react-router'
import { Check, LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { getStudioPreferencesFn, saveStudioPreferencesFn, sessionFn } from '@/server/functions'
import { seedreamModels, supportedSeedreamSizes } from '@/lib/studio-preferences'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => getStudioPreferencesFn(),
  component: SettingsPage,
})

const models = [
  { value: seedreamModels.pro, label: 'Seedream 5.0 Pro', description: '支持 1K、2K' },
  { value: seedreamModels.standard, label: 'Seedream 4.5', description: '支持 2K、4K' },
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
      const saved = await saveStudioPreferencesFn({ data: preferences })
      setPreferences(saved)
      setMessage('设置已保存，新作品将使用这些默认值。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setPending(false)
    }
  }

  return <AppShell><section className="mx-auto max-w-3xl p-5 sm:p-7"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-balance">设置</h1><p className="mt-2 text-sm text-muted-foreground text-pretty">调整创作与发布的默认行为。</p></div><Button onClick={save} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}保存设置</Button></header><div className="mt-7 divide-y rounded-lg bg-card shadow-[0_0_0_1px_rgb(0_0_0_/_0.06),0_8px_24px_rgb(73_15_25_/_0.05)]"><section className="p-5"><h2 className="font-medium">默认图片模型</h2><p className="mt-1 text-sm text-muted-foreground">生成作品配图时优先使用的 Seedream 模型。</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{models.map(model => <button key={model.value} type="button" aria-pressed={preferences.imageModel === model.value} onClick={() => setPreferences(current => ({ ...current, imageModel: model.value, imageSize: '2K' }))} className={cn('flex min-h-16 items-center justify-between rounded-md px-4 text-left shadow-[0_0_0_1px_var(--border)] transition-[background-color,box-shadow,transform] hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', preferences.imageModel === model.value && 'bg-accent shadow-[0_0_0_2px_var(--primary)]')}><span><span className="block text-sm font-medium">{model.label}</span><span className="mt-1 block text-xs text-muted-foreground">{model.description}</span></span>{preferences.imageModel === model.value && <Check className="size-4 text-primary" aria-hidden="true" />}</button>)}</div></section><section className="p-5"><h2 className="font-medium">默认清晰度</h2><p className="mt-1 text-sm text-muted-foreground">可选范围会随模型自动调整。</p><div className="mt-4 inline-flex rounded-md bg-muted p-1">{sizes.map(size => <button key={size} type="button" aria-pressed={preferences.imageSize === size} onClick={() => setPreferences(current => ({ ...current, imageSize: size }))} className={cn('min-h-10 min-w-20 rounded-sm px-4 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow,transform] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', preferences.imageSize === size && 'bg-card text-foreground shadow-sm')}>{size}</button>)}</div></section><section className="flex items-center justify-between gap-5 p-5"><div><h2 className="font-medium">默认开启 OSS 转存</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">创建扫码发布页时默认转存图片，发布前仍可单独关闭。</p></div><Switch checked={preferences.transferToOss} onCheckedChange={checked => setPreferences(current => ({ ...current, transferToOss: checked }))} aria-label="默认开启 OSS 转存" /></section><section className="p-5"><h2 className="font-medium">服务状态</h2><p className="mt-1 text-sm text-muted-foreground">凭证仍由服务端环境变量管理，页面不会读取或显示密钥。</p><div className="mt-4 flex flex-wrap gap-2">{Object.entries({ '文本模型': initial.capabilities.text, '图片模型': initial.capabilities.image, '扫码发布': initial.capabilities.publish }).map(([label, ready]) => <span key={label} className={cn('rounded-sm px-2.5 py-1 text-xs font-medium', ready ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>{label}：{ready ? '已配置' : '未配置'}</span>)}</div></section></div>{message && <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>}</section></AppShell>
}
