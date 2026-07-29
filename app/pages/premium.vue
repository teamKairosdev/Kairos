<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="text-center mb-10">
      <h1 class="text-3xl font-bold mb-3">Kairos Premium</h1>
      <p class="text-fg-neutral-muted">AI 커리어 도구를 무제한으로 활용하세요</p>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      <UCard v-for="plan in plans" :key="plan.name" class="relative" :ui="{ divide: 'divide-y divide-white/5' }">
        <template #header>
          <h3 class="text-lg font-semibold">{{ plan.name }}</h3>
          <p class="text-sm text-fg-neutral-muted">{{ plan.desc }}</p>
        </template>

        <div class="py-4 text-center">
          <span class="text-3xl font-bold">{{ plan.price }}</span>
          <span class="text-fg-neutral-muted text-sm">/{{ plan.period }}</span>
        </div>

        <div class="space-y-2 py-4">
          <div v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-sm">
            <UIcon name="i-lucide-check" class="text-green-400 w-4 h-4" />
            <span>{{ f }}</span>
          </div>
        </div>

        <template #footer>
          <UButton
            color="purple"
            variant="solid"
            class="w-full"
            :label="plan.cta"
            @click="subscribe(plan)"
          />
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const plans = [
  {
    name: 'Free',
    desc: '기본 기능',
    price: '₩0',
    period: '월',
    cta: '현재 요금제',
    features: ['이력서 3개', '모의 면접 5회/월', 'ATS 분석 3회/월', '휴머나이저 10회/월'],
  },
  {
    name: 'Pro',
    desc: '프리미엄 기능',
    price: '₩19,900',
    period: '월',
    cta: 'Pro 시작하기',
    features: ['이력서 무제한', '모의 면접 무제한', 'ATS 분석 무제한', '휴머나이저 무제한', 'Q&A 생성 무제한', '우선 지원'],
  },
  {
    name: 'Enterprise',
    desc: '팀/기업용',
    price: '₩99,000',
    period: '월',
    cta: '문의하기',
    features: ['Pro 모든 기능', '팀 계정 5인', 'API 액세스', '전용 온보딩', 'SLA 보장'],
  },
]

function subscribe(plan: any) {
  if (plan.name === 'Free') return
  if (plan.name === 'Enterprise') {
    window.location.href = 'mailto:hello@kairos.ai'
    return
  }
  navigateTo(`/payment?plan=${plan.name.toLowerCase()}`)
}
</script>
