<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Mock Interview</p>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">모의 면접</h1>
        <p class="text-sm text-gray-500 mt-1">AI 면접관과 실전처럼 연습하고, 즉각적인 피드백을 받으세요.</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-all shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        새 면접 시작
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
        <p class="text-xs text-gray-400 font-medium mb-1">{{ stat.label }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Sessions grid -->
    <div>
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">면접 세션</h2>
      <div v-if="interviews && interviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <NuxtLink
          v-for="item in interviews"
          :key="item.id"
          :to="`/interview/${item.id}`"
          class="group bg-white rounded-2xl border border-gray-100 shadow-xs p-6 hover:shadow-md hover:border-blue-200 transition-all space-y-4 block"
        >
          <!-- Top row -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" :class="difficultyBg(item.difficulty)">
                {{ difficultyEmoji(item.difficulty) }}
              </div>
              <div>
                <span class="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1" :class="difficultyBadge(item.difficulty)">
                  {{ difficultyLabel(item.difficulty) }}
                </span>
                <h3 class="text-sm font-bold text-gray-900 leading-tight">{{ item.jobTitle }}</h3>
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded-lg font-medium" :class="statusBadge(item.status)">
              {{ statusLabel(item.status) }}
            </span>
          </div>

          <!-- Company -->
          <div class="flex items-center gap-1.5 text-xs text-gray-500">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            {{ item.companyName || '일반 면접' }}
          </div>

          <!-- Bottom -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-50">
            <span class="text-xs text-gray-400">{{ formatDate(item.createdAt) }}</span>
            <span class="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">입장 →</span>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
        <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">면접 세션이 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">AI와 실전 면접 연습을 시작해보세요</p>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
        >
          첫 면접 시작하기
        </button>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" @click.self="showCreateModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">새 면접 설정</h2>
            <button @click="showCreateModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">지원 직무 <span class="text-red-400">*</span></label>
              <input v-model="jobTitle" type="text" placeholder="예: 시니어 풀스택 엔지니어" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">목표 기업 <span class="text-gray-400">(선택)</span></label>
              <input v-model="companyName" type="text" placeholder="예: 카카오, 네이버, 토스" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">난이도</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="d in difficulties"
                  :key="d.value"
                  @click="difficulty = d.value"
                  class="py-2 rounded-xl text-xs font-semibold border transition-all"
                  :class="difficulty === d.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'"
                >
                  {{ d.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showCreateModal = false" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button
              @click="startSession"
              :disabled="!jobTitle.trim() || loading"
              class="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                생성 중...
              </span>
              <span v-else>면접 시작</span>
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
const router = useRouter()
const { data: interviews, refresh } = await useFetch<any[]>('/api/interviews')

const showCreateModal = ref(false)
const jobTitle = ref('')
const companyName = ref('')
const difficulty = ref('medium')
const loading = ref(false)

const difficulties = [
  { label: '주니어', value: 'junior' },
  { label: '미들', value: 'medium' },
  { label: '시니어', value: 'senior' },
]

const stats = computed(() => {
  const list = interviews.value || []
  const completed = list.filter((i: any) => i.status === 'completed').length
  const inProgress = list.filter((i: any) => i.status === 'in_progress').length
  const avgScore = completed > 0
    ? Math.round(list.filter((i: any) => i.overallScore).reduce((s: number, i: any) => s + (i.overallScore || 0), 0) / completed)
    : 0
  return [
    { label: '총 세션', value: list.length },
    { label: '완료', value: completed },
    { label: '평균 점수', value: avgScore ? avgScore + '점' : '-' },
  ]
})

function difficultyLabel(d: string) {
  return { junior: '주니어', medium: '미들', senior: '시니어' }[d] || d
}
function difficultyEmoji(d: string) {
  return { junior: '🌱', medium: '⚡', senior: '🔥' }[d] || '💼'
}
function difficultyBg(d: string) {
  return { junior: 'bg-green-50', medium: 'bg-amber-50', senior: 'bg-red-50' }[d] || 'bg-gray-50'
}
function difficultyBadge(d: string) {
  return {
    junior: 'bg-green-50 text-green-700',
    medium: 'bg-sky-50 text-sky-700',
    senior: 'bg-red-50 text-red-700',
  }[d] || 'bg-gray-100 text-gray-600'
}
function statusLabel(s: string) {
  return { in_progress: '진행 중', completed: '완료', paused: '일시정지' }[s] || s
}
function statusBadge(s: string) {
  return {
    in_progress: 'bg-blue-50 text-blue-600',
    completed: 'bg-gray-100 text-gray-500',
    paused: 'bg-slate-50 text-slate-500',
  }[s] || 'bg-gray-100 text-gray-500'
}
function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function startSession() {
  if (!jobTitle.value.trim() || loading.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/interviews', {
      method: 'POST',
      body: { jobTitle: jobTitle.value, companyName: companyName.value, difficulty: difficulty.value },
    })
    router.push(`/interview/${res.session.id}`)
  } catch (err: any) {
    toast.add({ title: '면접 생성 실패', description: err.data?.message || '오류가 발생했습니다.', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>

