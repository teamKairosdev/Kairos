<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <p class="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-1">Text Humanizer</p>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">휴머나이저</h1>
      <p class="text-sm text-gray-500 mt-1">AI 특유의 딱딱한 문체를 자연스럽고 생동감 있는 어조로 변환합니다.</p>
    </div>

    <!-- Main split layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <!-- Input Panel -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-violet-400"></div>
            <span class="text-sm font-semibold text-gray-700">원본 문장</span>
          </div>
          <span class="text-xs text-gray-400">{{ originalText.length }}자</span>
        </div>
        <div class="flex-1 p-5">
          <textarea
            v-model="originalText"
            rows="12"
            placeholder="AI가 작성한 딱딱한 문장이나 자소서를 붙여넣으세요..."
            class="w-full text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none leading-relaxed h-full min-h-[200px]"
          ></textarea>
        </div>
        <div class="px-5 pb-5">
          <button
            @click="processHumanize"
            :disabled="!originalText.trim() || loading"
            class="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {{ loading ? '변환 중...' : '인간화 변환' }}
          </button>
        </div>
      </div>

      <!-- Result Panel -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" :class="result ? 'bg-emerald-400' : 'bg-gray-200'"></div>
            <span class="text-sm font-semibold text-gray-700">변환 결과</span>
          </div>
          <div v-if="result" class="flex items-center gap-2">
            <span class="text-xs text-gray-400">자연스러움</span>
            <span class="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{{ result.styleScore }}</span>
          </div>
        </div>

        <div class="flex-1 p-5">
          <div v-if="result" class="space-y-4 h-full">
            <!-- Humanized text -->
            <div class="relative">
              <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{{ result.humanizedText }}</p>
              <button
                @click="copyResult"
                class="absolute top-0 right-0 px-2.5 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
              >복사</button>
            </div>

            <!-- Changes summary -->
            <div class="mt-4 pt-4 border-t border-gray-50 space-y-3">
              <div>
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">변환 요약</p>
                <p class="text-xs text-gray-600 leading-relaxed">{{ result.changesSummary }}</p>
              </div>
              <div v-if="result.removedClichés && result.removedClichés.length > 0">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">제거된 클리셰</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="(c, idx) in result.removedClichés" :key="idx" class="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full line-through">{{ c }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-3 text-gray-400">
            <div class="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
              <svg class="w-6 h-6 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p class="text-sm">왼쪽에 문장을 입력하고<br/><strong class="text-gray-600">인간화 변환</strong>을 눌러보세요</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const originalText = ref('')
const loading = ref(false)
const result = ref<any>(null)

async function processHumanize() {
  if (!originalText.value.trim()) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/humanizer/process', { method: 'POST', body: { originalText: originalText.value } })
    result.value = res
  } catch (err: any) {
    toast.add({ title: '변환 실패', description: err.data?.message || '휴머나이저 변환 중 오류가 발생했습니다.', color: 'red' })
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value?.humanizedText) return
  try {
    await navigator.clipboard.writeText(result.value.humanizedText)
    toast.add({ title: '클립보드에 복사되었습니다.', color: 'green' })
  } catch {
    toast.add({ title: '복사에 실패했습니다.', color: 'red' })
  }
}
</script>
