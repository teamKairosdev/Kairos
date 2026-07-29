<template>
  <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-fg-neutral-muted tracking-wide">{{ label }}</p>
        <p class="text-2xl font-semibold text-fg-neutral mt-1">{{ value }}</p>
      </div>
      <div class="w-10 h-10 rounded-lg bg-neutral-muted flex items-center justify-center text-fg-neutral-muted">
        <UIcon v-if="icon.startsWith('i-')" :name="icon" class="w-5 h-5" />
        <span v-else class="text-lg">{{ icon }}</span>
      </div>
    </div>
    <div v-if="trend" class="mt-3 flex items-center gap-1 text-xs" :class="trendPositive ? 'text-fg-brand' : 'text-fg-neutral-muted'">
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
