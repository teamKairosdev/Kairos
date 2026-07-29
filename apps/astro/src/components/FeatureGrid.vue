<template>
  <section class="features">
    <div class="feature-card" v-for="f in features" :key="f.title">
      <h3>{{ f.title }}</h3>
      <p>{{ f.desc }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
const features = [
  { title: 'AI Resume', desc: '3단계 AI 체인으로 이력서 고도화' },
  { title: 'Mock Interview', desc: 'SSE 실시간 AI 면접' },
  { title: 'ATS Analyzer', desc: '직무 적합도 스코어 분석' },
  { title: 'Humanizer', desc: 'AI 문체 자연어 변환' },
]
</script>

<style scoped>
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
.feature-card { border: 1px solid var(--color-stroke-neutral-muted); border-radius: 12px; padding: 1.5rem; background: var(--color-bg-neutral-muted); }
.feature-card h3 { color: var(--color-fg-neutral); font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
.feature-card p { color: var(--color-fg-neutral-muted); font-size: 0.875rem; }
</style>
