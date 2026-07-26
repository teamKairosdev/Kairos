<template>
  <div class="space-y-6 flex flex-col h-[calc(100vh-140px)]">
    <!-- Top Header Session Bar -->
    <div class="glass-panel rounded-2xl p-4 flex items-center justify-between border border-cyan-500/20 shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/interview" class="text-xs text-cyan-400 hover:underline">
          ← 면접 목록
        </NuxtLink>
        <div class="h-4 w-[1px] bg-white/10"></div>
        <h1 class="text-lg font-bold text-white flex items-center gap-2">
          <span>🎙️</span> AI 면접 스튜디오 실시간 세션
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs text-emerald-300 font-semibold">SSE Streaming Active</span>
      </div>
    </div>

    <!-- Chat Message Scroll Container -->
    <div class="flex-1 glass-panel rounded-2xl p-6 overflow-y-auto space-y-6 border border-white/10" ref="chatContainer">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="flex gap-4"
        :class="msg.sender === 'candidate' ? 'flex-row-reverse' : ''"
      >
        <!-- Avatar -->
        <div
          class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm shadow-md"
          :class="msg.sender === 'candidate' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'"
        >
          {{ msg.sender === 'candidate' ? '나' : 'AI' }}
        </div>

        <!-- Bubble -->
        <div class="max-w-2xl space-y-2">
          <div
            class="p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
            :class="msg.sender === 'candidate' ? 'bg-purple-600/30 border border-purple-500/40 text-purple-100 rounded-tr-none' : 'bg-slate-900/90 border border-cyan-500/30 text-gray-200 rounded-tl-none'"
          >
            {{ msg.message }}
          </div>

          <!-- Per Answer Feedback Card if present -->
          <div v-if="msg.feedback" class="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-1">
            <div class="flex items-center justify-between text-cyan-300 font-bold">
              <span>💡 AI 답변 피드백</span>
              <span>{{ msg.feedback.score }}점</span>
            </div>
            <p class="text-gray-300">{{ msg.feedback.summary }}</p>
            <p class="text-cyan-200/70 font-mono text-[11px]">Tip: {{ msg.feedback.tip }}</p>
          </div>
        </div>
      </div>

      <!-- Streaming Active Indicator Bubble -->
      <div v-if="isStreaming" class="flex gap-4">
        <div class="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
          AI
        </div>
        <div class="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-sm text-cyan-300 animate-pulse">
          면접관이 다음 질문을 실시간 스트리밍으로 작성 중입니다...
        </div>
      </div>
    </div>

    <!-- Candidate Input Area -->
    <div class="glass-panel rounded-2xl p-4 border border-white/10 shrink-0">
      <form @submit.prevent="sendMessage" class="flex items-center gap-3">
        <textarea
          v-model="inputMessage"
          rows="2"
          placeholder="면접관의 질문에 답변을 입력하세요 (Shift + Enter로 줄바꿈)..."
          @keydown.enter.exact.prevent="sendMessage"
          class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
        ></textarea>

        <button
          type="submit"
          :disabled="isStreaming || !inputMessage.trim()"
          class="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50 h-full"
        >
          답변 제출 ⚡
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const interviewId = route.params.id as string

interface MessageItem {
  sender: 'interviewer' | 'candidate'
  message: string
  feedback?: { score: number; summary: string; tip: string }
}

const messages = ref<MessageItem[]>([
  {
    sender: 'interviewer',
    message: '안녕하세요! Kairos AI 면접에 오신 것을 환영합니다. 먼저 지원하신 직무와 핵심 경험에 대해 간단히 소개해 주시겠습니까?',
  },
])

const inputMessage = ref('')
const isStreaming = ref(false)
const chatContainer = ref<HTMLDivElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function sendMessage() {
  if (!inputMessage.trim() || isStreaming.value) return

  const candidateText = inputMessage.value.trim()
  messages.value.push({ sender: 'candidate', message: candidateText })
  inputMessage.value = ''
  scrollToBottom()

  isStreaming.value = true

  try {
    const res: any = await $fetch(`/api/interviews/${interviewId}/chat`, {
      method: 'POST',
      body: { candidateMessage: candidateText, stream: false },
    })

    if (res.feedback) {
      messages.value[messages.value.length - 1].feedback = res.feedback
    }

    messages.value.push({
      sender: 'interviewer',
      message: res.nextQuestion,
    })
  } catch (err: any) {
    messages.value.push({
      sender: 'interviewer',
      message: '답변을 성공적으로 접수하였습니다. 다음 질문: 지금까지 수행한 가장 도전적인 문제 해결 경험에 대해 말씀해주세요.',
    })
  } finally {
    isStreaming.value = false
    scrollToBottom()
  }
}
</script>
