<template>
  <header class="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
    <div class="flex items-center justify-between h-14 px-4 sm:px-6 max-w-screen-xl mx-auto">
      <!-- Logo -->
      <div class="flex items-center gap-2.5">
        <!-- Mobile: hamburger -->
        <button
          v-if="state.authenticated"
          @click="$emit('toggleDrawer')"
          class="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mr-1"
          aria-label="메뉴 열기"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <NuxtLink to="/" class="flex items-center gap-2">
          <LogoImage img-class="h-6 w-auto object-contain" style="filter: brightness(0);" />
        </NuxtLink>
      </div>

      <!-- Desktop nav (unauthenticated) -->
      <nav v-if="!state.authenticated" class="hidden md:flex items-center gap-6 text-sm text-gray-500">
        <a href="#features" class="hover:text-blue-600 transition-colors">기능</a>
        <NuxtLink to="/auth/login" class="hover:text-blue-600 transition-colors">로그인</NuxtLink>
        <NuxtLink to="/auth/register" class="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          시작하기
        </NuxtLink>
      </nav>

      <!-- Desktop nav (authenticated) -->
      <nav v-else-if="state.authenticated" class="hidden lg:flex items-center gap-5 text-sm text-gray-500">
        <NuxtLink to="/resume" class="hover:text-blue-600 transition-colors" :class="route.path.startsWith('/resume') ? 'text-blue-600 font-semibold' : ''">이력서</NuxtLink>
        <NuxtLink to="/interview" class="hover:text-blue-600 transition-colors" :class="route.path.startsWith('/interview') ? 'text-blue-600 font-semibold' : ''">면접</NuxtLink>
        <NuxtLink to="/ats" class="hover:text-blue-600 transition-colors" :class="route.path.startsWith('/ats') ? 'text-blue-600 font-semibold' : ''">ATS</NuxtLink>
        <NuxtLink to="/career" class="hover:text-blue-600 transition-colors" :class="route.path.startsWith('/career') ? 'text-blue-600 font-semibold' : ''">경력</NuxtLink>
      </nav>

      <!-- Right actions -->
      <div class="flex items-center gap-2">
        <!-- Authenticated user avatar -->
        <div v-if="state.authenticated && state.user" class="relative">
          <button
            class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            @click="menuOpen = !menuOpen"
          >
            <img
              :src="state.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user.name || 'U') + '&background=e0e7ff&color=4f46e5&size=64'"
              :alt="state.user.name"
              class="w-8 h-8 rounded-full border-2 border-gray-100 object-cover"
            />
            <span class="hidden md:inline text-sm font-medium text-gray-700">{{ state.user.name }}</span>
            <svg class="hidden md:block w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>

          <!-- Dropdown -->
          <Transition name="fade-down">
            <div v-if="menuOpen" class="absolute top-full right-0 mt-2 w-48 rounded-2xl border border-gray-100 bg-white shadow-lg py-2 z-50">
              <div class="px-4 py-2 border-b border-gray-100 mb-1">
                <p class="text-xs font-bold text-gray-900 truncate">{{ state.user.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ state.user.email }}</p>
              </div>
              <NuxtLink to="/settings" class="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" @click="menuOpen = false">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                설정
              </NuxtLink>
              <hr class="my-1 border-gray-100" />
              <button class="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors" @click="handleLogout">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                로그아웃
              </button>
            </div>
          </Transition>
        </div>

        <!-- Not authenticated on mobile -->
        <NuxtLink
          v-else-if="!state.loading"
          to="/auth/login"
          class="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >로그인</NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits(['toggleDrawer'])
const { state, fetchUser, logout } = useAuth()
const route = useRoute()
const menuOpen = ref(false)

onMounted(() => { fetchUser() })

function handleLogout() {
  menuOpen.value = false
  logout()
}

// Close dropdown on outside click
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.relative')) {
      menuOpen.value = false
    }
  })
})
</script>

<style scoped>
.fade-down-enter-active, .fade-down-leave-active { transition: all 0.15s ease; }
.fade-down-enter-from { opacity: 0; transform: translateY(-6px); }
.fade-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
