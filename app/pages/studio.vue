<template>
  <div class="max-w-5xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">AI 포토스튜디오</h1>
        <p class="text-sm text-fg-neutral-muted">DALL·E 3 이미지 생성 및 편집</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Generation Panel -->
      <div class="lg:col-span-1 space-y-4">
        <UCard>
          <template #header><h2 class="font-semibold">이미지 생성</h2></template>
          <form @submit.prevent="generateImage" class="space-y-3">
            <UFormGroup label="프롬프트">
              <UTextarea v-model="prompt" placeholder="생성할 이미지를 설명해주세요..." :rows="4" />
            </UFormGroup>
            <UFormGroup label="크기">
              <USelect v-model="size" :options="sizes" />
            </UFormGroup>
            <UButton type="submit" color="purple" block :loading="generating">
              생성하기
            </UButton>
          </form>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold">이미지 업로드</h2></template>
          <form @submit.prevent="uploadImage" class="space-y-3">
            <UInput type="file" accept="image/*" @change="onFileChange" />
            <UButton type="submit" color="neutral" variant="outline" block :loading="uploading">
              업로드
            </UButton>
          </form>
        </UCard>
      </div>

      <!-- Gallery -->
      <div class="lg:col-span-2">
        <div v-if="loading" class="text-center py-20 text-fg-neutral-muted">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p>이미지를 불러오는 중...</p>
        </div>

        <div v-else-if="images.length === 0" class="text-center py-20 text-fg-neutral-muted border border-dashed border-white/10 rounded-xl">
          <UIcon name="i-lucide-image" class="w-16 h-16 mx-auto mb-4 opacity-40" />
          <p>생성하거나 업로드한 이미지가 없습니다.</p>
        </div>

        <div v-else class="grid grid-cols-2 gap-4">
          <div v-for="img in images" :key="img.id" class="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <img :src="img.imageUrl" :alt="img.prompt || img.originalFileName" class="w-full aspect-square object-cover" />
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <p v-if="img.prompt" class="text-xs text-white/80 line-clamp-2">{{ img.prompt }}</p>
              <p v-else class="text-xs text-white/60">{{ img.originalFileName }}</p>
              <div class="flex gap-2 mt-2">
                <UButton size="xs" color="white" variant="ghost" icon="i-lucide-download" @click="downloadImage(img)" />
                <UButton size="xs" color="red" variant="ghost" icon="i-lucide-trash-2" @click="deleteImage(img.id)" />
              </div>
            </div>
            <div class="absolute top-2 left-2">
              <UBadge size="xs" :color="img.type === 'generated' ? 'purple' : 'neutral'" variant="soft">
                {{ img.type === 'generated' ? 'AI' : 'UP' }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const prompt = ref('')
const size = ref('1024x1024')
const sizes = [
  { label: '1024 x 1024 (정사각형)', value: '1024x1024' },
  { label: '1792 x 1024 (가로)', value: '1792x1024' },
  { label: '1024 x 1792 (세로)', value: '1024x1792' },
]
const generating = ref(false)
const uploading = ref(false)
const loading = ref(true)

const selectedFile = ref<File | null>(null)
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

const images = ref<any[]>([])

async function loadImages() {
  try {
    const res = await $fetch('/api/studio/images')
    images.value = (res as any).images || []
  } catch {} finally {
    loading.value = false
  }
}

async function generateImage() {
  if (!prompt.value) return
  generating.value = true
  try {
    const res: any = await $fetch('/api/studio/generate', {
      method: 'POST',
      body: { prompt: prompt.value, size: size.value },
    })
    images.value.unshift(res.image)
    prompt.value = ''
    useToast().add({ title: '이미지가 생성되었습니다.', icon: 'i-lucide-check' })
  } catch (err: any) {
    useToast().add({ title: '생성 실패', description: err.data?.statusMessage || err.message, color: 'red' })
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
    useToast().add({ title: '이미지가 업로드되었습니다.', icon: 'i-lucide-check' })
  } catch (err: any) {
    useToast().add({ title: '업로드 실패', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    uploading.value = false
  }
}

async function deleteImage(id: string) {
  try {
    await $fetch(`/api/studio/images/${id}`, { method: 'DELETE' })
    images.value = images.value.filter(i => i.id !== id)
    useToast().add({ title: '삭제되었습니다.', icon: 'i-lucide-check' })
  } catch {
    useToast().add({ title: '삭제 실패', color: 'red' })
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
