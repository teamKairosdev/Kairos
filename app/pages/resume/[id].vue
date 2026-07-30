<template>
  <div v-if="data" class="max-w-[1500px] mx-auto py-8 px-4 space-y-6">
    <!-- Header Area -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
      <div class="space-y-1">
        <NuxtLink to="/resume" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
          <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
          목록으로 돌아가기
        </NuxtLink>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">{{ data.resume.title }}</h1>
          <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
            {{ data.resume.status }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-6 bg-white border border-slate-100 shadow-sm px-6 py-3 rounded-2xl">
        <div class="text-right">
          <div class="text-sm font-bold text-slate-400 uppercase tracking-wider">AI 평가 점수</div>
          <div class="text-3xl font-black text-blue-600 mt-0.5">{{ data.resume.currentScore || 0 }}<span class="text-xs font-medium text-slate-400 ml-0.5">점</span></div>
        </div>
      </div>
    </div>

    <!-- Main Split Layout (Chat + Workbench) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Panel: Workbench Workspace (col-span-7) -->
      <div class="lg:col-span-7 space-y-6">
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <!-- Workspace Tabs Menu -->
          <div class="flex border-b border-slate-100 space-x-6 text-sm">
            <button
              @click="activeTab = 'editor'"
              :class="activeTab === 'editor' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3 transition-colors'"
            >
              📝 실시간 편집기
            </button>
            <button
              @click="activeTab = 'diff'"
              :class="activeTab === 'diff' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3 transition-colors'"
            >
              🔍 AI 수정 비교 (Diff)
            </button>
            <button
              @click="activeTab = 'feedback'"
              :class="activeTab === 'feedback' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-3' : 'text-slate-400 font-semibold hover:text-slate-600 pb-3 transition-colors'"
            >
              📊 AI 종합 평가서
            </button>
          </div>

          <!-- Tab 1: Live Editor -->
          <div v-show="activeTab === 'editor'" class="space-y-4">
            <UFormGroup label="이력서 제목">
              <UInput v-model="editingTitle" size="md" placeholder="이력서 제목을 적어주세요" class="w-full" />
            </UFormGroup>
            <UFormGroup label="이력서 본문 (Markdown 작성 지원)">
              <UTextarea
                v-model="editingContent"
                :rows="18"
                placeholder="여기에 경력 사항, 프로젝트 세부 내용, 기술 스택 등을 직접 수정하여 편집하세요..."
                class="w-full font-mono text-sm leading-relaxed"
              />
            </UFormGroup>
            <div class="flex justify-between items-center pt-2">
              <UButton
                color="blue"
                variant="solid"
                :loading="saving"
                icon="i-lucide-save"
                label="변경사항 저장"
                @click="saveResume"
                class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-4 font-semibold text-xs transition"
              />
              <UButton
                color="neutral"
                variant="outline"
                :loading="refining"
                icon="i-lucide-sparkles"
                label="AI 정밀 평가 실행"
                @click="triggerRefine"
                class="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5 px-4 font-semibold text-xs transition"
              />
            </div>
          </div>

          <!-- Tab 2: Compare/Diff View -->
          <div v-show="activeTab === 'diff'" class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-800">이력서 변경 사항 분석</h3>
                <p class="text-xs text-slate-400 mt-0.5">이전 저장 버전 대비 단어 수준의 세부 수정 사항을 시각적으로 확인합니다.</p>
              </div>
              <UButton
                v-if="suggestedContent"
                color="green"
                variant="soft"
                size="xs"
                icon="i-lucide-check-check"
                label="AI 제안 확정하여 편집기에 적용"
                @click="confirmApply"
                class="rounded-lg"
              />
            </div>
            
            <div v-if="suggestedContent" class="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 max-h-[500px] overflow-y-auto leading-relaxed text-sm font-mono whitespace-pre-wrap select-text">
              <div v-html="computedDiffHtml"></div>
            </div>
            <div v-else class="p-12 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <UIcon name="i-lucide-git-compare" class="w-8 h-8 text-slate-300 mx-auto" />
              <p class="text-xs font-semibold">우측 AI 에이전트와 대화하여 이력서 첨삭을 요청해 보세요.</p>
              <p class="text-[10px] text-slate-400">AI가 문서를 고치면 변경된 단어들이 여기에 실시간 적녹 색상으로 표시됩니다.</p>
            </div>

            <!-- Legends -->
            <div v-if="suggestedContent" class="flex gap-4 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <div class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 bg-red-100 rounded" />
                <span>삭제된 단어</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 bg-green-100 rounded" />
                <span>추가된 단어</span>
              </div>
            </div>
          </div>

          <!-- Tab 3: Detailed Feedback Report -->
          <div v-show="activeTab === 'feedback'" class="space-y-6">
            <div v-if="latestRefinement" class="space-y-6">
              <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <div class="space-y-0.5">
                  <h3 class="text-sm font-bold text-slate-800">최근 실행된 AI 진단 보고서</h3>
                  <p class="text-xs text-slate-400">진단 시각: {{ new Date(latestRefinement.createdAt).toLocaleString() }}</p>
                </div>
                <div class="bg-blue-50/50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-sm border border-blue-100">
                  점수: {{ latestRefinement.score }}점
                </div>
              </div>

              <!-- strengths & weaknesses -->
              <div v-if="latestRefinement.evaluationFeedback" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-5 rounded-2xl bg-green-50/30 border border-green-100/50 space-y-3">
                  <div class="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    강점 (Strengths)
                  </div>
                  <ul class="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li v-for="(s, idx) in latestRefinement.evaluationFeedback.strengths" :key="idx" class="leading-relaxed">{{ s }}</li>
                  </ul>
                </div>

                <div class="p-5 rounded-2xl bg-red-50/30 border border-red-100/50 space-y-3">
                  <div class="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-red-600 rounded-full" />
                    개선 필요 (Weaknesses)
                  </div>
                  <ul class="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li v-for="(w, idx) in latestRefinement.evaluationFeedback.weaknesses" :key="idx" class="leading-relaxed">{{ w }}</li>
                  </ul>
                </div>
              </div>

              <!-- suggestions -->
              <div v-if="latestRefinement.evaluationFeedback && latestRefinement.evaluationFeedback.suggestions" class="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3">
                <div class="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  ⭐ Actionable Suggestions (추천 기재 보강 사항)
                </div>
                <ul class="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                  <li v-for="(sug, idx) in latestRefinement.evaluationFeedback.suggestions" :key="idx" class="leading-relaxed">{{ sug }}</li>
                </ul>
              </div>
            </div>

            <div v-else class="p-12 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <UIcon name="i-lucide-bar-chart-3" class="w-8 h-8 text-slate-300 mx-auto" />
              <p class="text-xs font-semibold">이력서 평가 데이터가 존재하지 않습니다.</p>
              <p class="text-[10px] text-slate-400">[AI 정밀 평가 실행]을 클릭하여 본문을 최초로 진단해 보세요.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Conversational AI Canvas Agent (col-span-5) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[750px]">
          <!-- Chat Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <h3 class="text-sm font-extrabold text-slate-800">AI 커리어 에이전트 (Canvas)</h3>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold uppercase">Realtime Context Sync</span>
          </div>

          <!-- Messages Area -->
          <div class="flex-1 overflow-y-auto py-4 space-y-4 pr-1 select-text">
            <div class="text-xs text-center text-slate-400 bg-slate-50/60 p-3 rounded-2xl border border-slate-100/50 leading-relaxed font-semibold">
              💡 실시간으로 좌측 이력서 본문 맥락이 연계됩니다.<br>
              "React 경력을 추가해줘" 혹은 "성과를 수치화해줘" 라고 대화하세요.
            </div>

            <!-- Messages Loop -->
            <div v-for="(msg, index) in chatHistory" :key="index" class="flex flex-col space-y-1.5">
              <!-- Speaker & Bubble -->
              <div :class="msg.role === 'user' ? 'self-end bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] text-xs font-semibold' : 'self-start bg-slate-50 border border-slate-100/50 text-slate-700 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-xs leading-relaxed space-y-3'">
                <!-- Message Text Content -->
                <div class="whitespace-pre-wrap font-medium">{{ msg.content }}</div>

                <!-- Suggested Content Action -->
                <div v-if="msg.suggestedContent" class="mt-2.5 p-3 rounded-xl bg-white border border-slate-100 space-y-2 text-slate-800 shadow-sm shrink-0">
                  <div class="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                    <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
                    AI가 이력서 개선 초안을 생성했습니다.
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      color="blue"
                      size="xs"
                      label="에디터에 적용하기"
                      icon="i-lucide-arrow-left-right"
                      @click="applySuggestedContent(msg.suggestedContent)"
                      class="font-bold text-[10px] rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="chatLoading" class="flex items-center space-x-1.5 self-start bg-slate-50 border border-slate-100/50 text-slate-700 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>

          <!-- Chat Form Input Area -->
          <form @submit.prevent="sendChatMessage" class="pt-4 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              v-model="chatMessage"
              type="text"
              placeholder="AI 에디터에게 피드백 요청하기..."
              class="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
              :disabled="chatLoading"
            />
            <button
              type="submit"
              class="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition-colors shadow-md hover:shadow-blue-100 flex items-center gap-1.5 disabled:opacity-50"
              :disabled="chatLoading || !chatMessage.trim()"
            >
              <span>전송</span>
              <UIcon name="i-lucide-send" class="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { renderDiffHtml } from '~/utils/diff'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const toast = useToast()

const activeTab = ref<'editor' | 'diff' | 'feedback'>('editor')

// Fetch Resume Data from server
const { data, refresh } = await useFetch<any>(`/api/resumes/${route.params.id}`)

// Live Form States
const editingTitle = ref('')
const editingContent = ref('')
const originalContent = ref('')
const suggestedContent = ref('')

const saving = ref(false)
const refining = ref(false)

// Conversational Chat States
const chatMessage = ref('')
const chatHistory = ref<Array<{ role: 'user' | 'assistant'; content: string; suggestedContent?: string }>>([])
const chatLoading = ref(false)

onMounted(() => {
  if (data.value && data.value.resume) {
    editingTitle.value = data.value.resume.title || ''
    editingContent.value = data.value.resume.originalContent || ''
    originalContent.value = data.value.resume.originalContent || ''
  }
})

// 최신 평가 결과 추출
const latestRefinement = computed(() => {
  if (!data.value || !data.value.refinementHistory) return null
  // evaluate or improve 스텝 중 가장 최신 항목 반환
  return data.value.refinementHistory[0] || null
})

// 실시간 Diff 연산 HTML
const computedDiffHtml = computed(() => {
  return renderDiffHtml(originalContent.value, suggestedContent.value)
})

// PUT: 이력서 본문 수동 저장
async function saveResume() {
  if (!editingTitle.value || !editingContent.value) return
  saving.value = true
  try {
    const res: any = await $fetch(`/api/resumes/${route.params.id}`, {
      method: 'PUT',
      body: {
        title: editingTitle.value,
        originalContent: editingContent.value
      }
    })
    if (res.success) {
      originalContent.value = editingContent.value
      suggestedContent.value = '' // 저장 완료되었으므로 제안 버퍼 비움
      toast.add({ title: '이력서 저장 성공', description: '변경 사항이 안전하게 반영되었습니다.', color: 'green' })
      await refresh()
    }
  } catch (err: any) {
    toast.add({ title: '저장 실패', description: err.data?.statusMessage || '오류가 발생했습니다.', color: 'red' })
  } finally {
    saving.value = false
  }
}

// POST: AI 정밀 평가 체인 실행
async function triggerRefine() {
  refining.value = true
  try {
    await $fetch(`/api/resumes/${route.params.id}/refine`, { method: 'POST' })
    await refresh()
    if (data.value && data.value.resume) {
      editingContent.value = data.value.resume.originalContent || ''
      originalContent.value = data.value.resume.originalContent || ''
    }
    activeTab.value = 'feedback' // 평가 완료 후 피드백으로 즉시 전환
    toast.add({ title: 'AI 정밀 평가 완료', description: '최신 평가서 탭을 확인하세요.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '평가 중 오류', description: err.data?.message || '실패했습니다.', color: 'red' })
  } finally {
    refining.value = false
  }
}

// AI 챗봇 메시지 전송
async function sendChatMessage() {
  const query = chatMessage.value.trim()
  if (!query || chatLoading.value) return

  chatHistory.value.push({ role: 'user', content: query })
  chatMessage.value = ''
  chatLoading.value = true

  try {
    const res: any = await $fetch(`/api/resumes/${route.params.id}/chat`, {
      method: 'POST',
      body: {
        message: query,
        messages: chatHistory.value.slice(0, -1), // 현재 전송분 제외하고 전송
        currentContent: editingContent.value
      }
    })

    chatHistory.value.push({
      role: 'assistant',
      content: res.responseText,
      suggestedContent: res.suggestedContent
    })
  } catch (err: any) {
    chatHistory.value.push({
      role: 'assistant',
      content: '대화 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    })
  } finally {
    chatLoading.value = false
  }
}

// AI 제안을 임시 적용하고 Diff 화면으로 강제 포커싱
function applySuggestedContent(content: string) {
  suggestedContent.value = content
  activeTab.value = 'diff'
  toast.add({ title: 'AI 제안 적용', description: '변경된 텍스트가 좌측 비교(Diff) 탭에 기재되었습니다.', color: 'blue' })
}

// 제안 확정 후 에디터 본문 텍스트 덮어쓰기
function confirmApply() {
  if (!suggestedContent.value) return
  editingContent.value = suggestedContent.value
  suggestedContent.value = '' // 확정했으므로 클리어
  activeTab.value = 'editor'
  toast.add({ title: '에디터 본문 반영 완료', description: '반영 사항 저장을 잊지 마세요.', color: 'green' })
}
</script>
