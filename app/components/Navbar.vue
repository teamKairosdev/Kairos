<template>
  <header class="sticky top-0 z-50 border-b border-stroke-neutral-muted bg-bg-neutral-default/80 backdrop-blur-xl">
    <div class="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8" style="max-width: 1280px; margin: 0 auto;">
      <NuxtLink to="/" class="flex items-center gap-x3">
        <div class="w-8 h-8 rounded-r1 bg-fg-neutral-default text-bg-neutral-default flex items-center justify-center font-bold text-sm">
          K
        </div>
        <span class="font-semibold text-base text-fg-neutral">Kairos</span>
      </NuxtLink>

      <nav v-if="!state.authenticated" class="hidden md:flex items-center gap-x6 text-sm text-fg-neutral-muted">
        <a href="#features" class="hover:text-fg-neutral transition-colors">기능</a>
        <NuxtLink to="/auth/login" class="hover:text-fg-neutral transition-colors">로그인</NuxtLink>
        <NuxtLink to="/auth/register" class="px-x3 py-x1 rounded-r1 bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-opacity">
          시작하기
        </NuxtLink>
      </nav>

      <nav v-else class="hidden md:flex items-center gap-x4 text-sm text-fg-neutral-muted">
        <NuxtLink to="/resume" class="hover:text-fg-neutral transition-colors">이력서</NuxtLink>
        <NuxtLink to="/interview" class="hover:text-fg-neutral transition-colors">면접</NuxtLink>
        <NuxtLink to="/ats" class="hover:text-fg-neutral transition-colors">ATS</NuxtLink>
        <NuxtLink to="/humanizer" class="hover:text-fg-neutral transition-colors">휴머나이저</NuxtLink>
        <NuxtLink to="/docs" class="hover:text-fg-neutral transition-colors">문서</NuxtLink>
        <NuxtLink to="/studio" class="hover:text-fg-neutral transition-colors">스튜디오</NuxtLink>
      </nav>

      <div v-if="state.authenticated && state.user" class="flex items-center gap-x3 border-l border-stroke-neutral-muted pl-x3 relative">
        <button class="flex items-center gap-x2 cursor-pointer hover:opacity-80 transition-opacity" @click="menuOpen = !menuOpen">
          <img :src="state.user.avatarUrl || '/default-avatar.png'" :alt="state.user.name" class="w-7 h-7 rounded-full" />
          <span class="hidden md:inline text-sm text-fg-neutral-muted">{{ state.user.name }}</span>
          <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-fg-neutral-muted" />
        </button>
        <div v-if="menuOpen" class="absolute top-full right-0 mt-x1 w-48 rounded-lg border border-stroke-neutral-muted bg-bg-neutral-default shadow-lg py-x1 z-50">
          <NuxtLink to="/settings" class="block px-x3 py-x2 text-sm text-fg-neutral-muted hover:bg-neutral-muted hover:text-fg-neutral transition-colors" @click="menuOpen = false">
            설정
          </NuxtLink>
          <hr class="my-x1 border-stroke-neutral-muted" />
          <button class="block w-full text-left px-x3 py-x2 text-sm text-fg-danger hover:bg-neutral-muted transition-colors" @click="handleLogout">
            로그아웃
          </button>
        </div>
      </div>

      <NuxtLink v-else-if="!state.authenticated && !state.loading" to="/auth/login" class="md:hidden text-sm text-fg-neutral-muted hover:text-fg-neutral transition-colors">
        로그인
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
const { state, fetchUser, logout } = useAuth()
const menuOpen = ref(false)

onMounted(() => {
  fetchUser()
})

function handleLogout() {
  menuOpen.value = false
  logout()
}
</script>
