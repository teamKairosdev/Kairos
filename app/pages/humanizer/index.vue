<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
        <span>✨</span> AI 문장 휴머니자이저 (Humanizer)
      </h1>
      <p class="text-xs text-gray-400 mt-1">
        AI 특유의 진부한 어조(~에 대한, ~의 관점에서, 피동형 표현)를 감쪽같이 걷어내고 설득력 높은 자연스러운 인간 문체로 리라이팅합니다.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Input Panel -->
      <div class="glass-panel rounded-2xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span>🤖</span> 원본 AI/정형화된 문장 입력
        </h3>

        <UTextarea
          v-model="originalText"
          :rows="12"
          placeholder="교정할 자기소개서, 이력서 문장 또는 커버레터를 입력하세요..."
          color="amber"
        />

<UButton
  color="amber"
  variant="solid"
  size="lg"
  class="w-full"
  :loading="loading"
  :disabled="!originalText.trim()"
  label="AI 문체 휴머니즈 변환 ⚡"
  @click="processHumanize"
/>
      </div>

      <!-- Result Panel -->
      <div class="glass-panel rounded-2xl p-6 space-y-4 border border-amber-500/20">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-amber-300 flex items-center gap-2">
            <span>✨</span> 자연스러운 인간 작성 변환 결과
          </h3>

          <div v-if="result" class="text-right">
            <span class="text-xs text-gray-400">자연스러움 지수: </span>
            <span class="text-lg font-bold text-amber-400">{{ result.styleScore }}점</span>
          </div>
        </div>

        <div v-if="result" class="space-y-4">
          <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">
            {{ result.humanizedText }}
          </div>

          <div class="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-2">
            <div class="font-bold text-amber-300">💡 변환 요약 & 제거된 상투적 표현</div>
            <p class="text-gray-300">{{ result.changesSummary }}</p>
            <div v-if="result.removedClichés && result.removedClichés.length > 0" class="flex flex-wrap gap-1.5 pt-1">
              <UBadge
                v-for="(c, idx) in result.removedClichés"
                :key="idx"
color="red"
  variant="soft"
                size="xs"
              >
                <s>{{ c }}</s>
              </UBadge>
            </div>
          </div>
        </div>

        <div v-else class="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
          <div class="text-3xl">✨</div>
          <p class="text-xs">왼쪽에서 문장을 입력하고 변환 버튼을 누르면 이곳에 세련된 변환 결과가 표시됩니다.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const originalText = ref(`본 지원자는 지난 3년간 웹 프론트엔드 개발 프로젝트 수행에 있어 프론트엔드 성능 최적화 관점에서 다각도로 접근하여 효율적인 리팩토링을 완수함에 있어 큰 성과를 거두었습니다.`)
const loading = ref(false)
const result = ref<any>(null)

async function processHumanize() {
  if (!originalText.value.trim()) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/humanizer/process', {
      method: 'POST',
      body: { originalText: originalText.value },
    })
    result.value = res
  } catch (err: any) {
    alert('휴머니나이즈 변환에 실패했습니다.')
  } finally {
    loading.value = false
  }
}
</script>
