<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
          <span>🔍</span> 경력 포트폴리오 & pgvector 시맨틱 검색
        </h1>
        <p class="text-xs text-gray-400 mt-1">
          저장된 경력 이력과 프로젝트 성과를 1536 차원 고성능 pgvector 벡터 검색으로 자유롭게 탐색하세요.
        </p>
      </div>

      <button
        @click="showCreateModal = true"
        class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
      >
        <span>+</span> 신규 경력 등록 (임베딩 자동 생성)
      </button>
    </div>

    <!-- pgvector Semantic Search Bar Panel -->
    <div class="glass-panel rounded-2xl p-6 space-y-4 border border-cyan-500/20">
      <h3 class="text-sm font-bold text-cyan-300 flex items-center gap-2">
        <span>⚡</span> pgvector 1536-dim Cosine Similarity Semantic Search
      </h3>

      <div class="flex items-center gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="예: 백엔드 노드 노하우나 pgvector 데이터베이스 검색..."
          @keyup.enter="performSearch"
          class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
        />
        <button
          @click="performSearch"
          :disabled="searching || !searchQuery.trim()"
          class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50"
        >
          <span v-if="searching">검색 중...</span>
          <span v-else>벡터 검색 ⚡</span>
        </button>
      </div>

      <!-- Search Results -->
      <div v-if="searchResults" class="pt-4 border-t border-white/10 space-y-3">
        <div class="text-xs font-bold text-gray-300 flex items-center justify-between">
          <span>"{{ searchResults.query }}" 시맨틱 검색 결과</span>
          <span class="text-cyan-400">{{ searchResults.results.length }} 건 발견</span>
        </div>

        <div v-for="res in searchResults.results" :key="res.id" class="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-white">{{ res.company }} · {{ res.role }}</span>
            <span v-if="res.similarity" class="text-xs font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
              유사도: {{ (res.similarity * 100).toFixed(1) }}%
            </span>
          </div>
          <p class="text-xs text-gray-300">{{ res.description }}</p>
        </div>
      </div>
    </div>

    <!-- Career Items List -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-white">등록된 경력 항목</h2>

      <div v-if="careersList && careersList.length > 0" class="space-y-4">
        <div
          v-for="c in careersList"
          :key="c.id"
          class="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/40 transition-all"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {{ c.period }}
              </span>
              <h3 class="text-lg font-bold text-white mt-1">{{ c.company }} — <span class="text-purple-300">{{ c.role }}</span></h3>
            </div>
            <span class="text-xs text-emerald-400 font-mono">pgvector Embedded</span>
          </div>

          <p class="text-xs text-gray-300 leading-relaxed">{{ c.description }}</p>

          <div v-if="c.achievements && c.achievements.length > 0" class="pt-2 border-t border-white/5 space-y-1">
            <div class="text-[11px] font-bold text-gray-400">주요 성과:</div>
            <ul class="text-xs text-gray-300 space-y-1 list-disc list-inside">
              <li v-for="(a, aIdx) in c.achievements" :key="aIdx">{{ a }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-3">
        <div class="text-4xl">🏢</div>
        <p class="text-sm">등록된 경력이 없습니다. 경력을 추가해 보세요.</p>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div class="glass-panel rounded-3xl p-8 max-w-lg w-full space-y-6 border border-white/15">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-white">신규 경력 추가</h2>
          <button @click="showCreateModal = false" class="text-gray-400 hover:text-white">✕</button>
        </div>

        <form @submit.prevent="createCareer" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">회사명</label>
              <input
                v-model="company"
                type="text"
                required
                placeholder="예: Kairos Labs"
                class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1">직무명</label>
              <input
                v-model="role"
                type="text"
                required
                placeholder="예: Full-Stack Architect"
                class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">근무 기간</label>
            <input
              v-model="period"
              type="text"
              placeholder="예: 2023.01 - 2026.07"
              class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">주요 역량 및 역할 설명</label>
            <textarea
              v-model="description"
              rows="4"
              required
              placeholder="수행한 업무와 주요 프로그래밍 경험을 기술해 주세요..."
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
              저장 및 임베딩 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: careersList, refresh } = await useFetch<any[]>('/api/careers')
const showCreateModal = ref(false)
const company = ref('')
const role = ref('')
const period = ref('2024 - 현재')
const description = ref('')
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<any>(null)

async function createCareer() {
  if (!company.value || !role.value || !description.value) return
  await $fetch('/api/careers', {
    method: 'POST',
    body: {
      company: company.value,
      role: role.value,
      period: period.value,
      description: description.value,
    },
  })
  showCreateModal.value = false
  company.value = ''
  role.value = ''
  description.value = ''
  refresh()
}

async function performSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    const res: any = await $fetch('/api/careers/search', {
      query: { q: searchQuery.value },
    })
    searchResults.value = res
  } catch (err: any) {
    alert('검색에 실패했습니다.')
  } finally {
    searching.value = false
  }
}
</script>
