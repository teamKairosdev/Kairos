<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-xl font-semibold text-white">휴머나이저</h1>
      <p class="text-xs text-gray-500 mt-0.5">AI 문체를 자연스러운 인간 어조로 변환합니다</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-xl border border-white/5 p-6 bg-white/[0.02] space-y-4">
        <h3 class="text-sm font-medium text-white">원본 문장</h3>
        <UTextarea v-model="originalText" :rows="12" placeholder="교정할 문장을 입력하세요..." />
        <UButton color="black" variant="solid" size="lg" class="w-full" :loading="loading" :disabled="!originalText.trim()" label="변환" @click="processHumanize" />
      </div>

      <div class="rounded-xl border border-white/5 p-6 bg-white/[0.02] space-y-4">
        <h3 class="text-sm font-medium text-white">변환 결과</h3>
        <div v-if="result" class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">자연스러움</span>
            <span class="text-base font-medium text-white">{{ result.styleScore }}</span>
          </div>
          <div class="p-4 rounded-lg bg-white/5 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{{ result.humanizedText }}</div>
          <div class="p-4 rounded-lg bg-white/5 text-xs space-y-2">
            <div class="font-medium text-gray-400">변환 요약</div>
            <p class="text-gray-500">{{ result.changesSummary }}</p>
            <div v-if="result.removedClichés && result.removedClichés.length > 0" class="flex flex-wrap gap-1.5 pt-1">
              <UBadge v-for="(c, idx) in result.removedClichés" :key="idx" color="red" variant="soft" size="xs"><s>{{ c }}</s></UBadge>
            </div>
          </div>
        </div>
        <div v-else class="h-64 flex items-center justify-center text-center text-gray-600">
          <p class="text-xs">문장을 입력하고 변환 버튼을 누르세요</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const originalText = ref('본 지원자는 지난 3년간 웹 프론트엔드 개발 프로젝트 수행에 있어 프론트엔드 성능 최적화 관점에서 다각도로 접근하여 효율적인 리팩토링을 완수함에 있어 큰 성과를 거두었습니다.')
const loading = ref(false)
const result = ref<any>(null)

async function processHumanize() {
  if (!originalText.value.trim()) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/humanizer/process', { method: 'POST', body: { originalText: originalText.value } })
    result.value = res
  } catch { alert('변환 실패') }
  finally { loading.value = false }
}
</script>
