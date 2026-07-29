<template>
  <div class="space-y-4 flex flex-col h-[calc(100vh-140px)]">
    <div class="rounded-xl border border-white/5 p-4 bg-white/[0.02] flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <NuxtLink to="/interview" class="text-xs text-gray-500 hover:text-white transition-colors">&larr; 목록</NuxtLink>
        <div class="h-3 w-px bg-white/10"></div>
        <h1 class="text-base font-medium text-white">AI 면접</h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="text-xs text-gray-500">SSE 연결</span>
      </div>
    </div>

    <div class="flex-1 rounded-xl border border-white/5 p-6 bg-white/[0.02] overflow-y-auto space-y-5" ref="chatContainer">
      <div v-for="(msg, idx) in messages" :key="idx" class="flex gap-3" :class="msg.sender === 'candidate' ? 'flex-row-reverse' : ''">
        <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-medium" :class="msg.sender === 'candidate' ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-400'">
          {{ msg.sender === 'candidate' ? 'U' : 'AI' }}
        </div>
        <div class="max-w-xl space-y-1.5">
          <div class="p-3.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap" :class="msg.sender === 'candidate' ? 'bg-white/10 text-gray-200 rounded-tr-none' : 'bg-white/5 text-gray-300 rounded-tl-none'">
            {{ msg.message }}
          </div>
          <div v-if="msg.feedback" class="p-3 rounded-lg bg-white/5 text-xs space-y-1">
            <div class="flex items-center justify-between text-gray-400 font-medium">
              <span>피드백</span>
              <span>{{ msg.feedback.score }}점</span>
            </div>
            <p class="text-gray-500">{{ msg.feedback.summary }}</p>
          </div>
        </div>
      </div>
      <div v-if="isStreaming" class="flex gap-3">
        <div class="w-8 h-8 rounded-lg bg-white/5 text-gray-400 flex items-center justify-center text-xs font-medium">AI</div>
        <div class="p-3.5 rounded-xl bg-white/5 text-sm text-gray-500">질문 작성 중...</div>
      </div>
    </div>

    <div class="rounded-xl border border-white/5 p-4 bg-white/[0.02] shrink-0">
      <form @submit.prevent="sendMessage" class="flex items-center gap-3">
        <textarea v-model="inputMessage" rows="1" placeholder="답변을 입력하세요..." @keydown.enter.exact.prevent="sendMessage" class="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 resize-none"></textarea>
        <button type="submit" :disabled="isStreaming || !inputMessage.trim()" class="px-4 py-2 rounded-lg bg-white text-[#0a0a0b] text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
          전송
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

const messages = ref<MessageItem[]>([{ sender: 'interviewer', message: '안녕하세요. 지원 직무와 핵심 경험에 대해 소개해 주세요.' }])
const inputMessage = ref('')
const isStreaming = ref(false)
const chatContainer = ref<HTMLDivElement | null>(null)

function scrollToBottom() {
  nextTick(() => { if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight })
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isStreaming.value) return
  const candidateText = inputMessage.value.trim()
  messages.value.push({ sender: 'candidate', message: candidateText })
  inputMessage.value = ''
  scrollToBottom()
  isStreaming.value = true
  try {
    const res: any = await $fetch(`/api/interviews/${interviewId}/chat`, { method: 'POST', body: { candidateMessage: candidateText, stream: false } })
    if (res.feedback && messages.value.length > 0) messages.value[messages.value.length - 1]!.feedback = res.feedback
    messages.value.push({ sender: 'interviewer', message: res.nextQuestion })
  } catch {
    messages.value.push({ sender: 'interviewer', message: '다음 질문으로 넘어갑니다.' })
  } finally {
    isStreaming.value = false
    scrollToBottom()
  }
}
</script>
