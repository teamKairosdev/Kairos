<template>
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">AI Career Steward</h1>
      <p class="hero-subtitle">SEED Design + Astro Islands + Nuxt</p>
      <a href="/app" class="cta-button">시작하기</a>
    </div>
  </section>
</template>

<style scoped>
.hero {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0b 0%, #1a0a2e 50%, #0a0a0b 100%);
}
.hero-content { text-align: center; max-width: 640px; padding: 2rem; }
.hero-title { font-size: 3.5rem; font-weight: 800; background: linear-gradient(135deg, #c084fc, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
.hero-subtitle { font-size: 1.125rem; color: #9ca3af; margin-bottom: 2rem; }
.cta-button { display: inline-block; padding: 0.75rem 2rem; border-radius: 9999px; background: white; color: #0a0a0b; font-weight: 600; text-decoration: none; }
</style>
