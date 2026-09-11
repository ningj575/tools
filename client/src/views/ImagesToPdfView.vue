<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileDropZone from '../components/FileDropZone.vue'
import ImagePreviewGrid from '../components/ImagePreviewGrid.vue'
import ToolPage from '../components/ToolPage.vue'
import { BROWSER_IMAGE_LIMIT_BYTES, MAX_IMAGE_COUNT } from '../constants'
import { downloadBlob, friendlyError, validateFiles } from '../utils/files'
import { imagesToPdf } from '../utils/pdf'
import type { PdfPageOptions } from '../types'

const files = ref<File[]>([])
const options = ref<PdfPageOptions>({ size: 'a4', orientation: 'portrait', margin: 24 })
const processing = ref(false)
const progress = ref(0)

/** 校验并追加图片，保留用户选择顺序作为 PDF 页序。 */
function addFiles(selected: File[]) {
  const merged = [...files.value, ...selected]
  const error = validateFiles(merged, 'image', BROWSER_IMAGE_LIMIT_BYTES, MAX_IMAGE_COUNT)
  if (error) return ElMessage.error(error)
  files.value = merged
}

/** 调整图片顺序，新的顺序会作为生成 PDF 时的页面顺序。 */
function reorderFiles(fromIndex: number, toIndex: number): void {
  const reordered = [...files.value]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  files.value = reordered
}

/** 在浏览器内生成 PDF 并直接下载。 */
async function createPdf() {
  if (!files.value.length) return ElMessage.warning('请先添加图片')
  processing.value = true
  progress.value = 0
  try {
    const blob = await imagesToPdf(files.value, options.value, (value) => { progress.value = value })
    downloadBlob(blob, 'images-merged.pdf')
    ElMessage.success('PDF 已生成')
  } catch (error) {
    ElMessage.error(friendlyError(error, 'PDF 生成失败'))
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <ToolPage title="图片转 PDF" description="免费按顺序合并多张图片，自定义页面尺寸、方向和安全边距。" badge="IMAGE → PDF">
    <FileDropZone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple title="拖拽多张图片到这里" hint="PNG、JPG、WebP；最多 100 张" :disabled="processing" :has-files="files.length > 0" @files="addFiles">
      <template #files><ImagePreviewGrid embedded reorderable :files="files" @remove="files.splice($event, 1)" @reorder="reorderFiles" /></template>
    </FileDropZone>
    <div class="controls-grid three">
      <label>页面尺寸<el-select v-model="options.size"><el-option label="A4" value="a4" /><el-option label="Letter" value="letter" /><el-option label="适配原图" value="fit" /></el-select></label>
      <label>页面方向<el-segmented v-model="options.orientation" :options="[{ label: '纵向', value: 'portrait' }, { label: '横向', value: 'landscape' }]" /></label>
      <label><span class="control-label"><span>页边距</span><b>{{ options.margin }} pt</b></span><el-slider v-model="options.margin" :min="0" :max="72" /></label>
    </div>
    <el-progress v-if="processing" :percentage="progress" />
    <div class="action-bar"><el-button type="primary" size="large" :loading="processing" :disabled="!files.length" @click="createPdf">生成并下载 PDF</el-button><span> 图片仅用于本次处理，不读取，不存储，不对外泄露</span></div>
  </ToolPage>
</template>
