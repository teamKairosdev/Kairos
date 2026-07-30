<template>
  <!-- ── Landing (비인증) ── -->
  <div
    v-if="!state.authenticated && !state.loading"
    ref="landingContainer"
    class="min-h-screen relative overflow-hidden bg-white text-slate-900 pb-32"
    @mousemove="handleMouseMove"
  >
    <!-- Background grid decoration -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none no-select-drag" style="user-select: none; -webkit-user-drag: none;"></div>

    <!-- Sky Blue Hero Decorative Background Image (Non-selectable, Non-draggable) -->
    <div
      class="absolute top-0 left-0 right-0 h-[650px] opacity-[0.05] bg-cover bg-center pointer-events-none no-select-drag"
      style="background-image: url('/bg_sky.svg'); user-select: none; -webkit-user-drag: none; pointer-events: none;"
    ></div>

    <!-- Glassmorphic Header Navbar inside landing (Floating) -->
    <div class="max-w-6xl mx-auto pt-6 px-6 relative z-20">
      <div class="flex items-center justify-between px-6 py-3 rounded-full border border-slate-200/50 bg-white/70 backdrop-blur-md shadow-xs">
        <div class="flex items-center gap-3">
          <LogoImage img-class="h-5 w-auto object-contain" style="filter: brightness(0);" />
        </div>
        <div class="flex items-center gap-4">
          <NuxtLink to="/auth/login" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">로그인</NuxtLink>
          <NuxtLink to="/auth/register" class="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">시작하기</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Hero Content -->
    <section class="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center space-y-8 z-10">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 shadow-xs select-none">
        ⚡ pgvector 기반 의미 분석 실시간 매칭 엔진 탑재
      </div>

      <div class="space-y-6">
        <!-- Hero text replaced by Brandcopy SVG (Right click enabled, drag/select disabled, brightness filter applied to make it black) -->
        <div class="max-w-3xl mx-auto select-none no-select-drag" style="user-select: none; -webkit-user-drag: none;" draggable="false">
          <img
            src="/brandcopy.svg"
            alt="Kairos Brand Copy"
            class="w-full max-h-[140px] object-contain mx-auto no-select-drag"
            style="user-select: none; -webkit-user-drag: none; filter: brightness(0);"
            draggable="false"
          />
        </div>
        <p class="text-base sm:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
          이력서 문맥 평가부터 실시간 입체 모의 면접, 채용 공고(JD) 매칭까지.<br class="hidden sm:block" />
          단순한 줄글 작성을 넘어 당신의 가치를 정량적 수치 성과로 재창조합니다.
        </p>
      </div>

      <div class="flex flex-wrap gap-4 justify-center pt-2">
        <NuxtLink to="/auth/register" class="px-8 py-3.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold transition-all shadow-md hover:shadow-blue-100 hover:-translate-y-0.5">
          실시간 무료 진단 받기
        </NuxtLink>
        <button @click="fillMockCredentials" class="px-8 py-3.5 rounded-full border border-slate-200 bg-white/80 hover:bg-slate-50 text-slate-600 text-sm font-bold transition-all hover:-translate-y-0.5">
          테스트 계정 로그인 (50개 직무 세트)
        </button>
      </div>
    </section>

    <!-- Interactive Bento Showcase Grid -->
    <section class="max-w-6xl mx-auto px-6 py-12 space-y-16 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Bento 1: Interactive Resume Enhancer Canvas (col-span-7) -->
        <div class="lg:col-span-7 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[420px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Interactive Enhancer</span>
            <h3 class="text-2xl font-bold text-slate-800">슬라이더를 밀어 이력서 성과의 변화를 확인하세요</h3>
            <p class="text-xs text-slate-400 font-medium">단순 업무 나열식 이력서가 AI STAR 기법을 거쳐 강력한 수치 지표 성과로 업그레이드됩니다.</p>
          </div>

          <!-- Interactive Enhancer Box -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div class="flex justify-between items-center text-xs font-mono">
              <span class="text-slate-400">// 실시간 AI 고도화 수준</span>
              <span :class="sliderColorClass" class="font-bold font-mono transition-colors">{{ sliderPercentage }}% Optimized</span>
            </div>

            <!-- Resume Content Block -->
            <div class="p-4 bg-white rounded-xl border border-slate-150 min-h-[90px] flex items-center transition-all duration-300">
              <p class="text-xs sm:text-sm font-medium leading-relaxed" :class="evalSliderScore > 70 ? 'text-emerald-700' : 'text-slate-700'">
                {{ sliderText }}
              </p>
            </div>

            <!-- Control Slider -->
            <div class="space-y-1">
              <input
                v-model="evalSliderScore"
                type="range"
                min="30"
                max="100"
                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <span>원문 초안 (Draft)</span>
                <span>AI 정밀 평가 (Evaluate)</span>
                <span>성과 보강 (Improve)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento 2: Interactive ATS Match Matcher (col-span-5) -->
        <div class="lg:col-span-5 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-sky-200 transition-all duration-300 flex flex-col justify-between min-h-[420px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Job Fit Matcher</span>
            <h3 class="text-2xl font-bold text-slate-800">채용 요구 조건(JD) 즉시 비교</h3>
            <p class="text-xs text-slate-400 font-medium">원하는 타겟 포지션의 우대 사항과 내 스택을 매칭해 빈틈을 바로 메꿔줍니다.</p>
          </div>

          <!-- Matching Keywords Widget -->
          <div class="mt-6 space-y-4">
            <div class="rounded-2xl border border-slate-100 p-4 bg-slate-50 space-y-3">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">포지션: 시니어 프론트엔드 개발자</p>
              
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="chip in jdChips"
                  :key="chip.name"
                  @mouseenter="activeJd = chip.name"
                  @mouseleave="activeJd = ''"
                  class="text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold"
                  :class="[
                    chip.matched ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100',
                    activeJd === chip.name ? 'scale-105 shadow-xs ring-2 ring-blue-400' : ''
                  ]"
                >
                  {{ chip.name }} {{ chip.matched ? '✓' : '✕' }}
                </span>
              </div>
            </div>
            
            <p class="text-[10px] text-center text-slate-400 font-semibold">각 기술 칩 위에 마우스를 올려 매칭 여부를 확인하세요</p>
          </div>
        </div>

        <!-- Bento 3: Interactive Interview Chat Simulator (col-span-6) -->
        <div class="lg:col-span-6 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[400px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Interview Simulator</span>
            <h3 class="text-2xl font-bold text-slate-800">실시간 스트리밍 대화형 면접관</h3>
            <p class="text-xs text-slate-400 font-medium">선택하는 답변 방향에 맞춰 AI가 논리적 꼬리 질문을 동적으로 던집니다.</p>
          </div>

          <!-- Interview Chat Box -->
          <div class="mt-6 rounded-2xl border border-slate-100 p-4 bg-slate-950 text-slate-350 space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-white/5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <span class="text-[10px] font-mono text-gray-400">Interview Session ID: MOCK-09</span>
            </div>

            <!-- Chat message -->
            <div class="space-y-3">
              <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-gray-200">
                <span class="text-blue-400 font-bold">AI 면접관:</span> {{ activeInterviewQuestion }}
              </div>
            </div>

            <!-- Choice buttons -->
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button
                v-for="(ans, idx) in interviewAnswers"
                :key="idx"
                @click="selectInterviewAnswer(ans)"
                class="py-2 px-3 text-[10px] sm:text-xs text-left bg-white/10 border border-white/15 rounded-lg text-white hover:bg-blue-600 hover:border-transparent transition-all font-semibold"
              >
                {{ ans.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bento 4: Interactive Semantic Search (col-span-6) -->
        <div class="lg:col-span-6 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[400px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Semantic Vector Search</span>
            <h3 class="text-2xl font-bold text-slate-800">pgvector 기반 이력 매칭 검색</h3>
            <p class="text-xs text-slate-400 font-medium">단순 텍스트 매칭을 넘어 작성하신 경력의 유사도를 벡터 매핑하여 최적의 부합점을 검색합니다.</p>
          </div>

          <!-- Dynamic Search Widget -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-4">
            <div class="flex gap-2">
              <input
                v-model="vectorSearchQuery"
                type="text"
                placeholder="예: 프론트엔드 성능 최적화 경험"
                class="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button @click="triggerVectorSearch" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all">검색</button>
            </div>

            <!-- Results -->
            <div class="space-y-2 max-h-[110px] overflow-y-auto">
              <div v-for="res in vectorResults" :key="res.company" class="bg-white p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                  <p class="text-xs font-bold text-slate-800">{{ res.company }}</p>
                  <p class="text-[10px] text-slate-400">{{ res.role }}</p>
                </div>
                <span class="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{{ res.similarity }}% 유사도</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Simple Quick Footer -->
    <footer class="max-w-6xl mx-auto px-6 pt-16 text-center text-xs text-slate-400">
      <p>© 2026 Kairos. All rights reserved.</p>
    </footer>
  </div>

  <!-- ── Dashboard (인증됨) ── -->
  <div v-else-if="state.authenticated" class="space-y-8 pb-16">
    <!-- Welcome Banner -->
    <div class="rounded-2xl border border-blue-100/50 p-8 bg-gradient-to-r from-blue-50/40 via-blue-50/20 to-white shadow-sm">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-slate-900">
            {{ state.user?.name }}님, 반갑습니다 👋
          </h1>
          <p class="text-sm font-medium text-slate-400 leading-relaxed">{{ greetingMessage }}</p>
        </div>
        <NuxtLink to="/interview" class="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-200">
          <UIcon name="i-lucide-mic" class="w-4 h-4" />
          모의 면접 바로가기
        </NuxtLink>
      </div>
    </div>

    <!-- Stats Grid (dashboard-style) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink v-for="stat in dashboardStats" :key="stat.label" :to="stat.to"
        class="rounded-2xl border border-slate-100 p-5 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
      >
        <p class="text-xs font-semibold text-slate-400">{{ stat.label }}</p>
        <p class="text-2xl font-extrabold text-slate-800 mt-2">{{ stat.value }}</p>
        <p v-if="stat.trend" class="text-xs mt-3 font-semibold flex items-center gap-1" :class="stat.trendPositive ? 'text-blue-600' : 'text-slate-400'">
          <span>✨</span>
          <span>{{ stat.trend }}</span>
        </p>
      </NuxtLink>
    </div>

    <!-- Main Content: Feed + Sidebar -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <!-- Left: Activity feed (Modern timeline) -->
      <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800">추천 커리어 과제</h2>
          <NuxtLink to="/settings" class="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors">자세히 보기</NuxtLink>
        </div>
        <div class="space-y-6">
          <div v-for="(activity, i) in activities" :key="i"
            class="relative flex gap-5"
          >
            <!-- Timeline node line -->
            <div v-if="i < activities.length - 1" class="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100" />
            
            <div class="w-8 h-8 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center shrink-0 z-10">
              <div class="w-2.5 h-2.5 rounded-full" :class="activity.dotClass" />
            </div>
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-slate-700">{{ activity.label }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-600">{{ activity.time }}</span>
              </div>
              <p class="text-xs font-medium text-slate-400 leading-relaxed">{{ activity.desc }}</p>
              <NuxtLink :to="activity.to" class="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block">진행하기 &rarr;</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Quick menu & Tips -->
      <div class="space-y-6">
        <!-- Quick links -->
        <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 class="text-xs font-bold text-slate-400 tracking-wider mb-4 uppercase">바로가기 메뉴</h3>
          <nav class="space-y-1">
            <NuxtLink v-for="item in quickLinks" :key="item.label" :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200"
            >
              <UIcon :name="item.icon" class="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-600" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Tip card -->
        <div class="rounded-2xl border border-blue-50 p-6 bg-gradient-to-br from-blue-50/20 via-blue-50/10 to-white shadow-sm space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm">
              <UIcon name="i-lucide-lightbulb" class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-sm font-bold text-slate-800">커리어 가이드 팁</h3>
          </div>
          <p class="text-xs font-medium text-slate-400 leading-relaxed">이력서에 지원하려는 구체적 포지션의 핵심 키워드를 최적화해 포함시키면 AI 필터링 서류 평가 점수가 평균 23% 상승합니다.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Loading ── -->
  <div v-else class="flex items-center justify-center py-40">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader" class="w-7 h-7 text-blue-500 animate-spin" />
      <p class="text-sm font-semibold text-slate-400">시스템 로딩 중...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { state } = useAuth()

const hours = new Date().getHours()
const greetingMessage = hours < 12 ? '좋은 아침입니다. 오늘의 목표를 설정해보세요.'
  : hours < 18 ? '좋은 오후입니다. 커리어를 한 단계 발전시킬 시간입니다.'
  : '좋은 저녁입니다. 내일을 위한 준비를 해보세요.'

// Interactive mouse effect states
const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(e: MouseEvent) {
  if (!process.client) return
  const width = window.innerWidth
  const height = window.innerHeight
  mouseX.value = (e.clientX / width) * 2 - 1
  mouseY.value = (e.clientY / height) * 2 - 1
}

// Bento 1: Resume Enhancer Slider State
const evalSliderScore = ref(35)
const sliderPercentage = computed(() => evalSliderScore.value)
const sliderColorClass = computed(() => {
  if (evalSliderScore.value > 85) return 'text-emerald-500'
  if (evalSliderScore.value > 60) return 'text-blue-500'
  return 'text-red-500'
})
const sliderText = computed(() => {
  if (evalSliderScore.value < 55) {
    return '카카오에서 리액트 개발을 주로 하였습니다. 버그를 많이 수정했습니다.'
  } else if (evalSliderScore.value < 85) {
    return '카카오 프론트엔드 파트에서 결제 서비스 리팩토링 및 쿼리 캐싱 패턴 도입 담당.'
  } else {
    return '카카오 페이먼트 서비스 리액트 마이그레이션 주도 (결제 실패율 2.3%에서 0.05% 이하 통제, LCP 4.2s에서 1.1s 개선 완료)'
  }
})

// Bento 2: ATS Chips
const activeJd = ref('')
const jdChips = [
  { name: 'React', matched: true },
  { name: 'TypeScript', matched: true },
  { name: 'Next.js', matched: true },
  { name: 'Terraform', matched: false },
  { name: 'TailwindCSS', matched: true },
  { name: 'Kubernetes', matched: false }
]

// Bento 3: Mock Interview Chat States
const activeInterviewQuestion = ref('반갑습니다. 준비하신 프로젝트 성과에 대해 간략히 두 문장으로 대답해 주십시오.')
const interviewAnswers = [
  { label: '리액트 성능을 주로 개선했습니다.', response: '어떤 기법(예: 메모이제이션, 코드 스플리팅)을 사용해 LCP 지연을 단축하셨습니까?' },
  { label: 'MSA 결제 아키텍처를 도입했습니다.', response: '결제 트랜잭션 중 발생 가능한 동시성(Race Condition) 문제를 어떻게 보완하셨는지 공유해주세요.' }
]
function selectInterviewAnswer(ans: { label: string, response: string }) {
  activeInterviewQuestion.value = ans.response
}

// Bento 4: Vector Search
const vectorSearchQuery = ref('')
const vectorResults = ref<any[]>([
  { company: '토스', role: '프론트엔드 개발자', similarity: 96 },
  { company: '네이버', role: '백엔드 엔지니어', similarity: 82 }
])
function triggerVectorSearch() {
  if (!vectorSearchQuery.value.trim()) return
  // Randomize mock similarity to make it look active
  vectorResults.value = [
    { company: '카카오', role: '플랫폼 엔지니어', similarity: Math.floor(Math.random() * 15) + 85 },
    { company: '라인', role: '서버 아키텍트', similarity: Math.floor(Math.random() * 20) + 70 }
  ]
}

// Test login trigger
const router = useRouter()
const { login } = useAuth()
async function fillMockCredentials() {
  const success = await login('testmockup', '12345')
  if (success) {
    router.push('/')
  }
}

const stats = [
  { value: '50개', label: '직무 매칭 데이터' },
  { value: '1536차원', label: '임베딩 차원' },
  { value: '98%', label: 'AI 피드백 정확도' },
  { value: '실시간', label: '스트리밍 면접관' },
]

const dashboardStats = [
  { label: '이력서', value: '-', to: '/resume', trend: 'AI 고도화 시작하기', trendPositive: true },
  { label: '모의 면접', value: '-', to: '/interview', trend: '첫 면접 시작하기', trendPositive: true },
  { label: 'ATS 분석', value: '-', to: '/ats', trend: 'JD 매칭 분석', trendPositive: true },
  { label: '경력 관리', value: '-', to: '/career', trend: '벡터 검색', trendPositive: false },
]

const activities = [
  { label: '이력서를 작성해보세요', time: '추천', desc: 'AI가 초안부터 평가, 첨삭까지 도와줍니다.', to: '/resume', dotClass: 'bg-blue-600' },
  { label: 'AI 면접을 연습해보세요', time: '추천', desc: '직무별 맞춤 질문과 실시간 피드백', to: '/interview', dotClass: 'bg-blue-600' },
  { label: 'ATS 매칭 점수를 확인하세요', time: '추천', desc: 'JD 기반 키워드 분석으로 부족한 역량 진단', to: '/ats', dotClass: 'bg-blue-600' },
  { label: '문서를 업로드하고 관리하세요', time: '추천', desc: 'HWP, PDF, DOCX 파일 중앙 관리', to: '/docs', dotClass: 'bg-blue-600' },
]

const quickLinks = [
  { label: '이력서 관리', icon: 'i-lucide-file-text', to: '/resume' },
  { label: '면접 연습', icon: 'i-lucide-mic', to: '/interview' },
  { label: 'ATS 진단', icon: 'i-lucide-crosshair', to: '/ats' },
  { label: '문서 보관함', icon: 'i-lucide-folder', to: '/docs' },
  { label: '포토스튜디오', icon: 'i-lucide-palette', to: '/studio' },
  { label: '설정', icon: 'i-lucide-settings', to: '/settings' },
]
</script>

<style scoped>
@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
.animate-bounce-slow {
  animation: bounce-slow 6s ease-in-out infinite;
}
.typing-cursor::after {
  content: '|';
  animation: blink 0.8s step-start infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>