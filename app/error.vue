<template>
  <UApp>
    <div class="min-h-screen bg-bg-neutral-default text-fg-neutral flex flex-col items-center justify-center px-4 text-center">
      <div class="space-y-x4 max-w-md">
        <div class="text-6xl font-bold text-fg-brand">
          {{ error.statusCode || 500 }}
        </div>
        <h1 class="text-2xl font-semibold text-fg-neutral">
          {{ error.statusCode === 404 ? '페이지를 찾을 수 없습니다' : '오류가 발생했습니다' }}
        </h1>
        <p class="text-fg-neutral-muted text-sm">
          {{ error.statusCode === 404 ? '요청하신 페이지가 존재하지 않거나 이동되었습니다.' : '잠시 후 다시 시도해 주세요.' }}
        </p>
        <div class="pt-x4">
          <NuxtLink to="/" class="px-x4 py-x2 rounded-r1 bg-fg-neutral text-bg-neutral-default text-sm font-medium hover:bg-neutral-strong transition-colors">
            홈으로 돌아가기
          </NuxtLink>
        </div>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
interface Props {
  error: { statusCode?: number; statusMessage?: string; message?: string }
}
const props = defineProps<Props>()

useHead({
  htmlAttrs: {
    'data-seed-color-mode': 'system',
    'data-seed-user-color-scheme': 'dark',
  },
  title: `Error ${props.error.statusCode || 500} — Kairos`,
})
</script>
