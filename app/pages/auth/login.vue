<template>
  <div class="max-w-sm mx-auto py-16">
    <div class="border border-stroke-neutral-muted rounded-xl p-8 bg-neutral-muted space-y-x4">
      <div class="text-center space-y-1.5">
        <h1 class="text-xl font-semibold text-fg-neutral">로그인</h1>
        <p class="text-xs text-fg-neutral-muted">Kairos에 오신 것을 환영합니다</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup label="이메일">
          <UInput v-model="email" type="email" required placeholder="user@example.com" />
        </UFormGroup>

        <UFormGroup label="비밀번호">
          <UInput v-model="password" type="password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
        </UFormGroup>

        <UAlert v-if="errorMsg" color="red" variant="soft" :description="errorMsg" />

        <UButton type="submit" :loading="loading" color="black" variant="solid" size="lg" block label="로그인" />
      </form>

      <div class="text-center text-xs text-fg-neutral-muted pt-1">
        계정이 없으신가요?
        <NuxtLink to="/auth/register" class="text-fg-neutral hover:underline">회원가입</NuxtLink>
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
