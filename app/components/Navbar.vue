<template>
  <header class="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-white text-[#0a0a0b] flex items-center justify-center font-bold text-sm">
          K
        </div>
        <span class="font-semibold text-base tracking-tight text-white">Kairos</span>
      </NuxtLink>

      <div class="flex items-center gap-4">
        <NuxtLink
          to="/interview"
          class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-all"
        >
          AI 모의 면접
        </NuxtLink>

        <div v-if="user" class="flex items-center gap-2.5 border-l border-white/10 pl-3">
          <img :src="user.avatarUrl" :alt="user.name" class="w-7 h-7 rounded-full bg-gray-800" />
          <span class="hidden md:inline text-sm text-gray-300">{{ user.name }}</span>
        </div>
        <NuxtLink
          v-else
          to="/auth/login"
          class="text-sm text-gray-400 hover:text-white transition-colors"
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
