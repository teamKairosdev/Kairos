<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Resume Builder</p>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">이력서 관리</h1>
        <p class="text-sm text-gray-500 mt-1">Draft → Evaluate → Improve 3단계 AI 체인으로 이력서를 고도화합니다.</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        신규 이력서 등록
      </button>
    </div>

    <!-- 3-step workflow banner -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
      <p class="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">AI Workflow</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div v-for="step in workflowSteps" :key="step.num" class="bg-white rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <div class="shrink-0 w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">{{ step.num }}</div>
          <div>
            <p class="text-xs font-bold text-gray-800">{{ step.title }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Resume grid -->
    <div>
      <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">내 이력서</h2>
      <div v-if="resumes && resumes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="r in resumes"
          :key="r.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 hover:shadow-md hover:border-blue-100 transition-all group space-y-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <span
                class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide"
                :class="{
                  'bg-emerald-50 text-emerald-600': r.status === 'improved',
                  'bg-blue-50 text-blue-600': r.status === 'evaluating',
                  'bg-gray-100 text-gray-500': !['improved','evaluating'].includes(r.status),
                }"
              >{{ r.status }}</span>
              <h3 class="text-sm font-bold text-gray-900 truncate">{{ r.title }}</h3>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-2xl font-black text-blue-600">{{ r.currentScore || 0 }}</div>
              <div class="text-[10px] text-gray-400 font-medium">점</div>
            </div>
          </div>

          <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">{{ r.originalContent }}</p>

          <div class="flex items-center justify-between pt-3 border-t border-gray-50">
            <span class="text-xs text-gray-400">{{ new Date(r.createdAt).toLocaleDateString('ko-KR') }}</span>
            <div class="flex items-center gap-2">
              <button
                @click="triggerRefine(r.id)"
                :disabled="refiningId === r.id"
                class="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <svg v-if="refiningId === r.id" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                AI 고도화
              </button>
              <NuxtLink
                :to="`/resume/${r.id}`"
                class="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >Canvas 열기</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
        <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">등록된 이력서가 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">첫 이력서를 등록하고 AI로 고도화하세요</p>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
        >이력서 등록하기</button>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm" @click.self="showCreateModal = false">
        <div class="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">신규 이력서 등록</h2>
            <button @click="showCreateModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
          </div>

          <!-- File upload -->
          <label class="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all" :class="newContent ? 'border-blue-400 bg-blue-50/50' : ''">
            <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.docx,.doc,.txt,.hwp,.hwpx" class="hidden" />
            <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            <p class="text-xs text-gray-500">PDF / DOCX / HWP 업로드</p>
            <p class="text-xs text-gray-400 mt-0.5">또는 아래에 직접 입력</p>
          </label>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1.5">제목 <span class="text-red-400">*</span></label>
              <input v-model="newTitle" type="text" placeholder="이력서 제목" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1.5">본문 <span class="text-red-400">*</span></label>
              <textarea v-model="newContent" rows="6" placeholder="경력, 프로젝트, 기술 스택을 입력하세요..." class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none leading-relaxed"></textarea>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showCreateModal = false" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button @click="createResume" :disabled="!newTitle || !newContent" class="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">등록</button>
          </div>
        </div>
      </div>
    </Teleport>
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

const workflowSteps = [
  { num: '01', title: 'Draft Generation', desc: '초안 작성 또는 PDF/DOCX 파싱' },
  { num: '02', title: 'LLM Evaluation', desc: '점수, 강약점, STAR 프레임워크 분석' },
  { num: '03', title: 'Intelligent Rewrite', desc: '성과 중심 고도화 재작성' },
]

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
    toast.add({ title: '파일이 성공적으로 로드되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '파일 파싱 오류', description: err.message || '파일 읽기 오류', color: 'red' })
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
    toast.add({ title: '이력서가 등록되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '이력서 등록 실패', description: err.data?.message || '저장 오류', color: 'red' })
  }
}

async function triggerRefine(id: string) {
  refiningId.value = id
  try {
    await $fetch(`/api/resumes/${id}/refine`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'AI 고도화 완료', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'AI 고도화 오류', description: err.data?.message || '오류 발생', color: 'red' })
  } finally {
    refiningId.value = null
  }
}
</script>

