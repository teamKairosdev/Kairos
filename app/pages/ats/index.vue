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

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">지원 직무명</label>
          <input
            v-model="jobTitle"
            type="text"
            placeholder="예: 프론트엔드 리드 개발자"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">채용공고 주요 요구사항 & 우대사항</label>
          <textarea
            v-model="jobDescription"
            rows="8"
            placeholder="JD의 우대사항, 주요 자격요건 텍스트를 복사하여 붙여넣으세요..."
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          ></textarea>
        </div>
      </div>

      <div class="glass-panel rounded-2xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span>📑</span> 제출 이력서 텍스트 입력
        </h3>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">본인의 이력서 텍스트</label>
          <textarea
            v-model="resumeText"
            rows="11"
            placeholder="분석할 본인의 이력서 텍스트를 입력하거나 내 이력서에서 가져오세요..."
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          ></textarea>
        </div>

        <button
          @click="runATSAnalysis"
          :disabled="loading || !jobTitle || !jobDescription || !resumeText"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
        >
          <span v-if="loading">ATS 매칭 엔진 분석 중...</span>
          <span v-else>ATS 일치도 분석 실행 ⚡</span>
        </button>
      </div>
    </div>

    <!-- Analysis Result Section -->
    <div v-if="result" class="glass-panel rounded-3xl p-8 border border-purple-500/30 space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            ATS Match Score
          </span>
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
            <span
              v-for="(k, idx) in result.foundKeywords"
              :key="idx"
              class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono"
            >
              {{ k }}
            </span>
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <div class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <span>⚠️</span> 누락된 필수 ATS 키워드 (추가 필요)
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(k, idx) in result.missingKeywords"
              :key="idx"
              class="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-mono"
            >
              {{ k }}
            </span>
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
