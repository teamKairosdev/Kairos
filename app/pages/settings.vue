<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">설정</h1>
      <p class="text-sm text-gray-500 mt-1">프로필, 알림, 계정 설정을 관리합니다.</p>
    </div>

    <!-- Profile Card -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-700">프로필</h2>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">성함</label>
          <input v-model="form.name" type="text" placeholder="홍길동" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">이메일</label>
          <input :value="form.email" type="email" disabled class="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed" />
        </div>
        <button
          @click="saveProfile"
          :disabled="saving"
          class="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {{ saving ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>

    <!-- Wallet Card -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-700">연결된 지갑</h2>
      </div>
      <div class="p-6">
        <div v-if="walletAddress" class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <div>
              <p class="text-sm font-mono text-gray-900">{{ walletAddress.slice(0, 8) }}...{{ walletAddress.slice(-6) }}</p>
              <p class="text-xs text-gray-400">Kaikas / MetaMask</p>
            </div>
          </div>
          <button @click="disconnectWallet" class="px-3.5 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">연결 해제</button>
        </div>
        <div v-else class="space-y-3">
          <p class="text-sm text-gray-500">연결된 지갑이 없습니다. 지갑을 연결하면 지갑으로 로그인할 수 있습니다.</p>
          <div class="flex gap-2">
            <button @click="connectWallet('kaikas')" class="px-4 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">Kaikas 연결</button>
            <button @click="connectWallet('metamask')" class="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">MetaMask 연결</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications Card -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-700">알림 설정</h2>
      </div>
      <div class="p-6 space-y-4">
        <label v-for="notif in notifications" :key="notif.key" class="flex items-center justify-between py-2 cursor-pointer">
          <div>
            <p class="text-sm font-medium text-gray-800">{{ notif.label }}</p>
            <p class="text-xs text-gray-400">{{ notif.desc }}</p>
          </div>
          <div
            @click="notif.value = !notif.value"
            class="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
            :class="notif.value ? 'bg-indigo-500' : 'bg-gray-200'"
          >
            <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" :class="notif.value ? 'translate-x-5' : 'translate-x-0'"></div>
          </div>
        </label>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="bg-white rounded-2xl border border-red-100 shadow-xs overflow-hidden">
      <div class="px-6 py-4 border-b border-red-100">
        <h2 class="text-sm font-semibold text-red-600">위험 구역</h2>
      </div>
      <div class="p-6 flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-gray-800">계정 삭제</p>
          <p class="text-xs text-gray-500 mt-0.5">계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
        </div>
        <button @click="confirmDelete" class="shrink-0 px-4 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">계정 삭제</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const { data: user, refresh } = useFetch('/api/auth/me')
const saving = ref(false)
const connecting = ref(false)

const walletAddress = computed(() => (user.value as any)?.user?.walletAddress || '')

const form = reactive({ name: '', email: '' })

watchEffect(() => {
  if (user.value) {
    form.name = (user.value as any).user?.name || ''
    form.email = (user.value as any).user?.email || ''
  }
})

const notifications = reactive([
  { key: 'interview', label: '모의 면접 알림', desc: '면접 세션이 완료되면 알림을 받습니다.', value: true },
  { key: 'resume', label: '이력서 분석 완료', desc: 'ATS 분석이 완료되면 알림을 받습니다.', value: true },
  { key: 'marketing', label: '마케팅 및 프로모션', desc: '신기능 출시 및 이벤트 소식을 받습니다.', value: false },
])

async function saveProfile() {
  saving.value = true
  try {
    await $fetch('/api/auth/me', { method: 'PATCH', body: { name: form.name } })
    toast.add({ title: '프로필이 저장되었습니다.', color: 'green' })
  } catch {
    toast.add({ title: '저장에 실패했습니다.', color: 'red' })
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
      toast.add({ title: '지갑 확장 프로그램을 찾을 수 없습니다.', color: 'yellow' })
      return
    }
    const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' })
    const address = accounts[0].toLowerCase()
    const { nonce, id } = await $fetch('/api/auth/nonce')
    const message = `Kairos Sign-In\n${nonce}\n${address}`
    const signature: `0x${string}` = await provider.request({ method: 'personal_sign', params: [message, address] })
    await $fetch('/api/auth/wallet', { method: 'POST', body: { address, message, signature, nonce: id } })
    await refresh()
    toast.add({ title: '지갑이 연결되었습니다.', color: 'green' })
  } catch (err: any) {
    toast.add({ title: '지갑 연결에 실패했습니다.', description: err.message, color: 'red' })
  } finally {
    connecting.value = false
  }
}

async function disconnectWallet() {
  try {
    await $fetch('/api/auth/me', { method: 'PATCH', body: { walletAddress: null } })
    await refresh()
    toast.add({ title: '지갑 연결이 해제되었습니다.', color: 'green' })
  } catch {
    toast.add({ title: '연결 해제에 실패했습니다.', color: 'red' })
  }
}

function confirmDelete() {
  toast.add({ title: '계정 삭제 기능은 준비 중입니다.', color: 'yellow' })
}
</script>
