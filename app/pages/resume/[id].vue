<template>
  <div v-if="data" class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/resume" class="text-xs text-gray-500 hover:text-white transition-colors mb-1.5 flex items-center gap-1">&larr; 목록</NuxtLink>
        <h1 class="text-xl font-semibold text-white">{{ data.resume.title }}</h1>
      </div>
      <div class="text-right">
        <div class="text-2xl font-semibold text-white">{{ data.resume.currentScore || 85 }}</div>
        <div class="text-xs text-gray-500">평가 점수</div>
      </div>
    </div>

    <div v-if="data.refinementHistory && data.refinementHistory.length > 0" class="space-y-6">
      <h2 class="text-base font-medium text-white">AI 평가 &amp; 개선 이력</h2>
      <div v-for="ref in data.refinementHistory" :key="ref.id" class="rounded-xl border border-white/5 p-6 bg-white/[0.02] space-y-5">
        <div class="flex items-center justify-between border-b border-white/5 pb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300 uppercase">{{ ref.step }}</span>
            <span class="text-xs text-gray-500">{{ ref.score }}점</span>
          </div>
          <span class="text-xs text-gray-600">{{ new Date(ref.createdAt).toLocaleString() }}</span>
        </div>
        <div v-if="ref.evaluationFeedback" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-lg bg-white/5 space-y-2">
            <div class="text-xs font-medium text-emerald-400">강점</div>
            <ul class="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li v-for="(s, idx) in ref.evaluationFeedback.strengths" :key="idx">{{ s }}</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg bg-white/5 space-y-2">
            <div class="text-xs font-medium text-red-400">개선 필요</div>
            <ul class="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li v-for="(w, idx) in ref.evaluationFeedback.weaknesses" :key="idx">{{ w }}</li>
            </ul>
          </div>
        </div>
        <div v-if="ref.improvedContent" class="space-y-2">
          <div class="text-xs font-medium text-gray-400">AI 재작성 결과</div>
          <div class="p-4 rounded-lg bg-white/5 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{{ ref.improvedContent }}</div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-white/5 p-6 bg-white/[0.02] space-y-3">
      <h3 class="text-sm font-medium text-gray-400">원본 이력서</h3>
      <div class="p-4 rounded-lg bg-white/5 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{{ data.resume.originalContent }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch<any>(`/api/resumes/${route.params.id}`)
</script>
