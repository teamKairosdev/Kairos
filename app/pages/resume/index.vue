<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
          <span>📝</span> 이력서 생성 & 비동기 고도화 파이프라인
        </h1>
        <p class="text-xs text-gray-400 mt-1">
          Draft $\rightarrow$ Evaluate $\rightarrow$ Improve 3단계 LLM 체인을 통해 내 이력서를 완성합니다.
        </p>
      </div>

      <button
        @click="showCreateModal = true"
        class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
      >
        <span>+</span> 신규 이력서 등록
      </button>
    </div>

    <!-- Async Refinement Chain Pipeline Step Visualizer Banner -->
    <div class="glass-card rounded-2xl p-6 border border-purple-500/20">
      <h3 class="text-sm font-bold text-purple-300 uppercase tracking-wider mb-4">
        Kairos Resume Async Refinement Chain Workflow
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
          <div class="text-xs font-bold text-gray-400">STEP 01</div>
          <div class="text-sm font-bold text-white flex items-center gap-2">
            <span>📄</span> Draft Generation
          </div>
          <p class="text-xs text-gray-400">초안 작성 또는 PDF/DOCX 파싱하여 원본 텍스트 추출</p>
        </div>

        <div class="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
          <div class="text-xs font-bold text-purple-400">STEP 02</div>
          <div class="text-sm font-bold text-purple-200 flex items-center gap-2">
            <span>🔍</span> LLM Evaluation
          </div>
          <p class="text-xs text-purple-200/70">객관적 점수, 강약점 및 STAR 프레임워크 제안 분석</p>
        </div>

        <div class="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
          <div class="text-xs font-bold text-indigo-400">STEP 03</div>
          <div class="text-sm font-bold text-indigo-200 flex items-center gap-2">
            <span>✨</span> Intelligent Rewrite
          </div>
          <p class="text-xs text-indigo-200/70">정량적 성과 중심의 고도화된 이력서 재작성 완성</p>
        </div>
      </div>
    </div>

    <!-- Resume List Cards -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-white">내 이력서 목록</h2>
      
      <div v-if="resumes && resumes.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="r in resumes"
          :key="r.id"
          class="glass-panel rounded-2xl p-6 hover:border-purple-500/40 transition-all space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" :class="statusBadgeClass(r.status)">
                {{ r.status }}
              </span>
              <h3 class="text-lg font-bold text-white mt-2">{{ r.title }}</h3>
            </div>
            <div class="text-right">
              <div class="text-2xl font-extrabold gradient-text">{{ r.currentScore || 0 }}점</div>
              <div class="text-[10px] text-gray-400">완성도 점수</div>
            </div>
          </div>

          <p class="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {{ r.originalContent }}
          </p>

          <div class="pt-2 flex items-center justify-between border-t border-white/5">
            <span class="text-[11px] text-gray-500">생성일: {{ new Date(r.createdAt).toLocaleDateString() }}</span>

            <div class="flex items-center gap-2">
              <button
                @click="triggerRefine(r.id)"
                :disabled="refiningId === r.id"
                class="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold border border-purple-500/30 transition-all disabled:opacity-50"
              >
                <span v-if="refiningId === r.id">⚡ 고도화 진행 중...</span>
                <span v-else>⚡ AI 고도화 실행</span>
              </button>

              <NuxtLink
                :to="`/resume/${r.id}`"
                class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all"
              >
                상세보기
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-3">
        <div class="text-4xl">📄</div>
        <p class="text-sm">등록된 이력서가 없습니다. 신규 이력서를 등록해 보세요.</p>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-panel rounded-3xl p-8 max-w-lg w-full space-y-6 border border-white/15">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-white">신규 이력서 등록</h2>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-white">✕</button>
        </div>

        <!-- Document Parser File Upload (pdf.js + mammoth) -->
        <div class="p-4 rounded-xl bg-purple-950/30 border border-dashed border-purple-500/40 text-center space-y-2">
          <input type="file" ref="fileInput" @change="handleFileUpload" accept=".pdf,.docx,.txt" class="hidden" />
          <div class="text-2xl">📁</div>
          <div class="text-xs font-semibold text-purple-300">PDF / DOCX 이력서 파싱</div>
          <p class="text-[11px] text-gray-400">pdf.js 및 mammoth 엔진을 사용하여 텍스트를 파싱합니다.</p>
          <button
            @click="($refs.fileInput as HTMLInputElement).click()"
            type="button"
            class="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold transition-all"
          >
            파일 선택 및 자동 텍스트 추출
          </button>
        </div>

        <form @submit.prevent="createResume" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">이력서 제목</label>
            <input
              v-model="newTitle"
              type="text"
              required
              placeholder="예: 시니어 백엔드 개발자 이력서 v1"
              class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">이력서 본문</label>
            <textarea
              v-model="newContent"
              rows="6"
              required
              placeholder="경력 사항, 프로젝트 경험 및 기술 스택을 입력하세요..."
              class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-600/30"
            >
              등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: resumes, refresh } = await useFetch<any[]>('/api/resumes')
const showCreateModal = ref(false)
const newTitle = ref('')
const newContent = ref('')
const refiningId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function statusBadgeClass(status: string) {
  if (status === 'improved') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
  if (status === 'evaluating') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const formData = new FormData()
  formData.append('file', target.files[0])

  try {
    const res: any = await $fetch('/api/resumes/parse', {
      method: 'POST',
      body: formData,
    })
    newTitle.value = res.filename.replace(/\.[^/.]+$/, '')
    newContent.value = res.extractedText
  } catch (err: any) {
    alert('파일 파싱 중 오류가 발생했습니다.')
  }
}

async function createResume() {
  if (!newTitle.value || !newContent.value) return
  await $fetch('/api/resumes', {
    method: 'POST',
    body: { title: newTitle.value, originalContent: newContent.value },
  })
  showCreateModal.value = false
  newTitle.value = ''
  newContent.value = ''
  refresh()
}

async function triggerRefine(id: string) {
  refiningId.value = id
  try {
    await $fetch(`/api/resumes/${id}/refine`, { method: 'POST' })
    await refresh()
  } catch (err: any) {
    alert('AI 이력서 고도화 중 오류가 발생했습니다.')
  } finally {
    refiningId.value = null
  }
}
</script>
