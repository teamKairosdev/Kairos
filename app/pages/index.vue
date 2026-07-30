<template>
  <!-- ── Landing (비인증) ── -->
  <div
    v-if="!state.authenticated && !state.loading"
    ref="landingContainer"
    class="min-h-screen relative overflow-hidden bg-white text-slate-900 pb-32"
    @mousemove="handleMouseMove"
  >
    <!-- Interactive Background Mesh Orbs -->
    <div
      class="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out"
      :style="{ transform: `translate(${mouseX * 15}px, ${mouseY * 15}px)` }"
    >
      <div class="absolute top-10 left-10 w-[450px] h-[450px] bg-gradient-to-tr from-blue-300/20 via-indigo-200/20 to-purple-200/20 rounded-full blur-[140px] animate-pulse" style="animation-duration: 8s;"></div>
      <div class="absolute bottom-20 right-10 w-[550px] h-[550px] bg-gradient-to-br from-indigo-200/10 via-pink-200/20 to-amber-200/10 rounded-full blur-[160px] animate-pulse" style="animation-duration: 12s;"></div>
      <div class="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-sky-200/10 rounded-full blur-[100px] animate-bounce-slow"></div>
    </div>

    <!-- Hero Section -->
    <section class="relative pt-24 pb-16 px-6 max-w-6xl mx-auto text-center space-y-12">
      <!-- Tagline -->
      <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-indigo-100/50 bg-white/70 shadow-sm text-xs font-bold text-indigo-600 backdrop-blur-md hover:-translate-y-0.5 transition-all">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
        AI-native career stewardship
      </div>

      <!-- Main Headline -->
      <div class="space-y-6 max-w-4xl mx-auto">
        <h1 class="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] text-slate-900">
          이력서에서 면접까지<br />
          <span class="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">경력을 리드하는 AI</span>
        </h1>
        <p class="text-base sm:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          지루한 수작업과 불확실한 모의 준비는 끝났습니다. Kairos는 이력서 자동 고도화, 실시간 모의 면접, ATS 매칭을 아우르는 올인원 커리어 플랫폼입니다.
        </p>
      </div>

      <!-- Interactive Hero Interactive Card Mockup -->
      <div
        class="relative max-w-3xl mx-auto rounded-3xl border border-slate-100 bg-white/60 p-2.5 shadow-2xl backdrop-blur-2xl transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-indigo-100"
        :style="{ transform: `perspective(1000px) rotateX(${mouseY * -3}deg) rotateY(${mouseX * 3}deg)` }"
      >
        <div class="rounded-[22px] bg-slate-950 p-6 sm:p-10 text-left overflow-hidden relative min-h-[300px] flex flex-col justify-between">
          <!-- Mockup top bar -->
          <div class="flex items-center gap-2 mb-6">
            <span class="w-3 h-3 rounded-full bg-red-500"></span>
            <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span class="w-3 h-3 rounded-full bg-green-500"></span>
            <span class="text-[10px] text-gray-500 font-mono ml-2">kairos_evaluation_engine.py</span>
          </div>

          <!-- Dynamic Typewriter Content -->
          <div class="space-y-4 font-mono text-xs sm:text-sm text-gray-300">
            <div class="flex items-center gap-2 text-indigo-400">
              <span>&gt;</span>
              <span class="typing-cursor">kairos analyze --resume=active_profile.pdf</span>
            </div>
            <div class="text-gray-400 text-[10px] sm:text-xs">
              [SYSTEM] 1536-dim vector embedding generated. Similarity score matching...
            </div>
            <div class="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div class="flex justify-between items-center text-[10px] sm:text-xs">
                <span class="text-emerald-400 font-bold">✓ AI Evaluation Complete</span>
                <span class="text-indigo-300 font-bold">Score: 94/100</span>
              </div>
              <p class="text-gray-400 text-[11px] leading-relaxed">
                "API 리팩토링으로 로딩 속도 23% 개선" 피처가 감지되었습니다. 주요 비즈니스 모듈의 동시성 제어 공헌도가 높은 평가를 받았습니다.
              </p>
            </div>
          </div>

          <!-- Actions Overlay -->
          <div class="flex flex-wrap gap-3 mt-8 pt-6 border-t border-white/5">
            <NuxtLink to="/auth/register" class="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-indigo-600 hover:text-white font-bold text-xs transition-all shadow-md">
              무료 가입하고 시작하기
            </NuxtLink>
            <NuxtLink to="/auth/login" class="px-6 py-2.5 rounded-xl border border-white/15 text-white hover:bg-white/10 font-bold text-xs transition-all">
              데모 계정 로그인
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Bento Showcase Grid -->
    <section class="max-w-6xl mx-auto px-6 py-12 space-y-16">
      <div class="space-y-4 text-center max-w-xl mx-auto">
        <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight">과감하고 감도 높은 AI 핵심 파이프라인</h2>
        <p class="text-sm font-semibold text-slate-400 leading-relaxed">경력 개발 주기를 혁신하는 Kairos의 5가지 핵심 서비스 모듈을 경험해 보세요.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        <!-- Bento 1: AI Resume Diff Editor (col-span-7) -->
        <div class="md:col-span-7 group relative rounded-3xl border border-slate-100 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-100 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div>
            <div class="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 font-bold text-lg">📄</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">실시간 AI 이력서 캔버스 (Diff 지원)</h3>
            <p class="text-xs text-slate-400 leading-relaxed font-semibold">이력서 원본과 AI 고도화 본을 한눈에 비교하고, 직접 에디팅하여 최상의 결과를 완성합니다.</p>
          </div>

          <!-- Mini interactive diff visual on hover -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-4 bg-slate-50 relative group-hover:scale-[1.02] transition-transform duration-300">
            <p class="text-[10px] font-mono text-slate-400 mb-2">// 이력서 성과 파트 실시간 첨삭</p>
            <div class="space-y-1.5 font-mono text-[11px] leading-relaxed">
              <div class="bg-red-50 text-red-600 px-2 py-0.5 rounded">- 결제 서비스 개발에 주도적으로 참여함.</div>
              <div class="bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold">+ MSA 아키텍처 및 분산 캐싱을 도입하여 결제 처리 속도 23% 개선.</div>
            </div>
          </div>
        </div>

        <!-- Bento 2: ATS Matching Circle (col-span-5) -->
        <div class="md:col-span-5 group relative rounded-3xl border border-slate-100 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-pink-100 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div>
            <div class="w-11 h-11 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 mb-6 font-bold text-lg">🎯</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">ATS 요구 스택 적합률 매칭</h3>
            <p class="text-xs text-slate-400 leading-relaxed font-semibold">지원할 공고(JD)의 키워드를 파싱하여 이력서와의 직무 부합 점수를 실시간 판정합니다.</p>
          </div>

          <!-- Circle Gauge Animation -->
          <div class="mt-6 flex justify-center items-center relative">
            <div class="relative w-28 h-28 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#f1f5f9" stroke-width="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" stroke="#db2777" stroke-width="8" fill="transparent"
                  stroke-dasharray="301.6"
                  stroke-dashoffset="30.16"
                  class="transition-all duration-1000 group-hover:stroke-pink-500"
                />
              </svg>
              <div class="absolute text-center">
                <span class="text-2xl font-black text-slate-800">90%</span>
                <p class="text-[9px] text-gray-400 font-bold uppercase">MATCH</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento 3: Mock Interview room Waveform (col-span-5) -->
        <div class="md:col-span-5 group relative rounded-3xl border border-slate-100 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-purple-100 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div>
            <div class="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 font-bold text-lg">🎤</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">실시간 스트리밍 모의 면접</h3>
            <p class="text-xs text-slate-400 leading-relaxed font-semibold">실제 면접장과 유사한 분위기에서 AI 면접관과 대화하며 실력을 점검하세요.</p>
          </div>

          <!-- Pulsing Audio Wave graphic on hover -->
          <div class="mt-6 flex items-end justify-center gap-1.5 h-16 bg-slate-950 rounded-2xl p-4 overflow-hidden relative">
            <span v-for="w in [2, 4, 3, 5, 2, 6, 4, 3, 5, 2, 4, 3]" :key="w"
              class="w-1 bg-purple-500 rounded-full transition-all duration-200"
              :class="`h-${w*2} animate-pulse`"
              :style="{ animationDelay: `${w * 120}ms` }"
            ></span>
          </div>
        </div>

        <!-- Bento 4: Vector alignment visual (col-span-7) -->
        <div class="md:col-span-7 group relative rounded-3xl border border-slate-100 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-amber-100 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div>
            <div class="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 font-bold text-lg">🗂️</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">pgvector 시맨틱 경력 검색</h3>
            <p class="text-xs text-slate-400 leading-relaxed font-semibold">1,536차원의 벡터 임베딩 의미론적 대조로 과거의 유관 경력을 정확히 매칭합니다.</p>
          </div>

          <!-- Vector particles simulation -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-4 bg-slate-50 flex justify-between items-center group-hover:bg-amber-50/20 transition-all">
            <div class="space-y-1">
              <span class="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Vector Search Query</span>
              <p class="text-xs text-slate-800 font-bold font-mono">"대용량 트래픽 처리 경험"</p>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 relative"></span>
              <span class="text-xs font-mono font-bold text-amber-600 ml-1">94% Similarity</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Banner -->
    <section class="max-w-4xl mx-auto px-6 pt-16">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="stat in stats" :key="stat.label" class="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-xs hover:-translate-y-1 transition-all duration-300 hover:shadow-md">
          <p class="text-3xl font-black text-indigo-600 tracking-tight">{{ stat.value }}</p>
          <p class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{{ stat.label }}</p>
        </div>
      </div>
    </section>
  </div>

  <!-- ── Dashboard (인증됨) ── -->
  <div v-else-if="state.authenticated" class="space-y-8 pb-16">
    <!-- Welcome Banner -->
    <div class="rounded-2xl border border-blue-100/50 p-8 bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-white shadow-sm">
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
          <span v-if="stat.trendPositive">✨</span>
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
          <NuxtLink to="/settings" class="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors">자세히보기</NuxtLink>
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
        <div class="rounded-2xl border border-blue-50 p-6 bg-gradient-to-br from-blue-50/20 via-indigo-50/10 to-white shadow-sm space-y-4">
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
  // Calculate offset factor between -1 and 1
  const width = window.innerWidth
  const height = window.innerHeight
  mouseX.value = (e.clientX / width) * 2 - 1
  mouseY.value = (e.clientY / height) * 2 - 1
}

const stats = [
  { value: '5', label: '핵심 기능' },
  { value: '3', label: 'AI 모델' },
  { value: '100%', label: '데이터 보호' },
  { value: '무료', label: '시작 가능' },
]

const dashboardStats = [
  { label: '이력서', value: '-', to: '/resume', trend: 'AI 고도화 시작하기', trendPositive: true },
  { label: '모의 면접', value: '-', to: '/interview', trend: '첫 면접 시작하기', trendPositive: true },
  { label: 'ATS 분석', value: '-', to: '/ats', trend: 'JD 매칭 분석', trendPositive: true },
  { label: '경력 검색', value: '-', to: '/career', trend: '벡터 검색', trendPositive: false },
]

const activities = [
  { label: '이력서를 작성해보세요', time: '추천', desc: 'AI가 초안부터 평가, 재작성까지 도와줍니다', to: '/resume', dotClass: 'bg-fg-brand' },
  { label: 'AI 면접을 연습해보세요', time: '추천', desc: '직무별 맞춤 질문과 실시간 피드백', to: '/interview', dotClass: 'bg-fg-brand' },
  { label: 'ATS 매칭 점수를 확인하세요', time: '추천', desc: 'JD 기반 키워드 분석으로 부족한 역량 진단', to: '/ats', dotClass: 'bg-fg-brand' },
  { label: '문서를 업로드하고 관리하세요', time: '추천', desc: 'HWP, PDF, DOCX 파일 중앙 관리', to: '/docs', dotClass: 'bg-fg-brand' },
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
