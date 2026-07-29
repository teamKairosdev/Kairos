<template>
  <div class="max-w-lg mx-auto p-6 text-center">
    <div v-if="verifying">
      <UIcon name="i-lucide-loader-2" class="w-12 h-12 mx-auto mb-4 animate-spin text-purple-400" />
      <h1 class="text-xl font-bold">결제 확인 중...</h1>
    </div>

    <template v-else-if="error">
      <UIcon name="i-lucide-x-circle" class="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h1 class="text-2xl font-bold mb-2">결제 실패</h1>
      <p class="text-fg-neutral-muted mb-6">{{ error }}</p>
      <UButton color="purple" to="/premium">다시 시도</UButton>
    </template>

    <template v-else>
      <UIcon name="i-lucide-check-circle" class="w-16 h-16 text-green-400 mx-auto mb-4" />
      <h1 class="text-2xl font-bold mb-2">결제 완료</h1>
      <p class="text-fg-neutral-muted mb-6">{{ planLabel }} 구독이 시작되었습니다.</p>
      <UButton color="purple" to="/">대시보드로 이동</UButton>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const plan = route.query.plan as string || 'pro'
const verifying = ref(true)
const error = ref('')

const planLabel = computed(() => plan === 'pro' ? 'Kairos Pro' : 'Kairos Enterprise')

onMounted(async () => {
  const orderId = route.query.orderId as string
  const paymentKey = route.query.paymentKey as string
  const amount = parseInt(route.query.amount as string) || 19900

  if (!orderId || !paymentKey) {
    error.value = '결제 정보가 누락되었습니다.'
    verifying.value = false
    return
  }

  try {
    await $fetch('/api/payment/verify', {
      method: 'POST',
      body: { orderId, paymentKey, amount, plan },
    })
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || '결제 확인 중 오류가 발생했습니다.'
  } finally {
    verifying.value = false
  }
})
</script>
