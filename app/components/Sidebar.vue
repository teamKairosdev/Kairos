<template>
  <!-- Desktop sidebar -->
  <aside class="hidden lg:flex flex-col h-full">
    <div class="px-3 pt-2 pb-1">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">메뉴</p>
    </div>
    <nav class="flex-1 space-y-0.5 px-2">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group"
        :class="isActive(item.path)
          ? 'bg-indigo-50 text-indigo-700 font-semibold'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'"
      >
        <span class="text-base leading-none">{{ item.emoji }}</span>
        <span>{{ item.label }}</span>
        <span v-if="isActive(item.path)" class="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
      </NuxtLink>
    </nav>
    <div class="p-3 border-t border-gray-100 mt-2">
      <NuxtLink to="/settings" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
        <span class="text-base">⚙️</span>
        <span>설정</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '대시보드', path: '/', emoji: '🏠' },
  { label: '이력서', path: '/resume', emoji: '📄' },
  { label: '모의 면접', path: '/interview', emoji: '🎤' },
  { label: 'ATS 분석', path: '/ats', emoji: '🎯' },
  { label: '휴머나이저', path: '/humanizer', emoji: '✨' },
  { label: 'Q&A 생성', path: '/qa', emoji: '💡' },
  { label: '경력 관리', path: '/career', emoji: '🗂️' },
  { label: '포토스튜디오', path: '/studio', emoji: '🎨' },
  { label: '문서', path: '/docs', emoji: '📋' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
