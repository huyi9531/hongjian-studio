import { createFileRoute, redirect } from '@tanstack/react-router'
import { Check, KeyRound, LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WorkspacePageHeader } from '@/components/workspace-page-header'
import { imagePromptModes, seedreamModels, supportedSeedreamSizes, textModels } from '@/lib/studio-preferences'
import { cn } from '@/lib/utils'
import { getStudioPreferencesFn, saveStudioPreferencesFn, sessionFn } from '@/server/functions'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => { if (!(await sessionFn()).authenticated) throw redirect({ to: '/login' }) },
  loader: () => getStudioPreferencesFn(),
  component: SettingsPage,
})

const textModelOptions = [
  { value: textModels.pro, label: 'Doubao Seed 2.1 Pro', description: '更强的内容规划与视觉理解，适合高质量大纲和文案。' },
  { value: textModels.turbo, label: 'Doubao Seed 2.1 Turbo', description: '响应更快，适合频繁生成与快速迭代。' },
] as const

const imageModelOptions = [
  { value: seedreamModels.pro, label: 'Seedream 5.0 Pro', description: '更新的图像理解与文字表现，支持 1K、2K。' },
  { value: seedreamModels.standard, label: 'Seedream 4.5', description: '稳定的高分辨率生成，支持 2K、4K。' },
] as const

function SelectionMark() {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-white"><Check className="size-4" aria-hidden="true" /></span>
}

function SettingsPage() {
  const initial = Route.useLoaderData()
  const [preferences, setPreferences] = useState(initial.preferences)
  const [capabilities, setCapabilities] = useState(initial.capabilities)
  const [textApiKey, setTextApiKey] = useState('')
  const [imageApiKey, setImageApiKey] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const sizes = supportedSeedreamSizes(preferences.imageModel)

  async function save() {
    setPending(true)
    setMessage('')
    setSaveFailed(false)
    try {
      const saved = await saveStudioPreferencesFn({ data: {
        ...preferences,
        ...(textApiKey.trim() ? { textApiKey: textApiKey.trim() } : {}),
        ...(imageApiKey.trim() ? { imageApiKey: imageApiKey.trim() } : {}),
      } })
      setPreferences(saved.preferences)
      setCapabilities(saved.capabilities)
      setTextApiKey('')
      setImageApiKey('')
      setMessage('设置已保存，新请求将使用这些模型与密钥。')
    } catch (error) {
      setSaveFailed(true)
      setMessage(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setPending(false)
    }
  }

  const optionClass = (selected: boolean) => cn(
    'flex min-h-28 items-start justify-between rounded-xl bg-muted p-5 text-left transition-[background-color,transform] hover:bg-accent active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft',
    selected && 'bg-primary-soft',
  )

  return <AppShell><section className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <WorkspacePageHeader title="设置" description="配置文本与图片模型、生成清晰度和服务密钥。" actions={<Button onClick={save} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}保存设置</Button>} />
    <div className="mt-7 grid gap-0 overflow-hidden rounded-2xl bg-card">
      <section className="p-5 sm:p-6">
        <div className="mb-4"><h2 className="text-base font-medium">默认文本模型</h2><p className="mt-1 text-sm text-muted-foreground">用于参考图理解、大纲和发布文案生成。</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{textModelOptions.map(model => <button key={model.value} type="button" aria-pressed={preferences.textModel === model.value} onClick={() => setPreferences(current => ({ ...current, textModel: model.value }))} className={optionClass(preferences.textModel === model.value)}><span><span className="block text-sm font-medium">{model.label}</span><span className="mt-2 block max-w-[30ch] text-xs leading-5 text-muted-foreground">{model.description}</span></span>{preferences.textModel === model.value && <SelectionMark />}</button>)}</div>
      </section>

      <section className="border-t border-hairline p-5 sm:p-6">
        <div className="mb-4"><h2 className="text-base font-medium">模型 API 密钥</h2><p className="mt-1 text-sm text-muted-foreground">密钥仅保存在本机服务端数据库中，保存后不会回显。</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="text-api-key">文本模型 API Key</Label><div className="relative"><KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="text-api-key" type="password" value={textApiKey} onChange={event => setTextApiKey(event.target.value)} placeholder={capabilities.text ? '已配置，留空则不修改' : '输入方舟 API Key'} className="pl-10" autoComplete="off" spellCheck={false} /></div></div>
          <div className="grid gap-2"><Label htmlFor="image-api-key">图片模型 API Key</Label><div className="relative"><KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="image-api-key" type="password" value={imageApiKey} onChange={event => setImageApiKey(event.target.value)} placeholder={capabilities.image ? '已配置，留空则不修改' : '输入方舟 API Key'} className="pl-10" autoComplete="off" spellCheck={false} /></div></div>
        </div>
      </section>

      <section className="border-t border-hairline p-5 sm:p-6">
        <div className="mb-4"><h2 className="text-base font-medium">默认图片模型</h2><p className="mt-1 text-sm text-muted-foreground">生成作品配图时优先使用的模型。</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{imageModelOptions.map(model => <button key={model.value} type="button" aria-pressed={preferences.imageModel === model.value} onClick={() => setPreferences(current => ({ ...current, imageModel: model.value, imageSize: '2K' }))} className={optionClass(preferences.imageModel === model.value)}><span><span className="block text-sm font-medium">{model.label}</span><span className="mt-2 block max-w-[28ch] text-xs leading-5 text-muted-foreground">{model.description}</span></span>{preferences.imageModel === model.value && <SelectionMark />}</button>)}</div>
      </section>

      <section className="border-t border-hairline p-5 sm:p-6"><div className="mb-4"><h2 className="text-base font-medium">默认清晰度</h2><p className="mt-1 text-sm text-muted-foreground">可选范围会随图片模型自动调整。</p></div><div className="inline-flex rounded-full bg-muted p-1">{sizes.map(size => <button key={size} type="button" aria-pressed={preferences.imageSize === size} onClick={() => setPreferences(current => ({ ...current, imageSize: size }))} className={cn('min-h-10 min-w-20 rounded-full px-5 text-sm font-medium text-muted-foreground transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft', preferences.imageSize === size && 'bg-card text-foreground')}>{size}</button>)}</div></section>

      <section className="border-t border-hairline p-5 sm:p-6"><div className="mb-4"><h2 className="text-base font-medium">图片提示词</h2><p className="mt-1 text-sm text-muted-foreground">选择生成图片时发送给模型的提示词详细程度。</p></div><div className="grid gap-3 sm:grid-cols-2">{[
        { value: imagePromptModes.short, label: '短版（默认）', description: '保留页面内容、类型、合规与 3:4 排版要求。' },
        { value: imagePromptModes.long, label: '长版', description: '附带原始需求、完整大纲和页面类型细则。' },
      ].map(mode => <button key={mode.value} type="button" aria-pressed={preferences.imagePromptMode === mode.value} onClick={() => setPreferences(current => ({ ...current, imagePromptMode: mode.value }))} className={optionClass(preferences.imagePromptMode === mode.value)}><span><span className="block text-sm font-medium">{mode.label}</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">{mode.description}</span></span>{preferences.imagePromptMode === mode.value && <SelectionMark />}</button>)}</div></section>

      <section className="border-t border-hairline p-5 sm:p-6"><div className="mb-4"><h2 className="text-base font-medium">服务状态</h2><p className="mt-1 text-sm text-muted-foreground">模型凭证由设置页管理，扫码发布凭证由服务端环境变量管理。</p></div><div className="grid gap-2 sm:grid-cols-3">{Object.entries({ '文本模型': capabilities.text, '图片模型': capabilities.image, '扫码发布': capabilities.publish }).map(([label, ready]) => <div key={label} className="flex min-h-14 items-center justify-between rounded-lg bg-muted px-4 text-sm"><span>{label}</span><span className={cn('text-xs font-medium', ready ? 'text-foreground' : 'text-disabled-foreground')}>{ready ? '已配置' : '未配置'}</span></div>)}</div></section>
    </div>
    {message && <p className={cn('mt-8 text-sm', saveFailed ? 'text-destructive' : 'text-muted-foreground')} role={saveFailed ? 'alert' : 'status'}>{message}</p>}
  </section></AppShell>
}
