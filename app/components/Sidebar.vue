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
        <UIcon :name="item.icon" class="w-5 h-5 text-fg-neutral-muted" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '대시보드', path: '/', icon: 'i-lucide-layout-dashboard' },
  { label: '이력서', path: '/resume', icon: 'i-lucide-file-text' },
  { label: '모의 면접', path: '/interview', icon: 'i-lucide-mic' },
  { label: 'ATS 분석', path: '/ats', icon: 'i-lucide-crosshair' },
  { label: '휴머나이저', path: '/humanizer', icon: 'i-lucide-sparkles' },
  { label: 'Q&A 생성', path: '/qa', icon: 'i-lucide-lightbulb' },
  { label: '문서', path: '/docs', icon: 'i-lucide-file' },
  { label: '포토스튜디오', path: '/studio', icon: 'i-lucide-palette' },
  { label: '경력 검색', path: '/career', icon: 'i-lucide-search' },
  { label: '설정', path: '/settings', icon: 'i-lucide-settings' },
]
</script>
