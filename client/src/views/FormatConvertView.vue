<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileDropZone from '../components/FileDropZone.vue'
import ImagePreviewGrid from '../components/ImagePreviewGrid.vue'
import OutputGrid from '../components/OutputGrid.vue'
import ToolPage from '../components/ToolPage.vue'
import { BROWSER_IMAGE_LIMIT_BYTES } from '../constants'
import type { ImageFormat, OutputFile } from '../types'
import { convertImage } from '../utils/canvas'
import { downloadZip, friendlyError, revokeOutputs, validateFiles } from '../utils/files'

const files = ref<File[]>([])
const format = ref<ImageFormat>('webp')
const quality = ref(0.92)
const processing = ref(false)
const progress = ref(0)
const outputs = ref<OutputFile[]>([])

/** 校验并替换待转换图片。 */
function choose(selected: File[]) {
  const merged = [...files.value, ...selected]
  const error = validateFiles(merged, 'image', BROWSER_IMAGE_LIMIT_BYTES, 100)
  if (error) return ElMessage.error(error)
  files.value = merged
  revokeOutputs(outputs.value)
  outputs.value = []
}

/** 使用 Canvas 在 PNG/JPG/WebP 间批量转换。 */
async function run() {
  if (!files.value.length) return ElMessage.warning('请先添加图片')
  processing.value = true
  progress.value = 0
  revokeOutputs(outputs.value)
  outputs.value = []
  try {
    for (let index = 0; index < files.value.length; index += 1) {
      const source = files.value[index]
      const blob = await convertImage(source, format.value, quality.value)
      const extension = format.value === 'jpeg' ? 'jpg' : format.value
      const name = `${source.name.replace(/\.[^.]+$/, '')}.${extension}`
      outputs.value.push({ name, blob, url: URL.createObjectURL(blob) })
      progress.value = Math.round(((index + 1) / files.value.length) * 100)
    }
    ElMessage.success('格式转换完成')
  } catch (error) {
    revokeOutputs(outputs.value)
    outputs.value = []
    ElMessage.error(friendlyError(error, '格式转换失败'))
  } finally {
    processing.value = false
  }
}

onBeforeUnmount(() => revokeOutputs(outputs.value))
</script>

<template>
  <ToolPage title="格式互转" description="免费进行 PNG、JPG、WebP 互转；透明图片转 JPG 时自动填充白底。" badge="FORMAT CONVERT">
    <FileDropZone accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple title="拖拽图片到这里" hint="支持 PNG、JPG 与 WebP" :disabled="processing" :has-files="files.length > 0" @files="choose">
      <template #files><ImagePreviewGrid embedded :files="files" @remove="files.splice($event, 1)" /></template>
    </FileDropZone>
    <div class="controls-grid two">
      <label>转换为<el-segmented v-model="format" :options="[{ label: 'JPG', value: 'jpeg' }, { label: 'PNG', value: 'png' }, { label: 'WebP', value: 'webp' }]" /></label>
      <label><span class="control-label"><span>输出质量</span><b>{{ Math.round(quality * 100) }}%</b></span><el-slider v-model="quality" :min="0.3" :max="1" :step="0.05" :disabled="format === 'png'" /></label>
    </div>
    <el-progress v-if="processing" :percentage="progress" />
    <div class="action-bar"><el-button type="primary" size="large" :loading="processing" :disabled="!files.length" @click="run">开始转换</el-button><el-button v-if="outputs.length > 1" size="large" @click="downloadZip(outputs, 'converted-images.zip')">打包 ZIP</el-button><span>图片仅用于本次处理，不读取，不存储，不对外泄露</span></div>
    <OutputGrid :items="outputs" />
  </ToolPage>
</template>
