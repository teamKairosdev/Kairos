<template>
  <aside class="glass-panel rounded-2xl p-4 space-y-6">
    <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      주요 서비스 메뉴
    </div>

    <nav class="space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
        :class="route.path === item.path ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
      >
        <span class="w-2 h-2 rounded-full bg-purple-500/60 group-hover:bg-purple-400 transition-colors shrink-0"></span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="pt-4 border-t border-white/5">
      <div class="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-2">
        <div class="text-xs font-bold text-purple-300">
          Kairos LLM Engine
        </div>
        <p class="text-[11px] text-purple-200/70 leading-relaxed">
          OpenAI, Anthropic, Google Gemini 실시간 자동 Fallback 체인이 활성화되어 있습니다.
        </p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '대시보드 개요', path: '/' },
  { label: '이력서 생성 및 평가', path: '/resume' },
  { label: 'AI 모의 면접 (SSE)', path: '/interview' },
  { label: 'ATS 채용공고 분석', path: '/ats' },
  { label: 'AI 문장 휴머니자이저', path: '/humanizer' },
  { label: '예상 질문 Q&A 세트', path: '/qa' },
  { label: '경력 관리 및 벡터 검색', path: '/career' },
  { label: '공개 포트폴리오', path: '/portfolio/manage' },
]
</script>
