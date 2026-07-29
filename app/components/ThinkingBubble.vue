<template>
  <div v-if="active" class="rounded-lg border border-stroke-brand-muted bg-bg-neutral-muted p-3.5 space-y-2.5 backdrop-blur-sm transition-all duration-300">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-fg-brand opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-fg-brand"></span>
        </div>
        <span class="text-xs font-semibold text-fg-brand tracking-wide uppercase">Kairos AI Thinking Engine</span>
      </div>
      <span class="text-[10px] text-fg-brand font-mono">Step {{ step }}/{{ totalSteps }}</span>
    </div>

    <div class="flex items-start gap-2.5 text-xs text-fg-neutral leading-relaxed">
      <div class="pt-0.5">
        <UIcon name="i-lucide-brain-circuit" class="w-4 h-4 text-fg-brand animate-pulse" />
      </div>
      <div class="flex-1 space-y-1">
        <p class="font-medium">{{ stepTitle }}</p>
        <p v-if="thinkingDetails" class="text-[11px] text-fg-neutral-muted font-mono leading-normal whitespace-pre-wrap line-clamp-3">
          {{ thinkingDetails }}
        </p>
      </div>
    </div>

    <div class="w-full bg-bg-neutral-strong rounded-full h-1 overflow-hidden">
      <div
        class="bg-gradient-to-r from-fg-brand via-fg-brand to-fg-info h-full transition-all duration-500"
        :style="{ width: `${(step / totalSteps) * 100}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  active?: boolean
  step?: number
  totalSteps?: number
  stepTitle?: string
  thinkingDetails?: string
}

withDefaults(defineProps<Props>(), {
  active: false,
  step: 1,
  totalSteps: 3,
  stepTitle: '의도 파악 및 경험 벡터 매칭 중...',
  thinkingDetails: '',
})
</script>
