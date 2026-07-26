<template>
  <div class="glass-card rounded-2xl p-5 relative overflow-hidden group">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ label }}</p>
        <h3 class="text-2xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform origin-left">
          {{ value }}
        </h3>
      </div>
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
        {{ icon }}
      </div>
    </div>
    <div v-if="trend" class="mt-3 flex items-center gap-1 text-xs" :class="trendPositive ? 'text-emerald-400' : 'text-purple-400'">
      <span>{{ trendPositive ? '↑' : '✦' }}</span>
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
