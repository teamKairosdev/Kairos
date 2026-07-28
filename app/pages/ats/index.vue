<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
        <span>🎯</span> ATS 채용 공고 일치도 매칭 분석 (LLM Engine)
      </h1>
      <p class="text-xs text-gray-400 mt-1">
        지원하려는 채용 공고(JD)와 본인의 이력서를 실시간 비교분석하여 ATS 필터링 통과율과 필수 키워드를 추출합니다.
      </p>
    </div>

    <!-- ATS Form & Input -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-panel rounded-2xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span>📌</span> 채용 공고 (Job Description) 입력
        </h3>

        <UFormGroup label="지원 직무명">
          <UInput
            v-model="jobTitle"
            placeholder="예: 프론트엔드 리드 개발자"
            color="primary"
          />
        </UFormGroup>

        <UFormGroup label="채용공고 주요 요구사항 & 우대사항">
          <UTextarea
            v-model="jobDescription"
            :rows="8"
            placeholder="JD의 우대사항, 주요 자격요건 텍스트를 복사하여 붙여넣으세요..."
            color="primary"
          />
        </UFormGroup>
      </div>

      <div class="glass-panel rounded-2xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span>📑</span> 제출 이력서 텍스트 입력
        </h3>

        <UFormGroup label="본인의 이력서 텍스트">
          <UTextarea
            v-model="resumeText"
            :rows="11"
            placeholder="분석할 본인의 이력서 텍스트를 입력하거나 내 이력서에서 가져오세요..."
            color="primary"
          />
        </UFormGroup>

        <UButton
          color="primary"
          variant="solid"
          size="lg"
          class="w-full"
          :loading="loading"
          :disabled="!jobTitle || !jobDescription || !resumeText"
          label="ATS 일치도 분석 실행 ⚡"
          @click="runATSAnalysis"
        />
      </div>
    </div>

    <!-- Analysis Result Section -->
    <div v-if="result" class="glass-panel rounded-3xl p-8 border border-purple-500/30 space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <UBadge color="primary"
                  variant="soft">
            ATS Match Score
          </UBadge>
          <h2 class="text-2xl font-extrabold text-white mt-2">{{ jobTitle }} ATS 매칭 분석 결과</h2>
        </div>

        <div class="text-center md:text-right">
          <div class="text-5xl font-black gradient-text">{{ result.matchScore }}%</div>
          <div class="text-xs text-gray-400 mt-1">예상 ATS 서류 합격률</div>
        </div>
      </div>

      <!-- Breakdown Grid -->
      <div v-if="result.detailedBreakdown" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center">
          <div class="text-xs text-gray-400">기술 매칭</div>
          <div class="text-xl font-bold text-purple-400 mt-1">{{ result.detailedBreakdown.skillsScore }}%</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center">
          <div class="text-xs text-gray-400">경력 요구도</div>
          <div class="text-xl font-bold text-cyan-400 mt-1">{{ result.detailedBreakdown.experienceScore }}%</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center">
          <div class="text-xs text-gray-400">학력/자격</div>
          <div class="text-xl font-bold text-indigo-400 mt-1">{{ result.detailedBreakdown.educationScore }}%</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-center">
          <div class="text-xs text-gray-400">키워드 밀도</div>
          <div class="text-xl font-bold text-emerald-400 mt-1">{{ result.detailedBreakdown.keywordDensityScore }}%</div>
        </div>
      </div>

      <!-- Missing vs Found Keywords -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
          <div class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span>✅</span> 이력서에서 발견된 주요 ATS 키워드
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="(k, idx) in result.foundKeywords"
              :key="idx"
              color="green"
              variant="soft"
              size="xs"
            >
              {{ k }}
            </UBadge>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <div class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <span>⚠️</span> 누락된 필수 ATS 키워드 (추가 필요)
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="(k, idx) in result.missingKeywords"
              :key="idx"
              color="red"
              variant="soft"
              size="xs"
            >
              {{ k }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
        <div class="text-xs font-bold text-purple-300">💡 Kairos ATS 합격률 향상 추천 조언</div>
        <ul class="text-xs text-purple-200/80 space-y-1 list-disc list-inside">
          <li v-for="(rec, idx) in result.recommendations" :key="idx">{{ rec }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const jobTitle = ref('시니어 프론트엔드 개발자')
const jobDescription = ref(`- Nuxt.js, Vue 3, TypeScript 실무 경험 3년 이상\n- SSR / SSG 및 성능 최적화 경험\n- 상태 관리 및 REST / GraphQL API 연동\n- CI/CD 파이프라인 및 Docker 경험 우대`)
const resumeText = ref(`시니어 웹 개발자로서 Vue.js 및 TypeScript 기반 웹 애플리케이션을 다수 구축했습니다. Nuxt 프레임워크와 Tailwind CSS를 활용한 반응형 UI 구현 경험이 풍부합니다.`)
const loading = ref(false)
const result = ref<any>(null)

async function runATSAnalysis() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/ats/analyze', {
      method: 'POST',
      body: {
        jobTitle: jobTitle.value,
        jobDescription: jobDescription.value,
        resumeText: resumeText.value,
      },
    })
    result.value = res.analysis
  } catch (err: any) {
    alert('ATS 분석 중 오류가 발생했습니다.')
  } finally {
    loading.value = false
  }
}
</script>
