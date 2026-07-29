<template>
  <UApp>
    <div class="min-h-screen bg-bg-neutral-default text-fg-neutral flex flex-col selection:bg-purple-500/30 selection:text-white">
      <Navbar />
      <div class="flex-1 flex w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-8" style="max-width: 1280px;">
        <Sidebar class="hidden md:block w-56 shrink-0" />
        <main class="flex-1 min-w-0">
          <NuxtPage />
        </main>
      </div>
      <footer class="border-t border-stroke-neutral-muted py-6 text-center text-xs text-fg-neutral-muted mt-auto">
        <p>&copy; 2026 Kairos</p>
      </footer>
      <CareerAssistantPanel />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import CareerAssistantPanel from '~/components/CareerAssistantPanel.vue'

useHead({
  htmlAttrs: {
    'data-seed-color-mode': 'system',
    'data-seed-user-color-scheme': 'dark',
  },
})
</script>
