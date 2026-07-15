import { ref } from 'vue'
import { getConfig, updateConfig, testConnection, type Config } from '../api'
import { normalizeApiError, type AppError } from '../utils/errors'

/**
 * 服务商表单管理 Composable
 *
 * 提供服务商配置的完整管理功能：
 * - 加载/保存配置
 * - 添加/编辑/删除服务商
 * - 测试连接
 * - 激活服务商
 */

// 服务商数据类型
export interface Provider {
  type: string
  model: string
  base_url?: string
  api_key?: string
  api_key_masked?: string
  endpoint_type?: string
  high_concurrency?: boolean
  short_prompt?: boolean
  [key: string]: any
}

// 服务商配置类型
export interface ProviderConfig {
  active_provider: string
  providers: Record<string, Provider>
}

// 文本服务商表单类型
export interface TextProviderForm {
  name: string
  type: string
  api_key: string
  api_key_masked: string
  base_url: string
  model: string
  endpoint_type: string
  _has_api_key: boolean
}

// 图片服务商表单类型
export interface ImageProviderForm {
  name: string
  type: string
  api_key: string
  api_key_masked: string
  base_url: string
  model: string
  high_concurrency: boolean
  short_prompt: boolean
  endpoint_type: string
  image_size: string
  _has_api_key: boolean
}

// 文本服务商类型选项
export const textTypeOptions = [
  { value: 'google_gemini', label: 'Google Gemini' },
  { value: 'openai_compatible', label: 'OpenAI 兼容接口' }
]

export const VOLCENGINE_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com'
export const VOLCENGINE_ARK_ENDPOINT = '/api/v3/images/generations'
export const SEEDREAM_4_5_MODEL = 'doubao-seedream-4-5-251128'
export const SEEDREAM_5_PRO_MODEL = 'doubao-seedream-5-0-260128'

/**
 * 服务商表单管理 Hook
 */
export function useProviderForm() {
  // 加载状态
  const loading = ref(true)
  const saving = ref(false)
  const testingText = ref(false)
  const testingImage = ref(false)
  const feedback = ref<{
    type: 'success' | 'error'
    message?: string
    error?: AppError
  } | null>(null)

  // 配置数据
  const textConfig = ref<ProviderConfig>({
    active_provider: '',
    providers: {}
  })

  const imageConfig = ref<ProviderConfig>({
    active_provider: '',
    providers: {}
  })

  // 文本服务商弹窗状态
  const showTextModal = ref(false)
  const editingTextProvider = ref<string | null>(null)
  const textForm = ref<TextProviderForm>(createEmptyTextForm())

  // 图片服务商弹窗状态
  const showImageModal = ref(false)
  const editingImageProvider = ref<string | null>(null)
  const imageForm = ref<ImageProviderForm>(createEmptyImageForm())

  /**
   * 创建空的文本服务商表单
   */
  function createEmptyTextForm(): TextProviderForm {
    return {
      name: '',
      type: 'openai_compatible',
      api_key: '',
      api_key_masked: '',
      base_url: '',
      model: '',
      endpoint_type: '/v1/chat/completions',
      _has_api_key: false
    }
  }

  /**
   * 创建空的图片服务商表单
   */
  function createEmptyImageForm(): ImageProviderForm {
    return {
      name: '',
      type: 'volcengine_ark',
      api_key: '',
      api_key_masked: '',
      base_url: '',
      model: SEEDREAM_4_5_MODEL,
      high_concurrency: false,
      short_prompt: false,
      endpoint_type: VOLCENGINE_ARK_ENDPOINT,
      image_size: '2K',
      _has_api_key: false
    }
  }

  /**
   * 加载配置
   */
  async function loadConfig() {
    loading.value = true
    try {
      const result = await getConfig()
      if (result.success && result.config) {
        textConfig.value = {
          active_provider: result.config.text_generation.active_provider,
          providers: result.config.text_generation.providers
        }
        imageConfig.value = result.config.image_generation
      } else {
        setError(result.error || result.error_message || '加载配置失败', '加载配置失败')
      }
    } catch (e) {
      setError(e, '加载配置失败')
    } finally {
      loading.value = false
    }
  }

  /**
   * 自动保存配置
   */
  async function autoSaveConfig() {
    try {
      const config: Partial<Config> = {
        text_generation: {
          active_provider: textConfig.value.active_provider,
          providers: textConfig.value.providers
        },
        image_generation: imageConfig.value
      }

      const result = await updateConfig(config)
      if (result.success) {
        // 重新加载配置以获取最新的脱敏 API Key
        await loadConfig()
        setSuccess(result.message || '配置已保存')
      }
    } catch (e) {
      console.error('自动保存失败:', e)
      setError(e, '保存配置失败')
    }
  }

  function setSuccess(message: string) {
    feedback.value = { type: 'success', message }
  }

  function setError(error: unknown, fallbackTitle = '操作失败') {
    feedback.value = {
      type: 'error',
      error: normalizeApiError(error, fallbackTitle)
    }
  }

  function clearFeedback() {
    feedback.value = null
  }

  // ==================== 文本服务商操作 ====================

  /**
   * 激活文本服务商
   */
  async function activateTextProvider(name: string) {
    textConfig.value.active_provider = name
    await autoSaveConfig()
  }

  /**
   * 打开添加文本服务商弹窗
   */
  function openAddTextModal() {
    editingTextProvider.value = null
    textForm.value = createEmptyTextForm()
    showTextModal.value = true
  }

  /**
   * 打开编辑文本服务商弹窗
   */
  function openEditTextModal(name: string, provider: Provider) {
    editingTextProvider.value = name
    textForm.value = {
      name: name,
      type: provider.type || 'openai_compatible',
      api_key: '',
      api_key_masked: provider.api_key_masked || '',
      base_url: provider.base_url || '',
      model: provider.model || '',
      endpoint_type: provider.endpoint_type || '/v1/chat/completions',
      _has_api_key: !!provider.api_key_masked
    }
    showTextModal.value = true
  }

  /**
   * 关闭文本服务商弹窗
   */
  function closeTextModal() {
    showTextModal.value = false
    editingTextProvider.value = null
  }

  /**
   * 保存文本服务商
   */
  async function saveTextProvider() {
    const name = editingTextProvider.value || textForm.value.name

    if (!name) {
      setError('请填写服务商名称', '配置不完整')
      return
    }

    if (!textForm.value.type) {
      setError('请选择服务商类型', '配置不完整')
      return
    }

    // 新增时必须填写 API Key
    if (!editingTextProvider.value && !textForm.value.api_key) {
      setError('请填写 API Key', '配置不完整')
      return
    }

    const existingProvider = textConfig.value.providers[name] || {}

    const providerData: any = {
      type: textForm.value.type,
      model: textForm.value.model
    }

    // 如果填写了新的 API Key，使用新的；否则保留原有的
    if (textForm.value.api_key) {
      providerData.api_key = textForm.value.api_key
    } else if (existingProvider.api_key) {
      providerData.api_key = existingProvider.api_key
    }

    if (textForm.value.base_url) {
      providerData.base_url = textForm.value.base_url
    }

    // 如果是 OpenAI 兼容接口，保存 endpoint_type
    if (textForm.value.type === 'openai_compatible') {
      providerData.endpoint_type = textForm.value.endpoint_type
    }

    textConfig.value.providers[name] = providerData

    closeTextModal()
    await autoSaveConfig()
  }

  /**
   * 删除文本服务商
   */
  async function deleteTextProvider(name: string) {
    if (confirm(`确定要删除服务商 "${name}" 吗？`)) {
      delete textConfig.value.providers[name]
      if (textConfig.value.active_provider === name) {
        textConfig.value.active_provider = ''
      }
      await autoSaveConfig()
    }
  }

  /**
   * 测试文本服务商连接（弹窗中）
   */
  async function testTextConnection() {
    testingText.value = true
    try {
      const result = await testConnection({
        type: textForm.value.type,
        provider_name: editingTextProvider.value || undefined,
        api_key: textForm.value.api_key || undefined,
        base_url: textForm.value.base_url,
        endpoint_type: textForm.value.endpoint_type,
        model: textForm.value.model
      })
      if (result.success) {
        setSuccess(result.message || '连接成功')
      }
    } catch (e: any) {
      setError(e, '连接失败')
    } finally {
      testingText.value = false
    }
  }

  /**
   * 测试列表中的文本服务商
   */
  async function testTextProviderInList(name: string, provider: Provider) {
    try {
      const result = await testConnection({
        type: provider.type,
        provider_name: name,
        api_key: undefined,
        base_url: provider.base_url,
        endpoint_type: provider.endpoint_type,
        model: provider.model
      })
      if (result.success) {
        setSuccess(`${name} 连接成功`)
      }
    } catch (e: any) {
      setError(e, `${name} 连接失败`)
    }
  }

  // ==================== 图片服务商操作 ====================

  /**
   * 激活图片服务商
   */
  async function activateImageProvider(name: string) {
    imageConfig.value.active_provider = name
    await autoSaveConfig()
  }

  /**
   * 打开添加图片服务商弹窗
   */
  function openAddImageModal() {
    const providerName = imageConfig.value.active_provider || Object.keys(imageConfig.value.providers)[0] || 'volcengine'
    const provider = imageConfig.value.providers[providerName] || {}
    openEditImageModal(providerName, provider)
  }

  /**
   * 打开编辑图片服务商弹窗
   */
  function openEditImageModal(name: string, provider: Provider) {
    editingImageProvider.value = name
    imageForm.value = {
      name: name,
      type: 'volcengine_ark',
      api_key: '',
      api_key_masked: provider.api_key_masked || '',
      base_url: provider.base_url || '',
      model: provider.model === SEEDREAM_5_PRO_MODEL ? SEEDREAM_5_PRO_MODEL : SEEDREAM_4_5_MODEL,
      high_concurrency: provider.high_concurrency || false,
      short_prompt: provider.short_prompt || false,
      endpoint_type: VOLCENGINE_ARK_ENDPOINT,
      image_size: provider.image_size || '2K',
      _has_api_key: !!provider.api_key_masked
    }
    showImageModal.value = true
  }

  /**
   * 关闭图片服务商弹窗
   */
  function closeImageModal() {
    showImageModal.value = false
    editingImageProvider.value = null
  }

  /**
   * 保存图片服务商
   */
  async function saveImageProvider() {
    const name = editingImageProvider.value || imageForm.value.name

    if (!name) {
      setError('请填写服务商名称', '配置不完整')
      return
    }

    if (!imageForm.value.type) {
      setError('请填写服务商类型', '配置不完整')
      return
    }

    // 新增时必须填写 API Key
    if (!editingImageProvider.value && !imageForm.value.api_key) {
      setError('请填写 API Key', '配置不完整')
      return
    }

    const existingProvider = imageConfig.value.providers[name] || {}

    const providerData: any = {
      ...existingProvider,
      type: 'volcengine_ark',
      model: imageForm.value.model,
      image_size: imageForm.value.image_size,
      base_url: VOLCENGINE_ARK_BASE_URL,
      endpoint_type: VOLCENGINE_ARK_ENDPOINT,
      high_concurrency: imageForm.value.high_concurrency,
      short_prompt: imageForm.value.short_prompt
    }

    // 如果填写了新的 API Key，使用新的；否则保留原有的
    if (imageForm.value.api_key) {
      providerData.api_key = imageForm.value.api_key
    } else if (existingProvider.api_key) {
      providerData.api_key = existingProvider.api_key
    }

    imageConfig.value.providers[name] = providerData
    imageConfig.value.active_provider = name

    closeImageModal()
    await autoSaveConfig()
  }

  /**
   * 删除图片服务商
   */
  async function deleteImageProvider(name: string) {
    if (confirm(`确定要删除服务商 "${name}" 吗？`)) {
      delete imageConfig.value.providers[name]
      if (imageConfig.value.active_provider === name) {
        imageConfig.value.active_provider = ''
      }
      await autoSaveConfig()
    }
  }

  /**
   * 测试图片服务商连接（弹窗中）
   */
  async function testImageConnection() {
    testingImage.value = true
    try {
      const result = await testConnection({
        type: imageForm.value.type,
        provider_name: editingImageProvider.value || undefined,
        api_key: imageForm.value.api_key || undefined,
        base_url: imageForm.value.base_url,
        endpoint_type: imageForm.value.endpoint_type,
        model: imageForm.value.model
      })
      if (result.success) {
        setSuccess(result.message || '连接成功')
      }
    } catch (e: any) {
      setError(e, '连接失败')
    } finally {
      testingImage.value = false
    }
  }

  /**
   * 测试列表中的图片服务商
   */
  async function testImageProviderInList(name: string, provider: Provider) {
    try {
      const result = await testConnection({
        type: provider.type,
        provider_name: name,
        api_key: undefined,
        base_url: provider.base_url,
        endpoint_type: provider.endpoint_type,
        model: provider.model
      })
      if (result.success) {
        setSuccess(`${name} 连接成功`)
      }
    } catch (e: any) {
      setError(e, `${name} 连接失败`)
    }
  }

  /**
   * 更新文本表单数据
   */
  function updateTextForm(data: TextProviderForm) {
    textForm.value = data
  }

  /**
   * 更新图片表单数据
   */
  function updateImageForm(data: ImageProviderForm) {
    imageForm.value = data
  }

  return {
    // 状态
    loading,
    saving,
    testingText,
    testingImage,
    feedback,

    // 配置数据
    textConfig,
    imageConfig,

    // 文本服务商弹窗
    showTextModal,
    editingTextProvider,
    textForm,

    // 图片服务商弹窗
    showImageModal,
    editingImageProvider,
    imageForm,

    // 方法
    loadConfig,
    clearFeedback,

    // 文本服务商方法
    activateTextProvider,
    openAddTextModal,
    openEditTextModal,
    closeTextModal,
    saveTextProvider,
    deleteTextProvider,
    testTextConnection,
    testTextProviderInList,
    updateTextForm,

    // 图片服务商方法
    activateImageProvider,
    openAddImageModal,
    openEditImageModal,
    closeImageModal,
    saveImageProvider,
    deleteImageProvider,
    testImageConnection,
    testImageProviderInList,
    updateImageForm
  }
}
