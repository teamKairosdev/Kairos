<template>
  <div class="max-w-6xl mx-auto py-10 space-y-10 px-4 pb-20">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">백엔드 관리 콘솔</h1>
        <p class="text-sm font-medium text-slate-400 mt-2">재배포 없는 환경변수 매칭, 시스템 설정 조율, MFA OTP 보안 및 서버 작업 감사 로그 콘솔</p>
      </div>
      <div class="shrink-0">
        <a href="/admin" target="_blank" class="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all duration-200">
          <span>Payload CMS 관리자 열기</span>
          <UIcon name="i-lucide-external-link" class="w-4 h-4" />
        </a>
      </div>
    </div>

    <!-- System Overview Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">총 회원수</div>
        <div class="text-3xl font-extrabold text-slate-800">{{ stats.usersCount }}</div>
      </div>
      <div class="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">등록된 이력서</div>
        <div class="text-3xl font-extrabold text-slate-800">{{ stats.resumesCount }}</div>
      </div>
      <div class="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">진행된 모의 면접</div>
        <div class="text-3xl font-extrabold text-slate-800">{{ stats.interviewsCount }}</div>
      </div>
      <div class="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">ATS 분석 실행 수</div>
        <div class="text-3xl font-extrabold text-slate-800">{{ stats.atsCount }}</div>
      </div>
    </div>

    <!-- Section Tabs -->
    <div class="border-b border-slate-200 flex space-x-8 text-sm">
      <button
        @click="activeTab = 'env'"
        :class="activeTab === 'env' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-4' : 'text-slate-400 font-semibold hover:text-slate-600 pb-4 transition-colors'"
      >
        🔑 환경변수 & 백엔드 제어
      </button>
      <button
        @click="activeTab = 'mfa'"
        :class="activeTab === 'mfa' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-4' : 'text-slate-400 font-semibold hover:text-slate-600 pb-4 transition-colors'"
      >
        🛡️ MFA 2단계 OTP 인증
      </button>
      <button
        @click="activeTab = 'audit'"
        :class="activeTab === 'audit' ? 'border-b-2 border-blue-600 font-bold text-blue-600 pb-4' : 'text-slate-400 font-semibold hover:text-slate-600 pb-4 transition-colors'"
      >
        📋 감사 로그 (Audit Logs)
      </button>
    </div>

    <!-- Tab 1: Environment Variables & Backend Controls -->
    <div v-if="activeTab === 'env'" class="space-y-6">
      <div class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-800">동적 환경변수 매칭 관리</h2>
          <p class="text-xs font-medium text-slate-400 mt-1">DB 설정 테이블에 저장된 환경변수 매칭 값이 우선 적용되므로 실시간으로 API 키 교체 등이 가능합니다.</p>
        </div>

        <div class="space-y-4 pt-2">
          <div v-for="env in settings.envMappings" :key="env.key" class="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:border-slate-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-bold text-slate-800">{{ env.key }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-600">Active Map</span>
              </div>
              <p class="text-xs font-semibold text-slate-400">{{ env.label }}</p>
            </div>
            <div class="flex gap-2 w-full md:w-auto md:min-w-[400px]">
              <input
                v-model="configForm[env.key]"
                type="text"
                class="flex-1 px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                :placeholder="env.key + ' 값을 입력하세요'"
              />
              <button
                @click="saveConfig(env.key, configForm[env.key], 'env', env.label)"
                class="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 hover:shadow-md transition-all duration-200 shrink-0"
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
      <div class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-xl">
        <div>
          <h2 class="text-xl font-bold text-slate-800">MFA OTP 2단계 설정</h2>
          <p class="text-xs font-medium text-slate-400 mt-1">Google Authenticator 등 OTP 호환 앱을 통해 계정 보안 수준을 격상합니다.</p>
        </div>

        <div v-if="!mfaData.qrCodeUrl" class="pt-2">
          <button
            @click="setupMfa"
            class="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
          >
            OTP 2차 인증 활성화 시작
          </button>
        </div>

        <div v-else class="space-y-6 pt-2">
          <div class="flex flex-col items-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
            <img :src="mfaData.qrCodeUrl" alt="MFA QR Code" class="w-48 h-48 rounded-xl border border-slate-200 p-2 bg-white" />
            <div class="text-[10px] font-mono font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg select-all">Secret: {{ mfaData.secret }}</div>
          </div>

          <div class="space-y-2.5">
            <label class="text-xs font-bold text-slate-500">6자리 OTP 코드 검증</label>
            <div class="flex gap-2">
              <input
                v-model="otpToken"
                type="text"
                maxlength="6"
                placeholder="123456"
                class="flex-1 px-4 py-2.5 text-center text-lg font-mono font-bold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              />
              <button
                @click="enableMfa"
                class="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 hover:shadow-md transition-all duration-200"
              >
                검증 및 연동
              </button>
            </div>
          </div>
        </div>

        <div v-if="mfaMessage" class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-xs font-semibold text-blue-600">
          {{ mfaMessage }}
        </div>
      </div>
    </div>

    <!-- Tab 3: Audit Logs -->
    <div v-if="activeTab === 'audit'" class="space-y-4">
      <div class="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 class="text-xl font-bold text-slate-800">보안 감사 작업 로그</h2>
          <p class="text-xs font-medium text-slate-400 mt-1">시스템 주요 상태 변화 및 관리자 작업 이력이 기록되는 실시간 리포트입니다.</p>
        </div>
        <div class="overflow-x-auto pt-2">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th class="py-3 px-2">작업 코드</th>
                <th class="py-3 px-2">카테고리</th>
                <th class="py-3 px-2">IP 주소</th>
                <th class="py-3 px-2">기록 일시</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr v-for="log in stats.recentLogs" :key="log.id" class="text-slate-600 hover:bg-slate-50/50 transition-colors">
                <td class="py-3.5 px-2 font-mono text-slate-800">{{ log.action }}</td>
                <td class="py-3.5 px-2 text-slate-500">{{ log.category }}</td>
                <td class="py-3.5 px-2 font-mono text-slate-400">{{ log.ipAddress }}</td>
                <td class="py-3.5 px-2 text-slate-400">{{ new Date(log.createdAt).toLocaleString() }}</td>
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
