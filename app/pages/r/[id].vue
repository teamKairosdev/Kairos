<template>
  <div class="chat-view">
    <div class="chat-header">
      <h1>{{ session?.title || 'AI 채팅' }}</h1>
      <p class="chat-meta">{{ session?.messages?.length || 0 }}개의 메시지</p>
    </div>

    <div class="messages">
      <div v-for="msg in session?.messages || []" :key="msg.id || $index" class="message" :class="msg.role === 'user' ? 'user' : 'assistant'">
        <div class="avatar">{{ msg.role === 'user' ? 'U' : 'AI' }}</div>
        <div class="bubble">
          <div v-if="msg.role === 'user'">{{ extractText(msg) }}</div>
          <div v-else v-html="renderMarkdown(extractText(msg))" />
        </div>
      </div>
    </div>

    <div v-if="pending" class="loading">로딩 중...</div>
    <div v-else-if="error" class="error">
      <p>채팅을 불러올 수 없습니다.</p>
      <NuxtLink to="/">메인으로</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data: session, pending, error } = await useFetch(`/api/chat/${id}`)

useHead({
  title: () => `${session.value?.title || 'AI 채팅'} — Kairos`,
  meta: [
    { name: 'description', content: `${session.value?.messages?.length || 0}개의 메시지가 있는 AI 채팅 세션` },
    { property: 'og:title', content: `${session.value?.title || 'AI 채팅'} — Kairos` },
    { property: 'og:description', content: `AI 커리어 어시스턴트와의 채팅 세션` },
    { property: 'og:url', content: `/r/${id}` },
  ],
})

function extractText(msg: any): string {
  if (typeof msg.content === 'string') return msg.content
  const parts = msg.parts ?? msg.content ?? []
  return parts.map((p: any) => p.type === 'text' ? p.text : p.type === 'tool-result' ? '[도구 실행 결과]' : '').join('')
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.chat-view { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
.chat-header { margin-bottom: 2rem; }
.chat-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-fg-neutral); }
.chat-meta { font-size: 0.875rem; color: var(--color-fg-neutral-muted); }
.messages { display: flex; flex-direction: column; gap: 1rem; }
.message { display: flex; gap: 0.75rem; max-width: 85%; }
.message.assistant { align-self: flex-start; }
.message.user { align-self: flex-end; flex-direction: row-reverse; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: var(--color-bg-neutral-muted); color: var(--color-fg-neutral); flex-shrink: 0; }
.bubble { padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9375rem; line-height: 1.6; background: var(--color-bg-neutral-muted); color: var(--color-fg-neutral); }
.message.user .bubble { background: var(--color-bg-brand-muted); }
.loading { text-align: center; padding: 4rem 1rem; color: var(--color-fg-neutral-muted); }
.error { text-align: center; padding: 4rem 1rem; }
.error a { color: var(--color-fg-brand); text-decoration: underline; }
:deep(pre) { background: var(--color-bg-neutral-muted); padding: 1rem; border-radius: 8px; overflow-x: auto; }
:deep(code) { font-size: 0.875rem; }
</style>
