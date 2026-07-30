<template>
  <div class="max-w-md mx-auto py-20 px-4">
    <!-- Premium Card Container -->
    <div class="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100/50 space-y-6 relative overflow-hidden">
      <!-- Decorative Gradient background elements -->
      <div class="absolute -right-16 -top-16 w-32 h-32 bg-blue-100/30 blur-[30px] rounded-full pointer-events-none" />
      <div class="absolute -left-16 -bottom-16 w-32 h-32 bg-indigo-100/30 blur-[30px] rounded-full pointer-events-none" />

      <div class="relative text-center space-y-2">
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">{{ $t('auth.loginTitle') }}</h1>
        <p class="text-xs font-semibold text-slate-400">{{ $t('auth.loginSubtitle') }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="relative space-y-4 pt-2">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-500">{{ $t('auth.emailLabel') }}</label>
          <UInput v-model="email" type="email" required :placeholder="$t('auth.emailPlaceholder')" 
            class="w-full" size="md" />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-500">{{ $t('auth.passwordLabel') }}</label>
          <UInput v-model="password" type="password" required placeholder="••••••••" 
            class="w-full" size="md" />
        </div>

        <UAlert v-if="errorMsg" color="red" variant="soft" :description="errorMsg" class="rounded-xl" />

        <UButton type="submit" :loading="loading" color="blue" variant="solid" size="lg" block 
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl hover:shadow-md hover:shadow-blue-100 transition-all duration-200 mt-2">
          {{ $t('auth.loginBtn') }}
        </UButton>
      </form>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-100" /></div>
        <div class="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400"><span class="bg-white px-3">{{ $t('common.or') }}</span></div>
      </div>

      <!-- Social Account Logins -->
      <div class="space-y-3">
        <UButton color="neutral" variant="outline" size="lg" block @click="signInGoogle" :loading="socialLoading"
          class="border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all duration-200">
          <template #leading>
            <UIcon name="i-lucide-chrome" class="w-4 h-4 text-blue-500" />
          </template>
          Google로 로그인
        </UButton>
      </div>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-100" /></div>
        <div class="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400"><span class="bg-white px-3">또는 지갑 로그인</span></div>
      </div>

      <!-- Wallet Logins -->
      <div class="grid grid-cols-2 gap-3">
        <UButton color="neutral" variant="outline" size="md" block @click="connectKaikas" :loading="walletLoading"
          class="border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200">
          {{ $t('auth.wallet.kaikas') }}
        </UButton>
        <UButton color="neutral" variant="outline" size="md" block @click="connectMetaMask" :loading="walletLoading"
          class="border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200">
          {{ $t('auth.wallet.metamask') }}
        </UButton>
      </div>

      <div class="text-center text-xs font-semibold text-slate-400 pt-2">
        {{ $t('auth.noAccount') }}
        <NuxtLink to="/auth/register" class="text-blue-600 hover:text-blue-700 hover:underline ml-1">{{ $t('auth.registerLink') }}</NuxtLink>
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
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
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
    if (!provider) {
      errorMsg.value = `${networkName} ${$t('auth.wallet.notFound')}`
      return
    }

    const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' })
    const address = accounts[0].toLowerCase()
    const { nonce, id } = await $fetch('/api/auth/nonce')
    const message = `Kairos Sign-In\n${nonce}\n${address}`
    const signature: `0x${string}` = await provider.request({ method: 'personal_sign', params: [message, address] })

    const result = await $fetch('/api/auth/wallet', {
      method: 'POST',
      body: { address, message, signature, nonce: id },
    })

    router.push('/')
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    errorMsg.value = e.data?.statusMessage || e.message || $t('auth.wallet.error')
  } finally {
    walletLoading.value = false
  }
}

function connectKaikas() {
  connectWallet(() => (window as any).klaytn, 'Kaikas')
}

function connectMetaMask() {
  connectWallet(() => {
    const ethereum = (window as any).ethereum
    return ethereum?.isMetaMask ? ethereum : null
  }, 'MetaMask')
}
</script>
