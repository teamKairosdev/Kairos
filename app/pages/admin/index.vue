<template>
  <div class="max-w-6xl mx-auto py-8 space-y-8 px-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-fg-neutral">Kairos 백엔드 관리자 대시보드</h1>
        <p class="text-sm text-fg-neutral-muted">환경변수 매칭, 시스템 설정, LLM 게이트웨이, MFA 2단계 인증 통합 관리 콘솔</p>
      </div>
      <div class="flex items-center space-x-3">
        <a href="/admin" target="_blank" class="px-4 py-2 bg-neutral-default hover:bg-neutral-muted text-fg-neutral text-sm rounded-lg border border-stroke-neutral-muted transition flex items-center gap-2">
          <span>Payload CMS 관리자 열기</span>
          <span class="text-xs">↗</span>
        </a>
      </div>
    </div>

    <!-- System Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-5 border border-stroke-neutral-muted rounded-xl bg-neutral-muted space-y-1">
        <div class="text-xs text-fg-neutral-muted">총 유저 수</div>
        <div class="text-2xl font-bold text-fg-neutral">{{ stats.usersCount }}</div>
      </div>
      <div class="p-5 border border-stroke-neutral-muted rounded-xl bg-neutral-muted space-y-1">
        <div class="text-xs text-fg-neutral-muted">등록된 이력서</div>
        <div class="text-2xl font-bold text-fg-neutral">{{ stats.resumesCount }}</div>
      </div>
      <div class="p-5 border border-stroke-neutral-muted rounded-xl bg-neutral-muted space-y-1">
        <div class="text-xs text-fg-neutral-muted">진행된 모의 면접</div>
        <div class="text-2xl font-bold text-fg-neutral">{{ stats.interviewsCount }}</div>
      </div>
      <div class="p-5 border border-stroke-neutral-muted rounded-xl bg-neutral-muted space-y-1">
        <div class="text-xs text-fg-neutral-muted">ATS 분석 실행 수</div>
        <div class="text-2xl font-bold text-fg-neutral">{{ stats.atsCount }}</div>
      </div>
    </div>

    <!-- Section Tabs -->
    <div class="border-b border-stroke-neutral-muted flex space-x-6 text-sm">
      <button
        @click="activeTab = 'env'"
        :class="activeTab === 'env' ? 'border-b-2 border-fg-neutral font-semibold text-fg-neutral pb-3' : 'text-fg-neutral-muted hover:text-fg-neutral pb-3'"
      >
        🔑 환경변수 & 백엔드 제어
      </button>
      <button
        @click="activeTab = 'mfa'"
        :class="activeTab === 'mfa' ? 'border-b-2 border-fg-neutral font-semibold text-fg-neutral pb-3' : 'text-fg-neutral-muted hover:text-fg-neutral pb-3'"
      >
        🛡️ MFA 2단계 OTP 인증
      </button>
      <button
        @click="activeTab = 'audit'"
        :class="activeTab === 'audit' ? 'border-b-2 border-fg-neutral font-semibold text-fg-neutral pb-3' : 'text-fg-neutral-muted hover:text-fg-neutral pb-3'"
      >
        📋 감사 로그 (Audit Logs)
      </button>
    </div>

    <!-- Tab 1: Environment Variables & Backend Controls -->
    <div v-if="activeTab === 'env'" class="space-y-6">
      <div class="border border-stroke-neutral-muted rounded-xl p-6 bg-neutral-muted space-y-4">
        <h2 class="text-lg font-semibold text-fg-neutral">환경변수 & 백엔드 동적 매칭</h2>
        <p class="text-xs text-fg-neutral-muted">DB에 저장된 환경변수가 `process.env`보다 우선 적용되어 재배포 없이 실시간으로 제어됩니다.</p>

        <div class="space-y-4 pt-2">
          <div v-for="env in settings.envMappings" :key="env.key" class="p-4 border border-stroke-neutral-muted rounded-lg bg-neutral-default space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-mono text-sm font-bold text-fg-neutral">{{ env.key }}</span>
                <span class="ml-2 text-xs text-fg-neutral-muted">({{ env.label }})</span>
              </div>
              <span class="text-xs px-2 py-0.5 rounded bg-neutral-muted text-fg-neutral-muted">ENV MAPPING</span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="configForm[env.key]"
                type="text"
                class="flex-1 px-3 py-1.5 text-sm font-mono border border-stroke-neutral-muted rounded-lg bg-neutral-muted text-fg-neutral focus:outline-none focus:border-fg-neutral"
                :placeholder="env.key"
              />
              <button
                @click="saveConfig(env.key, configForm[env.key], 'env', env.label)"
                class="px-4 py-1.5 bg-fg-neutral text-bg-neutral text-xs font-semibold rounded-lg hover:opacity-90 transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: MFA OTP Security -->
    <div v-if="activeTab === 'mfa'" class="space-y-6">
      <div class="border border-stroke-neutral-muted rounded-xl p-6 bg-neutral-muted space-y-4 max-w-xl">
        <h2 class="text-lg font-semibold text-fg-neutral">MFA 2단계 OTP 인증 설정</h2>
        <p class="text-xs text-fg-neutral-muted">Google Authenticator, Authy 앱으로 QR 코드를 스캔하여 6자리 OTP 인증을 설정합니다.</p>

        <div v-if="!mfaData.qrCodeUrl" class="pt-2">
          <button
            @click="setupMfa"
            class="px-4 py-2 bg-fg-neutral text-bg-neutral text-sm font-medium rounded-lg hover:opacity-90 transition"
          >
            MFA OTP 설정 시작하기
          </button>
        </div>

        <div v-else class="space-y-4 pt-2">
          <div class="flex flex-col items-center p-4 bg-neutral-default rounded-xl border border-stroke-neutral-muted space-y-3">
            <img :src="mfaData.qrCodeUrl" alt="MFA QR Code" class="w-48 h-48 rounded" />
            <div class="text-xs font-mono text-fg-neutral-muted select-all">Secret: {{ mfaData.secret }}</div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium text-fg-neutral">인증 앱의 6자리 OTP 번호 입력</label>
            <div class="flex gap-2">
              <input
                v-model="otpToken"
                type="text"
                maxlength="6"
                placeholder="123456"
                class="flex-1 px-3 py-2 text-center text-lg font-mono border border-stroke-neutral-muted rounded-lg bg-neutral-default text-fg-neutral"
              />
              <button
                @click="enableMfa"
                class="px-4 py-2 bg-fg-neutral text-bg-neutral text-sm font-semibold rounded-lg hover:opacity-90"
              >
                OTP 활성화 검증
              </button>
            </div>
          </div>
        </div>

        <div v-if="mfaMessage" class="p-3 bg-neutral-default rounded-lg border border-stroke-neutral-muted text-xs text-fg-neutral">
          {{ mfaMessage }}
        </div>
      </div>
    </div>

    <!-- Tab 3: Audit Logs -->
    <div v-if="activeTab === 'audit'" class="space-y-4">
      <div class="border border-stroke-neutral-muted rounded-xl p-6 bg-neutral-muted space-y-4">
        <h2 class="text-lg font-semibold text-fg-neutral">백엔드 작업 감사 로그</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-stroke-neutral-muted text-fg-neutral-muted">
              <tr>
                <th class="py-2">작업</th>
                <th class="py-2">카테고리</th>
                <th class="py-2">IP 주소</th>
                <th class="py-2">시각</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stroke-neutral-muted">
              <tr v-for="log in stats.recentLogs" :key="log.id">
                <td class="py-2.5 font-mono text-fg-neutral">{{ log.action }}</td>
                <td class="py-2.5 text-fg-neutral-muted">{{ log.category }}</td>
                <td class="py-2.5 font-mono text-fg-neutral-muted">{{ log.ipAddress }}</td>
                <td class="py-2.5 text-fg-neutral-muted">{{ new Date(log.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const activeTab = ref<'env' | 'mfa' | 'audit'>('env')
const stats = ref<{ usersCount: number; resumesCount: number; interviewsCount: number; atsCount: number; recentLogs: any[] }>({
  usersCount: 0,
  resumesCount: 0,
  interviewsCount: 0,
  atsCount: 0,
  recentLogs: [],
})
const settings = ref<{ envMappings: { key: string; label: string }[]; configs: any[] }>({
  envMappings: [],
  configs: [],
})
const configForm = reactive<Record<string, string>>({})
const mfaData = ref<{ secret?: string; qrCodeUrl?: string }>({})
const otpToken = ref('')
const mfaMessage = ref('')

onMounted(async () => {
  try {
    const [statsData, settingsData] = await Promise.all([
      $fetch<any>('/api/admin/stats'),
      $fetch<any>('/api/admin/settings'),
    ])
    stats.value = statsData
    settings.value = settingsData

    for (const item of settingsData.configs || []) {
      configForm[item.key] = item.value
    }
  } catch {}
})

async function saveConfig(key: string, value: string, category: string, description: string) {
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: { key, value, category, description },
    })
    alert(`[${key}] 환경변수가 저장되었습니다.`)
  } catch (err: any) {
    alert(err?.data?.statusMessage || '저장 실패')
  }
}

async function setupMfa() {
  try {
    const res = await $fetch<any>('/api/auth/mfa/setup', { method: 'POST' })
    mfaData.value = res
  } catch (err: any) {
    mfaMessage.value = err?.data?.statusMessage || 'MFA 설정 실패'
  }
}

async function enableMfa() {
  try {
    const res = await $fetch<any>('/api/auth/mfa/enable', {
      method: 'POST',
      body: { token: otpToken.value },
    })
    mfaMessage.value = res.message
  } catch (err: any) {
    mfaMessage.value = err?.data?.statusMessage || 'MFA 활성화 실패'
  }
}
</script>
