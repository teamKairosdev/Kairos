<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <p class="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Photo Studio</p>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">AI 포토스튜디오</h1>
      <p class="text-sm text-gray-500 mt-1">DALL·E 3로 커리어 프로필 이미지와 포트폴리오 비주얼을 생성하세요.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Generation Panel -->
      <div class="lg:col-span-1 space-y-4">
        <!-- Generate -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h2 class="text-sm font-semibold text-gray-700">이미지 생성</h2>
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">프롬프트</label>
            <textarea
              v-model="prompt"
              rows="4"
              placeholder="예: 전문적인 프로필 사진, 화이트 배경, 정장 착용, 자연스러운 미소"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all resize-none leading-relaxed"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">크기</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="s in sizes"
                :key="s.value"
                @click="size = s.value"
                class="py-2 rounded-xl text-xs font-medium border transition-all"
                :class="size === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'"
              >{{ s.label }}</button>
            </div>
          </div>
          <button
            @click="generateImage"
            :disabled="!prompt.trim() || generating"
            class="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="generating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            {{ generating ? '생성 중...' : '이미지 생성' }}
          </button>
        </div>

        <!-- Upload -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h2 class="text-sm font-semibold text-gray-700">이미지 업로드</h2>
          <label
            class="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            :class="selectedFile ? 'border-blue-400 bg-blue-50/50' : ''"
          >
            <input type="file" accept="image/*" @change="onFileChange" class="hidden" />
            <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            <p class="text-xs text-gray-500">{{ selectedFile ? selectedFile.name : '클릭하여 파일 선택' }}</p>
          </label>
          <button
            @click="uploadImage"
            :disabled="!selectedFile || uploading"
            class="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ uploading ? '업로드 중...' : '업로드' }}
          </button>
        </div>
      </div>

      <!-- Right: Gallery -->
      <div class="lg:col-span-2">
        <div v-if="loading" class="bg-white rounded-2xl border border-gray-100 shadow-xs p-16 flex flex-col items-center justify-center gap-3">
          <svg class="w-8 h-8 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="text-sm text-gray-400">이미지를 불러오는 중...</p>
        </div>

        <div v-else-if="images.length === 0" class="bg-white rounded-2xl border border-dashed border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <h3 class="text-sm font-semibold text-gray-600">갤러리가 비어 있습니다</h3>
          <p class="text-xs text-gray-400">왼쪽 패널에서 이미지를 생성하거나 업로드하세요</p>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="img in images"
            :key="img.id"
            class="group relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square"
          >
            <img :src="img.imageUrl" :alt="img.prompt || img.originalFileName" class="w-full h-full object-cover" />
            <!-- Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all">
              <div class="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                <p v-if="img.prompt" class="text-xs text-white/90 line-clamp-2 leading-relaxed">{{ img.prompt }}</p>
                <p v-else class="text-xs text-white/60">{{ img.originalFileName }}</p>
                <div class="flex gap-2">
                  <button @click="downloadImage(img)" class="flex-1 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg transition-colors">다운로드</button>
                  <button @click="deleteImage(img.id)" class="flex-1 py-1.5 bg-red-500/70 hover:bg-red-600/80 text-white text-xs font-medium rounded-lg transition-colors">삭제</button>
                </div>
              </div>
            </div>
            <!-- Badge -->
            <div class="absolute top-2 left-2">
              <span
                class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="img.type === 'generated' ? 'bg-blue-600 text-white' : 'bg-gray-800/70 text-white'"
              >{{ img.type === 'generated' ? 'AI' : 'UP' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const prompt = ref('')
const size = ref('1024x1024')
const sizes = [
  { label: '1:1', value: '1024x1024' },
  { label: '16:9', value: '1792x1024' },
  { label: '9:16', value: '1024x1792' },
]
const generating = ref(false)
const uploading = ref(false)
const loading = ref(true)
const selectedFile = ref<File | null>(null)
const images = ref<any[]>([])

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

async function loadImages() {
  try {
    const res = await $fetch('/api/studio/images')
    images.value = (res as any).images || []
  } catch { /* no-op */ } finally {
    loading.value = false
  }
}

async function generateImage() {
  if (!prompt.value) return
  generating.value = true
  try {
    const res: any = await $fetch('/api/studio/generate', { method: 'POST', body: { prompt: prompt.value, size: size.value } })
    images.value.unshift(res.image)
    prompt.value = ''
    toast.add({ title: '이미지가 생성되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '생성 실패', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    generating.value = false
  }
}

async function uploadImage() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', selectedFile.value)
    const res: any = await $fetch('/api/studio/upload', { method: 'POST', body: form })
    images.value.unshift(res.image)
    selectedFile.value = null
    toast.add({ title: '이미지가 업로드되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '업로드 실패', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    uploading.value = false
  }
}

async function deleteImage(id: string) {
  try {
    await $fetch(`/api/studio/images/${id}`, { method: 'DELETE' })
    images.value = images.value.filter(i => i.id !== id)
    toast.add({ title: '삭제되었습니다.', color: 'green' })
  } catch {
    toast.add({ title: '삭제 실패', color: 'red' })
  }
}

function downloadImage(img: any) {
  const a = document.createElement('a')
  a.href = img.imageUrl
  a.download = img.prompt ? `${img.prompt.slice(0, 30)}.png` : img.originalFileName || 'image.png'
  a.click()
}

onMounted(loadImages)
</script>

