<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-extrabold text-white">
          공개 포트폴리오 관리
        </h1>
        <p class="text-xs text-gray-400 mt-1">면접관에게 보여줄 프로젝트 기록을 관리하세요. AI가 자동으로 수집해 올 수도 있습니다.</p>
      </div>
      <UButton color="primary" variant="solid" size="sm" icon="i-lucide-eye" :to="`/portfolio/${user?.id}`" v-if="user">
        공개 페이지 보기
      </UButton>
    </div>

    <!-- Bio -->
    <div class="glass-panel rounded-2xl p-6 space-y-3">
      <h2 class="text-sm font-bold text-white">자기 소개</h2>
      <UTextarea v-model="bio" placeholder="간단한 자기 소개를 입력하세요..." :rows="3" color="primary" />
    </div>

    <!-- Social Links -->
    <div class="glass-panel rounded-2xl p-6 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white">외부 링크</h2>
        <UButton color="primary" variant="soft" size="2xs" icon="i-lucide-plus" label="링크 추가" @click="addLink" />
      </div>
      <div v-for="(link, i) in socialLinks" :key="i" class="flex items-center gap-2">
        <USelect v-model="link.platform" class="w-28 px-3 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500">
          <option value="github">GitHub</option>
          <option value="blog">Blog</option>
          <option value="portfolio">Portfolio</option>
          <option value="linkedin">LinkedIn</option>
          <option value="other">기타</option>
        </USelect>
        <UInput v-model="link.url" placeholder="URL 입력" color="primary" class="flex-1" />
        <UButton color="gray" variant="soft" size="2xs" icon="i-lucide-x" @click="socialLinks.splice(i, 1)" />
      </div>
    </div>

    <!-- AI Import -->
    <div class="glass-panel rounded-2xl p-6 space-y-4 border border-amber-500/20">
      <h2 class="text-sm font-bold text-amber-300">
        AI 자동 프로젝트 수집
      </h2>
      <p class="text-xs text-gray-400">GitHub 주소나 프로젝트 페이지 URL을 입력하면 AI가 직접 방문해서 데이터를 가져옵니다.</p>
      <div class="flex items-center gap-2">
        <UInput v-model="aiSourceUrl" placeholder="https://github.com/username" color="primary" class="flex-1" />
        <UInput v-model="aiSourceDesc" placeholder="설명 (예: 내 GitHub 프로필)" color="primary" class="flex-1" />
        <UButton color="warning" variant="solid" :loading="aiLoading" @click="runAIFetch">
          AI 수집
        </UButton>
      </div>
      <div v-if="aiResult" class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
        {{ aiResult.projects.length }}개의 프로젝트를 찾았습니다. 아래 목록에 추가되었습니다.
      </div>
    </div>

    <!-- Projects -->
    <div class="glass-panel rounded-2xl p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white">프로젝트 목록</h2>
      </div>
      <div v-if="projects.length === 0" class="text-center py-8 text-gray-400 text-sm">
        등록된 프로젝트가 없습니다. AI 수집으로 자동 추가하거나 직접 추가해 보세요.
      </div>
      <div v-for="(p, i) in projects" :key="i" class="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">{{ p.title }}</span>
              <span v-if="p.isAIFetched" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">AI</span>
            </div>
            <p class="text-xs text-gray-300">{{ p.description }}</p>
            <div v-if="p.techStack" class="flex flex-wrap gap-1">
              <span v-for="t in p.techStack" :key="t" class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-200 text-[10px]">{{ t }}</span>
            </div>
            <div v-if="p.highlights" class="text-xs text-gray-400 space-y-0.5">
              <div v-for="h in p.highlights" :key="h" class="flex items-start gap-1">
                <span class="text-emerald-400">▸</span> {{ h }}
              </div>
            </div>
            <div v-if="p.projectUrl" class="text-xs">
              <a :href="p.projectUrl" target="_blank" class="text-cyan-400 hover:underline">🔗 프로젝트 바로가기</a>
            </div>
          </div>
          <UButton color="gray" variant="soft" size="2xs" icon="i-lucide-trash" @click="projects.splice(i, 1)" />
        </div>
      </div>
    </div>

    <!-- Save -->
    <div class="flex justify-end">
      <UButton color="primary" variant="solid" size="lg" :loading="saving" @click="savePortfolio">
        포트폴리오 저장
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Portfolio, PortfolioProject } from 'shared/types'

const { state: authState } = useAuth()
const user = computed(() => authState.user)

const bio = ref('')
const socialLinks = ref<{ platform: string; url: string }[]>([])
const projects = ref<PortfolioProject[]>([])
const saving = ref(false)

const aiSourceUrl = ref('')
const aiSourceDesc = ref('')
const aiLoading = ref(false)
const aiResult = ref<any>(null)

onMounted(async () => {
  if (!user.value?.id) return
  try {
    const res: Portfolio | null = await $fetch(`/api/portfolio?userId=${user.value.id}`)
    if (res) {
      bio.value = res.bio || ''
      socialLinks.value = res.socialLinks || []
      projects.value = res.projects || []
    }
  } catch {
    // ignore
  }
})

function addLink() {
  socialLinks.value.push({ platform: 'github', url: '' })
}

async function runAIFetch() {
  if (!aiSourceUrl.value || !aiSourceDesc.value) return
  aiLoading.value = true
  aiResult.value = null
  try {
    const res: any = await $fetch('/api/portfolio/ai-fetch', {
      method: 'POST',
      body: { sourceUrl: aiSourceUrl.value, sourceDescription: aiSourceDesc.value },
    })
    if (res.projects) {
      for (const p of res.projects) {
        projects.value.push({ ...p, isAIFetched: true })
      }
      aiResult.value = res
    }
  } catch {
    alert('AI 데이터 수집에 실패했습니다.')
  } finally {
    aiLoading.value = false
  }
}

async function savePortfolio() {
  saving.value = true
  try {
    await $fetch('/api/portfolio', {
      method: 'POST',
      body: {
        bio: bio.value,
        socialLinks: socialLinks.value,
        projects: projects.value,
        isPublic: true,
      },
    })
    alert('포트폴리오가 저장되었습니다.')
  } catch {
    alert('저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}
</script>
