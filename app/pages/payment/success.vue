<template>
  <div class="max-w-lg mx-auto p-6 text-center">
    <UIcon name="i-lucide-check-circle" class="w-16 h-16 text-green-400 mx-auto mb-4" />
    <h1 class="text-2xl font-bold mb-2">결제 완료</h1>
    <p class="text-fg-neutral-muted mb-6">{{ planLabel }} 구독이 시작되었습니다.</p>
    <UButton color="purple" to="/">대시보드로 이동</UButton>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const plan = route.query.plan as string || 'pro'
const planLabel = plan === 'pro' ? 'Kairos Pro' : 'Kairos Enterprise'
</script>
