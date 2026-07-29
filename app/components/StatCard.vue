<template>
  <div class="rounded-xl border border-white/5 p-5 bg-white/[0.02]">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-gray-500 tracking-wide">{{ label }}</p>
        <p class="text-2xl font-semibold text-white mt-1">{{ value }}</p>
      </div>
      <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg text-gray-400">
        {{ icon }}
      </div>
    </div>
    <div v-if="trend" class="mt-3 flex items-center gap-1 text-xs" :class="trendPositive ? 'text-emerald-400' : 'text-gray-500'">
      <span>{{ trendPositive ? '↑' : '·' }}</span>
      <span>{{ trend }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  trend?: string
  trendPositive?: boolean
}>()
</script>
