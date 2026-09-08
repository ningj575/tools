<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
    <footer class="site-footer">© 2026 Xinglu Tools. All rights reserved.</footer>
  </div>
</template>
