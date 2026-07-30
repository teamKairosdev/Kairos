<template>
  <div class="max-w-sm mx-auto py-16">
    <div class="border border-stroke-neutral-muted rounded-xl p-8 bg-neutral-muted space-y-x4">
      <div class="text-center space-y-1.5">
        <h1 class="text-xl font-semibold text-fg-neutral">{{ $t('auth.loginTitle') }}</h1>
        <p class="text-xs text-fg-neutral-muted">{{ $t('auth.loginSubtitle') }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup :label="$t('auth.emailLabel')">
          <UInput v-model="email" type="email" required :placeholder="$t('auth.emailPlaceholder')" />
        </UFormGroup>

        <UFormGroup :label="$t('auth.passwordLabel')">
          <UInput v-model="password" type="password" required placeholder="......" />
        </UFormGroup>

        <UAlert v-if="errorMsg" color="red" variant="soft" :description="errorMsg" />

        <UButton type="submit" :loading="loading" color="black" variant="solid" size="lg" block>{{ $t('auth.loginBtn') }}</UButton>
      </form>

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-stroke-neutral-muted" /></div>
        <div class="relative flex justify-center text-xs text-fg-neutral-muted"><span class="bg-neutral-muted px-2">{{ $t('common.or') }}</span></div>
      </div>

      <div class="space-y-2">
        <UButton color="red" variant="outline" size="lg" block @click="signInGoogle" :loading="socialLoading">
          Google로 계속하기
        </UButton>

      </div>

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-stroke-neutral-muted" /></div>
        <div class="relative flex justify-center text-xs text-fg-neutral-muted"><span class="bg-neutral-muted px-2">{{ $t('common.or') }}</span></div>
      </div>

      <div class="space-y-2">
        <UButton color="purple" variant="outline" size="lg" block @click="connectKaikas" :loading="walletLoading">
          {{ $t('auth.wallet.kaikas') }}
        </UButton>
        <UButton color="neutral" variant="outline" size="lg" block @click="connectMetaMask" :loading="walletLoading">
          {{ $t('auth.wallet.metamask') }}
        </UButton>
      </div>

      <div class="text-center text-xs text-fg-neutral-muted pt-1">
        {{ $t('auth.noAccount') }}
        <NuxtLink to="/auth/register" class="text-fg-neutral hover:underline">{{ $t('auth.registerLink') }}</NuxtLink>
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
  window.location.href = '/api/auth/sign-in/social?provider=google&callbackURL=/'
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
