<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />

      <!-- Mobile Drawer Overlay -->
      <Teleport to="body">
        <Transition name="overlay">
          <div
            v-if="drawerOpen && showSidebar"
            class="fixed inset-0 z-50 lg:hidden"
          >
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="drawerOpen = false"></div>

            <!-- Drawer panel -->
            <Transition name="slide-left">
              <div v-if="drawerOpen" class="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
                <!-- Drawer header -->
                <div class="flex items-center justify-between px-5 h-14 border-b border-gray-100">
                  <div class="flex items-center gap-2">
                    <LogoImage img-class="h-6 w-auto object-contain" style="filter: brightness(0);" />
                  </div>
                  <button @click="drawerOpen = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                <!-- Drawer nav -->
                <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  <NuxtLink
                    v-for="item in navItems"
                    :key="item.path"
                    :to="item.path"
                    @click="drawerOpen = false"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                    :class="isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                  >
                    <span class="text-lg leading-none w-6 text-center">{{ item.emoji }}</span>
                    <span>{{ item.label }}</span>
                  </NuxtLink>
                </nav>

                <!-- Drawer footer -->
                <div class="p-3 border-t border-gray-100">
                  <NuxtLink to="/settings" @click="drawerOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
                    <span class="text-lg w-6 text-center">⚙️</span>
                    <span>설정</span>
                  </NuxtLink>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>

      <!-- Main layout -->
      <div class="flex-1 flex w-full max-w-screen-xl mx-auto px-0 lg:px-6 pt-0 lg:pt-6 pb-16 lg:pb-8 gap-0 lg:gap-6">
        <!-- Desktop sidebar -->
        <div v-if="showSidebar" class="hidden lg:block w-52 xl:w-56 shrink-0">
          <div class="sticky top-20 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <Sidebar />
          </div>
        </div>

        <!-- Page content -->
        <main class="flex-1 min-w-0 px-4 sm:px-6 lg:px-0 pt-4 lg:pt-0">
          <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
        </main>
      </div>

      <!-- Mobile Bottom Tab Bar -->
      <div v-if="showSidebar" class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 safe-bottom">
        <nav class="flex items-stretch h-16 max-w-lg mx-auto px-2">
          <NuxtLink
            v-for="tab in bottomTabs"
            :key="tab.path"
            :to="tab.path"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 text-center transition-colors min-w-0 px-1"
            :class="isActive(tab.path) ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'"
          >
            <span class="text-xl leading-none">{{ tab.emoji }}</span>
            <span class="text-[10px] font-medium leading-tight truncate w-full text-center">{{ tab.label }}</span>
          </NuxtLink>
        </nav>
      </div>

      <!-- Footer (desktop only) -->
      <footer class="hidden lg:block border-t border-gray-100 py-5 text-center text-xs text-gray-400 mt-auto bg-white">
        <p>© 2026 Kairos — 종합경력개발 에이전트 서비스</p>
      </footer>

      <!-- Global AI Assistant Panel -->
      <CareerAssistantPanel v-if="showSidebar" />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import CareerAssistantPanel from '~/components/CareerAssistantPanel.vue'

const { state, fetchUser } = useAuth()
const route = useRoute()
const drawerOpen = ref(false)

const showSidebar = computed(() =>
  state.authenticated &&
  route.path !== '/auth/login' &&
  route.path !== '/auth/register'
)

// Close drawer on route change
watch(() => route.path, () => { drawerOpen.value = false })

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

const bottomTabs = [
  { label: '홈', path: '/', emoji: '🏠' },
  { label: '이력서', path: '/resume', emoji: '📄' },
  { label: '면접', path: '/interview', emoji: '🎤' },
  { label: 'ATS', path: '/ats', emoji: '🎯' },
  { label: '더보기', path: '/career', emoji: '⋯' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

onMounted(() => {
  fetchUser()

  // 다크모드 강제 척결
  const html = document.documentElement
  html.classList.remove('dark')
  html.classList.add('light')
  html.setAttribute('data-seed-color-mode', 'light-only')
  html.setAttribute('data-seed-user-color-scheme', 'light')
  localStorage.setItem('nuxt-color-mode', 'light')

  const observer = new MutationObserver(() => {
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      html.classList.add('light')
    }
  })
  observer.observe(html, { attributes: true, attributeFilter: ['class'] })
})

useHead({
  htmlAttrs: {
    'data-seed-color-mode': 'light-only',
    'data-seed-user-color-scheme': 'light',
  },
})
</script>

<style>
/* Mobile safe area for bottom tab bar */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Custom selection color (Blue) */
::selection {
  background-color: #2563eb !important;
  color: #ffffff !important;
}
</style>

<style scoped>
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.2s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); }
</style>
