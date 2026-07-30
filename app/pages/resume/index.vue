<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-fg-neutral">이력서</h1>
        <p class="text-xs text-fg-neutral-muted mt-0.5">Draft &rarr; Evaluate &rarr; Improve 3단계 LLM 체인</p>
      </div>
      <UButton color="black" variant="solid" icon="i-lucide-plus" label="신규 등록" @click="showCreateModal = true" />
    </div>

    <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
      <div class="text-xs font-medium text-fg-neutral-muted mb-4 uppercase tracking-wide">Workflow</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-lg bg-neutral-muted space-y-1.5">
          <div class="text-xs text-fg-neutral-muted">STEP 01</div>
          <div class="text-sm font-medium text-fg-neutral">Draft Generation</div>
          <p class="text-xs text-fg-neutral-muted">초안 작성 또는 PDF/DOCX 파싱</p>
        </div>
        <div class="p-4 rounded-lg bg-neutral-muted space-y-1.5">
          <div class="text-xs text-fg-neutral-muted">STEP 02</div>
          <div class="text-sm font-medium text-fg-neutral">LLM Evaluation</div>
          <p class="text-xs text-fg-neutral-muted">점수, 강약점, STAR 프레임워크 분석</p>
        </div>
        <div class="p-4 rounded-lg bg-neutral-muted space-y-1.5">
          <div class="text-xs text-fg-neutral-muted">STEP 03</div>
          <div class="text-sm font-medium text-fg-neutral">Intelligent Rewrite</div>
          <p class="text-xs text-fg-neutral-muted">성과 중심 고도화 재작성</p>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-base font-medium text-fg-neutral">내 이력서</h2>

      <div v-if="resumes && resumes.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="r in resumes" :key="r.id" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <UBadge :color="r.status === 'improved' ? 'success' : r.status === 'evaluating' ? 'warning' : 'neutral'" variant="soft" size="xs">{{ r.status }}</UBadge>
              <h3 class="text-base font-medium text-fg-neutral mt-1.5">{{ r.title }}</h3>
            </div>
            <div class="text-right">
              <div class="text-xl font-semibold text-fg-neutral">{{ r.currentScore || 0 }}</div>
              <div class="text-xs text-fg-neutral-muted">점수</div>
            </div>
          </div>
          <p class="text-xs text-fg-neutral-muted line-clamp-2">{{ r.originalContent }}</p>
          <div class="pt-2 flex items-center justify-between border-t border-stroke-neutral-muted">
            <span class="text-xs text-fg-neutral-muted">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="soft" size="xs" :loading="refiningId === r.id" label="AI 고도화" @click="triggerRefine(r.id)" />
              <NuxtLink :to="`/resume/${r.id}`" class="px-3 py-1 rounded-lg bg-neutral-muted text-fg-neutral-muted text-xs hover:bg-neutral-strong transition-colors">상세</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="rounded-xl border border-stroke-neutral-muted p-12 text-center text-fg-neutral-muted bg-neutral-muted">
        <p class="text-sm">등록된 이력서가 없습니다.</p>
      </div>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #header>
        <h2 class="text-lg font-semibold text-fg-neutral">신규 이력서 등록</h2>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="p-4 rounded-lg border border-dashed border-stroke-neutral-muted text-center space-y-2">
            <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.docx,.doc,.txt,.hwp,.hwpx" class="hidden" />
            <p class="text-xs text-fg-neutral-muted">PDF / DOCX 파일 업로드</p>
            <UButton color="neutral" variant="soft" size="xs" label="파일 선택" @click="($refs.fileInput as HTMLInputElement).click()" />
          </div>
          <UFormGroup label="제목">
            <UInput v-model="newTitle" placeholder="이력서 제목" />
          </UFormGroup>
          <UFormGroup label="본문">
            <UTextarea v-model="newContent" :rows="6" placeholder="경력, 프로젝트, 기술 스택을 입력하세요..." />
          </UFormGroup>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" label="취소" @click="showCreateModal = false" />
          <UButton color="black" variant="solid" label="등록" :disabled="!newTitle || !newContent" @click="createResume" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const { data: resumes, refresh } = await useFetch<any[]>('/api/resumes')
const showCreateModal = ref(false)
const newTitle = ref('')
const newContent = ref('')
const refiningId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const { parseResumeFile } = useDocumentParser()

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (!file) return
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    let text: string
    if (ext === 'hwp' || ext === 'hwpx') {
      const form = new FormData()
      form.append('file', file)
      const res: any = await $fetch('/api/docs/parse', { method: 'POST', body: form })
      text = res.text
    } else {
      text = await parseResumeFile(file)
    }
    newTitle.value = file.name.replace(/\.[^/.]+$/, '')
    newContent.value = text
  } catch (err: any) {
    toast.add({ title: '파일 파싱 중 오류', description: err.message || '파일을 읽는 도중 오류가 발생했습니다.', color: 'red' })
  }
}

async function createResume() {
  if (!newTitle.value || !newContent.value) return
  try {
    await $fetch('/api/resumes', { method: 'POST', body: { title: newTitle.value, originalContent: newContent.value } })
    showCreateModal.value = false
    newTitle.value = ''
    newContent.value = ''
    refresh()
  } catch (err: any) {
    toast.add({ title: '이력서 등록 실패', description: err.data?.message || '이력서 저장 중 오류가 발생했습니다.', color: 'red' })
  }
}

async function triggerRefine(id: string) {
  refiningId.value = id
  try {
    await $fetch(`/api/resumes/${id}/refine`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'AI 고도화 완료', description: '이력서 3단계 고도화가 정상 처리되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'AI 고도화 중 오류', description: err.data?.message || '고도화 처리 중 문제가 발생했습니다.', color: 'red' })
  }
  finally { refiningId.value = null }
}
</script>
