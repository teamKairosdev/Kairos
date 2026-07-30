<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <p class="text-xs font-semibold tracking-widest text-teal-500 uppercase mb-1">Q&A Generator</p>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">면접 Q&A 생성</h1>
      <p class="text-sm text-gray-500 mt-1">직무와 경력을 분석하여 실전 면접 예상 질문과 모범 답안을 생성합니다.</p>
    </div>

    <!-- Config Panel -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-5">
      <h2 class="text-sm font-semibold text-gray-700">생성 설정</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">지원 직무 <span class="text-red-400">*</span></label>
          <input v-model="targetRole" type="text" placeholder="예: 시니어 풀스택 엔지니어" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">질문 개수</label>
          <div class="flex gap-2">
            <button
              v-for="n in [3, 5, 7, 10]"
              :key="n"
              @click="questionCount = n"
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
              :class="questionCount === n ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'"
            >{{ n }}</button>
          </div>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1.5">경력 요약 <span class="text-red-400">*</span></label>
        <textarea
          v-model="careerSummary"
          rows="4"
          placeholder="주요 프로젝트, 사용한 기술 스택, 성과 등을 요약해주세요. AI가 이를 기반으로 맞춤 질문을 생성합니다."
          class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all resize-none leading-relaxed"
        ></textarea>
      </div>
      <button
        @click="generateQA"
        :disabled="!targetRole.trim() || !careerSummary.trim() || loading"
        class="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        {{ loading ? 'AI가 질문을 생성하고 있습니다...' : `${questionCount}개 Q&A 생성` }}
      </button>
    </div>

    <!-- Q&A Results -->
    <div v-if="qaSet" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-widest">
          {{ qaSet.targetRole }} 맞춤 Q&A
        </h2>
        <span class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{{ qaSet.qaPairs?.length }}개</span>
      </div>

      <div class="space-y-4">
        <div
          v-for="(qa, idx) in qaSet.qaPairs"
          :key="idx"
          class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden"
        >
          <!-- Question -->
          <div class="px-6 py-4 flex items-start gap-4">
            <div class="shrink-0 w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-600">
              Q{{ Number(idx) + 1 }}
            </div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="{
                    'bg-green-50 text-green-700': qa.difficulty === 'easy' || qa.difficulty === '기초',
                    'bg-amber-50 text-amber-700': qa.difficulty === 'medium' || qa.difficulty === '중급',
                    'bg-red-50 text-red-700': qa.difficulty === 'hard' || qa.difficulty === '심화',
                  }"
                >{{ qa.difficulty }}</span>
              </div>
              <p class="text-sm font-semibold text-gray-900 leading-relaxed">{{ qa.question }}</p>
            </div>
          </div>

          <!-- Answer -->
          <div class="px-6 pb-5 border-t border-gray-50 pt-4 space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-4 h-4 rounded flex items-center justify-center bg-emerald-100 text-emerald-600 text-xs">A</div>
              <span class="text-xs font-semibold text-emerald-600">모범 답안</span>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{{ qa.sampleAnswer }}</p>

            <div v-if="qa.keyPoints && qa.keyPoints.length > 0" class="flex flex-wrap gap-1.5 pt-1">
              <span class="text-xs text-gray-400 font-medium">핵심 키워드:</span>
              <span v-for="(kp, kIdx) in qa.keyPoints" :key="kIdx" class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">#{{ kp }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const targetRole = ref('')
const questionCount = ref(5)
const careerSummary = ref('')
const loading = ref(false)
const qaSet = ref<any>(null)

async function generateQA() {
  if (!targetRole.value || !careerSummary.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/qa/generate', {
      method: 'POST',
      body: { targetRole: targetRole.value, careerSummary: careerSummary.value, count: questionCount.value },
    })
    qaSet.value = res.qaSet
  } catch (err: any) {
    toast.add({ title: 'Q&A 생성 실패', description: err.data?.message || 'Q&A 생성 중 오류가 발생했습니다.', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
