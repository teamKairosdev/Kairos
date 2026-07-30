<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Document Vault</p>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">문서 보관함</h1>
        <p class="text-sm text-gray-500 mt-1">HWP, PDF, DOCX 파일을 안전하게 보관하고 AI로 분석합니다.</p>
      </div>
      <button
        @click="showUpload = true"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
        문서 업로드
      </button>
    </div>

    <!-- File list -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <!-- Empty state -->
      <div v-if="files.length === 0" class="p-16 text-center">
        <div class="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">업로드된 문서가 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">이력서, 자소서, 포트폴리오 등을 업로드하세요</p>
        <button @click="showUpload = true" class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all">
          첫 문서 업로드
        </button>
      </div>

      <!-- File items -->
      <div v-else class="divide-y divide-gray-50">
        <div
          v-for="f in files"
          :key="f.id"
          class="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
        >
          <!-- File type icon -->
          <div class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold" :class="fileIconBg(f.ext)">
            {{ fileEmoji(f.ext) }}
          </div>

          <!-- File info -->
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/docs/${f.id}`" class="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block">
              {{ f.name }}
            </NuxtLink>
            <p class="text-xs text-gray-400 mt-0.5">{{ f.ext.toUpperCase() }} · {{ formatSize(f.size) }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <NuxtLink :to="`/docs/${f.id}`" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </NuxtLink>
            <button @click="deleteFile(f.id)" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div v-if="showUpload" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm" @click.self="showUpload = false">
        <div class="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">문서 업로드</h2>
            <button @click="showUpload = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
          </div>

          <label class="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-orange-300 hover:bg-orange-50/20 transition-all" :class="selectedFile ? 'border-orange-400 bg-orange-50/40' : ''">
            <input ref="fileInput" type="file" accept=".hwp,.hwpx,.docx,.doc,.pdf" class="hidden" @change="onFileSelect" />
            <span class="text-3xl mb-2">📄</span>
            <p class="text-sm font-semibold text-gray-600">{{ selectedFile ? selectedFile.name : '클릭하여 파일 선택' }}</p>
            <p class="text-xs text-gray-400 mt-1">HWP, HWPX, DOCX, PDF 지원</p>
          </label>

          <div v-if="selectedFile">
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">제목</label>
            <input v-model="docTitle" type="text" :placeholder="selectedFile.name.replace(/\.[^.]+$/, '')" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all" />
          </div>

          <div class="flex gap-3">
            <button @click="showUpload = false" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button @click="uploadFile" :disabled="!selectedFile || uploading" class="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
              {{ uploading ? '업로드 중...' : '업로드' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
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
    toast.add({ title: '문서가 업로드되었습니다.', color: 'green' })
    await loadFiles()
  } catch {
    toast.add({ title: '업로드 실패', color: 'red' })
  } finally {
    uploading.value = false
  }
}

async function deleteFile(id: string) {
  try {
    await $fetch(`/api/docs/${id}`, { method: 'DELETE' })
    toast.add({ title: '문서가 삭제되었습니다.', color: 'green' })
    await loadFiles()
  } catch {
    toast.add({ title: '삭제 실패', color: 'red' })
  }
}

function fileEmoji(ext: string) {
  return { hwp: '📝', hwpx: '📝', docx: '📄', doc: '📄', pdf: '📕' }[ext] || '📄'
}
function fileIconBg(ext: string) {
  return { hwp: 'bg-blue-50', hwpx: 'bg-blue-50', docx: 'bg-blue-50', doc: 'bg-blue-50', pdf: 'bg-red-50' }[ext] || 'bg-gray-50'
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
</script>

