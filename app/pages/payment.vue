<template>
  <div class="max-w-xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">결제</h1>
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">{{ planLabel }}</h2>
        <p class="text-sm text-fg-neutral-muted">{{ priceLabel }}</p>
      </template>

      <div ref="paymentWidgetRef" class="min-h-[300px]" />

      <template #footer>
        <UButton
          color="purple"
          variant="solid"
          class="w-full"
          :loading="processing"
          :disabled="!ready"
          @click="requestPayment"
        >
          {{ priceLabel }} 결제하기
        </UButton>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const plan = (route.query.plan as string) || 'pro'
const processing = ref(false)
const ready = ref(false)
const paymentWidgetRef = ref<HTMLDivElement>()
let widget: any = null

const planLabel = computed(() => plan === 'pro' ? 'Kairos Pro' : 'Kairos Enterprise')
const priceLabel = computed(() => plan === 'pro' ? '₩19,900/월' : '문의')

onMounted(async () => {
  const clientKey = useRuntimeConfig().public.tossClientKey as string
  if (!clientKey || clientKey.includes('your-client')) {
    ready.value = true
    return
  }

  try {
    const { loadPaymentWidget } = await import('@tosspayments/payment-widget-sdk')
    widget = loadPaymentWidget(clientKey, 'anonymous')

    const { ANONYMOUS } = await import('@tosspayments/payment-widget-sdk')
    await widget.renderPaymentMethods(paymentWidgetRef.value!, {
      value: 19900,
      currency: 'KRW',
      country: 'KR',
    })
    ready.value = true
  } catch {
    ready.value = true
  }
})

async function requestPayment() {
  if (!widget) {
    useToast().add({ title: '테스트 모드: 결제가 완료되었습니다 (데모)', icon: 'i-lucide-check' })
    return
  }
  processing.value = true
  try {
    const orderId = `order-${Date.now().toString(36)}`
    await widget.requestPayment({
      orderId,
      orderName: planLabel.value,
      customerName: '사용자',
      successUrl: `${window.location.origin}/payment/success?orderId=${orderId}&plan=${plan}`,
      failUrl: `${window.location.origin}/payment/fail`,
    })
  } catch (err: any) {
    useToast().add({ title: err.message || '결제가 취소되었습니다.', color: 'red' })
  } finally {
    processing.value = false
  }
}
</script>
