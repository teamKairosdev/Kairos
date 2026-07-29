<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Floating Trigger Button -->
    <UButton
      v-if="!isOpen"
      color="purple"
      variant="solid"
      size="xl"
      class="rounded-full shadow-2xl shadow-purple-900/50 border border-purple-400/30 hover:scale-105 transition-transform"
      icon="i-lucide-sparkles"
      label="Kairos AI"
      @click="isOpen = true"
    />

    <!-- Sliding CUI Panel -->
    <div
      v-else
      class="w-96 max-w-[calc(100vw-3rem)] h-[540px] rounded-2xl border border-purple-500/20 bg-[#0f0a1a]/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
    >
      <!-- Panel Header -->
      <div class="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <UIcon name="i-lucide-bot" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">Kairos Career Steward</h3>
            <p class="text-[10px] text-purple-300/70">Orchestrator Agent &amp; CUI Assistant</p>
          </div>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          size="xs"
          class="text-gray-400 hover:text-white"
          @click="isOpen = false"
        />
      </div>

      <!-- Messages Stream Area -->
      <div class="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        <div v-for="(msg, idx) in messages" :key="idx" class="space-y-1.5">
          <div :class="['flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start']">
            <div
              :class="[
                'max-w-[85%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-none'
                  : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>
        </div>

        <!-- Thinking Indicator -->
        <ThinkingBubble
          :active="isThinking"
          :step="thinkingStep"
          :total-steps="3"
          :step-title="thinkingTitle"
          :thinking-details="thinkingLog"
        />
      </div>

      <!-- Input Bar -->
      <div class="p-3 border-t border-white/10 bg-white/[0.01]">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <UInput
            v-model="inputQuery"
            placeholder="이력서, 면접, 커리어 조언 물어보기..."
            class="flex-1 text-xs"
            :disabled="isThinking"
          />
          <UButton
            type="submit"
            color="purple"
            variant="solid"
            icon="i-lucide-send"
            :loading="isThinking"
            :disabled="!inputQuery.trim()"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isOpen = ref(false)
const inputQuery = ref('')
const isThinking = ref(false)
const thinkingStep = ref(1)
const thinkingTitle = ref('의도 파악 및 경험 벡터 매칭 중...')
const thinkingLog = ref('')

const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([
  {
    role: 'assistant',
    content: '안녕하세요! Kairos AI 어시스턴트입니다. 이력서 고도화, ATS 분석, 실시간 면접 준비에 대해 무엇이든 도와드릴까요?',
  },
])

async function sendMessage() {
  if (!inputQuery.value.trim() || isThinking.value) return

  const userText = inputQuery.value
  messages.value.push({ role: 'user', content: userText })
  inputQuery.value = ''
  isThinking.value = true
  thinkingStep.value = 1
  thinkingTitle.value = '의도 파악 및 pgvector 경험 노드 검색 중...'
  thinkingLog.value = `[Query Hash] analyzing prompt semantics for: "${userText.slice(0, 30)}..."`

  try {
    // Step 2: Agent Orchestration
    setTimeout(() => {
      thinkingStep.value = 2
      thinkingTitle.value = 'Evaluator-Optimizer 프롬프트 분석 실행 중...'
      thinkingLog.value = '[Agent LLM] Routing to Anthropic Claude 3.5 Haiku + Extended Thinking Budget'
    }, 600)

    // Step 3: Stream generation
    setTimeout(() => {
      thinkingStep.value = 3
      thinkingTitle.value = '최종 응답 스트리밍 생성 중...'
    }, 1200)

    const res: any = await $fetch('/api/llm/chat', {
      method: 'POST',
      body: { prompt: userText },
    })

    setTimeout(() => {
      messages.value.push({
        role: 'assistant',
        content: res.text || res.reply || '요청하신 커리어 조언 생성을 마쳤습니다.',
      })
      isThinking.value = false
    }, 1600)
  } catch (err) {
    messages.value.push({
      role: 'assistant',
      content: '응답 생성 도중 에러가 발생했습니다. 다시 시도해 주세요.',
    })
    isThinking.value = false
  }
}
</script>
