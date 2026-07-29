<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-white">AI 모의 면접</h1>
        <p class="text-xs text-gray-500 mt-0.5">SSE 실시간 스트리밍 기반 맞춤형 면접</p>
      </div>
      <UButton color="black" variant="solid" icon="i-lucide-zap" label="새 면접 시작" @click="showCreateModal = true" />
    </div>

    <div class="space-y-4">
      <h2 class="text-base font-medium text-white">면접 세션</h2>
      <div v-if="interviews && interviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="item in interviews" :key="item.id" class="rounded-xl border border-white/5 p-5 bg-white/[0.02] hover:border-white/20 transition-colors space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <UBadge color="neutral" variant="soft" size="xs">{{ item.difficulty }}</UBadge>
              <h3 class="text-base font-medium text-white mt-1.5">{{ item.jobTitle }}</h3>
              <p class="text-xs text-gray-500">{{ item.companyName || '일반' }}</p>
            </div>
          </div>
          <div class="pt-2 flex items-center justify-between border-t border-white/5">
            <span class="text-xs text-gray-600">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            <NuxtLink :to="`/interview/${item.id}`" class="px-3 py-1 rounded-lg bg-white/10 text-gray-300 text-xs hover:bg-white/15 transition-colors">입장</NuxtLink>
          </div>
        </div>
      </div>
      <div v-else class="rounded-xl border border-white/5 p-12 text-center text-gray-500 bg-white/[0.02]">
        <p class="text-sm">면접 세션이 없습니다.</p>
      </div>
    </div>

    <UModal v-model:open="showCreateModal">
      <template #header>
        <h2 class="text-lg font-semibold text-white">새 면접 설정</h2>
      </template>
      <template #body>
        <form @submit.prevent="startSession" class="space-y-4">
          <UFormGroup label="지원 직무">
            <UInput v-model="jobTitle" placeholder="예: 시니어 풀스택 엔지니어" />
          </UFormGroup>
          <UFormGroup label="목표 기업 (선택)">
            <UInput v-model="companyName" placeholder="예: 카카오, 네이버" />
          </UFormGroup>
          <UFormGroup label="난이도">
            <USelect v-model="difficulty" :options="[
              { label: '주니어', value: 'junior' },
              { label: '미들', value: 'medium' },
              { label: '시니어', value: 'senior' },
            ]" />
          </UFormGroup>
          <div class="flex justify-end gap-3 pt-2">
            <UButton color="neutral" variant="soft" label="취소" @click="showCreateModal = false" />
            <UButton type="submit" color="black" variant="solid" :loading="loading" label="시작" />
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
    const res: any = await $fetch('/api/interviews', { method: 'POST', body: { jobTitle: jobTitle.value, companyName: companyName.value, difficulty: difficulty.value } })
    router.push(`/interview/${res.session.id}`)
  } catch { alert('면접 생성 실패') }
  finally { loading.value = false }
}
</script>
