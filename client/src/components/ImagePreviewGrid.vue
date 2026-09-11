<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatBytes } from '../utils/files'

const props = withDefaults(defineProps<{
  files: File[]
  removable?: boolean
  reorderable?: boolean
  title?: string
  embedded?: boolean
}>(), {
  removable: true,
  reorderable: false,
  title: '图片预览',
  embedded: false,
})

const emit = defineEmits<{
  remove: [index: number]
  reorder: [fromIndex: number, toIndex: number]
}>()
const urls = ref<string[]>([])
const draggingIndex = ref<number>()
const dragOverIndex = ref<number>()
const previewUrls = computed(() => urls.value)

/** 释放当前文件列表对应的对象 URL，避免替换图片后占用内存。 */
function revokePreviewUrls(): void {
  urls.value.forEach((url) => URL.revokeObjectURL(url))
  urls.value = []
}

/** 为浏览器本地文件创建缩略图 URL；文件不会因此上传。 */
function rebuildPreviewUrls(): void {
  revokePreviewUrls()
  urls.value = props.files.map((file) => URL.createObjectURL(file))
}

/** 请求父组件将图片移动到相邻或指定位置。 */
function reorder(fromIndex: number, toIndex: number): void {
  if (!props.reorderable || fromIndex === toIndex || toIndex < 0 || toIndex >= props.files.length) return
  emit('reorder', fromIndex, toIndex)
}

/** 记录桌面端拖拽的起始图片序号。 */
function startDrag(index: number, event: DragEvent): void {
  draggingIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

/** 接收拖拽排序，同时清理卡片高亮状态。 */
function dropAt(index: number, event: DragEvent): void {
  const source = draggingIndex.value ?? Number(event.dataTransfer?.getData('text/plain'))
  if (Number.isInteger(source)) reorder(source, index)
  finishDrag()
}

/** 清理桌面端拖拽状态。 */
function finishDrag(): void {
  draggingIndex.value = undefined
  dragOverIndex.value = undefined
}

watch(() => props.files, rebuildPreviewUrls, { immediate: true, deep: true })
onBeforeUnmount(revokePreviewUrls)
</script>

<template>
  <section v-if="files.length" class="preview-section" :class="{ embedded }">
    <div v-if="!embedded" class="section-title">
      <strong>{{ title }}</strong>
      <span>点击图片可放大、缩小与旋转</span>
    </div>
    <div class="image-preview-grid">
      <article
        v-for="(file, index) in files"
        :key="`${file.name}-${file.lastModified}-${file.size}`"
        class="image-preview-card"
        :class="{ dragging: draggingIndex === index, 'drag-over': dragOverIndex === index }"
        @dragenter.prevent="reorderable && (dragOverIndex = index)"
        @dragover.prevent
        @dragleave="dragOverIndex === index && (dragOverIndex = undefined)"
        @drop.prevent="dropAt(index, $event)"
      >
        <div class="preview-thumb" title="点击放大查看">
          <el-image
            :src="urls[index]"
            :preview-src-list="previewUrls"
            :initial-index="index"
            fit="contain"
            hide-on-click-modal
            preview-teleported
          >
            <template #error><span class="image-error">无法预览</span></template>
          </el-image>
          <span v-if="reorderable" class="preview-order">{{ index + 1 }}</span>
          <span class="zoom-badge" aria-hidden="true">放大</span>
        </div>
        <div class="preview-meta">
          <div><strong :title="file.name">{{ file.name }}</strong><span>{{ formatBytes(file.size) }}</span></div>
          <div class="preview-actions">
            <span
              v-if="reorderable"
              class="drag-handle"
              draggable="true"
              title="按住拖动调整顺序"
              aria-label="按住拖动调整顺序"
              @dragstart="startDrag(index, $event)"
              @dragend="finishDrag"
            >⋮⋮</span>
            <el-button v-if="reorderable" text :disabled="index === 0" :aria-label="`将第 ${index + 1} 张图片前移`" @click="reorder(index, index - 1)">←</el-button>
            <el-button v-if="reorderable" text :disabled="index === files.length - 1" :aria-label="`将第 ${index + 1} 张图片后移`" @click="reorder(index, index + 1)">→</el-button>
            <el-button v-if="removable" text type="danger" aria-label="移除图片" @click="emit('remove', index)">移除</el-button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
