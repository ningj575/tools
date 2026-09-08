<script setup lang="ts">
import { computed } from 'vue'
import type { OutputFile } from '../types'
import { downloadBlob, formatBytes } from '../utils/files'

const props = defineProps<{ items: OutputFile[] }>()
const previewUrls = computed(() => props.items.map((item) => item.url))
</script>

<template>
  <div v-if="items.length" class="output-section">
    <div class="section-title"><strong>处理结果</strong><span>{{ items.length }} 个文件</span></div>
    <div class="output-grid">
      <article v-for="(item, index) in items" :key="item.name" class="output-item">
        <div class="output-thumb" title="点击放大查看">
          <el-image :src="item.url" :preview-src-list="previewUrls" :initial-index="index" fit="contain" hide-on-click-modal preview-teleported />
          <span class="zoom-badge" aria-hidden="true">放大</span>
        </div>
        <div class="output-meta"><strong>{{ item.name }}</strong><span>{{ formatBytes(item.blob.size) }}</span></div>
        <el-button plain @click="downloadBlob(item.blob, item.name)">下载</el-button>
      </article>
    </div>
  </div>
</template>
