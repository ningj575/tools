<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatBytes } from '../utils/files'

const props = withDefaults(defineProps<{
  files: File[]
  removable?: boolean
  title?: string
  embedded?: boolean
}>(), {
  removable: true,
  title: '图片预览',
  embedded: false,
})

const emit = defineEmits<{ remove: [index: number] }>()
const urls = ref<string[]>([])
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
      <article v-for="(file, index) in files" :key="`${file.name}-${file.lastModified}-${index}`" class="image-preview-card">
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
          <span class="zoom-badge" aria-hidden="true">放大</span>
        </div>
        <div class="preview-meta">
          <div><strong :title="file.name">{{ file.name }}</strong><span>{{ formatBytes(file.size) }}</span></div>
          <el-button v-if="removable" text type="danger" aria-label="移除图片" @click="emit('remove', index)">移除</el-button>
        </div>
      </article>
    </div>
  </section>
</template>
