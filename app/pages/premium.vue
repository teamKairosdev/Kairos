<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="text-center mb-10">
      <h1 class="text-3xl font-bold mb-3">Kairos Premium</h1>
      <p class="text-fg-neutral-muted">AI 커리어 도구를 무제한으로 활용하세요</p>
    </div>

    <!-- Current Usage Stats -->
    <UCard v-if="usageData" class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">이번 달 사용량</h2>
          <UBadge :color="usageData.plan === 'free' ? 'neutral' : 'purple'" variant="soft">
            {{ usageData.plan.toUpperCase() }}
          </UBadge>
        </div>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="item in usageStats" :key="item.key" class="text-center p-3 rounded-lg bg-white/5">
          <p class="text-xs text-fg-neutral-muted">{{ item.label }}</p>
          <p class="text-xl font-bold mt-1">{{ item.used }}</p>
          <p class="text-xs text-fg-neutral-muted">/ {{ item.limit }}</p>
          <UProgress :value="item.percent" :color="item.percent > 80 ? 'red' : item.percent > 50 ? 'yellow' : 'purple'" class="mt-2" />
        </div>
      </div>
    </UCard>

    <!-- Plan Cards -->
    <div class="grid md:grid-cols-3 gap-6">
      <UCard v-for="plan in plans" :key="plan.name" class="relative" :ui="{ divide: 'divide-y divide-white/5' }">
        <template #header>
          <div v-if="currentPlan === plan.name.toLowerCase()" class="absolute -top-2 -right-2">
            <UBadge color="purple" variant="solid" size="sm">현재</UBadge>
          </div>
          <h3 class="text-lg font-semibold">{{ plan.name }}</h3>
          <p class="text-sm text-fg-neutral-muted">{{ plan.desc }}</p>
        </template>

        <div class="py-4 text-center">
          <span class="text-3xl font-bold">{{ plan.price }}</span>
          <span class="text-fg-neutral-muted text-sm">/{{ plan.period }}</span>
        </div>

        <div class="space-y-2 py-4">
          <div v-for="f in plan.features" :key="f" class="flex items-center gap-2 text-sm">
            <UIcon name="i-lucide-check" class="text-fg-success w-4 h-4" />
            <span>{{ f }}</span>
          </div>
        </div>

        <template #footer>
          <UButton
            :color="currentPlan === plan.name.toLowerCase() ? 'neutral' : 'purple'"
            :variant="currentPlan === plan.name.toLowerCase() ? 'outline' : 'solid'"
            class="w-full"
            :label="currentPlan === plan.name.toLowerCase() ? '현재 요금제' : plan.cta"
            :disabled="currentPlan === plan.name.toLowerCase()"
            @click="subscribe(plan)"
          />
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const router = useRouter()
const usageData = ref<any>(null)
const currentPlan = ref('free')

const plans = [
  {
    name: 'Free',
    desc: '기본 기능',
    price: '₩0',
    period: '월',
    cta: '현재 요금제',
    features: ['채팅 50회/월', 'ATS 분석 10회/월', 'AI 이미지 5회/월', '문서 3개'],
  },
  {
    name: 'Pro',
    desc: '프리미엄 기능',
    price: '₩19,900',
    period: '월',
    cta: 'Pro 시작하기',
    features: ['채팅 500회/월', 'ATS 분석 100회/월', 'AI 이미지 50회/월', '문서 30개', '모든 고급 기능', '우선 지원'],
  },
  {
    name: 'Enterprise',
    desc: '팀/기업용',
    price: '₩99,000',
    period: '월',
    cta: '업그레이드',
    features: ['Pro 모든 기능', '무제한 사용량', '팀 계정 5인', 'API 액세스', '전용 온보딩', 'SLA 보장'],
  },
]

const usageStats = computed(() => {
  if (!usageData.value) return []
  const { limits, usage } = usageData.value
  const features = [
    { key: 'chat', label: '채팅' },
    { key: 'ats', label: 'ATS 분석' },
    { key: 'studio', label: 'AI 이미지' },
    { key: 'hwp', label: '문서' },
  ]
  return features.map(f => ({
    ...f,
    used: usage[f.key] || 0,
    limit: limits[f.key] || 0,
    percent: limits[f.key] ? Math.min(100, ((usage[f.key] || 0) / limits[f.key]) * 100) : 0,
  }))
})

onMounted(async () => {
  try {
    usageData.value = await $fetch('/api/billing/usage')
    currentPlan.value = usageData.value.plan || 'free'
  } catch {}
})

function subscribe(plan: any) {
  if (plan.name === 'Free') return
  if (plan.name === 'Enterprise') {
    window.location.href = 'mailto:hello@kairos.ai'
    return
  }
  router.push(`/payment?plan=${plan.name.toLowerCase()}`)
}
</script>
