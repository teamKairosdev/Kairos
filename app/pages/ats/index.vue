<template>
  <div class="max-w-6xl mx-auto py-10 space-y-10 px-4 pb-20">
    <!-- Header -->
    <div class="pb-6 border-b border-slate-100">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">AI ATS 적합성 매칭</h1>
      <p class="text-sm font-medium text-slate-400 mt-2">채용 공고(JD)의 요구 스택 및 우대사항을 AI 기반으로 파싱하여 이력서와의 직무 적합률을 분석합니다.</p>
    </div>

    <!-- Inputs Group -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- JD Input Card -->
      <div class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-50">
          <UIcon name="i-lucide-briefcase" class="w-5 h-5 text-blue-600" />
          <h3 class="text-base font-bold text-slate-800">채용 정보 (Job Description)</h3>
        </div>

        <UFormGroup label="직무명">
          <UInput v-model="jobTitle" size="md" placeholder="예: 시니어 프론트엔드 개발자" class="w-full" />
        </UFormGroup>

        <UFormGroup label="자격요건 및 요구 스택">
          <UTextarea v-model="jobDescription" :rows="10" placeholder="채용공고의 자격요건, 우대사항 등 본문을 여기에 붙여넣으세요..." class="w-full font-mono text-sm leading-relaxed" />
        </UFormGroup>
      </div>

      <!-- Resume Selection & Input Card -->
      <div class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 flex flex-col justify-between">
        <div class="space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-55">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-blue-600" />
              <h3 class="text-base font-bold text-slate-800">대상 이력서 선택</h3>
            </div>
            <span class="text-[10px] text-blue-600 font-bold uppercase">Database Sync</span>
          </div>

          <!-- Resume Select Dropdown -->
          <UFormGroup label="작성한 이력서 불러오기">
            <USelect
              v-model="selectedResumeId"
              :options="resumeOptions"
              placeholder="분석할 이력서를 선택해 주세요"
              size="md"
              class="w-full"
            />
          </UFormGroup>

          <UFormGroup label="이력서 텍스트 직접 입력/수정">
            <UTextarea
              v-model="resumeText"
              :rows="8"
              placeholder="이력서 목록에서 선택하거나, 여기에 이력서 텍스트를 직접 입력하세요..."
              class="w-full font-mono text-sm leading-relaxed"
            />
          </UFormGroup>
        </div>

        <div class="pt-4">
          <UButton
            color="blue"
            variant="solid"
            size="lg"
            block
            :loading="loading"
            :disabled="!jobTitle || !jobDescription || !resumeText"
            label="ATS 적합성 평가 실행"
            @click="runATSAnalysis"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl hover:shadow-lg hover:shadow-blue-100 transition-all duration-200"
          />
        </div>
      </div>
    </div>

    <!-- Analysis Results Card -->
    <div v-if="result" class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-md shadow-slate-100/50 space-y-8 relative overflow-hidden">
      <!-- Subtle top decorative gradient -->
      <div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />

      <!-- Overall score indicator -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div class="space-y-1 text-center md:text-left">
          <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">분석 레포트</span>
          <h2 class="text-2xl font-extrabold text-slate-800 mt-2">{{ jobTitle }} 적합도 결과</h2>
        </div>
        <div class="flex items-center gap-4 bg-slate-50/60 border border-slate-100 rounded-2xl px-6 py-4">
          <div class="text-center md:text-right">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">최종 매칭률</div>
            <div class="text-4xl font-black text-blue-600 mt-1">{{ result.matchScore }}<span class="text-lg font-medium text-slate-400 ml-0.5">%</span></div>
          </div>
        </div>
      </div>

      <!-- Grid Breakdown Scores -->
      <div v-if="result.detailedBreakdown" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">기술 스택 매칭</div>
          <div class="text-2xl font-extrabold text-slate-850">{{ result.detailedBreakdown.skillsScore }}%</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">요구 경력 충족</div>
          <div class="text-2xl font-extrabold text-slate-850">{{ result.detailedBreakdown.experienceScore }}%</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">학력 사항 부합</div>
          <div class="text-2xl font-extrabold text-slate-850">{{ result.detailedBreakdown.educationScore }}%</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">키워드 밀도 지수</div>
          <div class="text-2xl font-extrabold text-slate-850">{{ result.detailedBreakdown.keywordDensityScore }}%</div>
        </div>
      </div>

      <!-- Keyword Analysis -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-6 rounded-2xl bg-green-50/20 border border-green-100/50 space-y-4">
          <div class="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-green-600 rounded-full" />
            이력서 내 감지된 매칭 키워드 (Found)
          </div>
          <div v-if="result.foundKeywords && result.foundKeywords.length > 0" class="flex flex-wrap gap-2">
            <span v-for="(k, idx) in result.foundKeywords" :key="idx" class="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-100/80 rounded-xl">
              {{ k }}
            </span>
          </div>
          <p v-else class="text-xs text-slate-400">매칭된 키워드가 존재하지 않습니다.</p>
        </div>

        <div class="p-6 rounded-2xl bg-red-50/20 border border-red-100/50 space-y-4">
          <div class="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-red-600 rounded-full" />
            우대 요구사항 내 누락된 키워드 (Missing)
          </div>
          <div v-if="result.missingKeywords && result.missingKeywords.length > 0" class="flex flex-wrap gap-2">
            <span v-for="(k, idx) in result.missingKeywords" :key="idx" class="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-100/80 rounded-xl">
              {{ k }}
            </span>
          </div>
          <p v-else class="text-xs text-slate-400">누락된 필수 키워드가 없습니다.</p>
        </div>
      </div>

      <!-- Actionable recommendations -->
      <div class="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          💡 ATS 매칭률 향상을 위한 기재 개선 제언
        </div>
        <ul class="text-xs text-slate-650 space-y-2 list-disc list-inside">
          <li v-for="(rec, idx) in result.recommendations" :key="idx" class="leading-relaxed">
            {{ rec }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

definePageMeta({ middleware: 'auth' })

const toast = useToast()

const jobTitle = ref('시니어 프론트엔드 개발자')
const jobDescription = ref('- Nuxt.js, Vue 3, TypeScript 실무 경험 3년 이상\n- SSR / SSG 및 성능 최적화 경험\n- CI/CD 파이프라인 및 Docker 경험 우대')
const resumeText = ref('')
const loading = ref(false)
const result = ref<any>(null)

// 1. 기존 DB에 저장된 이력서 목록조회
const { data: resumes } = await useFetch<any[]>('/api/resumes')
const selectedResumeId = ref('')

// 드롭다운 옵션 바인딩
const resumeOptions = computed(() => {
  if (!resumes.value) return []
  return resumes.value.map(r => ({
    label: r.title,
    value: r.id
  }))
})

// 이력서 선택 시 텍스트 영역에 본문 자동 주입
watch(selectedResumeId, (newId) => {
  const target = resumes.value?.find(r => r.id === newId)
  if (target) {
    resumeText.value = target.originalContent || ''
  }
})

// 2. 실서비스 ATS 분석 실행
async function runATSAnalysis() {
  loading.value = true
  result.value = null
  try {
    const res: any = await $fetch('/api/ats/analyze', {
      method: 'POST',
      body: {
        jobTitle: jobTitle.value,
        jobDescription: jobDescription.value,
        resumeText: resumeText.value,
        resumeId: selectedResumeId.value || null
      }
    })
    result.value = res.analysis
    toast.add({ title: 'ATS 매칭 분석 완료', description: '요구 스택 분석 레포트가 하단에 작성되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'ATS 분석 실패', description: err.data?.message || '서버 분석 중 오류가 발생했습니다.', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>

