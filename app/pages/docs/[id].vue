<template>
  <div class="max-w-5xl mx-auto p-6">
    <div class="flex items-center gap-4 mb-6">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/docs" />
      <div>
        <h1 class="text-xl font-bold">{{ doc?.title || '문서 로딩 중...' }}</h1>
        <p class="text-sm text-fg-neutral-muted">{{ doc?.ext?.toUpperCase() }} · {{ formatSize(doc?.size || 0) }}</p>
      </div>
      <div class="ml-auto flex gap-2">
        <UButton color="purple" variant="outline" size="sm" icon="i-lucide-download" :to="`/api/docs/${id}`" target="_blank">
          다운로드
        </UButton>
        <UButton v-if="isHwp" color="purple" size="sm" @click="showEditor = !showEditor">
          {{ showEditor ? '닫기' : '편집기' }}
        </UButton>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20 text-fg-neutral-muted">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 mx-auto mb-3 animate-spin" />
      <p>문서를 불러오는 중...</p>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <UIcon name="i-lucide-file-x" class="w-12 h-12 mx-auto mb-3 text-fg-danger" />
      <p class="text-fg-neutral-muted mb-4">문서를 불러올 수 없습니다.</p>
      <UButton color="purple" variant="outline" to="/docs">문서 목록</UButton>
    </div>

    <div v-else-if="isHwp && showEditor" class="h-[80vh] rounded-xl overflow-hidden border border-stroke-neutral-muted flex flex-col">
      <div ref="editorContainer" class="flex-1" />
      <div v-if="editorDirty" class="p-2 bg-bg-neutral-muted border-t border-stroke-neutral-muted flex justify-end gap-2">
        <UButton color="purple" size="sm" icon="i-lucide-save" :loading="saving" @click="saveEditor">
          저장
        </UButton>
      </div>
    </div>

    <div v-else class="text-center py-20 text-fg-neutral-muted border border-dashed border-stroke-neutral-muted rounded-xl">
      <UIcon :name="fileIcon" class="w-16 h-16 mx-auto mb-4 opacity-40" />
      <p class="mb-2">문서 파일이 업로드되었습니다.</p>
      <p class="text-sm mb-4">다운로드하거나 편집기로 열어 확인하세요.</p>
      <UButton color="purple" variant="outline" size="sm" icon="i-lucide-download" :to="`/api/docs/${id}`" target="_blank">
        파일 다운로드
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { createEditor } from '@rhwp/editor'

const route = useRoute()
const id = route.params.id as string

const doc = ref<{ title: string; ext: string; size: number } | null>(null)
const loading = ref(true)
const error = ref(false)
const showEditor = ref(false)
const editorContainer = ref<HTMLElement | null>(null)
const editorInstance = ref<Awaited<ReturnType<typeof createEditor>> | null>(null)
const editorDirty = ref(false)
const saving = ref(false)
const isHwp = computed(() => doc.value?.ext === 'hwp' || doc.value?.ext === 'hwpx')

const fileIcon = computed(() => {
  const icons: Record<string, string> = { hwp: 'i-lucide-file-text', hwpx: 'i-lucide-file-text', docx: 'i-lucide-file-text', pdf: 'i-lucide-file' }
  return icons[doc.value?.ext || ''] || 'i-lucide-file'
})

onMounted(async () => {
  try {
    const meta = await $fetch<Array<{ id: string; title: string; ext: string; size: number }>>('/api/docs')
    const found = meta.find(m => m.id === id)
    if (!found) throw new Error('not found')
    doc.value = found
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

watch(showEditor, async (open) => {
  if (!open) {
    editorInstance.value?.destroy()
    editorInstance.value = null
    return
  }
  await nextTick()
  if (!editorContainer.value) return
  try {
    const editor = await createEditor(editorContainer.value)
    editorInstance.value = editor
    const resp = await fetch(`/api/docs/${id}`)
    const buffer = await resp.arrayBuffer()
    await editor.loadFile(buffer, doc.value?.title || 'document.hwp')
    editorDirty.value = false
  } catch (e) {
    console.error('[hwp editor] failed to load:', e)
  }
})

async function saveEditor() {
  const editor = editorInstance.value
  if (!editor) return
  saving.value = true
  try {
    const hwpBytes = await editor.exportHwp()
    const form = new FormData()
    form.append('file', new Blob([hwpBytes], { type: 'application/x-hwp' }), doc.value?.title || 'document.hwp')
    await $fetch('/api/docs/upload', { method: 'POST', body: form })
    await editor.notifySaved(doc.value?.title || 'document.hwp')
    editorDirty.value = false
  } catch (e) {
    console.error('[hwp editor] save failed:', e)
  } finally {
    saving.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
</script>
