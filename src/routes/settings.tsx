import { createFileRoute, redirect } from '@tanstack/react-router'
import { Check, ImageIcon, KeyRound, LoaderCircle, MessageSquareText, Save, type LucideIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

function ProviderPanel({ icon: Icon, type, configured, children }: { icon: LucideIcon; type: string; configured: boolean; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl bg-card">
    <header className="flex items-center gap-3 p-5 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><Icon className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0"><h3 className="text-base font-medium text-balance">火山方舟</h3><p className="mt-0.5 text-xs text-muted-foreground">Volcengine Ark · {type}</p></div>
      <span className={cn('ml-auto flex shrink-0 items-center gap-2 text-xs', configured ? 'text-foreground' : 'text-muted-foreground')}><span className={cn('size-2 rounded-full', configured ? 'bg-success' : 'bg-black/15')} />{configured ? '已配置' : '未配置'}</span>
    </header>
    <div className="border-t border-hairline p-5 sm:p-6">{children}</div>
  </section>
}

function CredentialField({ id, label, value, configured, onChange }: { id: string; label: string; value: string; configured: boolean; onChange: (value: string) => void }) {
  return <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative"><KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={id} type="password" value={value} onChange={event => onChange(event.target.value)} placeholder={configured ? '已配置，留空则不修改' : '输入方舟 API Key'} className="pl-10" autoComplete="off" spellCheck={false} /></div>
  </div>
}

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
    'flex min-h-24 items-start justify-between rounded-xl bg-muted p-4 text-left transition-[background-color,transform] hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft',
    selected && 'bg-primary-soft',
  )

  return <AppShell><section className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
    <WorkspacePageHeader title="设置" description="按用途管理模型渠道和默认生成参数。" actions={<Button onClick={save} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}保存设置</Button>} />
    {message && <p className={cn('mt-5 text-sm', saveFailed ? 'text-destructive' : 'text-muted-foreground')} role={saveFailed ? 'alert' : 'status'}>{message}</p>}

    <div className="mt-8 grid gap-10">
      <div>
        <div className="mb-4"><div className="flex items-center gap-2"><MessageSquareText className="size-5 text-muted-foreground" aria-hidden="true" /><h2 className="text-lg font-semibold text-balance">文本模型</h2></div><p className="mt-1.5 max-w-[60ch] text-sm text-pretty text-muted-foreground">负责参考图理解、内容大纲、标题和发布文案。</p></div>
        <ProviderPanel icon={MessageSquareText} type="文本生成" configured={capabilities.text}>
          <CredentialField id="text-api-key" label="API Key" value={textApiKey} configured={capabilities.text} onChange={setTextApiKey} />
          <div className="mt-6"><Label className="mb-2.5 block">默认模型</Label><div className="grid gap-3 sm:grid-cols-2">{textModelOptions.map(model => <button key={model.value} type="button" aria-pressed={preferences.textModel === model.value} onClick={() => setPreferences(current => ({ ...current, textModel: model.value }))} className={optionClass(preferences.textModel === model.value)}><span><span className="block text-sm font-medium">{model.label}</span><span className="mt-1.5 block max-w-[30ch] text-xs leading-5 text-muted-foreground">{model.description}</span></span>{preferences.textModel === model.value && <SelectionMark />}</button>)}</div></div>
          <div className="mt-6 flex items-center gap-4 border-t border-hairline pt-4"><div className="min-w-0"><Label htmlFor="text-thinking" className="text-sm font-medium">深度思考</Label><p className="mt-1 text-xs leading-5 text-pretty text-muted-foreground">开启后进行多步骤分析，结果更严谨，但响应时间和 Token 消耗会增加。</p></div><Switch id="text-thinking" className="ml-auto" checked={preferences.textThinkingEnabled} onCheckedChange={checked => setPreferences(current => ({ ...current, textThinkingEnabled: checked }))} aria-label="深度思考" /></div>
        </ProviderPanel>
      </div>

      <div>
        <div className="mb-4"><div className="flex items-center gap-2"><ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" /><h2 className="text-lg font-semibold text-balance">图片模型</h2></div><p className="mt-1.5 max-w-[60ch] text-sm text-pretty text-muted-foreground">负责封面和内容页生成，并统一控制清晰度与提示词详细程度。</p></div>
        <ProviderPanel icon={ImageIcon} type="图片生成" configured={capabilities.image}>
          <CredentialField id="image-api-key" label="API Key" value={imageApiKey} configured={capabilities.image} onChange={setImageApiKey} />
          <div className="mt-6"><Label className="mb-2.5 block">默认模型</Label><div className="grid gap-3 sm:grid-cols-2">{imageModelOptions.map(model => <button key={model.value} type="button" aria-pressed={preferences.imageModel === model.value} onClick={() => setPreferences(current => ({ ...current, imageModel: model.value, imageSize: '2K' }))} className={optionClass(preferences.imageModel === model.value)}><span><span className="block text-sm font-medium">{model.label}</span><span className="mt-1.5 block max-w-[28ch] text-xs leading-5 text-muted-foreground">{model.description}</span></span>{preferences.imageModel === model.value && <SelectionMark />}</button>)}</div></div>
          <div className="mt-6 grid gap-6 border-t border-hairline pt-6 sm:grid-cols-2">
            <div><Label className="mb-2.5 block">默认清晰度</Label><div className="inline-flex rounded-xl bg-muted p-1">{sizes.map(size => <button key={size} type="button" aria-pressed={preferences.imageSize === size} onClick={() => setPreferences(current => ({ ...current, imageSize: size }))} className={cn('min-h-10 min-w-20 rounded-lg px-5 text-sm font-medium text-muted-foreground transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft', preferences.imageSize === size && 'bg-card text-foreground')}>{size}</button>)}</div></div>
            <div><Label className="mb-2.5 block">提示词版本</Label><div className="grid grid-cols-2 rounded-xl bg-muted p-1">{[
              { value: imagePromptModes.short, label: '短版' },
              { value: imagePromptModes.long, label: '长版' },
            ].map(mode => <button key={mode.value} type="button" aria-pressed={preferences.imagePromptMode === mode.value} onClick={() => setPreferences(current => ({ ...current, imagePromptMode: mode.value }))} className={cn('min-h-10 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft', preferences.imagePromptMode === mode.value && 'bg-card text-foreground')}>{mode.label}</button>)}</div></div>
          </div>
        </ProviderPanel>
      </div>
    </div>
  </section></AppShell>
}
