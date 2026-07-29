<template>
  <div class="max-w-lg mx-auto p-6 text-center">
    <UIcon name="i-lucide-x-circle" class="w-16 h-16 text-fg-danger mx-auto mb-4" />
    <h1 class="text-2xl font-bold mb-2">결제 실패</h1>
    <p class="text-fg-neutral-muted mb-6">{{ route.query.message || '결제가 취소되었습니다. 다시 시도해 주세요.' }}</p>
    <UButton color="purple" to="/premium">다시 시도</UButton>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
