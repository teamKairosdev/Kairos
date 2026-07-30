<template>
  <!-- Landing page for guests -->
  <div v-if="!state.authenticated && !state.loading" class="space-y-16 pb-16">
    <!-- Hero -->
    <section class="text-center pt-8 sm:pt-16 pb-8">
      <div class="max-w-3xl mx-auto space-y-6">
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-fg-neutral leading-tight">
          당신의 커리어를 완성하는<br />
          <span class="text-fg-brand">AI 가이던스</span>
        </h1>
        <p class="text-lg text-fg-neutral-muted leading-relaxed max-w-2xl mx-auto">
          이력서 고도화, 실시간 모의 면접, ATS 분석, 문장 교정, 경력 검색까지.<br />
          하나의 플랫폼에서 커리어 전 과정을 AI와 함께 관리하세요.
        </p>
        <div class="flex flex-wrap gap-3 justify-center pt-4">
          <NuxtLink to="/auth/register" class="px-6 py-2.5 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-opacity">
            무료로 시작하기
          </NuxtLink>
          <NuxtLink to="/auth/login" class="px-6 py-2.5 rounded-lg border border-stroke-neutral-muted text-fg-neutral-muted text-sm font-medium hover:bg-neutral-muted transition-colors">
            로그인
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Stats banner -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
      <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
        <p class="text-2xl font-bold text-fg-neutral">5</p>
        <p class="text-xs text-fg-neutral-muted mt-1">핵심 기능</p>
      </div>
      <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
        <p class="text-2xl font-bold text-fg-neutral">3</p>
        <p class="text-xs text-fg-neutral-muted mt-1">AI 모델</p>
      </div>
      <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
        <p class="text-2xl font-bold text-fg-neutral">100%</p>
        <p class="text-xs text-fg-neutral-muted mt-1">데이터 보호</p>
      </div>
      <div class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted">
        <p class="text-2xl font-bold text-fg-neutral">무료</p>
        <p class="text-xs text-fg-neutral-muted mt-1">시작 가능</p>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="max-w-5xl mx-auto space-y-8">
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-fg-neutral">모든 커리어 도구를 한 곳에서</h2>
        <p class="text-sm text-fg-neutral-muted mt-2">AI 기반 5대 핵심 기능으로 취업 준비를 완성하세요</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">이력서 고도화</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">3단계 AI 체인으로 초안부터 평가, 재작성까지. ATS 최적화와 맞춤형 피드백을 제공합니다.</p>
        </NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-mic" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">AI 모의 면접</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">SSE 실시간 스트리밍 면접. 직무별 맞춤 질문과 즉각적인 답변 피드백을 제공합니다.</p>
        </NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-crosshair" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">ATS 분석</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">이력서와 JD를 비교하여 키워드 매칭 점수를 분석. 부족한 역량을 진단합니다.</p>
        </NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">AI 휴머나이저</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">딱딱한 AI 문체를 자연스러운 인간 어조로 변환. 자기소개서를 더 설득력 있게.</p>
        </NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-search" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">경력 검색</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">pgvector 기반 의미 검색. 과거 경력을 벡터 임베딩하여 유사 경력을 즉시 찾습니다.</p>
        </NuxtLink>
        <NuxtLink to="/auth/login" class="rounded-xl border border-stroke-neutral-muted p-6 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-palette" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-2 group-hover:text-fg-brand transition-colors">AI 포토스튜디오</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">DALL-E 3 기반 증명사진 및 프로필 이미지 생성. 취업용 전문 이미지를 제작합니다.</p>
        </NuxtLink>
      </div>
    </section>

    <!-- CTA -->
    <section class="text-center max-w-2xl mx-auto rounded-2xl border border-stroke-neutral-muted p-10 bg-neutral-muted">
      <h2 class="text-2xl font-semibold text-fg-neutral">지금 바로 시작하세요</h2>
      <p class="text-sm text-fg-neutral-muted mt-3">회원가입 없이도 체험이 가능합니다. 로그인하면 더 많은 기능을 이용할 수 있습니다.</p>
      <div class="flex flex-wrap gap-3 justify-center mt-6">
        <NuxtLink to="/auth/register" class="px-6 py-2.5 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-opacity">
          무료 회원가입
        </NuxtLink>
        <NuxtLink to="/auth/login" class="px-6 py-2.5 rounded-lg border border-stroke-neutral-muted text-fg-neutral-muted text-sm font-medium hover:bg-neutral-muted transition-colors">
          로그인
        </NuxtLink>
      </div>
    </section>
  </div>

  <!-- Dashboard for authenticated users -->
  <div v-else-if="state.authenticated" class="space-y-8">
    <!-- Welcome -->
    <div class="border border-stroke-neutral-muted rounded-xl p-6 bg-neutral-muted">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-fg-neutral">
            안녕하세요, {{ state.user?.name || '님' }}
          </h1>
          <p class="text-sm text-fg-neutral-muted mt-1">오늘도 커리어를 한 단계 발전시켜보세요</p>
        </div>
        <NuxtLink to="/interview" class="hidden sm:flex items-center gap-x2 px-4 py-2 rounded-lg bg-fg-neutral-default text-bg-neutral-default text-sm font-medium hover:opacity-90 transition-opacity">
          <UIcon name="i-lucide-mic" class="w-4 h-4" />
          면접 시작
        </NuxtLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="등록된 이력서" value="3" icon="i-lucide-file-text" trend="최근 평가 94점" :trendPositive="true" />
      <StatCard label="완료된 면접" value="8" icon="i-lucide-mic" trend="답변 완성도 +15%" :trendPositive="true" />
      <StatCard label="ATS 매칭" value="92%" icon="i-lucide-crosshair" trend="목표 직무 최적화" :trendPositive="true" />
      <StatCard label="벡터 경력" value="12" icon="i-lucide-zap" trend="pgvector 1536-dim" />
    </div>

    <!-- Quick actions -->
    <div>
      <h2 class="text-lg font-semibold text-fg-neutral mb-4">빠른 실행</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NuxtLink to="/resume" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1 group-hover:text-fg-brand transition-colors">이력서 작성</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">3단계 AI 고도화 파이프라인으로 이력서를 완성하세요</p>
        </NuxtLink>
        <NuxtLink to="/ats" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-crosshair" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1 group-hover:text-fg-brand transition-colors">ATS 진단</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">JD 기반 키워드 매칭 분석으로 합격률을 높이세요</p>
        </NuxtLink>
        <NuxtLink to="/career" class="rounded-xl border border-stroke-neutral-muted p-5 bg-neutral-muted hover:border-stroke-neutral-strong transition-colors group">
          <div class="w-10 h-10 rounded-lg bg-fg-brand/10 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-search" class="w-5 h-5 text-fg-brand" />
          </div>
          <h3 class="text-base font-medium text-fg-neutral mb-1 group-hover:text-fg-brand transition-colors">경력 검색</h3>
          <p class="text-xs text-fg-neutral-muted leading-relaxed">pgvector 의미 검색으로 관련 경력을 즉시 찾아보세요</p>
        </NuxtLink>
      </div>
    </div>

    <!-- Activity feed -->
    <div>
      <h2 class="text-lg font-semibold text-fg-neutral mb-4">최근 활동</h2>
      <div class="rounded-xl border border-stroke-neutral-muted divide-y divide-stroke-neutral-muted">
        <div v-for="activity in recentActivities" :key="activity.label" class="flex items-center gap-4 p-4">
          <div class="w-8 h-8 rounded-lg bg-fg-brand/10 flex items-center justify-center shrink-0">
            <UIcon :name="activity.icon" class="w-4 h-4 text-fg-brand" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-fg-neutral">{{ activity.label }}</p>
            <p class="text-xs text-fg-neutral-muted">{{ activity.time }}</p>
          </div>
          <NuxtLink :to="activity.to" class="text-xs text-fg-brand hover:underline shrink-0">보기</NuxtLink>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center justify-center py-20">
    <UIcon name="i-lucide-loader" class="w-6 h-6 text-fg-neutral-muted animate-spin" />
  </div>
</template>

<script setup lang="ts">
import StatCard from '~/components/StatCard.vue'

const { state } = useAuth()

const recentActivities = [
  { label: '이력서 고도화 완료', icon: 'i-lucide-file-text', time: '30분 전', to: '/resume' },
  { label: 'AI 모의 면접 세션 종료', icon: 'i-lucide-mic', time: '2시간 전', to: '/interview' },
  { label: 'ATS 분석 리포트 생성', icon: 'i-lucide-crosshair', time: '어제', to: '/ats' },
  { label: '휴머나이저 변환 완료', icon: 'i-lucide-sparkles', time: '어제', to: '/humanizer' },
]
</script>
