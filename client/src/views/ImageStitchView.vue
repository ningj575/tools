<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileDropZone from '../components/FileDropZone.vue'
import ImagePreviewGrid from '../components/ImagePreviewGrid.vue'
import ToolPage from '../components/ToolPage.vue'
import { BROWSER_IMAGE_LIMIT_BYTES, MAX_IMAGE_COUNT } from '../constants'
import type { ImageFormat, StitchMode } from '../types'
import { stitchImages } from '../utils/canvas'
import { downloadBlob, friendlyError, validateFiles } from '../utils/files'

const files = ref<File[]>([])
const mode = ref<StitchMode>('vertical')
const gap = ref(12)
const margin = ref(12)
const columns = ref(2)
const background = ref('#ffffff')
const format = ref<ImageFormat>('png')
const quality = ref(0.92)
const processing = ref(false)
const result = ref<{ blob: Blob; url: string }>()

/** 校验并追加待拼接图片。 */
function addFiles(selected: File[]) {
  const merged = [...files.value, ...selected]
  const error = validateFiles(merged, 'image', BROWSER_IMAGE_LIMIT_BYTES, MAX_IMAGE_COUNT)
  if (error) return ElMessage.error(error)
  files.value = merged
}

/** 调整待拼接图片的排列顺序，并清除顺序已失效的旧结果。 */
function reorderFiles(fromIndex: number, toIndex: number): void {
  const reordered = [...files.value]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  files.value = reordered
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = undefined
}

/** 计算画布布局并导出拼接结果。 */
async function run() {
  if (files.value.length < 2) return ElMessage.warning('请至少添加两张图片')
  processing.value = true
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = undefined
  try {
    const blob = await stitchImages(files.value, { mode: mode.value, gap: gap.value, margin: margin.value, columns: columns.value, background: background.value, format: format.value, quality: quality.value })
    result.value = { blob, url: URL.createObjectURL(blob) }
    ElMessage.success('拼接完成')
  } catch (error) {
    ElMessage.error(friendlyError(error, '拼接失败'))
  } finally {
    processing.value = false
  }
}

onBeforeUnmount(() => { if (result.value) URL.revokeObjectURL(result.value.url) })
</script>

<template>
  <ToolPage title="图片拼接" description="免费横向、纵向或网格拼接图片，间隙、页边距和背景色均可调整。" badge="CANVAS STITCH">
    <FileDropZone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple title="拖拽要拼接的图片" hint="上传后可拖动或点击箭头调整顺序" :disabled="processing" :has-files="files.length > 0" @files="addFiles">
      <template #files><ImagePreviewGrid embedded reorderable :files="files" @remove="files.splice($event, 1)" @reorder="reorderFiles" /></template>
    </FileDropZone>
    <div class="controls-grid">
      <label>布局方式<el-select v-model="mode"><el-option label="纵向拼接" value="vertical" /><el-option label="横向拼接" value="horizontal" /><el-option label="网格拼接" value="grid" /></el-select></label>
      <label v-if="mode === 'grid'">每行列数<el-input-number v-model="columns" :min="1" :max="10" /></label>
      <label><span class="control-label"><span>页边距</span><b>{{ margin }} px</b></span><el-slider v-model="margin" :min="0" :max="100" /></label>
      <label><span class="control-label"><span>图片间隙</span><b>{{ gap }} px</b></span><el-slider v-model="gap" :min="0" :max="100" /></label>
      <label>背景颜色<el-color-picker v-model="background" /></label>
      <label>输出格式<el-select v-model="format"><el-option label="PNG" value="png" /><el-option label="JPG" value="jpeg" /><el-option label="WebP" value="webp" /></el-select></label>
    </div>
    <div class="action-bar"><el-button type="primary" size="large" :loading="processing" :disabled="files.length < 2" @click="run">生成拼接图</el-button><span>图片仅用于本次处理，不读取，不存储，不对外泄露</span></div>
    <div v-if="result" class="single-result">
      <div class="single-result-image" title="点击放大查看">
        <el-image :src="result.url" :preview-src-list="[result.url]" fit="contain" hide-on-click-modal preview-teleported />
        <span class="zoom-badge" aria-hidden="true">放大</span>
      </div>
      <el-button type="primary" @click="downloadBlob(result.blob, `stitched.${format === 'jpeg' ? 'jpg' : format}`)">下载图片</el-button>
    </div>
  </ToolPage>
</template>
