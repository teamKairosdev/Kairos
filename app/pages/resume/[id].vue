<template>
  <div v-if="data" class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/resume" class="text-xs text-fg-neutral-muted hover:text-fg-neutral transition-colors mb-1.5 flex items-center gap-1">&larr; 목록</NuxtLink>
        <h1 class="text-xl font-semibold text-fg-neutral">{{ data.resume.title }}</h1>
      </div>
      <div class="text-right">
        <div class="text-2xl font-semibold text-fg-neutral">{{ data.resume.currentScore || 85 }}</div>
        <div class="text-xs text-fg-neutral-muted">평가 점수</div>
      </div>
    </div>

    <div v-if="data.refinementHistory && data.refinementHistory.length > 0" class="space-y-6">
      <h2 class="text-base font-medium text-fg-neutral">AI 평가 &amp; 개선 이력</h2>
      <div v-for="ref in data.refinementHistory" :key="ref.id" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-5">
        <div class="flex items-center justify-between border-b border-stroke-neutral-muted pb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-muted text-fg-neutral-muted uppercase">{{ ref.step }}</span>
            <span class="text-xs text-fg-neutral-muted">{{ ref.score }}점</span>
          </div>
          <span class="text-xs text-fg-neutral-muted">{{ new Date(ref.createdAt).toLocaleString() }}</span>
        </div>
        <div v-if="ref.evaluationFeedback" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-lg bg-neutral-muted space-y-2">
            <div class="text-xs font-medium text-fg-brand">강점</div>
            <ul class="text-xs text-fg-neutral-muted space-y-1 list-disc list-inside">
              <li v-for="(s, idx) in ref.evaluationFeedback.strengths" :key="idx">{{ s }}</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg bg-neutral-muted space-y-2">
            <div class="text-xs font-medium text-fg-danger">개선 필요</div>
            <ul class="text-xs text-fg-neutral-muted space-y-1 list-disc list-inside">
              <li v-for="(w, idx) in ref.evaluationFeedback.weaknesses" :key="idx">{{ w }}</li>
            </ul>
          </div>
        </div>
        <div v-if="ref.improvedContent" class="space-y-2">
          <div class="text-xs font-medium text-fg-neutral-muted">AI 재작성 결과</div>
          <div class="p-4 rounded-lg bg-neutral-muted text-xs text-fg-neutral-muted leading-relaxed whitespace-pre-wrap font-mono">{{ ref.improvedContent }}</div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-3">
      <h3 class="text-sm font-medium text-fg-neutral-muted">원본 이력서</h3>
      <div class="p-4 rounded-lg bg-neutral-muted text-xs text-fg-neutral-muted leading-relaxed whitespace-pre-wrap">{{ data.resume.originalContent }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useFetch<any>(`/api/resumes/${route.params.id}`)
</script>
