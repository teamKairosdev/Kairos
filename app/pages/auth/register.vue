<template>
  <div class="max-w-md mx-auto py-12">
    <div class="glass-panel rounded-3xl p-8 border border-white/10 space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-extrabold text-white">Kairos 회원가입</h1>
        <p class="text-xs text-gray-400">새로운 AI 기반 취업 준비 계정을 작성하세요</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">성함 / 이름</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="홍길동"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">이메일</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="user@example.com"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">비밀번호</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div v-if="errorMsg" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
        >
          <span v-if="loading">가입 중...</span>
          <span v-else>가입하기</span>
        </button>
      </form>

      <div class="text-center text-xs text-gray-400 pt-2">
        이미 계정이 있으신가요?
        <NuxtLink to="/auth/login" class="text-purple-400 font-semibold hover:underline">로그인</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()

async function handleRegister() {
  loading.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || '회원가입에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>
