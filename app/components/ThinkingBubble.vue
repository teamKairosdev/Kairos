<template>
  <div v-if="active" class="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3.5 space-y-2.5 backdrop-blur-sm transition-all duration-300">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
        </div>
        <span class="text-xs font-semibold text-purple-300 tracking-wide uppercase">Kairos AI Thinking Engine</span>
      </div>
      <span class="text-[10px] text-purple-400 font-mono">Step {{ step }}/{{ totalSteps }}</span>
    </div>

    <!-- Thinking Message & Animation -->
    <div class="flex items-start gap-2.5 text-xs text-purple-200/90 leading-relaxed">
      <div class="pt-0.5">
        <UIcon name="i-lucide-brain-circuit" class="w-4 h-4 text-purple-400 animate-pulse" />
      </div>
      <div class="flex-1 space-y-1">
        <p class="font-medium">{{ stepTitle }}</p>
        <p v-if="thinkingDetails" class="text-[11px] text-purple-300/70 font-mono leading-normal whitespace-pre-wrap line-clamp-3">
          {{ thinkingDetails }}
        </p>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="w-full bg-purple-950/60 rounded-full h-1 overflow-hidden">
      <div 
        class="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full transition-all duration-500"
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
