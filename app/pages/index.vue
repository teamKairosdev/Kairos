<template>
  <div class="space-y-8">
    <div class="border border-stroke-neutral-muted rounded-xl p-8 bg-neutral-muted">
      <div class="max-w-2xl space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight text-fg-neutral">
          당신의 커리어를 완성하는<br />
          AI 가이던스
        </h1>
        <p class="text-fg-neutral-muted text-sm leading-relaxed">
          이력서 고도화, 실시간 모의 면접, ATS 분석, 문장 교정, pgvector 검색까지.<br />
          하나의 플랫폼에서 커리어 전 과정을 추적하고 관리하세요.
        </p>
        <div class="pt-2 flex flex-wrap gap-3">
          <NuxtLink to="/resume" class="px-4 py-2 rounded-lg bg-white text-bg-neutral-default text-sm font-medium hover:bg-neutral-strong transition-colors">
            이력서 시작
          </NuxtLink>
          <NuxtLink to="/interview" class="px-4 py-2 rounded-lg bg-neutral-muted text-gray-300 text-sm font-medium hover:bg-neutral-strong transition-colors">
            모의 면접
          </NuxtLink>
          <NuxtLink to="/ats" class="px-4 py-2 rounded-lg bg-neutral-muted text-gray-300 text-sm font-medium hover:bg-neutral-strong transition-colors">
            ATS 분석
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="등록된 이력서" value="3" icon="📝" trend="최근 평가 94점" trendPositive />
      <StatCard label="완료된 면접" value="8" icon="🎙️" trend="답변 완성도 +15%" trendPositive />
      <StatCard label="ATS 매칭" value="92%" icon="🎯" trend="목표 직무 최적화" trendPositive />
      <StatCard label="벡터 경력" value="12" icon="⚡" trend="pgvector 1536-dim" />
    </div>

    <div>
      <h2 class="text-lg font-semibold text-fg-neutral mb-4">핵심 기능</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink to="/resume" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors">
          <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg mb-3 text-fg-neutral-muted">
            📑
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1">Resume Refinement</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">
            3단계 AI 체인으로 이력서를 초안부터 평가, 재작성까지 자동 고도화합니다.
          </p>
        </NuxtLink>

        <NuxtLink to="/interview" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors">
          <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg mb-3 text-fg-neutral-muted">
            🎙️
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1">Mock Interview</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">
            SSE 실시간 스트리밍으로 끊김 없는 AI 면접과 즉각 피드백을 제공합니다.
          </p>
        </NuxtLink>

        <NuxtLink to="/humanizer" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors">
          <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg mb-3 text-fg-neutral-muted">
            ✨
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1">Humanizer</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">
            AI 특유의 정형화된 문체를 자연스러운 인간 어조로 변환합니다.
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatCard from '~/components/StatCard.vue'
</script>
