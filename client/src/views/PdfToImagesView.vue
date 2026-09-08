<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileDropZone from '../components/FileDropZone.vue'
import OutputGrid from '../components/OutputGrid.vue'
import ToolPage from '../components/ToolPage.vue'
import { BROWSER_PDF_WARNING_BYTES } from '../constants'
import type { ImageFormat, OutputFile } from '../types'
import { downloadZip, friendlyError, revokeOutputs, validateFiles } from '../utils/files'
import { renderPdfToImages } from '../utils/pdf'

const file = ref<File>()
const format = ref<ImageFormat>('jpeg')
const processing = ref(false)
const progress = ref(0)
const outputs = ref<OutputFile[]>([])
const isLarge = computed(() => (file.value?.size ?? 0) > BROWSER_PDF_WARNING_BYTES)

/** 接收单个 PDF 并在新任务开始前释放旧预览资源。 */
function choose(files: File[]) {
  const error = validateFiles(files.slice(0, 1), 'pdf', 250 * 1024 * 1024, 1)
  if (error) return ElMessage.error(error)
  revokeOutputs(outputs.value)
  outputs.value = []
  file.value = files[0]
  progress.value = 0
}

/** 在浏览器本地逐页渲染 PDF，不上传原始文件。 */
async function processPdf() {
  if (!file.value) return ElMessage.warning('请先选择 PDF 文件')
  processing.value = true
  progress.value = 1
  revokeOutputs(outputs.value)
  outputs.value = []
  const options = { format: format.value, quality: 1, scale: 2, onProgress: (value: number) => { progress.value = value } }
  try {
    outputs.value = await renderPdfToImages(file.value, options)
    ElMessage.success(`已转换 ${outputs.value.length} 页`)
  } catch (error) {
    ElMessage.error(friendlyError(error))
  } finally {
    processing.value = false
  }
}

/** 将所有页面在浏览器中打包为 ZIP。 */
async function zipAll() {
  try {
    await downloadZip(outputs.value, `${file.value?.name.replace(/\.pdf$/i, '') ?? 'pdf'}-images.zip`, (value) => { progress.value = value })
  } catch (error) {
    ElMessage.error(friendlyError(error, '打包失败'))
  }
}

onBeforeUnmount(() => revokeOutputs(outputs.value))
</script>

<template>
  <ToolPage title="PDF 转图片" description="免费逐页导出 JPG、PNG 或 WebP。" badge="PDF → IMAGE">
    <FileDropZone accept="application/pdf,.pdf" title="拖拽 PDF 到这里" hint="支持单个 PDF，最大 250MB" :disabled="processing" :has-files="Boolean(file)" @files="choose">
      <small>加密或损坏的 PDF 会给出明确提示</small>
      <template #files>
        <div v-if="file" class="selected-file">
          <div class="pdf-glyph">PDF</div>
          <div><strong>{{ file.name }}</strong><span>{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span></div>
          <el-button text type="danger" @click="file = undefined; revokeOutputs(outputs); outputs = []">移除</el-button>
        </div>
      </template>
    </FileDropZone>

    <el-alert v-if="isLarge" title="此 PDF 较大，将继续在本地处理；如浏览器内存不足，请降低清晰度或拆分 PDF 后重试。" type="warning" :closable="false" show-icon />

    <div class="controls-grid one">
      <label>输出格式<el-select v-model="format"><el-option label="JPG" value="jpeg" /><el-option label="PNG" value="png" /><el-option label="WebP" value="webp" /></el-select></label>
    </div>
    <div v-if="processing || progress" class="progress-wrap"><el-progress :percentage="progress" :status="progress === 100 ? 'success' : undefined" /></div>
    <div class="action-bar">
      <el-button type="primary" size="large" :loading="processing" :disabled="!file" @click="processPdf">开始转换</el-button>
      <el-button v-if="outputs.length > 1" size="large" @click="zipAll">打包 ZIP</el-button>
      <span>文件仅用于本次处理，不读取，不存储，不对外泄露</span>
    </div>
    <OutputGrid :items="outputs" />
  </ToolPage>
</template>
