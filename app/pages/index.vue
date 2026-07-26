<template>
  <div class="space-y-8">
    <!-- Hero Banner -->
    <div class="glass-card rounded-3xl p-8 border border-purple-500/20 relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-purple-600/30 to-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>
      
      <div class="max-w-2xl space-y-4 relative z-10">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <span>🚀</span> AI 커리어 청지기 (Kairos Stewardship)
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          당신의 취업 성공을 완성하는 <br />
          <span class="gradient-text">맞춤형 AI 가이던스 플랫폼</span>
        </h1>
        <p class="text-gray-300 text-sm sm:text-base leading-relaxed">
          이력서 비동기 3단계 개선, 실시간 SSE 스트리밍 모의 면접, ATS 분석, AI 문체 자연화 및 pgvector 기반 시맨틱 검색을 제공합니다.
        </p>
        <div class="pt-2 flex flex-wrap gap-4">
          <NuxtLink
            to="/resume"
            class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all"
          >
            이력서 생성 & 평가 시작
          </NuxtLink>
          <NuxtLink
            to="/ats"
            class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-sm font-semibold border border-white/10 transition-all"
          >
            ATS 매칭 분석
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stat Dashboard Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="등록된 이력서" value="3 건" icon="📝" trend="최근 평가 점수 94점" trendPositive />
      <StatCard label="완료된 모의 면접" value="8 회" icon="🎙️" trend="평균 답변 완성도 +15%" trendPositive />
      <StatCard label="ATS 매칭 분석" value="92%" icon="🎯" trend="목표 직무 최적화 완료" trendPositive />
      <StatCard label="시맨틱 벡터 경력" value="12 개" icon="⚡" trend="pgvector 1536-dim" />
    </div>

    <!-- Core Feature Quick Access Cards -->
    <div>
      <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>⭐</span> Kairos 핵심 AI 기능
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink to="/resume" class="glass-card rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            📑
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">Resume Refinement</h3>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">
            초안 작성부터 LLM 객관적 평가, 완성본 재작성까지 비동기 3단계 체인으로 자동 고도화합니다.
          </p>
        </NuxtLink>

        <NuxtLink to="/interview" class="glass-card rounded-2xl p-6 hover:border-cyan-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            🎙️
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">AI Mock Interview</h3>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">
            SSE 스트리밍 기술로 끊김 없는 실시간 꼬리질문과 답변 세부 피드백을 전달합니다.
          </p>
        </NuxtLink>

        <NuxtLink to="/humanizer" class="glass-card rounded-2xl p-6 hover:border-amber-500/50 transition-all group">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            ✨
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">AI Humanizer</h3>
          <p class="text-xs text-gray-400 mt-2 leading-relaxed">
            AI 특유의 진부하거나 정형화된 어조를 감쪽같이 자연스러운 전문 인간 문체로 교정합니다.
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatCard from '~/components/StatCard.vue'
</script>
