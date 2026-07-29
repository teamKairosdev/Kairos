<template>
  <aside class="space-y-x1">
    <div class="px-x3 py-x2 text-xs font-medium text-fg-neutral-muted tracking-wide">
      Menu
    </div>
    <nav class="space-y-x0">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-x3 px-x3 py-x2 rounded-r1 text-sm transition-all"
        :class="route.path === item.path ? 'bg-neutral-muted text-fg-neutral font-medium' : 'text-fg-neutral-muted hover:text-fg-neutral hover:bg-neutral-muted'"
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
