<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">문서</h1>
      <UButton color="purple" @click="showUpload = true">문서 업로드</UButton>
    </div>

    <UCard>
      <div v-if="files.length === 0" class="text-center py-12 text-fg-neutral-muted">
        <UIcon name="i-lucide-file-text" class="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>업로드된 문서가 없습니다.</p>
        <UButton color="purple" variant="outline" class="mt-4" @click="showUpload = true">문서 업로드</UButton>
      </div>

      <div v-else class="divide-y divide-white/5">
        <div v-for="f in files" :key="f.id" class="flex items-center gap-4 py-4 px-2 hover:bg-white/[0.02] rounded-lg transition-colors">
          <UIcon :name="fileIcon(f.ext)" class="w-8 h-8 text-purple-400" />
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/docs/${f.id}`" class="font-medium hover:text-purple-400 transition-colors truncate block">
              {{ f.name }}
            </NuxtLink>
            <p class="text-xs text-fg-neutral-muted">{{ f.ext.toUpperCase() }} · {{ formatSize(f.size) }}</p>
          </div>
          <div class="flex gap-2">
            <UButton color="neutral" variant="ghost" icon="i-lucide-eye" size="xs" :to="`/docs/${f.id}`" />
            <UButton color="neutral" variant="ghost" icon="i-lucide-trash-2" size="xs" @click="deleteFile(f.id)" />
          </div>
        </div>
      </div>
    </UCard>

    <UModal v-model="showUpload">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">문서 업로드</h2>
        </template>
        <form @submit.prevent="uploadFile" class="space-y-4">
          <UFormGroup label="파일 선택">
            <input
              ref="fileInput"
              type="file"
              accept=".hwp,.hwpx,.docx,.doc,.pdf"
              class="block w-full text-sm text-fg-neutral-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"
              @change="onFileSelect"
            />
          </UFormGroup>
          <UFormGroup v-if="selectedFile" label="제목">
            <UInput v-model="docTitle" :placeholder="selectedFile.name.replace(/\.[^.]+$/, '')" />
          </UFormGroup>
          <div class="flex gap-2 justify-end">
            <UButton color="neutral" variant="outline" @click="showUpload = false">취소</UButton>
            <UButton type="submit" color="purple" :loading="uploading" :disabled="!selectedFile">업로드</UButton>
          </div>
        </form>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const showUpload = ref(false)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)
const docTitle = ref('')
const fileInput = ref<HTMLInputElement>()
const files = ref<Array<{ id: string; name: string; ext: string; size: number }>>([])

async function loadFiles() {
  try {
    const data: any[] = await $fetch('/api/docs')
    files.value = data.map((f: any) => ({
      id: f.id || f._id,
      name: f.name || f.title || 'Untitled',
      ext: (f.name || '').split('.').pop() || 'hwp',
      size: f.size || 0,
    }))
  } catch {
    files.value = []
  }
}

onMounted(loadFiles)

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
  if (selectedFile.value) {
    docTitle.value = selectedFile.value.name.replace(/\.[^.]+$/, '')
  }
}

async function uploadFile() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', selectedFile.value)
    form.append('title', docTitle.value || selectedFile.value.name.replace(/\.[^.]+$/, ''))
    await $fetch('/api/docs/upload', { method: 'POST', body: form })
    showUpload.value = false
    selectedFile.value = null
    docTitle.value = ''
    if (fileInput.value) fileInput.value.value = ''
    useToast().add({ title: '문서가 업로드되었습니다.', icon: 'i-lucide-check' })
    await loadFiles()
  } catch {
    useToast().add({ title: '업로드 실패', color: 'red' })
  } finally {
    uploading.value = false
  }
}

async function deleteFile(id: string) {
  try {
    await $fetch(`/api/docs/${id}`, { method: 'DELETE' })
    useToast().add({ title: '문서가 삭제되었습니다.', icon: 'i-lucide-check' })
    await loadFiles()
  } catch {
    useToast().add({ title: '삭제 실패', color: 'red' })
  }
}

function fileIcon(ext: string) {
  const icons: Record<string, string> = {
    hwp: 'i-lucide-file-text',
    hwpx: 'i-lucide-file-text',
    docx: 'i-lucide-file-text',
    doc: 'i-lucide-file-text',
    pdf: 'i-lucide-file',
  }
  return icons[ext] || 'i-lucide-file'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
</script>
