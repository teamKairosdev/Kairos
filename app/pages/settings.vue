<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">설정</h1>

    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">프로필</h2>
      </template>
      <UForm :state="form" @submit="saveProfile" class="space-y-4">
        <UFormGroup label="성함">
          <UInput v-model="form.name" placeholder="홍길동" />
        </UFormGroup>
        <UFormGroup label="이메일">
          <UInput v-model="form.email" type="email" disabled />
        </UFormGroup>
        <UButton type="submit" color="purple" :loading="saving">저장</UButton>
      </UForm>
    </UCard>

    <UCard class="mb-6">
      <template #header>
        <h2 class="text-lg font-semibold">알림 설정</h2>
      </template>
      <div class="space-y-3">
        <UCheckbox v-model="notifyInterview" label="모의 면접 알림" />
        <UCheckbox v-model="notifyResume" label="이력서 분석 완료 알림" />
        <UCheckbox v-model="notifyMarketing" label="마케팅 및 프로모션" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">계정</h2>
      </template>
      <p class="text-sm text-fg-neutral-muted mb-4">계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</p>
      <UButton color="red" variant="outline" @click="confirmDelete">계정 삭제</UButton>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({})
const { data: user } = useFetch('/api/auth/me')
const saving = ref(false)
const notifyInterview = ref(true)
const notifyResume = ref(true)
const notifyMarketing = ref(false)

const form = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
})

watchEffect(() => {
  if (user.value) {
    form.name = user.value.name
    form.email = user.value.email
  }
})

async function saveProfile() {
  saving.value = true
  try {
    await $fetch('/api/auth/me', { method: 'PATCH', body: { name: form.name } })
    useToast().add({ title: '프로필이 저장되었습니다.', icon: 'i-lucide-check' })
  } catch {
    useToast().add({ title: '저장에 실패했습니다.', color: 'red' })
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  useToast().add({ title: '계정 삭제 기능은 준비 중입니다.', color: 'yellow' })
}
</script>
