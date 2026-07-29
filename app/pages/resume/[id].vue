<template>
  <div v-if="data" class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/resume" class="text-xs text-purple-400 hover:underline mb-2 inline-block">
          &larr; 이력서 목록으로 돌아가기
        </NuxtLink>
        <h1 class="text-2xl font-extrabold text-white">{{ data.resume.title }}</h1>
      </div>
      <div class="text-right">
        <div class="text-3xl font-extrabold gradient-text">{{ data.resume.currentScore || 85 }}점</div>
        <div class="text-xs text-gray-400">현재 평가 점수</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/10 w-fit">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeTab === tab.key ? 'bg-purple-600/40 text-purple-200 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200'"
      >{{ tab.label }}</button>
    </div>

    <!-- Tab: Evaluation -->
    <div v-if="activeTab === 'evaluate'" class="space-y-6">
      <div class="glass-panel rounded-2xl p-6 space-y-4 border border-cyan-500/20">
        <h2 class="text-sm font-bold text-white">기업 맞춤 평가</h2>
        <div class="flex items-center gap-3">
          <USelect v-model="selectedCompanyId"
            class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500">
            <option :value="null">목표 기업 선택</option>
            <option v-for="c in companyList" :key="c.id" :value="c.id">{{ c.name }}</option>
          </USelect>
          <UButton color="primary" variant="solid" size="sm" :loading="evaluating" :disabled="!selectedCompanyId" @click="runCompanyEvaluation">평가 실행</UButton>
        </div>
        <div v-if="evalResult" class="pt-2 border-t border-white/10 space-y-3">
          <div class="flex items-center gap-4">
            <div class="text-3xl font-black text-cyan-400">{{ evalResult.matchScore }}%</div>
            <div class="text-xs text-gray-300 leading-relaxed">{{ evalResult.aiSummary }}</div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div v-for="b in breakdowns" :key="b.key" class="p-2 rounded-lg bg-slate-900/60 border border-white/10">
              <div class="text-[11px] text-gray-400">{{ b.label }}</div>
              <div class="text-sm font-bold" :class="b.color">{{ b.value }}%</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div class="font-bold text-emerald-400">강점</div>
              <ul class="text-emerald-200/80 space-y-0.5 list-disc list-inside mt-1">
                <li v-for="s in evalResult.strengths" :key="s">{{ s }}</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <div class="font-bold text-rose-400">보강 필요</div>
              <ul class="text-rose-200/80 space-y-0.5 list-disc list-inside mt-1">
                <li v-for="g in evalResult.gaps" :key="g">{{ g }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div v-if="data.refinementHistory && data.refinementHistory.length > 0" class="space-y-4">
        <h2 class="text-lg font-bold text-white">AI 평가 및 개선 결과</h2>
        <div v-for="ref in data.refinementHistory" :key="ref.id" class="glass-panel rounded-2xl p-6 space-y-4">
          <div class="flex items-center gap-2 border-b border-white/10 pb-3">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase"
              :class="ref.step === 'evaluate' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'"
            >{{ ref.step === 'evaluate' ? '평가' : '개선' }}</span>
            <span class="text-xs text-gray-400">{{ ref.score }}점</span>
          </div>
          <div v-if="ref.evaluationFeedback" class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div class="font-bold text-emerald-400">강점</div>
              <ul class="text-emerald-200/80 space-y-0.5 list-disc list-inside mt-1">
                <li v-for="s in ref.evaluationFeedback.strengths" :key="s">{{ s }}</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <div class="font-bold text-rose-400">약점</div>
              <ul class="text-rose-200/80 space-y-0.5 list-disc list-inside mt-1">
                <li v-for="w in ref.evaluationFeedback.weaknesses" :key="w">{{ w }}</li>
              </ul>
            </div>
          </div>
          <div v-if="ref.improvedContent" class="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
            {{ ref.improvedContent }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Compare -->
    <div v-if="activeTab === 'compare'" class="glass-panel rounded-2xl p-6 space-y-4">
      <h2 class="text-sm font-bold text-white">이력서 비교</h2>
      <p class="text-xs text-gray-400">다른 이력서를 선택하여 현재 이력서와 비교 분석합니다.</p>
      <div class="flex items-center gap-3">
        <USelect v-model="compareTargetId"
          class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">
          <option :value="null">비교할 이력서 선택</option>
          <option v-for="r in otherResumes" :key="r.id" :value="r.id">{{ r.title }} ({{ r.currentScore }}점)</option>
        </USelect>
        <UButton color="primary" variant="solid" size="sm" :loading="comparing" :disabled="!compareTargetId" @click="runCompare">비교 실행</UButton>
      </div>
      <div v-if="compareResult" class="pt-4 border-t border-white/10 space-y-4">
        <div class="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-gray-300">{{ compareResult.summary }}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <div class="text-xs font-bold text-cyan-400 mb-1">현재 이력서만의 강점</div>
              <ul class="text-xs text-cyan-200/80 space-y-0.5 list-disc list-inside">
                <li v-for="s in compareResult.uniqueToFirst" :key="s">{{ s }}</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
              <div class="text-xs font-bold text-amber-400 mb-1">현재 이력서 보완점</div>
              <ul class="text-xs text-amber-200/80 space-y-0.5 list-disc list-inside">
                <li v-for="s in compareResult.firstImprovements" :key="s">{{ s }}</li>
              </ul>
            </div>
          </div>
          <div class="space-y-3">
            <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div class="text-xs font-bold text-emerald-400 mb-1">선택한 이력서만의 강점</div>
              <ul class="text-xs text-emerald-200/80 space-y-0.5 list-disc list-inside">
                <li v-for="s in compareResult.uniqueToSecond" :key="s">{{ s }}</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <div class="text-xs font-bold text-rose-400 mb-1">선택한 이력서 보완점</div>
              <ul class="text-xs text-rose-200/80 space-y-0.5 list-disc list-inside">
                <li v-for="s in compareResult.secondImprovements" :key="s">{{ s }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Merge -->
    <div v-if="activeTab === 'merge'" class="glass-panel rounded-2xl p-6 space-y-4">
      <h2 class="text-sm font-bold text-white">이력서 병합</h2>
      <p class="text-xs text-gray-400">다른 이력서의 장점을 현재 이력서에 결합하여 더 나은 버전을 만듭니다.</p>
      <div class="flex items-center gap-3">
        <USelect v-model="mergeTargetId"
          class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">
          <option :value="null">병합할 이력서 선택</option>
          <option v-for="r in otherResumes" :key="r.id" :value="r.id">{{ r.title }} ({{ r.currentScore }}점)</option>
        </USelect>
        <UButton color="primary" variant="solid" size="sm" :loading="merging" :disabled="!mergeTargetId" @click="runMerge">병합 실행</UButton>
      </div>
      <div v-if="mergeResult" class="pt-4 border-t border-white/10 space-y-4">
        <div class="flex items-center gap-3">
          <div class="text-2xl font-black text-purple-400">{{ mergeResult.estimatedScore }}점</div>
          <div class="text-xs text-gray-400">예상 병합 완성도</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
          {{ mergeResult.mergedContent }}
        </div>
        <div v-if="mergeResult.keyChanges" class="p-3 rounded-xl bg-slate-900/60 border border-white/10">
          <div class="text-xs font-bold text-gray-300 mb-1">주요 변경 사항</div>
          <ul class="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
            <li v-for="c in mergeResult.keyChanges" :key="c">{{ c }}</li>
          </ul>
        </div>
        <div class="flex justify-end">
          <UButton color="primary" variant="solid" size="sm" @click="saveMergedResume">
            병합본을 새 이력서로 저장
          </UButton>
        </div>
      </div>
    </div>

    <!-- Original Draft -->
    <div class="glass-card rounded-2xl p-6">
      <h3 class="text-sm font-bold text-gray-300 mb-3">원본 이력서</h3>
      <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
        {{ data.resume.originalContent }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch<any>(`/api/resumes/${route.params.id}`)
const { data: allResumes } = await useFetch<any[]>('/api/resumes')
const { data: companyList } = await useFetch<any[]>('/api/companies')

const activeTab = ref('evaluate')
const tabs = [
  { key: 'evaluate', label: '기업 평가' },
  { key: 'compare', label: '이력서 비교' },
  { key: 'merge', label: '이력서 병합' },
]

const otherResumes = computed(() => (allResumes.value || []).filter(r => r.id !== route.params.id))

// Evaluation
const selectedCompanyId = ref<string | null>(null)
const evaluating = ref(false)
const evalResult = ref<any>(null)
const breakdowns = computed(() => {
  if (!evalResult.value?.breakdown) return []
  const b = evalResult.value.breakdown
  return [
    { key: 'techFit', label: '기술', value: b.techFit, color: 'text-cyan-400' },
    { key: 'cultureFit', label: '문화', value: b.cultureFit, color: 'text-purple-400' },
    { key: 'experienceFit', label: '경험', value: b.experienceFit, color: 'text-amber-400' },
    { key: 'overallFit', label: '종합', value: b.overallFit, color: 'text-emerald-400' },
  ]
})
async function runCompanyEvaluation() {
  if (!selectedCompanyId.value) return
  evaluating.value = true
  try {
    const res: any = await $fetch('/api/companies/evaluate', { method: 'POST', body: { resumeId: route.params.id, companyId: selectedCompanyId.value } })
    evalResult.value = res.evaluation
  } catch { alert('기업 평가 중 오류가 발생했습니다.') }
  finally { evaluating.value = false }
}

// Compare
const compareTargetId = ref<string | null>(null)
const comparing = ref(false)
const compareResult = ref<any>(null)
async function runCompare() {
  if (!compareTargetId.value) return
  comparing.value = true
  try {
    const res: any = await $fetch('/api/resumes/compare', { method: 'POST', body: { resumeId1: route.params.id, resumeId2: compareTargetId.value } })
    compareResult.value = res.comparison
  } catch { alert('비교 중 오류가 발생했습니다.') }
  finally { comparing.value = false }
}

// Merge
const mergeTargetId = ref<string | null>(null)
const merging = ref(false)
const mergeResult = ref<any>(null)
async function runMerge() {
  if (!mergeTargetId.value) return
  merging.value = true
  try {
    const res: any = await $fetch('/api/resumes/merge', { method: 'POST', body: { resumeId1: route.params.id, resumeId2: mergeTargetId.value } })
    mergeResult.value = res.merge
  } catch { alert('병합 중 오류가 발생했습니다.') }
  finally { merging.value = false }
}
async function saveMergedResume() {
  if (!mergeResult.value?.mergedContent) return
  try {
    await $fetch('/api/resumes', { method: 'POST', body: { title: data.value.resume.title + ' (병합본)', originalContent: mergeResult.value.mergedContent } })
    alert('병합본이 새 이력서로 저장되었습니다.')
  } catch { alert('저장에 실패했습니다.') }
}
</script>
