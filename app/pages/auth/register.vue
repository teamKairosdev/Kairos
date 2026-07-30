<template>
  <div class="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Card -->
      <div class="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-100/60 space-y-6 relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-100/20 blur-[30px] rounded-full pointer-events-none"></div>

        <div class="text-center space-y-1.5 relative">
          <div class="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center font-black text-white text-lg mx-auto mb-3">K</div>
          <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight">회원가입</h1>
          <p class="text-xs text-gray-400 font-medium">AI 커리어 플랫폼, 무료로 시작하세요</p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4 relative">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">성함</label>
            <input v-model="name" type="text" required placeholder="홍길동" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">이메일</label>
            <input v-model="email" type="email" required placeholder="user@example.com" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">비밀번호</label>
            <input v-model="password" type="password" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
          </div>

          <div v-if="errorMsg" class="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{{ errorMsg }}</div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ loading ? '가입 중...' : '무료 회원가입' }}
          </button>
        </form>

        <p class="text-center text-xs text-gray-400 relative">
          이미 계정이 있으신가요?
          <NuxtLink to="/auth/login" class="text-blue-600 font-semibold hover:underline ml-1">로그인</NuxtLink>
        </p>
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
