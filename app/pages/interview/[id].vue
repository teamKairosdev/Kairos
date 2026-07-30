<template>
  <!-- Mobile tab switcher -->
  <div class="lg:hidden flex border-b border-gray-100 bg-white mb-0">
    <button
      @click="mobileTab = 'chat'"
      class="flex-1 py-3 text-sm font-semibold transition-colors"
      :class="mobileTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400'"
    >💬 면접 진행</button>
    <button
      @click="mobileTab = 'info'"
      class="flex-1 py-3 text-sm font-semibold transition-colors"
      :class="mobileTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400'"
    >📋 세션 정보</button>
  </div>

  <div class="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] gap-0 overflow-hidden rounded-none lg:rounded-2xl border-0 lg:border border-gray-100 shadow-none lg:shadow-sm bg-white">

    <!-- Left Panel: Interview Info & Guide -->
    <div
      class="shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col"
      :class="[
        'lg:w-72 xl:w-80',
        mobileTab === 'info' ? 'flex' : 'hidden lg:flex',
        'w-full lg:w-72'
      ]"
    >
      <!-- Session Header -->
      <div class="p-5 border-b border-gray-100">
        <NuxtLink to="/interview" class="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          목록으로
        </NuxtLink>
        <div class="flex items-center gap-2 mb-1">
          <div class="w-2 h-2 rounded-full animate-pulse" :class="isStreaming ? 'bg-amber-400' : 'bg-emerald-400'"></div>
          <span class="text-xs font-medium" :class="isStreaming ? 'text-amber-600' : 'text-emerald-600'">
            {{ isStreaming ? 'AI 응답 중' : '대기 중' }}
          </span>
        </div>
        <h1 class="text-base font-bold text-gray-900">{{ sessionInfo?.jobTitle || 'AI 모의 면접' }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ sessionInfo?.companyName || '일반 면접' }}</p>
      </div>

      <!-- Difficulty & Round -->
      <div class="p-5 border-b border-gray-100 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">난이도</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="difficultyBadge(sessionInfo?.difficulty)">
            {{ difficultyLabel(sessionInfo?.difficulty) }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">질문 수</span>
          <span class="text-xs font-bold text-gray-900">{{ questionCount }}번째</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">경과 시간</span>
          <span class="text-xs font-bold text-gray-900 font-mono">{{ elapsedTime }}</span>
        </div>
      </div>

      <!-- Tips -->
      <div class="flex-1 p-5 overflow-y-auto">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">면접 팁</h3>
        <ul class="space-y-3">
          <li v-for="tip in interviewTips" :key="tip.title" class="flex gap-2.5">
            <span class="text-base shrink-0 mt-0.5">{{ tip.icon }}</span>
            <div>
              <p class="text-xs font-semibold text-gray-700">{{ tip.title }}</p>
              <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ tip.desc }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- End Session -->
      <div class="p-5 border-t border-gray-100">
        <button
          @click="endSession"
          class="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
        >
          면접 종료
        </button>
      </div>
    </div>

    <!-- Right Panel: Chat -->
    <div class="flex-1 flex flex-col min-w-0 bg-white" :class="mobileTab === 'info' ? 'hidden lg:flex' : 'flex'">
      <!-- Chat Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">AI</div>
        <div>
          <p class="text-sm font-bold text-gray-900">Kairos AI 면접관</p>
          <p class="text-xs text-emerald-500 font-medium">온라인 · 실시간 평가 중</p>
        </div>
      </div>

      <!-- Messages -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div v-for="(msg, idx) in displayMessages" :key="idx" class="flex gap-3" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
          <!-- Avatar -->
          <div class="shrink-0">
            <div v-if="msg.role === 'assistant'" class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">AI</div>
            <div v-else class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">나</div>
          </div>
          <!-- Bubble -->
          <div class="max-w-[75%] space-y-1">
            <div
              class="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs"
              :class="msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'"
            >
              <span class="whitespace-pre-wrap">{{ getMessageText(msg) }}</span>
            </div>
          </div>
        </div>

        <!-- Streaming indicator -->
        <div v-if="isStreaming && !streamingText" class="flex gap-3">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">AI</div>
          <div class="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-sm">
            <div class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 150ms"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 300ms"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="px-6 py-4 border-t border-gray-100 bg-white">
        <div class="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <textarea
            ref="inputRef"
            v-model="inputText"
            placeholder="답변을 입력하세요... (Shift+Enter로 줄바꿈)"
            rows="1"
            @keydown.enter.exact.prevent="submitAnswer"
            @input="autoResize"
            class="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 leading-relaxed"
          ></textarea>
          <button
            @click="submitAnswer"
            :disabled="isStreaming || !inputText.trim()"
            class="shrink-0 w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const interviewId = route.params.id as string

const chatContainer = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const mobileTab = ref<'chat' | 'info'>('chat')

// Fetch session info
const { data: sessionInfo } = await useFetch<any>(`/api/interviews/${interviewId}`)

// AI SDK chat
const { messages, input: inputText, handleSubmit, isLoading: isStreaming, error } = useChat({
  api: `/api/interviews/${interviewId}/chat`,
  onError: (err) => {
    toast.add({ title: '오류 발생', description: err.message, color: 'red' })
  },
  onFinish: () => {
    scrollToBottom()
  },
})

// Compute streaming text from last partial message
const streamingText = computed(() => {
  const last = messages.value[messages.value.length - 1]
  if (last?.role === 'assistant' && isStreaming.value) {
    return getMessageText(last)
  }
  return ''
})

// Display messages (include initial question if no AI message yet)
const displayMessages = computed(() => {
  return messages.value
})

const questionCount = computed(() => {
  return messages.value.filter(m => m.role === 'assistant').length
})

// Timer
const startTime = Date.now()
const elapsedTime = ref('00:00')
onMounted(() => {
  const timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    elapsedTime.value = `${m}:${s}`
  }, 1000)
  onUnmounted(() => clearInterval(timer))
})

function getMessageText(msg: any): string {
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text || '')
      .join('')
  }
  return ''
}

async function submitAnswer() {
  if (!inputText.value.trim() || isStreaming.value) return
  handleSubmit()
  await nextTick()
  scrollToBottom()
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function endSession() {
  router.push('/interview')
}

// Difficulty helpers
function difficultyLabel(d?: string) {
  return { junior: '🌱 주니어', medium: '⚡ 미들', senior: '🔥 시니어' }[d || ''] || d || '-'
}
function difficultyBadge(d?: string) {
  return {
    junior: 'bg-green-50 text-green-700',
    medium: 'bg-amber-50 text-amber-700',
    senior: 'bg-red-50 text-red-700',
  }[d || ''] || 'bg-gray-100 text-gray-600'
}

const interviewTips = [
  { icon: '🎯', title: 'STAR 기법 활용', desc: '상황(S), 과제(T), 행동(A), 결과(R) 순서로 답변하세요.' },
  { icon: '⏱️', title: '답변 시간 조절', desc: '질문당 1~3분 이내로 간결하고 핵심적으로 답변하세요.' },
  { icon: '📊', title: '수치로 증명', desc: '경험과 성과를 구체적인 수치와 데이터로 뒷받침하세요.' },
  { icon: '🔍', title: '역질문 준비', desc: '면접 말미에는 회사나 팀에 대한 관심 있는 질문을 해보세요.' },
]

watch(messages, () => scrollToBottom(), { deep: true })
</script>
