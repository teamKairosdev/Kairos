<template>
  <!-- ── Landing (비인증) ── -->
  <div v-if="!state.authenticated && !state.loading" class="space-y-24 pb-24">
    <!-- Hero -->
    <section class="relative pt-12 sm:pt-20 pb-8 text-center overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-fg-brand/5 to-transparent pointer-events-none" />
      <div class="relative max-w-4xl mx-auto space-y-8 px-4">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-stroke-neutral-muted text-xs text-fg-neutral-muted bg-neutral-muted/50">
          AI 기반 커리어 플랫폼
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-fg-neutral leading-[1.1]">
          당신의 커리어를<br />
          <span class="text-fg-brand">완성하는 AI</span>
        </h1>
        <p class="text-base sm:text-lg text-fg-neutral-muted leading-relaxed max-w-2xl mx-auto">
          이력서 고도화부터 AI 모의 면접, ATS 분석까지.<br class="hidden sm:block" />
          하나의 플랫폼에서 커리어 전 과정을 관리하세요.
        </p>
        <div class="flex flex-wrap gap-3 justify-center pt-2">
          <NuxtLink to="/auth/register" class="px-6 py-2.5 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-all shadow-sm">
            무료로 시작하기
          </NuxtLink>
          <NuxtLink to="/auth/login" class="px-6 py-2.5 rounded-lg border border-stroke-neutral-muted text-fg-neutral-muted text-sm font-medium hover:bg-neutral-muted transition-colors">
            로그인
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Stats banner -->
    <section class="max-w-4xl mx-auto px-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-stroke-neutral-muted bg-stroke-neutral-muted">
        <div v-for="stat in stats" :key="stat.label" class="bg-bg-neutral-default p-6 text-center">
          <p class="text-2xl sm:text-3xl font-bold text-fg-neutral">{{ stat.value }}</p>
          <p class="text-xs text-fg-neutral-muted mt-1">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- Features grid -->
    <section id="features" class="max-w-6xl mx-auto px-4 space-y-8">
      <div class="text-center max-w-xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-semibold text-fg-neutral">필요한 모든 도구</h2>
        <p class="text-sm text-fg-neutral-muted mt-3 leading-relaxed">
          AI가 이력서, 면접, 자소서, 경력 관리를 하나로 연결합니다
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink v-for="feature in landingFeatures" :key="feature.title"
          to="/auth/register"
          class="group rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-fg-brand/30 hover:shadow-sm transition-all"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-4" :class="feature.bgClass">
            <UIcon :name="feature.icon" class="w-5 h-5" :class="feature.iconClass" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">{{ feature.title }}</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">{{ feature.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-2xl mx-auto px-4">
      <div class="rounded-2xl border border-stroke-neutral-muted p-10 sm:p-12 text-center bg-gradient-to-b from-neutral-muted to-bg-neutral-default">
        <h2 class="text-2xl sm:text-3xl font-semibold text-fg-neutral">지금 시작하세요</h2>
        <p class="text-sm text-fg-neutral-muted mt-3">3초 만에 가입하고 AI 커리어 어시스턴트를 경험해보세요</p>
        <div class="flex flex-wrap gap-3 justify-center mt-6">
          <NuxtLink to="/auth/register" class="px-6 py-2.5 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
            무료 회원가입
          </NuxtLink>
          <NuxtLink to="/auth/login" class="px-6 py-2.5 rounded-lg border border-stroke-neutral-muted text-fg-neutral-muted text-sm font-medium hover:bg-neutral-muted transition-colors">
            로그인
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>

  <!-- ── Dashboard (인증됨) ── -->
  <div v-else-if="state.authenticated" class="space-y-8">
    <!-- Welcome banner -->
    <div class="rounded-xl border border-stroke-neutral-muted p-6 bg-gradient-to-r from-neutral-muted to-bg-neutral-default">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-fg-neutral">
            {{ state.user?.name }}님, 반갑습니다
          </h1>
          <p class="text-sm text-fg-neutral-muted">{{ greetingMessage }}</p>
        </div>
        <NuxtLink to="/interview" class="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-all shrink-0">
          <UIcon name="i-lucide-mic" class="w-4 h-4" />
          면접 시작
        </NuxtLink>
      </div>
    </div>

    <!-- Stats row (portal-style) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <NuxtLink v-for="stat in dashboardStats" :key="stat.label" :to="stat.to"
        class="rounded-xl border border-stroke-neutral-muted p-4 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors"
      >
        <p class="text-xs text-fg-neutral-muted">{{ stat.label }}</p>
        <p class="text-xl font-semibold text-fg-neutral mt-1">{{ stat.value }}</p>
        <p v-if="stat.trend" class="text-xs mt-1" :class="stat.trendPositive ? 'text-fg-brand' : 'text-fg-neutral-muted'">
          {{ stat.trendPositive ? '↑' : '·' }} {{ stat.trend }}
        </p>
      </NuxtLink>
    </div>

    <!-- Main content: Feed + Sidebar (portal+SNS hybrid) -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <!-- Left: Activity feed (Threads-style timeline) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-fg-neutral">최근 활동</h2>
          <NuxtLink to="/settings" class="text-xs text-fg-neutral-muted hover:text-fg-neutral transition-colors">전체보기</NuxtLink>
        </div>
        <div class="space-y-3">
          <div v-for="(activity, i) in activities" :key="i"
            class="relative flex gap-4 pb-3"
            :class="i < activities.length - 1 ? 'border-l-2 border-stroke-neutral-muted ml-3.5' : ''"
          >
            <div class="absolute -left-[11px] w-5 h-5 rounded-full border-2 border-stroke-neutral-muted bg-bg-neutral-default flex items-center justify-center">
              <div class="w-2 h-2 rounded-full" :class="activity.dotClass" />
            </div>
            <div class="flex-1 pl-6">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-fg-neutral">{{ activity.label }}</span>
                <span class="text-xs text-fg-neutral-muted">{{ activity.time }}</span>
              </div>
              <p class="text-xs text-fg-neutral-muted mt-0.5">{{ activity.desc }}</p>
              <NuxtLink :to="activity.to" class="text-xs text-fg-brand hover:underline mt-1 inline-block">확인하기 →</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Right sidebar (portal-style quick links) -->
      <div class="space-y-4">
        <!-- Quick links -->
        <div class="rounded-xl border border-stroke-neutral-muted p-4 bg-neutral-muted">
          <h3 class="text-xs font-semibold text-fg-neutral-muted tracking-wide mb-3">빠른 메뉴</h3>
          <nav class="space-y-1">
            <NuxtLink v-for="item in quickLinks" :key="item.label" :to="item.to"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg-neutral-muted hover:text-fg-neutral hover:bg-bg-neutral-default transition-colors"
            >
              <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Tip card -->
        <div class="rounded-xl border border-stroke-neutral-muted p-4 bg-gradient-to-br from-fg-brand/5 to-transparent">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-fg-brand/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-lightbulb" class="w-4 h-4 text-fg-brand" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-fg-neutral">AI 팁</h3>
              <p class="text-xs text-fg-neutral-muted mt-1 leading-relaxed">이력서에 지원 회사의 핵심 키워드를 포함하면 ATS 점수가 평균 23% 상승합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Loading ── -->
  <div v-else class="flex items-center justify-center py-32">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader" class="w-6 h-6 text-fg-neutral-muted animate-spin" />
      <p class="text-sm text-fg-neutral-muted">로딩 중...</p>
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
