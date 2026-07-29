<template>
  <div v-if="portfolio && targetUserId" class="max-w-4xl mx-auto space-y-8">
    <NuxtLink to="/portfolio/manage" class="text-xs text-purple-400 hover:underline">← 포트폴리오 관리</NuxtLink>

    <!-- Header -->
    <div class="glass-panel rounded-3xl p-8 space-y-4 border border-purple-500/20">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
          {{ (portfolio.user?.name || '?')[0] }}
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-white">{{ portfolio.user?.name || '개발자' }}</h1>
          <p class="text-xs text-gray-400 mt-1">{{ portfolio.bio || '자기 소개가 없습니다.' }}</p>
        </div>
      </div>
      <div v-if="portfolio.socialLinks?.length" class="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        <a v-for="link in portfolio.socialLinks" :key="link.url" :href="link.url" target="_blank"
          class="px-3 py-1 rounded-lg bg-slate-900/60 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-purple-500/50 transition-all">
          {{ link.platform }}
        </a>
      </div>
    </div>

    <!-- Projects -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-white">프로젝트 기록</h2>
      <div v-if="portfolio.projects?.length">
        <div v-for="(p, i) in portfolio.projects" :key="i"
          class="glass-panel rounded-2xl p-6 space-y-3 hover:border-purple-500/40 transition-all">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white">{{ p.title }}</h3>
              <span v-if="p.isAIFetched" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">AI</span>
            </div>
            <p class="text-sm text-gray-300 leading-relaxed">{{ p.description }}</p>
            <div v-if="p.techStack" class="flex flex-wrap gap-1.5">
              <span v-for="t in p.techStack" :key="t"
                class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-200 border border-purple-500/20 text-[11px] font-mono">{{ t }}</span>
            </div>
            <div v-if="p.highlights" class="space-y-1">
              <div class="text-xs font-bold text-gray-400">주요 성과</div>
              <ul class="text-xs text-gray-300 space-y-0.5">
                <li v-for="h in p.highlights" :key="h" class="flex items-start gap-1.5">
                  <span class="text-emerald-400 mt-0.5">▹</span> {{ h }}
                </li>
              </ul>
            </div>
            <div v-if="p.duration" class="text-xs text-gray-500">{{ p.duration }}</div>
          </div>
          <div v-if="p.projectUrl" class="pt-2 border-t border-white/5">
            <a :href="p.projectUrl" target="_blank"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 hover:bg-cyan-600/30 transition-all">
              프로젝트 보기
            </a>
          </div>
        </div>
      </div>
      <div v-else class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-2">
        <p class="text-sm">등록된 프로젝트가 없습니다.</p>
      </div>
    </div>
  </div>
  <div v-else-if="!loading" class="text-center py-20 text-gray-400 text-sm">
    포트폴리오를 찾을 수 없습니다.
  </div>
  <div v-else class="text-center py-20 text-gray-400">
    불러오는 중...
  </div>
</template>

<script setup lang="ts">
import type { Portfolio } from 'shared/types'

const route = useRoute()
const targetUserId = ref<string | null>(null)
const loading = ref(true)
const portfolio = ref<Portfolio | null>(null)

onMounted(async () => {
  const { state: authState } = useAuth()
  const uid = route.params.userId as string || authState.user?.id || ''
  if (!uid) {
    loading.value = false
    return
  }
  targetUserId.value = uid
  try {
    const res: any = await $fetch(`/api/portfolio?userId=${uid}`)
    portfolio.value = res
  } catch {
    // not found
  } finally {
    loading.value = false
  }
})
</script>
