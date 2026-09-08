<script setup lang="ts">
defineProps<{ title: string; description: string; badge?: string }>()
</script>

<template>
  <section class="tool-page">
    <div class="tool-heading">
      <div>
        <div v-if="badge" class="eyebrow">{{ badge }}</div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="local-note"><span>!</span><strong>系统不会留存资源，为避免图片或者文件丢失，请立即下载至本地保存</strong></div>
    </div>
    <div class="workspace-card"><slot /></div>
  </section>
</template>
