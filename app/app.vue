<template>
  <UApp>
    <div class="min-h-screen bg-bg-neutral-default text-fg-neutral flex flex-col">
      <Navbar />
      <div class="flex-1 flex w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-8" style="max-width: 1280px;">
        <Sidebar v-if="showSidebar" class="hidden md:block w-56 shrink-0" />
        <main class="flex-1 min-w-0">
          <NuxtPage />
        </main>
      </div>
      <footer class="border-t border-stroke-neutral-muted py-6 text-center text-xs text-fg-neutral-muted mt-auto">
        <p>&copy; 2026 Kairos</p>
      </footer>
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
const showSidebar = computed(() => state.authenticated && route.path !== '/auth/login' && route.path !== '/auth/register')

onMounted(() => {
  fetchUser()

  // 다크모드 강제 척결
  const html = document.documentElement
  html.classList.remove('dark')
  html.classList.add('light')
  html.setAttribute('data-seed-color-mode', 'light-only')
  html.setAttribute('data-seed-user-color-scheme', 'light')
  localStorage.setItem('nuxt-color-mode', 'light')

  // MutationObserver를 사용하여 다크모드 클래스가 브라우저/모듈에 의해 강제 추가되는 것 감시 및 제거
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
