<template>
  <div class="space-y-8">
    <div>
        <h1 class="text-2xl font-extrabold text-white">예상 면접 Q&A 플래시카드 생성기
      </h1>
      <p class="text-xs text-gray-400 mt-1">
        지원 직무와 경력 사항을 기반으로 적중률 높고 심도 있는 예상 질문과 최고 품질 모범 답안 세트를 생성합니다.
      </p>
    </div>

    <!-- Generator Input Panel -->
    <div class="glass-panel rounded-2xl p-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormGroup label="목표 지원 직무">
          <UInput
            v-model="targetRole"
            placeholder="예: 백엔드 테크 리드"
            color="primary"
          />
        </UFormGroup>

        <UFormGroup label="생성할 질문 개수">
          <USelect
            v-model="questionCount"
            :options="[
              { label: '3 개 질문 세트', value: 3 },
              { label: '5 개 질문 세트', value: 5 },
              { label: '7 개 질문 세트', value: 7 },
            ]"
            color="primary"
          />
        </UFormGroup>
      </div>

      <UFormGroup label="본인 경력 요약 또는 기술 배경">
        <UTextarea
          v-model="careerSummary"
          :rows="4"
          placeholder="주요 프로젝트, 사용 언어/프레임워크, 해결한 난관 등을 요약해 입력하세요..."
          color="primary"
        />
      </UFormGroup>

      <UButton
        color="primary"
        variant="solid"
        size="lg"
        class="w-full"
        :loading="loading"
        :disabled="!targetRole || !careerSummary"
        label="Q&A 질문/모범답안 세트 생성 ⚡"
        @click="generateQA"
      />
    </div>

    <!-- Generated Q&A Cards List -->
    <div v-if="qaSet" class="space-y-4">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <span>📚</span> {{ qaSet.targetRole }} 맞춤형 Q&A 플래시카드
      </h2>

      <div class="space-y-4">
        <div
          v-for="(qa, idx) in qaSet.qaPairs"
          :key="idx"
          class="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/40 transition-all"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UBadge color="primary" variant="subtle" size="xs">
                  Q{{ Number(idx) + 1 }} · {{ qa.questionCategory }}
                </UBadge>
                <span class="text-[10px] text-gray-400">난이도: {{ qa.difficulty }}</span>
              </div>
              <h3 class="text-base font-bold text-white leading-relaxed">{{ qa.question }}</h3>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div class="text-xs font-bold text-emerald-400">✅ 추천 모범 답변 (Model Answer)</div>
            <p class="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{{ qa.sampleAnswer }}</p>
          </div>

          <div v-if="qa.keyPoints && qa.keyPoints.length > 0" class="flex flex-wrap gap-2 pt-1">
            <span class="text-xs text-purple-300 font-semibold">핵심 수록 포인트:</span>
            <UBadge
              v-for="(kp, kIdx) in qa.keyPoints"
              :key="kIdx"
              color="primary"
              variant="subtle"
              size="xs"
            >
              #{{ kp }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const targetRole = ref('시니어 풀스택 개발자')
const questionCount = ref(5)
const careerSummary = ref(`TypeScript, Nuxt 4, Node.js 기반 Web App 구축 4년 경력. PostgreSQL 및 pgvector 시맨틱 검색 엔진 구현 경험 보유.`)
const loading = ref(false)
const qaSet = ref<any>(null)

async function generateQA() {
  if (!targetRole.value || !careerSummary.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/qa/generate', {
      method: 'POST',
      body: {
        targetRole: targetRole.value,
        careerSummary: careerSummary.value,
        count: questionCount.value,
      },
    })
    qaSet.value = res.qaSet
  } catch (err: any) {
    alert('Q&A 세트 생성에 실패했습니다.')
  } finally {
    loading.value = false
  }
}
</script>
