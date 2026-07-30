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
        <div v-if="error.statusMessage && error.statusCode && error.statusCode !== 404" class="text-fg-danger-muted text-xs">
          {{ error.statusMessage }}
        </div>
        <div class="flex gap-x3 pt-x4 justify-center">
          <button
            class="px-x4 py-x2 rounded-r1 bg-fg-neutral text-bg-neutral-default text-sm font-medium hover:bg-neutral-strong transition-colors"
            @click="handleGoHome"
          >
            홈으로 돌아가기
          </button>
          <button
            class="px-x4 py-x2 rounded-r1 border border-border-neutral-default text-fg-neutral text-sm font-medium hover:bg-bg-neutral-elevated transition-colors"
            @click="handleRetry"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
interface Props {
  error: { statusCode?: number; statusMessage?: string; message?: string; url?: string }
}
const props = defineProps<Props>()

useHead({
  htmlAttrs: {
    'data-seed-color-mode': 'light',
  },
  title: `Error ${props.error.statusCode || 500} — Kairos`,
})

console.error(`[${props.error.statusCode || 500}] ${props.error.url || 'unknown'} — ${props.error.statusMessage || props.error.message || 'Unknown error'}`)

function handleGoHome() {
  clearError({ redirect: '/' })
}

function handleRetry() {
  clearError({ redirect: props.error.url || '/' })
}
</script>
