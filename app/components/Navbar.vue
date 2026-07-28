<template>
  <header class="sticky top-0 z-50 glass-panel border-b border-white/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Logo Branding -->
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300">
          <div class="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center font-bold text-lg text-purple-400">
            K
          </div>
        </div>
        <div>
          <span class="font-extrabold text-xl tracking-tight gradient-text">Kairos</span>
          <UBadge color="primary" variant="subtle" size="xs" class="hidden sm:inline-flex ml-2">
            AI Steward v1.0
          </UBadge>
        </div>
      </NuxtLink>

      <!-- Quick Action Right Nav -->
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/interview"
          class="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md hover:shadow-purple-500/25 transition-all"
        >
          <span>⚡ AI 모의 면접</span>
        </NuxtLink>

        <!-- User Profile Badge -->
        <div v-if="user" class="flex items-center gap-3 border-l border-white/10 pl-4">
          <img :src="user.avatarUrl" :alt="user.name" class="w-8 h-8 rounded-full border border-purple-500/30 bg-purple-900/30" />
          <span class="hidden md:inline text-sm font-medium text-gray-200">{{ user.name }}</span>
        </div>
        <NuxtLink
          v-else
          to="/auth/login"
          class="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
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
