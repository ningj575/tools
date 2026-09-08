<script setup lang="ts">
import { formatBytes } from '../utils/files'

defineProps<{ files: File[] }>()
const emit = defineEmits<{ remove: [index: number] }>()
</script>

<template>
  <div v-if="files.length" class="file-list">
    <div v-for="(file, index) in files" :key="`${file.name}-${file.lastModified}`" class="file-row">
      <div class="file-type">{{ file.name.split('.').pop()?.slice(0, 4).toUpperCase() }}</div>
      <div class="file-info"><strong>{{ file.name }}</strong><span>{{ formatBytes(file.size) }}</span></div>
      <el-button text type="danger" aria-label="移除文件" @click="emit('remove', index)">移除</el-button>
    </div>
  </div>
</template>
