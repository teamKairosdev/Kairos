<template>
  <aside class="space-y-1">
    <div class="px-3 py-2 text-xs font-medium text-gray-500 tracking-wide">
      Menu
    </div>
    <nav class="space-y-0.5">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
        :class="route.path === item.path ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
      >
        <span class="text-base">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '대시보드', path: '/', icon: '📊' },
  { label: '이력서', path: '/resume', icon: '📝' },
  { label: '모의 면접', path: '/interview', icon: '🎙️' },
  { label: 'ATS 분석', path: '/ats', icon: '🎯' },
  { label: '휴머나이저', path: '/humanizer', icon: '✨' },
  { label: 'Q&A 생성', path: '/qa', icon: '💡' },
  { label: '경력 검색', path: '/career', icon: '🔍' },
]
</script>
