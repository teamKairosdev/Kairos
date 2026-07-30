<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Career History</p>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">경력 관리</h1>
        <p class="text-sm text-gray-500 mt-1">커리어 이력을 체계적으로 기록하고 AI 시맨틱 검색으로 찾아보세요.</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-all shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        경력 추가
      </button>
    </div>

    <!-- Semantic Search -->
    <div class="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-blue-100">
      <div class="flex items-center gap-2 mb-3">
        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <span class="text-sm font-semibold text-blue-800">AI 시맨틱 검색</span>
        <span class="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">pgvector 1536차원</span>
      </div>
      <div class="flex gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="예: React로 대용량 트래픽 처리한 경험"
          @keyup.enter="performSearch"
          class="flex-1 px-4 py-2.5 rounded-xl bg-white border border-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-xs"
        />
        <button
          @click="performSearch"
          :disabled="!searchQuery.trim() || searching"
          class="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="searching" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <span>{{ searching ? '검색 중...' : '검색' }}</span>
        </button>
      </div>

      <!-- Search Results -->
      <div v-if="searchResults" class="mt-4 space-y-2">
        <div class="flex items-center justify-between text-xs text-blue-600 font-medium mb-3">
          <span>"{{ searchResults.query }}" 검색 결과</span>
          <button @click="searchResults = null; searchQuery = ''" class="text-blue-400 hover:text-blue-600">✕ 초기화</button>
        </div>
        <div v-if="searchResults.results.length === 0" class="text-center py-4 text-sm text-gray-500">관련 경력을 찾지 못했습니다.</div>
        <div
          v-for="res in searchResults.results"
          :key="res.id"
          class="bg-white rounded-xl p-4 border border-blue-100 flex items-start justify-between gap-3"
        >
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-gray-900 truncate">{{ res.company }}</span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-600">{{ res.role }}</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed line-clamp-2">{{ res.description }}</p>
          </div>
          <div v-if="res.similarity" class="shrink-0 text-center">
            <div class="text-lg font-black" :class="similarityColor(res.similarity)">
              {{ (res.similarity * 100).toFixed(0) }}
            </div>
            <div class="text-xs text-gray-400">%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Career Timeline -->
    <div>
      <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">경력 타임라인</h2>

      <div v-if="careersList && careersList.length > 0" class="relative">
        <!-- Timeline line -->
        <div class="absolute left-[22px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-300 via-violet-200 to-gray-100"></div>

        <div class="space-y-6">
          <div v-for="(c, idx) in careersList" :key="c.id" class="relative flex gap-5">
            <!-- Timeline dot -->
            <div class="shrink-0 w-11 flex justify-center pt-0.5">
              <div class="w-5 h-5 rounded-full border-2 border-blue-400 bg-white ring-4 ring-blue-50 z-10 relative flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
            </div>

            <!-- Content card -->
            <div class="flex-1 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 hover:shadow-sm hover:border-blue-100 transition-all group">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div class="inline-block text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">{{ c.period }}</div>
                  <h3 class="text-base font-bold text-gray-900">{{ c.company }}</h3>
                  <p class="text-sm text-gray-500 font-medium">{{ c.role }}</p>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors text-xs" @click="deleteCareer(c.id)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <p class="text-sm text-gray-600 leading-relaxed">{{ c.description }}</p>

              <div v-if="c.achievements && c.achievements.length > 0" class="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">주요 성과</p>
                <ul class="space-y-1">
                  <li v-for="(a, aIdx) in c.achievements" :key="aIdx" class="flex items-start gap-2 text-xs text-gray-600">
                    <span class="mt-1 shrink-0 w-1 h-1 rounded-full bg-blue-400"></span>
                    {{ a }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
        <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="text-base font-semibold text-gray-700 mb-1">등록된 경력이 없습니다</h3>
        <p class="text-sm text-gray-400 mb-6">첫 경력을 추가하고 커리어를 체계적으로 관리하세요</p>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
        >
          경력 추가하기
        </button>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" @click.self="showCreateModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">경력 추가</h2>
            <button @click="showCreateModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">회사 <span class="text-red-400">*</span></label>
                <input v-model="form.company" type="text" placeholder="카카오" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">직무 <span class="text-red-400">*</span></label>
                <input v-model="form.role" type="text" placeholder="프론트엔드 엔지니어" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">기간</label>
              <input v-model="form.period" type="text" placeholder="2023.01 - 2026.07 (재직 중)" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">업무 내용 & 기술 스택 <span class="text-red-400">*</span></label>
              <textarea
                v-model="form.description"
                rows="4"
                placeholder="담당한 업무, 사용한 기술 스택, 주요 프로젝트를 기술해주세요. AI가 이 내용을 학습하여 시맨틱 검색에 활용합니다."
                class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button @click="showCreateModal = false" class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button
              @click="createCareer"
              :disabled="!form.company || !form.role || !form.description || creating"
              class="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="creating">저장 중...</span>
              <span v-else>저장</span>
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
const { data: careersList, refresh } = await useFetch<any[]>('/api/careers')

const showCreateModal = ref(false)
const creating = ref(false)
const searching = ref(false)
const searchQuery = ref('')
const searchResults = ref<any>(null)

const form = ref({
  company: '',
  role: '',
  period: '',
  description: '',
})

function similarityColor(sim: number) {
  if (sim >= 0.8) return 'text-emerald-600'
  if (sim >= 0.6) return 'text-blue-600'
  if (sim >= 0.4) return 'text-amber-600'
  return 'text-gray-500'
}

async function createCareer() {
  if (!form.value.company || !form.value.role || !form.value.description) return
  creating.value = true
  try {
    await $fetch('/api/careers', {
      method: 'POST',
      body: {
        company: form.value.company,
        role: form.value.role,
        period: form.value.period || '재직 중',
        description: form.value.description,
      },
    })
    showCreateModal.value = false
    form.value = { company: '', role: '', period: '', description: '' }
    await refresh()
    toast.add({ title: '경력이 추가되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '경력 등록 실패', description: err.data?.message || '오류가 발생했습니다.', color: 'red' })
  } finally {
    creating.value = false
  }
}

async function deleteCareer(id: string) {
  try {
    await $fetch(`/api/careers/${id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: '경력이 삭제되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '삭제 실패', description: err.data?.message || '오류가 발생했습니다.', color: 'red' })
  }
}

async function performSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    const res: any = await $fetch('/api/careers/search', { query: { q: searchQuery.value } })
    searchResults.value = res
  } catch (err: any) {
    toast.add({ title: '검색 실패', description: err.data?.message || '시맨틱 검색 중 오류가 발생했습니다.', color: 'red' })
  } finally {
    searching.value = false
  }
}
</script>

