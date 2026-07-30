<template>
  <div class="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Premium Card -->
      <div class="bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-100/60 space-y-6 relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-32 h-32 bg-blue-100/20 blur-[30px] rounded-full pointer-events-none"></div>
        <div class="absolute -left-16 -bottom-16 w-32 h-32 bg-indigo-100/20 blur-[30px] rounded-full pointer-events-none"></div>

        <div class="relative text-center space-y-2">
          <div class="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center font-black text-white text-lg mx-auto mb-3">K</div>
          <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight">{{ $t('auth.loginTitle') }}</h1>
          <p class="text-xs text-gray-400 font-medium">{{ $t('auth.loginSubtitle') }}</p>
        </div>

        <form @submit.prevent="handleLogin" class="relative space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">{{ $t('auth.emailLabel') }}</label>
            <input
              v-model="email"
              type="email"
              required
              :placeholder="$t('auth.emailPlaceholder')"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5">{{ $t('auth.passwordLabel') }}</label>
            <input
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div v-if="errorMsg" class="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">{{ errorMsg }}</div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-md hover:shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ loading ? '로그인 중...' : $t('auth.loginBtn') }}
          </button>
        </form>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-100"></div></div>
          <div class="relative flex justify-center"><span class="bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">{{ $t('common.or') }}</span></div>
        </div>

        <!-- Google login -->
        <button
          @click="signInGoogle"
          :disabled="socialLoading"
          class="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google로 로그인
        </button>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-100"></div></div>
          <div class="relative flex justify-center"><span class="bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">지갑 로그인</span></div>
        </div>

        <!-- Wallet login -->
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="connectKaikas"
            :disabled="walletLoading"
            class="py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
          >{{ $t('auth.wallet.kaikas') }}</button>
          <button
            @click="connectMetaMask"
            :disabled="walletLoading"
            class="py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
          >{{ $t('auth.wallet.metamask') }}</button>
        </div>

        <p class="text-center text-xs text-gray-400">
          {{ $t('auth.noAccount') }}
          <NuxtLink to="/auth/register" class="text-blue-600 font-semibold hover:underline ml-1">{{ $t('auth.registerLink') }}</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const loading = ref(false)
const walletLoading = ref(false)
const socialLoading = ref(false)
const errorMsg = ref('')
const router = useRouter()

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    router.push('/')
  } catch (err) {
    errorMsg.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || $t('auth.loginError')
  } finally {
    loading.value = false
  }
}

function signInGoogle() {
  socialLoading.value = true
  window.location.href = '/api/auth/google'
}

async function connectWallet(getProvider: () => any, networkName: string) {
  walletLoading.value = true
  errorMsg.value = ''
  try {
    const provider = getProvider()
    if (!provider) { errorMsg.value = `${networkName} ${$t('auth.wallet.notFound')}`; return }
    const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' })
    const address = accounts[0].toLowerCase()
    const { nonce, id } = await $fetch('/api/auth/nonce')
    const message = `Kairos Sign-In\n${nonce}\n${address}`
    const signature: `0x${string}` = await provider.request({ method: 'personal_sign', params: [message, address] })
    await $fetch('/api/auth/wallet', { method: 'POST', body: { address, message, signature, nonce: id } })
    router.push('/')
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage || e.message || $t('auth.wallet.error')
  } finally {
    walletLoading.value = false
  }
}

function connectKaikas() { connectWallet(() => (window as any).klaytn, 'Kaikas') }
function connectMetaMask() {
  connectWallet(() => {
    const eth = (window as any).ethereum
    return eth?.isMetaMask ? eth : null
  }, 'MetaMask')
}
</script>
