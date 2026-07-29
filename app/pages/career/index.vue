<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-fg-neutral">경력 &amp; 벡터 검색</h1>
        <p class="text-xs text-fg-neutral-muted mt-0.5">pgvector 1536차원 시맨틱 검색</p>
      </div>
      <UButton color="black" variant="solid" icon="i-lucide-plus" label="경력 등록" @click="showCreateModal = true" />
    </div>

    <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-4">
      <div class="flex items-center gap-3">
        <UInput v-model="searchQuery" placeholder="검색어를 입력하세요..." class="flex-1" @keyup.enter="performSearch" />
        <UButton color="black" variant="solid" :loading="searching" :disabled="!searchQuery.trim()" label="검색" @click="performSearch" />
      </div>

      <div v-if="searchResults" class="pt-4 border-t border-stroke-neutral-muted space-y-3">
        <div class="text-xs text-fg-neutral-muted flex items-center justify-between">
          <span>&quot;{{ searchResults.query }}&quot; 결과</span>
          <span class="text-fg-neutral">{{ searchResults.results.length }}건</span>
        </div>
        <div v-for="res in searchResults.results" :key="res.id" class="p-4 rounded-lg bg-neutral-muted space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-fg-neutral">{{ res.company }} &middot; {{ res.role }}</span>
            <UBadge v-if="res.similarity" color="neutral" variant="soft" size="xs">유사도 {{ (res.similarity * 100).toFixed(1) }}%</UBadge>
          </div>
          <p class="text-xs text-fg-neutral-muted">{{ res.description }}</p>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-base font-medium text-fg-neutral">경력 목록</h2>
      <div v-if="careersList && careersList.length > 0" class="space-y-4">
        <div v-for="c in careersList" :key="c.id" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <UBadge color="neutral" variant="soft" size="xs">{{ c.period }}</UBadge>
              <h3 class="text-base font-medium text-fg-neutral mt-1.5">{{ c.company }} &mdash; {{ c.role }}</h3>
            </div>
          </div>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">{{ c.description }}</p>
          <div v-if="c.achievements && c.achievements.length > 0" class="pt-2 border-t border-stroke-neutral-muted space-y-1">
            <div class="text-xs font-medium text-fg-neutral-muted">주요 성과</div>
            <ul class="text-xs text-fg-neutral-muted space-y-1 list-disc list-inside">
              <li v-for="(a, aIdx) in c.achievements" :key="aIdx">{{ a }}</li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else class="rounded-xl border border-stroke-neutral-muted p-12 text-center text-fg-neutral-muted bg-neutral-muted">
        <p class="text-sm">등록된 경력이 없습니다.</p>
      </div>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #header>
        <h2 class="text-lg font-semibold text-fg-neutral">경력 추가</h2>
      </template>
      <template #body>
        <form @submit.prevent="createCareer" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="회사">
              <UInput v-model="company" placeholder="회사명" />
            </UFormGroup>
            <UFormGroup label="직무">
              <UInput v-model="role" placeholder="직무명" />
            </UFormGroup>
          </div>
          <UFormGroup label="기간">
            <UInput v-model="period" placeholder="2023.01 - 2026.07" />
          </UFormGroup>
          <UFormGroup label="설명">
            <UTextarea v-model="description" :rows="4" placeholder="업무 내용과 기술 스택" />
          </UFormGroup>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" label="취소" @click="showCreateModal = false" />
          <UButton color="black" variant="solid" label="저장" :disabled="!company || !role || !description" @click="createCareer" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
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
  try {
    await $fetch('/api/careers', { method: 'POST', body: { company: company.value, role: role.value, period: period.value, description: description.value } })
    showCreateModal.value = false
    company.value = ''
    role.value = ''
    description.value = ''
    refresh()
  } catch (err: any) {
    toast.add({ title: '경력 등록 실패', description: err.data?.message || '경력 등록 중 오류가 발생했습니다.', color: 'red' })
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
  }
  finally { searching.value = false }
}
</script>
