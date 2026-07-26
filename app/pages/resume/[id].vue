<template>
  <div v-if="data" class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/resume" class="text-xs text-purple-400 hover:underline flex items-center gap-1 mb-2">
          ← 이력서 목록으로 돌아가기
        </NuxtLink>
        <h1 class="text-2xl font-extrabold text-white flex items-center gap-3">
          <span>📄</span> {{ data.resume.title }}
        </h1>
      </div>

      <div class="text-right">
        <div class="text-3xl font-extrabold gradient-text">{{ data.resume.currentScore || 85 }}점</div>
        <div class="text-xs text-gray-400">현재 평가 점수</div>
      </div>
    </div>

    <!-- Refinement History Steps -->
    <div v-if="data.refinementHistory && data.refinementHistory.length > 0" class="space-y-6">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <span>✨</span> AI 비동기 체인 평가 & 개선 결과
      </h2>

      <div v-for="ref in data.refinementHistory" :key="ref.id" class="glass-panel rounded-2xl p-6 space-y-6">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              {{ ref.step }} Stage
            </span>
            <span class="text-xs text-gray-400">점수: {{ ref.score }}점</span>
          </div>
          <span class="text-xs text-gray-500">{{ new Date(ref.createdAt).toLocaleString() }}</span>
        </div>

        <!-- Evaluation Feedback Card -->
        <div v-if="ref.evaluationFeedback" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <div class="text-xs font-bold text-emerald-400">💡 주요 강점 (Strengths)</div>
            <ul class="text-xs text-emerald-200/80 space-y-1 list-disc list-inside">
              <li v-for="(s, idx) in ref.evaluationFeedback.strengths" :key="idx">{{ s }}</li>
            </ul>
          </div>

          <div class="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
            <div class="text-xs font-bold text-rose-400">⚠️ 개선 권장사항 (Weaknesses)</div>
            <ul class="text-xs text-rose-200/80 space-y-1 list-disc list-inside">
              <li v-for="(w, idx) in ref.evaluationFeedback.weaknesses" :key="idx">{{ w }}</li>
            </ul>
          </div>
        </div>

        <!-- Improved Content Diff Box -->
        <div v-if="ref.improvedContent" class="space-y-2">
          <div class="text-xs font-bold text-purple-300">✨ AI 최종 고도화 재작성 이력서 본문</div>
          <div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
            {{ ref.improvedContent }}
          </div>
        </div>
      </div>
    </div>

    <!-- Original Draft Section -->
    <div class="glass-card rounded-2xl p-6 space-y-4">
      <h3 class="text-sm font-bold text-gray-300">원본 이력서 텍스트 (Original Draft)</h3>
      <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
        {{ data.resume.originalContent }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch<any>(`/api/resumes/${route.params.id}`)
</script>
