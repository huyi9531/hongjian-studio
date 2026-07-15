<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-subtitle">配置文本生成和图片生成的 API 服务</p>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加载配置中...</p>
    </div>

    <div v-else class="settings-container">
      <ErrorCard
        v-if="feedback?.type === 'error'"
        :error="feedback.error"
        dismissible
        @dismiss="clearFeedback"
        style="margin-bottom: 16px;"
      />

      <div
        v-else-if="feedback?.type === 'success'"
        class="success-card"
        role="status"
        aria-live="polite"
      >
        <span>{{ feedback.message }}</span>
        <button type="button" @click="clearFeedback" aria-label="关闭提示">×</button>
      </div>

      <!-- 文本生成配置 -->
      <div class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">文本生成配置</h2>
            <p class="section-desc">用于生成小红书图文大纲</p>
          </div>
          <button class="btn btn-small" @click="openAddTextModal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加
          </button>
        </div>

        <!-- 服务商列表表格 -->
        <ProviderTable
          :providers="textConfig.providers"
          :activeProvider="textConfig.active_provider"
          @activate="activateTextProvider"
          @edit="openEditTextModal"
          @delete="deleteTextProvider"
          @test="testTextProviderInList"
        />
      </div>

      <!-- 图片生成配置 -->
      <div class="card">
        <div class="section-header">
          <div>
            <h2 class="section-title">图片生成配置</h2>
            <p class="section-desc">用于生成小红书配图</p>
          </div>
          <button class="btn btn-small" @click="openAddImageModal">配置</button>
        </div>

        <div class="volcengine-summary">
          <div>
            <strong>火山引擎</strong>
            <span>方舟图片生成 API</span>
          </div>
          <span class="model-name">{{ imageConfig.providers[imageConfig.active_provider]?.model || '未配置' }}</span>
        </div>
      </div>
    </div>

    <!-- 文本服务商弹窗 -->
    <ProviderModal
      :visible="showTextModal"
      :isEditing="!!editingTextProvider"
      :formData="textForm"
      :testing="testingText"
      :typeOptions="textTypeOptions"
      providerCategory="text"
      @close="closeTextModal"
      @save="saveTextProvider"
      @test="testTextConnection"
      @update:formData="updateTextForm"
    />

    <!-- 图片服务商弹窗 -->
    <ImageProviderModal
      :visible="showImageModal"
      :formData="imageForm"
      @close="closeImageModal"
      @save="saveImageProvider"
      @update:formData="updateImageForm"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ProviderTable from '../components/settings/ProviderTable.vue'
import ProviderModal from '../components/settings/ProviderModal.vue'
import ImageProviderModal from '../components/settings/ImageProviderModal.vue'
import ErrorCard from '../components/common/ErrorCard.vue'
import { useProviderForm, textTypeOptions } from '../composables/useProviderForm'

/**
 * 系统设置页面
 *
 * 功能：
 * - 管理文本生成服务商配置
 * - 管理图片生成服务商配置
 * - 测试 API 连接
 */

// 使用 composable 管理表单状态和逻辑
const {
  // 状态
  loading,
  testingText,
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
  openAddImageModal,
  closeImageModal,
  saveImageProvider,
  updateImageForm
} = useProviderForm()

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.settings-container {
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.section-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.success-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
  border-radius: 8px;
  font-size: 14px;
}

.success-card button {
  border: none;
  background: transparent;
  color: #166534;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

/* 按钮样式 */
.btn-small {
  padding: 6px 12px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.volcengine-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color, #eee);
  border-radius: 8px;
  background: #fff;
}

.volcengine-summary strong { display: block; color: var(--text-main, #1a1a1a); }
.volcengine-summary span { display: block; margin-top: 4px; color: var(--text-sub, #666); font-size: 13px; }
.volcengine-summary .model-name { margin-top: 0; padding: 3px 8px; border-radius: 4px; background: #f5f5f5; font-family: Monaco, Menlo, monospace; font-size: 12px; }

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #666;
}
</style>
