<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import imageCompression from 'browser-image-compression'
import { ElMessage } from 'element-plus'
import FileDropZone from '../components/FileDropZone.vue'
import ImagePreviewGrid from '../components/ImagePreviewGrid.vue'
import OutputGrid from '../components/OutputGrid.vue'
import ToolPage from '../components/ToolPage.vue'
import { BROWSER_IMAGE_LIMIT_BYTES, MIME_BY_FORMAT } from '../constants'
import type { ImageFormat, OutputFile } from '../types'
import { downloadZip, friendlyError, revokeOutputs, validateFiles } from '../utils/files'

const files = ref<File[]>([])
const quality = ref(0.8)
const format = ref<ImageFormat>('jpeg')
const processing = ref(false)
const progress = ref(0)
const outputs = ref<OutputFile[]>([])

/** 校验并替换待压缩图片列表。 */
function choose(selected: File[]) {
  const merged = [...files.value, ...selected]
  const error = validateFiles(merged, 'image', BROWSER_IMAGE_LIMIT_BYTES, 100)
  if (error) return ElMessage.error(error)
  files.value = merged
  revokeOutputs(outputs.value)
  outputs.value = []
}

/** 使用 browser-image-compression 顺序压缩图片以控制内存峰值。 */
async function run() {
  if (!files.value.length) return ElMessage.warning('请先添加图片')
  processing.value = true
  progress.value = 0
  revokeOutputs(outputs.value)
  outputs.value = []
  try {
    for (let index = 0; index < files.value.length; index += 1) {
      const source = files.value[index]
      const compressed = await imageCompression(source, {
        initialQuality: quality.value,
        fileType: MIME_BY_FORMAT[format.value],
        useWebWorker: true,
        alwaysKeepResolution: true,
        preserveExif: false,
        onProgress: (value) => { progress.value = Math.round(((index + value / 100) / files.value.length) * 100) },
      })
      const extension = format.value === 'jpeg' ? 'jpg' : format.value
      const name = `${source.name.replace(/\.[^.]+$/, '')}-compressed.${extension}`
      outputs.value.push({ name, blob: compressed, url: URL.createObjectURL(compressed) })
    }
    progress.value = 100
    ElMessage.success('压缩完成')
  } catch (error) {
    revokeOutputs(outputs.value)
    outputs.value = []
    ElMessage.error(friendlyError(error, '图片压缩失败'))
  } finally {
    processing.value = false
  }
}

onBeforeUnmount(() => revokeOutputs(outputs.value))
</script>

<template>
  <ToolPage title="图片压缩" description="免费调整图片质量，批量压缩图片。" badge="SMART COMPRESS">
    <FileDropZone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple title="拖拽图片到这里" hint="单张最大 40MB，最多 100 张" :disabled="processing" :has-files="files.length > 0" @files="choose">
      <template #files><ImagePreviewGrid embedded :files="files" @remove="files.splice($event, 1)" /></template>
    </FileDropZone>
    <div class="controls-grid two">
      <label>输出格式<el-select v-model="format"><el-option label="JPG" value="jpeg" /><el-option label="PNG" value="png" /><el-option label="WebP" value="webp" /></el-select></label>
      <label><span class="control-label"><span>图片质量</span><b>{{ Math.round(quality * 100) }}%</b></span><el-slider v-model="quality" :min="0.2" :max="1" :step="0.05" /></label>
    </div>
    <el-progress v-if="processing || progress" :percentage="progress" :status="progress === 100 ? 'success' : undefined" />
    <div class="action-bar"><el-button type="primary" size="large" :loading="processing" :disabled="!files.length" @click="run">开始压缩</el-button><el-button v-if="outputs.length > 1" size="large" @click="downloadZip(outputs, 'compressed-images.zip')">打包 ZIP</el-button><span>图片仅用于本次处理，不读取，不存储，不对外泄露</span></div>
    <OutputGrid :items="outputs" />
  </ToolPage>
</template>
