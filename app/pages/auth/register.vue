<template>
  <div class="max-w-md mx-auto py-12">
    <div class="glass-panel rounded-3xl p-8 border border-white/10 space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-extrabold text-white">Kairos 회원가입</h1>
        <p class="text-xs text-gray-400">새로운 AI 기반 취업 준비 계정을 작성하세요</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <UFormGroup label="성함 / 이름">
          <UInput
            v-model="name"
            type="text"
            required
            placeholder="홍길동"
            color="primary"
          />
        </UFormGroup>

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
color="red"
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
          label="가입하기"
        />
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
