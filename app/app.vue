<template>
  <UApp>
    <div class="min-h-screen bg-[#090d16] text-gray-100 flex flex-col relative selection:bg-purple-500 selection:text-white">
      <!-- Ambient Background Lights -->
      <div class="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div class="fixed bottom-10 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <!-- Top Navigation Header -->
      <Navbar />

      <!-- Main Content Container with Sidebar -->
      <div class="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-8">
        <!-- Sidebar Navigation -->
        <Sidebar class="hidden md:block w-64 shrink-0" />

        <!-- Page Content -->
        <main class="flex-1 min-w-0">
          <NuxtPage />
        </main>
      </div>

      <!-- App Footer -->
      <footer class="border-t border-white/5 py-6 text-center text-xs text-gray-500 glass-panel mt-auto">
        <p>© 2026 Kairos. "당신의 시간에 의미를 부여하는 단 하나의 청지기 (Dispensator)"</p>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
</script>
