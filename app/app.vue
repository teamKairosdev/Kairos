<template>
  <UApp>
    <div class="min-h-screen bg-[#0a0a0b] text-[#f5f5f4] flex flex-col selection:bg-purple-500/30 selection:text-white">
      <Navbar />
      <div class="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-8">
        <Sidebar class="hidden md:block w-56 shrink-0" />
        <main class="flex-1 min-w-0">
          <NuxtPage />
        </main>
      </div>
      <footer class="border-t border-white/5 py-6 text-center text-xs text-gray-600 mt-auto">
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
</script>
