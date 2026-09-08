<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)
const tools = [
  { path: '/pdf-to-images', label: 'PDF 转图片' },
  { path: '/images-to-pdf', label: '图片转 PDF' },
  { path: '/stitch', label: '图片拼接' },
  { path: '/compress', label: '图片压缩' },
  { path: '/convert', label: '格式互转' },
]

/** 切换移动端导航菜单的展开状态。 */
function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

watch(() => route.path, () => { menuOpen.value = false })
</script>

<template>
  <header class="topbar">
    <div class="brand" aria-label="星路工具箱首页">
      <img class="brand-mark" src="/favicon.svg?v=3" alt="" />
      <span><strong>星路工具箱</strong><small>XINGLU TOOLS</small></span>
    </div>
    <button class="menu-toggle" type="button" aria-label="切换工具菜单" :aria-expanded="menuOpen" aria-controls="tool-navigation" @click="toggleMenu">
      <span></span><span></span><span></span>
    </button>
    <nav id="tool-navigation" class="tool-nav" :class="{ open: menuOpen }" aria-label="工具导航">
      <router-link v-for="tool in tools" :key="tool.path" :to="tool.path" :class="{ active: route.path === tool.path }">
        {{ tool.label }}
      </router-link>
    </nav>
  </header>
</template>
