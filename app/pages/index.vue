<template>
  <!-- ── Landing (비인증) ── -->
  <div v-if="!state.authenticated && !state.loading" class="space-y-20 pb-24">
    <!-- Hero Section -->
    <section class="relative pt-16 sm:pt-24 pb-12 text-center overflow-hidden">
      <!-- Premium Multi-colored Background Gradients -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/80 via-indigo-50/40 to-transparent pointer-events-none" />
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-200/20 to-indigo-200/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div class="relative max-w-4xl mx-auto space-y-8 px-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-100 text-xs font-semibold text-blue-600 bg-blue-50/50 backdrop-blur-md">
          ✨ AI 기반 차세대 커리어 steward
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
          당신의 커리어를<br />
          <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">완벽하게 완성하는 AI</span>
        </h1>
        <p class="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
          이력서 고도화부터 AI 모의 면접, ATS 매칭률 분석까지.<br class="hidden sm:block" />
          하나의 프리미엄 플랫폼에서 커리어 성장 주기를 통합 관리하세요.
        </p>
        <div class="flex flex-wrap gap-4 justify-center pt-4">
          <NuxtLink to="/auth/register" class="px-7 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 transition-all duration-200">
            무료로 시작하기
          </NuxtLink>
          <NuxtLink to="/auth/login" class="px-7 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
            로그인
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Stats Banner -->
    <section class="max-w-4xl mx-auto px-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="stat in stats" :key="stat.label" class="bg-white/60 backdrop-blur-md border border-slate-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
          <p class="text-3xl font-extrabold text-blue-600">{{ stat.value }}</p>
          <p class="text-xs font-semibold text-slate-400 mt-2">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section id="features" class="max-w-6xl mx-auto px-4 space-y-12">
      <div class="text-center max-w-xl mx-auto space-y-3">
        <h2 class="text-3xl font-bold text-slate-900">핵심 기능 가이드</h2>
        <p class="text-sm font-medium text-slate-400 leading-relaxed">
          지능형 에이전트가 이력서, 자소서, 면접, 커리어 로드맵을 지능적으로 빌드합니다.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink v-for="feature in landingFeatures" :key="feature.title"
          to="/auth/register"
          class="group rounded-2xl border border-slate-100 p-8 bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1 transition-all duration-300 shadow-sm"
        >
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300" :class="feature.bgClass">
            <UIcon :name="feature.icon" class="w-6 h-6" :class="feature.iconClass" />
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">{{ feature.title }}</h3>
          <p class="text-xs text-slate-400 leading-relaxed font-medium">{{ feature.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="max-w-4xl mx-auto px-4">
      <div class="rounded-3xl border border-blue-50 p-10 sm:p-14 text-center bg-gradient-to-b from-blue-50/50 to-white shadow-sm relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-100/30 blur-[40px] rounded-full" />
        <div class="relative space-y-6">
          <h2 class="text-3xl font-bold text-slate-900">당신의 성장을 도울 파트너</h2>
          <p class="text-sm font-medium text-slate-400 max-w-md mx-auto leading-relaxed">3초 간편 회원가입으로 나만을 위한 AI 커리어 전문가를 맞이하세요.</p>
          <div class="flex flex-wrap gap-3 justify-center pt-2">
            <NuxtLink to="/auth/register" class="px-7 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 hover:shadow-lg transition-all duration-200">
              지금 시작하기
            </NuxtLink>
            <NuxtLink to="/auth/login" class="px-7 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all duration-200">
              간편 로그인
            </NuxtLink>
          </div>
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

const stats = [
  { value: '5', label: '핵심 기능' },
  { value: '3', label: 'AI 모델' },
  { value: '100%', label: '데이터 보호' },
  { value: '무료', label: '시작 가능' },
]

const landingFeatures = [
  { title: '이력서 고도화', icon: 'i-lucide-file-text', desc: '3단계 AI 체인으로 초안부터 평가, 재작성까지 자동 고도화합니다.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
  { title: 'AI 모의 면접', icon: 'i-lucide-mic', desc: 'SSE 실시간 스트리밍 면접. 직무별 맞춤 질문과 즉각 피드백.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
  { title: 'ATS 분석', icon: 'i-lucide-crosshair', desc: 'JD 기반 키워드 매칭 점수 분석. 부족한 역량을 정확히 진단합니다.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
  { title: 'AI 휴머나이저', icon: 'i-lucide-sparkles', desc: 'AI 문체를 자연스러운 인간 어조로. 자기소개서를 더 설득력 있게.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
  { title: '경력 검색', icon: 'i-lucide-search', desc: 'pgvector 의미 검색. 과거 경력을 벡터 임베딩하여 유사 경력을 즉시 검색.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
  { title: 'AI 포토스튜디오', icon: 'i-lucide-palette', desc: 'DALL-E 3 기반 프로필 이미지 생성. 취업용 전문 이미지를 제작합니다.', bgClass: 'bg-fg-brand/10', iconClass: 'text-fg-brand' },
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
