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
        <span class="text-lg group-hover:scale-110 transition-transform">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="pt-4 border-t border-white/5">
      <div class="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-2">
        <div class="text-xs font-bold text-purple-300 flex items-center gap-1.5">
          <span>✨</span> Kairos LLM Engine
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
  { label: '대시보드 개요', path: '/', icon: '📊' },
  { label: '이력서 생성을 및 평가', path: '/resume', icon: '📝' },
  { label: 'AI 모의 면접 (SSE)', path: '/interview', icon: '🎙️' },
  { label: 'ATS 채용공고 분석', path: '/ats', icon: '🎯' },
  { label: 'AI 문장 휴머니자이저', path: '/humanizer', icon: '✨' },
  { label: '예상 질문 Q&A 세트', path: '/qa', icon: '💡' },
  { label: '경력 관리 & 벡터 검색', path: '/career', icon: '🔍' },
]
</script>
