<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  accept: string
  multiple?: boolean
  title?: string
  hint?: string
  disabled?: boolean
  hasFiles?: boolean
}>(), {
  multiple: false,
  title: '拖拽文件到这里',
  hint: '或点击选择文件',
  disabled: false,
  hasFiles: false,
})

const emit = defineEmits<{ files: [files: File[]] }>()
const inputRef = ref<HTMLInputElement>()
const dragging = ref(false)

/** 过滤空选择并将原生 FileList 转成普通数组。 */
function submit(files: FileList | null) {
  if (!files?.length || props.disabled) return
  emit('files', Array.from(files))
  if (inputRef.value) inputRef.value.value = ''
}

/** 打开系统文件选择器，供空状态和多文件“继续添加”入口复用。 */
function openPicker(): void {
  if (!props.disabled) inputRef.value?.click()
}
</script>

<template>
  <div
    class="drop-zone"
    :class="{ dragging, disabled, filled: hasFiles, multi: multiple }"
    :role="hasFiles ? undefined : 'button'"
    :tabindex="hasFiles ? undefined : 0"
    @click="!hasFiles && openPicker()"
    @keydown.enter="!hasFiles && openPicker()"
    @keydown.space.prevent="!hasFiles && openPicker()"
    @dragenter.prevent="dragging = true"
    @dragover.prevent
    @dragleave.prevent="dragging = false"
    @drop.prevent="dragging = false; submit($event.dataTransfer?.files ?? null)"
  >
    <input ref="inputRef" type="file" hidden :accept="accept" :multiple="multiple" @change="submit(($event.target as HTMLInputElement).files)" />
    <template v-if="!hasFiles">
      <div class="upload-icon">↑</div>
      <strong>{{ title }}</strong>
      <span>{{ hint }}</span>
      <slot />
    </template>
    <div v-else class="drop-zone-filled" @click.stop @keydown.stop>
      <slot name="files" />
      <button v-if="multiple" type="button" class="add-more-card" :disabled="disabled" @click="openPicker">
        <span aria-hidden="true">＋</span>
        <strong>继续添加</strong>
        <small>图片</small>
      </button>
    </div>
  </div>
</template>
