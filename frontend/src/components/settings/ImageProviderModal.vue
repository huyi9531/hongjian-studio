<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div>
          <h3>火山引擎图片生成</h3>
          <p>方舟 Seedream 图像模型</p>
        </div>
        <button class="close-btn" type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="volcengine-api-key">API Key</label>
          <input
            id="volcengine-api-key"
            type="password"
            class="form-input"
            :value="formData.api_key"
            @input="updateField('api_key', ($event.target as HTMLInputElement).value)"
            :placeholder="formData._has_api_key ? formData.api_key_masked : '输入火山引擎 API Key'"
          />
          <span class="form-hint" v-if="formData._has_api_key">已配置 API Key，留空表示不修改</span>
        </div>

        <div class="form-group">
          <label for="seedream-model">模型</label>
          <select id="seedream-model" class="form-select" :value="formData.model" @change="updateModel">
            <option :value="seedream45">Seedream 4.5</option>
            <option :value="seedream5Pro">Seedream 5.0 Pro</option>
          </select>
        </div>

        <div class="form-group">
          <label for="seedream-size">清晰度</label>
          <select
            id="seedream-size"
            class="form-select"
            :value="formData.image_size"
            @change="updateField('image_size', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="size in supportedSizes" :key="size" :value="size">{{ size }}</option>
          </select>
          <span class="form-hint">仅显示当前模型支持的清晰度</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" type="button" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" type="button" @click="$emit('save')">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageProviderForm } from '../../composables/useProviderForm'

const seedream45 = 'doubao-seedream-4-5-251128'
const seedream5Pro = 'doubao-seedream-5-0-260128'

const props = defineProps<{
  visible: boolean
  formData: ImageProviderForm
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:formData', data: ImageProviderForm): void
}>()

const supportedSizes = computed(() => (
  props.formData.model === seedream5Pro ? ['1K', '2K'] : ['2K', '4K']
))

function updateField(field: keyof ImageProviderForm, value: string) {
  emit('update:formData', { ...props.formData, [field]: value })
}

function updateModel(event: Event) {
  const model = (event.target as HTMLSelectElement).value
  const sizes = model === seedream5Pro ? ['1K', '2K'] : ['2K', '4K']
  emit('update:formData', {
    ...props.formData,
    model,
    image_size: sizes.includes(props.formData.image_size) ? props.formData.image_size : sizes[0]
  })
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, .5); }
.modal-content { display: flex; flex-direction: column; width: 100%; max-width: 500px; max-height: 90vh; overflow: hidden; border-radius: 12px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, .2); }
.modal-header, .modal-footer { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border-color, #eee); }
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-header p { margin: 4px 0 0; color: var(--text-sub, #666); font-size: 13px; }
.close-btn { width: 40px; height: 40px; border: 0; border-radius: 6px; background: transparent; color: #777; font-size: 24px; line-height: 1; cursor: pointer; }
.close-btn:hover { background: #f5f5f5; color: #333; }
.modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; margin-bottom: 8px; color: var(--text-main, #1a1a1a); font-size: 14px; font-weight: 500; }
.form-input, .form-select { box-sizing: border-box; width: 100%; min-height: 40px; padding: 10px 12px; border: 1px solid var(--border-color, #eee); border-radius: 8px; background: #fff; font-size: 14px; }
.form-input:focus, .form-select:focus { outline: 0; border-color: var(--primary, #ff2442); box-shadow: 0 0 0 3px rgba(255, 36, 66, .1); }
.form-hint { display: block; margin-top: 6px; color: var(--text-sub, #666); font-size: 12px; }
.modal-footer { justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color, #eee); border-bottom: 0; }
.btn { min-height: 40px; padding: 8px 16px; border: 1px solid var(--border-color, #eee); border-radius: 6px; background: #fff; color: var(--text-main, #1a1a1a); cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color .2s, border-color .2s, transform .15s; }
.btn:hover { background: #f5f5f5; }
.btn:active { transform: scale(.96); }
.btn-primary { border-color: var(--primary, #ff2442); background: var(--primary, #ff2442); color: #fff; }
.btn-primary:hover { background: var(--primary-hover, #e61e3a); }
</style>
