<template>
  <header class="sticky top-0 z-50 border-b border-stroke-neutral-muted bg-bg-neutral-default/80 backdrop-blur-xl">
    <div class="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8" style="max-width: 1280px; margin: 0 auto;">
      <NuxtLink to="/" class="flex items-center gap-x3">
        <div class="w-8 h-8 rounded-r1 bg-fg-neutral-default text-bg-neutral-default flex items-center justify-center font-bold text-sm">
          K
        </div>
        <span class="font-semibold text-base text-fg-neutral">Kairos</span>
      </NuxtLink>

      <div class="flex items-center gap-x4">
        <NuxtLink
          to="/interview"
          class="hidden sm:flex items-center gap-x1 px-x3 py-x1 rounded-r1 bg-neutral-muted hover:bg-neutral-muted text-fg-neutral-muted text-sm transition-all"
        >
          AI 모의 면접
        </NuxtLink>

        <div v-if="user" class="flex items-center gap-x3 border-l border-stroke-neutral-muted pl-x3">
          <img :src="user.avatarUrl" :alt="user.name" class="w-7 h-7 rounded-full" />
          <span class="hidden md:inline text-sm text-fg-neutral-muted">{{ user.name }}</span>
        </div>
        <NuxtLink
          v-else
          to="/auth/login"
          class="text-sm text-fg-neutral-muted hover:text-fg-neutral transition-colors"
        >
          로그인
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { data } = await useFetch<{ authenticated: boolean; user?: { id: string; email: string; name: string; avatarUrl: string } }>('/api/auth/me')
const user = computed(() => data.value?.user)
</script>
