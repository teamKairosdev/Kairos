<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-xl font-semibold text-fg-neutral">ATS 매칭 분석</h1>
      <p class="text-xs text-fg-neutral-muted mt-0.5">JD와 이력서를 비교하여 ATS 통과율과 키워드를 분석합니다</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-4">
        <h3 class="text-sm font-medium text-fg-neutral">채용 공고</h3>
        <UFormGroup label="직무명">
          <UInput v-model="jobTitle" placeholder="예: 프론트엔드 리드 개발자" />
        </UFormGroup>
        <UFormGroup label="요구사항">
          <UTextarea v-model="jobDescription" :rows="8" placeholder="JD를 붙여넣으세요..." />
        </UFormGroup>
      </div>

      <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-4">
        <h3 class="text-sm font-medium text-fg-neutral">이력서</h3>
        <UFormGroup label="이력서 텍스트">
          <UTextarea v-model="resumeText" :rows="11" placeholder="이력서 텍스트를 입력하세요..." />
        </UFormGroup>
        <UButton color="black" variant="solid" size="lg" class="w-full" :loading="loading" :disabled="!jobTitle || !jobDescription || !resumeText" label="분석 실행" @click="runATSAnalysis" />
      </div>
    </div>

    <div v-if="result" class="rounded-xl border border-stroke-neutral-muted p-8 bg-neutral-muted space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-stroke-neutral-muted pb-6">
        <div>
          <div class="text-xs font-medium text-fg-neutral-muted mb-1">ATS Match</div>
          <h2 class="text-xl font-semibold text-fg-neutral">{{ jobTitle }}</h2>
        </div>
        <div class="text-center md:text-right">
          <div class="text-4xl font-semibold text-fg-neutral">{{ result.matchScore }}%</div>
          <div class="text-xs text-fg-neutral-muted mt-0.5">예상 합격률</div>
        </div>
      </div>

      <div v-if="result.detailedBreakdown" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-lg bg-neutral-muted text-center">
          <div class="text-xs text-fg-neutral-muted">기술</div>
          <div class="text-lg font-medium text-fg-neutral mt-0.5">{{ result.detailedBreakdown.skillsScore }}%</div>
        </div>
        <div class="p-4 rounded-lg bg-neutral-muted text-center">
          <div class="text-xs text-fg-neutral-muted">경력</div>
          <div class="text-lg font-medium text-fg-neutral mt-0.5">{{ result.detailedBreakdown.experienceScore }}%</div>
        </div>
        <div class="p-4 rounded-lg bg-neutral-muted text-center">
          <div class="text-xs text-fg-neutral-muted">학력</div>
          <div class="text-lg font-medium text-fg-neutral mt-0.5">{{ result.detailedBreakdown.educationScore }}%</div>
        </div>
        <div class="p-4 rounded-lg bg-neutral-muted text-center">
          <div class="text-xs text-fg-neutral-muted">키워드</div>
          <div class="text-lg font-medium text-fg-neutral mt-0.5">{{ result.detailedBreakdown.keywordDensityScore }}%</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-5 rounded-lg bg-neutral-muted space-y-3">
          <div class="text-xs font-medium text-fg-success">발견된 키워드</div>
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="(k, idx) in result.foundKeywords" :key="idx" color="green" variant="soft" size="xs">{{ k }}</UBadge>
          </div>
        </div>
        <div class="p-5 rounded-lg bg-neutral-muted space-y-3">
          <div class="text-xs font-medium text-fg-danger">누락된 키워드</div>
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="(k, idx) in result.missingKeywords" :key="idx" color="red" variant="soft" size="xs">{{ k }}</UBadge>
          </div>
        </div>
      </div>

      <div class="p-5 rounded-lg bg-neutral-muted space-y-2">
        <div class="text-xs font-medium text-fg-neutral-muted">추천 조언</div>
        <ul class="text-xs text-fg-neutral-muted space-y-1 list-disc list-inside">
          <li v-for="(rec, idx) in result.recommendations" :key="idx">{{ rec }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const jobTitle = ref('시니어 프론트엔드 개발자')
const jobDescription = ref('- Nuxt.js, Vue 3, TypeScript 실무 경험 3년 이상\n- SSR / SSG 및 성능 최적화 경험\n- CI/CD 파이프라인 및 Docker 경험 우대')
const resumeText = ref('시니어 웹 개발자로서 Vue.js 및 TypeScript 기반 웹 애플리케이션을 다수 구축했습니다.')
const loading = ref(false)
const result = ref<any>(null)

async function runATSAnalysis() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/ats/analyze', { method: 'POST', body: { jobTitle: jobTitle.value, jobDescription: jobDescription.value, resumeText: resumeText.value } })
    result.value = res.analysis
  } catch (err: any) {
    toast.add({ title: 'ATS 분석 실패', description: err.data?.message || '분석 중 오류가 발생했습니다.', color: 'red' })
  }
  finally { loading.value = false }
}
</script>
