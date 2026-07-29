<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-xl font-semibold text-fg-neutral">Q&A 생성</h1>
      <p class="text-xs text-fg-neutral-muted mt-0.5">직무와 경력 기반 예상 면접 질문을 생성합니다</p>
    </div>

    <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormGroup label="지원 직무">
          <UInput v-model="targetRole" placeholder="예: 백엔드 테크 리드" />
        </UFormGroup>
        <UFormGroup label="질문 개수">
          <USelect v-model="questionCount" :options="[
            { label: '3개', value: 3 },
            { label: '5개', value: 5 },
            { label: '7개', value: 7 },
          ]" />
        </UFormGroup>
      </div>
      <UFormGroup label="경력 요약">
        <UTextarea v-model="careerSummary" :rows="4" placeholder="주요 프로젝트, 기술 스택 등을 요약하세요..." />
      </UFormGroup>
      <UButton color="black" variant="solid" size="lg" class="w-full" :loading="loading" :disabled="!targetRole || !careerSummary" label="생성" @click="generateQA" />
    </div>

    <div v-if="qaSet" class="space-y-4">
      <h2 class="text-base font-medium text-fg-neutral">{{ qaSet.targetRole }} 맞춤 Q&A</h2>
      <div class="space-y-4">
        <div v-for="(qa, idx) in qaSet.qaPairs" :key="idx" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="soft" size="xs">Q{{ Number(idx) + 1 }}</UBadge>
                <span class="text-xs text-fg-neutral-muted">{{ qa.difficulty }}</span>
              </div>
              <h3 class="text-base font-medium text-fg-neutral leading-relaxed">{{ qa.question }}</h3>
            </div>
          </div>
          <div class="p-4 rounded-lg bg-neutral-muted space-y-2">
            <div class="text-xs font-medium text-fg-success">모범 답안</div>
            <p class="text-xs text-fg-neutral-muted leading-relaxed whitespace-pre-wrap">{{ qa.sampleAnswer }}</p>
          </div>
          <div v-if="qa.keyPoints && qa.keyPoints.length > 0" class="flex flex-wrap gap-1.5">
            <span class="text-xs text-fg-neutral-muted">핵심:</span>
            <UBadge v-for="(kp, kIdx) in qa.keyPoints" :key="kIdx" color="neutral" variant="soft" size="xs">#{{ kp }}</UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const targetRole = ref('시니어 풀스택 개발자')
const questionCount = ref(5)
const careerSummary = ref('TypeScript, Nuxt 4, Node.js 기반 Web App 구축 4년 경력. PostgreSQL 및 pgvector 시맨틱 검색 엔진 구현 경험.')
const loading = ref(false)
const qaSet = ref<any>(null)

async function generateQA() {
  if (!targetRole.value || !careerSummary.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/qa/generate', { method: 'POST', body: { targetRole: targetRole.value, careerSummary: careerSummary.value, count: questionCount.value } })
    qaSet.value = res.qaSet
  } catch (err: any) {
    toast.add({ title: 'Q&A 생성 실패', description: err.data?.message || 'Q&A 생성 중 오류가 발생했습니다.', color: 'red' })
  }
  finally { loading.value = false }
}
</script>
