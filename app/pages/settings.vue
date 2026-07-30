<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">설정</h1>

    <UCard class="mb-6">
      <template #header><h2 class="text-lg font-semibold">프로필</h2></template>
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
      <template #header><h2 class="text-lg font-semibold">연결된 지갑</h2></template>
      <div v-if="walletAddress" class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-wallet" class="w-5 h-5 text-fg-brand" />
          <div>
            <p class="text-sm font-mono">{{ walletAddress }}</p>
            <p class="text-xs text-fg-neutral-muted">Kaikas / MetaMask</p>
          </div>
        </div>
        <UButton color="red" variant="outline" size="sm" @click="disconnectWallet">연결 해제</UButton>
      </div>
      <div v-else>
        <p class="text-sm text-fg-neutral-muted mb-3">연결된 지갑이 없습니다. 지갑을 연결하면 지갑으로 로그인할 수 있습니다.</p>
        <div class="flex gap-2">
          <UButton color="purple" variant="outline" size="sm" @click="connectWallet('kaikas')">Kaikas 연결</UButton>
          <UButton color="neutral" variant="outline" size="sm" @click="connectWallet('metamask')">MetaMask 연결</UButton>
        </div>
      </div>
    </UCard>

    <UCard class="mb-6">
      <template #header><h2 class="text-lg font-semibold">알림 설정</h2></template>
      <div class="space-y-3">
        <UCheckbox v-model="notifyInterview" label="모의 면접 알림" />
        <UCheckbox v-model="notifyResume" label="이력서 분석 완료 알림" />
        <UCheckbox v-model="notifyMarketing" label="마케팅 및 프로모션" />
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="text-lg font-semibold">계정</h2></template>
      <p class="text-sm text-fg-neutral-muted mb-4">계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</p>
      <UButton color="red" variant="outline" @click="confirmDelete">계정 삭제</UButton>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { data: user, refresh } = useFetch('/api/auth/me')
const saving = ref(false)
const connecting = ref(false)
const notifyInterview = ref(true)
const notifyResume = ref(true)
const notifyMarketing = ref(false)

const walletAddress = computed(() => (user.value as any)?.user?.walletAddress || '')

const form = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
})

watchEffect(() => {
  if (user.value) {
    form.name = (user.value as any).user?.name || ''
    form.email = (user.value as any).user?.email || ''
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

async function connectWallet(type: 'kaikas' | 'metamask') {
  connecting.value = true
  try {
    let provider: any
    if (type === 'kaikas') {
      provider = (window as any).klaytn
    } else {
      const eth = (window as any).ethereum
      provider = eth?.isMetaMask ? eth : null
    }
    if (!provider) {
      useToast().add({ title: '지갑 확장 프로그램을 찾을 수 없습니다.', color: 'yellow' })
      return
    }

    const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' })
    const address = accounts[0].toLowerCase()
    const { nonce, id } = await $fetch('/api/auth/nonce')
    const message = `Kairos Sign-In\n${nonce}\n${address}`
    const signature: `0x${string}` = await provider.request({ method: 'personal_sign', params: [message, address] })

    await $fetch('/api/auth/wallet', {
      method: 'POST',
      body: { address, message, signature, nonce: id },
    })
    await refresh()
    useToast().add({ title: '지갑이 연결되었습니다.', icon: 'i-lucide-check' })
  } catch (err: any) {
    useToast().add({ title: '지갑 연결에 실패했습니다.', description: err.message, color: 'red' })
  } finally {
    connecting.value = false
  }
}

async function disconnectWallet() {
  try {
    await $fetch('/api/auth/me', { method: 'PATCH', body: { walletAddress: null } })
    await refresh()
    useToast().add({ title: '지갑이 연결 해제되었습니다.', icon: 'i-lucice-check' })
  } catch {
    useToast().add({ title: '연결 해제에 실패했습니다.', color: 'red' })
  }
}

function confirmDelete() {
  useToast().add({ title: '계정 삭제 기능은 준비 중입니다.', color: 'yellow' })
}
</script>
