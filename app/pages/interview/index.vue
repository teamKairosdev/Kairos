<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
          <span>🎙️</span> AI 모의 면접 (Mock Interview via SSE)
        </h1>
        <p class="text-xs text-gray-400 mt-1">
          실시간 SSE 스트리밍 기술로 끊김 없는 맞춤형 면접관 LLM과의 일대일 면접 세션을 진행하세요.
        </p>
      </div>

      <UButton
        color="cyan"
        variant="solid"
        icon="i-lucide-zap"
        label="신규 모의 면접 시작"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Active Interview Sessions List -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-white">진행 중 및 이전 면접 세션</h2>

      <div v-if="interviews && interviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in interviews"
          :key="item.id"
          class="glass-panel rounded-2xl p-6 hover:border-cyan-500/40 transition-all space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <UBadge color="info" variant="soft" size="xs">
                {{ item.difficulty }} 난이도
              </UBadge>
              <h3 class="text-lg font-bold text-white mt-2">{{ item.jobTitle }}</h3>
              <p class="text-xs text-gray-400">{{ item.companyName || '목표 기업' }}</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center text-xl">
              🎙️
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between border-t border-white/5">
            <span class="text-[11px] text-gray-500">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            <NuxtLink
              :to="`/interview/${item.id}`"
              class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all"
            >
              면접장 입장 ⚡
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-3">
        <div class="text-4xl">🎙️</div>
        <p class="text-sm">생성된 모의 면접 세션이 없습니다. 신규 면접을 시작해 보세요.</p>
      </div>
    </div>

    <!-- Create Session Modal -->
    <UModal v-model:open="showCreateModal" class="max-w-md">
      <template #header>
        <h2 class="text-xl font-bold text-white">신규 모의 면접 설정</h2>
      </template>

      <template #body>
        <form @submit.prevent="startSession" class="space-y-4">
          <UFormGroup label="지원 직무명">
            <UInput
              v-model="jobTitle"
              placeholder="예: 시니어 풀스택 엔지니어"
              color="info"
            />
          </UFormGroup>

          <UFormGroup label="목표 기업명 (선택)">
            <UInput
              v-model="companyName"
              placeholder="예: 카카오, 네이버, Kairos Labs"
              color="info"
            />
          </UFormGroup>

          <UFormGroup label="면접 난이도">
            <USelect
              v-model="difficulty"
              :options="[
                { label: '주니어 (기초 꼬리질문)', value: 'junior' },
                { label: '미들 (실무 및 행동질문 중심)', value: 'medium' },
                { label: '시니어 (아키텍처 및 심층 기술 질문)', value: 'senior' },
              ]"
              color="info"
            />
          </UFormGroup>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              color="gray"
              variant="soft"
              label="취소"
              @click="showCreateModal = false"
            />
            <UButton
              type="submit"
              color="cyan"
              variant="solid"
              :loading="loading"
              label="면접장 입장 ⚡"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const { data: interviews } = await useFetch<any[]>('/api/interviews')
const showCreateModal = ref(false)
const jobTitle = ref('')
const companyName = ref('')
const difficulty = ref('medium')
const loading = ref(false)
const router = useRouter()

async function startSession() {
  if (!jobTitle.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/interviews', {
      method: 'POST',
      body: {
        jobTitle: jobTitle.value,
        companyName: companyName.value,
        difficulty: difficulty.value,
      },
    })
    router.push(`/interview/${res.session.id}`)
  } catch (err: any) {
    alert('면접 세션 생성에 실패했습니다.')
  } finally {
    loading.value = false
  }
}
</script>
