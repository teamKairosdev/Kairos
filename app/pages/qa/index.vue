<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-extrabold text-white flex items-center gap-2">
        <span>💡</span> 예상 면접 Q&A 플래시카드 생성기
      </h1>
      <p class="text-xs text-gray-400 mt-1">
        지원 직무와 경력 사항을 기반으로 적중률 높고 심도 있는 예상 질문과 최고 품질 모범 답안 세트를 생성합니다.
      </p>
    </div>

    <!-- Generator Input Panel -->
    <div class="glass-panel rounded-2xl p-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">목표 지원 직무</label>
          <input
            v-model="targetRole"
            type="text"
            placeholder="예: 백엔드 테크 리드"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">생성할 질문 개수</label>
          <select
            v-model="questionCount"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option :value="3">3 개 질문 세트</option>
            <option :value="5">5 개 질문 세트</option>
            <option :value="7">7 개 질문 세트</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-300 mb-1">본인 경력 요약 또는 기술 배경</label>
        <textarea
          v-model="careerSummary"
          rows="4"
          placeholder="주요 프로젝트, 사용 언어/프레임워크, 해결한 난관 등을 요약해 입력하세요..."
          class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
        ></textarea>
      </div>

      <button
        @click="generateQA"
        :disabled="loading || !targetRole || !careerSummary"
        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
      >
        <span v-if="loading">맞춤형 Q&A 세트 생성 중...</span>
        <span v-else>Q&A 질문/모범답안 세트 생성 ⚡</span>
      </button>
    </div>

    <!-- Generated Q&A Cards List -->
    <div v-if="qaSet" class="space-y-4">
      <h2 class="text-lg font-bold text-white flex items-center gap-2">
        <span>📚</span> {{ qaSet.targetRole }} 맞춤형 Q&A 플래시카드
      </h2>

      <div class="space-y-4">
        <div
          v-for="(qa, idx) in qaSet.qaPairs"
          :key="idx"
          class="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/40 transition-all"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Q{{ idx + 1 }} · {{ qa.questionCategory }}
                </span>
                <span class="text-[10px] text-gray-400">난이도: {{ qa.difficulty }}</span>
              </div>
              <h3 class="text-base font-bold text-white leading-relaxed">{{ qa.question }}</h3>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div class="text-xs font-bold text-emerald-400">✅ 추천 모범 답변 (Model Answer)</div>
            <p class="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{{ qa.sampleAnswer }}</p>
          </div>

          <div v-if="qa.keyPoints && qa.keyPoints.length > 0" class="flex flex-wrap gap-2 pt-1">
            <span class="text-xs text-purple-300 font-semibold">핵심 수록 포인트:</span>
            <span
              v-for="(kp, kIdx) in qa.keyPoints"
              :key="kIdx"
              class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-200 border border-purple-500/20 text-[11px]"
            >
              #{{ kp }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const targetRole = ref('시니어 풀스택 개발자')
const questionCount = ref(5)
const careerSummary = ref(`TypeScript, Nuxt 4, Node.js 기반 Web App 구축 4년 경력. PostgreSQL 및 pgvector 시맨틱 검색 엔진 구현 경험 보유.`)
const loading = ref(false)
const qaSet = ref<any>(null)

async function generateQA() {
  if (!targetRole.value || !careerSummary.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/qa/generate', {
      method: 'POST',
      body: {
        targetRole: targetRole.value,
        careerSummary: careerSummary.value,
        count: questionCount.value,
      },
    })
    qaSet.value = res.qaSet
  } catch (err: any) {
    alert('Q&A 세트 생성에 실패했습니다.')
  } finally {
    loading.value = false
  }
}
</script>
