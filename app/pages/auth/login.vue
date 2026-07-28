<template>
  <div class="max-w-md mx-auto py-12">
    <div class="glass-panel rounded-3xl p-8 border border-white/10 space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-extrabold text-white">Kairos 로그인</h1>
        <p class="text-xs text-gray-400">당신의 커리어 스튜어드쉽 플랫폼에 접속하세요</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup label="이메일">
          <UInput
            v-model="email"
            type="email"
            required
            placeholder="user@example.com"
            color="primary"
          />
        </UFormGroup>

        <UFormGroup label="비밀번호">
          <UInput
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            color="primary"
          />
        </UFormGroup>

        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          :description="errorMsg"
        />

        <UButton
          type="submit"
          :loading="loading"
          color="primary"
          variant="solid"
          size="lg"
          block
          label="로그인"
        />
      </form>

      <div class="text-center text-xs text-gray-400 pt-2">
        계정이 없으신가요?
        <NuxtLink to="/auth/register" class="text-purple-400 font-semibold hover:underline">회원가입</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>
