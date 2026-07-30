<template>
  <!-- ?? Landing (鍮꾩씤利? ?? -->
  <div
    v-if="!state.authenticated && !state.loading"
    ref="landingContainer"
    class="min-h-screen relative overflow-hidden bg-white text-slate-900 pb-32"
    @mousemove="handleMouseMove"
  >
    <!-- Background grid decoration -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none no-select-drag" style="user-select: none; -webkit-user-drag: none;"></div>

    <!-- Sky Blue Hero Decorative Background Image (Non-selectable, Non-draggable) -->
    <div
      class="absolute top-0 left-0 right-0 h-[650px] opacity-[0.05] bg-cover bg-center pointer-events-none no-select-drag"
      style="background-image: url('/bg_sky.svg'); user-select: none; -webkit-user-drag: none; pointer-events: none;"
    ></div>

    <!-- Glassmorphic Header Navbar inside landing (Floating) -->
    <div class="max-w-6xl mx-auto pt-6 px-6 relative z-20">
      <div class="flex items-center justify-between px-6 py-3 rounded-full border border-slate-200/50 bg-white/70 backdrop-blur-md shadow-xs">
        <div class="flex items-center gap-3">
          <LogoImage img-class="h-5 w-auto object-contain" style="filter: brightness(0);" />
        </div>
        <div class="flex items-center gap-4">
          <NuxtLink to="/auth/login" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">濡쒓렇??/NuxtLink>
          <NuxtLink to="/auth/register" class="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">?쒖옉?섍린</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Hero Content -->
    <section class="relative pt-20 pb-16 px-6 max-w-5xl mx-auto text-center space-y-8 z-10">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 shadow-xs select-none">
        ??pgvector 湲곕컲 ?섎? 遺꾩꽍 ?ㅼ떆媛?留ㅼ묶 ?붿쭊 ?묒옱
      </div>

      <div class="space-y-6">
        <!-- Hero text replaced by Brandcopy SVG (Right click enabled, drag/select disabled, brightness filter applied to make it black) -->
        <div class="max-w-3xl mx-auto select-none no-select-drag" style="user-select: none; -webkit-user-drag: none;" draggable="false">
          <img
            src="/brandcopy.svg"
            alt="Kairos Brand Copy"
            class="w-full max-h-[140px] object-contain mx-auto no-select-drag"
            style="user-select: none; -webkit-user-drag: none; filter: brightness(0);"
            draggable="false"
          />
        </div>
        <p class="text-base sm:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
          ?대젰??臾몃㎘ ?됯?遺???ㅼ떆媛??낆껜 紐⑥쓽 硫댁젒, 梨꾩슜 怨듦퀬(JD) 留ㅼ묶源뚯?.<br class="hidden sm:block" />
          ?⑥닚??以꾧? ?묒꽦???섏뼱 ?뱀떊??媛移섎? ?뺣웾???섏튂 ?깃낵濡??ъ갹議고빀?덈떎.
        </p>
      </div>

      <div class="flex flex-wrap gap-4 justify-center pt-2">
        <NuxtLink to="/auth/register" class="px-8 py-3.5 rounded-full bg-slate-900 text-white hover:bg-blue-700 text-sm font-bold transition-all shadow-md hover:shadow-blue-100 hover:-translate-y-0.5">
          ?ㅼ떆媛?臾대즺 吏꾨떒 諛쏄린
        </NuxtLink>
        <button @click="fillMockCredentials" class="px-8 py-3.5 rounded-full border border-slate-200 bg-white/80 hover:bg-slate-50 text-slate-600 text-sm font-bold transition-all hover:-translate-y-0.5">
          ?뚯뒪??怨꾩젙 濡쒓렇??(50媛?吏곷Т ?명듃)
        </button>
      </div>
    </section>

    <!-- Interactive Bento Showcase Grid (No AI Slop, Rich Interactive UI widgets) -->
    <section class="max-w-6xl mx-auto px-6 py-12 space-y-16 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Bento 1: Interactive Resume Enhancer Canvas (col-span-7) -->
        <div class="lg:col-span-7 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[420px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Interactive Enhancer</span>
            <h3 class="text-2xl font-bold text-slate-800">?щ씪?대뜑瑜?諛???대젰???깃낵??蹂?붾? ?뺤씤?섏꽭??/h3>
            <p class="text-xs text-slate-400 font-medium">?⑥닚 ?낅Т ?섏뿴???대젰?쒓? AI STAR 湲곕쾿??嫄곗퀜 媛뺣젰???섏튂 吏???깃낵濡??낃렇?덉씠?쒕맗?덈떎.</p>
          </div>

          <!-- Interactive Enhancer Box -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-5 bg-slate-50 space-y-4">
            <div class="flex justify-between items-center text-xs font-mono">
              <span class="text-slate-400">// ?ㅼ떆媛?AI 怨좊룄???섏?</span>
              <span :class="sliderColorClass" class="font-bold font-mono transition-colors">{{ sliderPercentage }}% Optimized</span>
            </div>

            <!-- Resume Content Block -->
            <div class="p-4 bg-white rounded-xl border border-slate-150 min-h-[90px] flex items-center transition-all duration-300">
              <p class="text-xs sm:text-sm font-medium leading-relaxed" :class="evalSliderScore > 70 ? 'text-emerald-700' : 'text-slate-700'">
                {{ sliderText }}
              </p>
            </div>

            <!-- Control Slider -->
            <div class="space-y-1">
              <input
                v-model="evalSliderScore"
                type="range"
                min="30"
                max="100"
                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <span>?먮Ц 珥덉븞 (Draft)</span>
                <span>AI ?뺣? ?됯? (Evaluate)</span>
                <span>?깃낵 蹂닿컯 (Improve)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento 2: Interactive ATS Match Matcher (col-span-5) -->
        <div class="lg:col-span-5 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-sky-200 transition-all duration-300 flex flex-col justify-between min-h-[420px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Job Fit Matcher</span>
            <h3 class="text-2xl font-bold text-slate-800">梨꾩슜 ?붽뎄 議곌굔(JD) 利됱떆 鍮꾧탳</h3>
            <p class="text-xs text-slate-400 font-medium">?먰븯???寃??ъ??섏쓽 ?곕? ?ы빆怨????ㅽ깮??留ㅼ묶??鍮덊땲??諛붾줈 硫붽퓭以띾땲??</p>
          </div>

          <!-- Matching Keywords Widget -->
          <div class="mt-6 space-y-4">
            <div class="rounded-2xl border border-slate-100 p-4 bg-slate-50 space-y-3">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">?ъ??? ?쒕땲???꾨줎?몄뿏??媛쒕컻??/p>
              
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="chip in jdChips"
                  :key="chip.name"
                  @mouseenter="activeJd = chip.name"
                  @mouseleave="activeJd = ''"
                  class="text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold"
                  :class="[
                    chip.matched ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100',
                    activeJd === chip.name ? 'scale-105 shadow-xs ring-2 ring-blue-400' : ''
                  ]"
                >
                  {{ chip.name }} {{ chip.matched ? '?? : '?? }}
                </span>
              </div>
            </div>
            
            <p class="text-[10px] text-center text-slate-400 font-semibold">媛?湲곗닠 移??꾩뿉 留덉슦?ㅻ? ?щ젮 留ㅼ묶 ?щ?瑜??뺤씤?섏꽭??/p>
          </div>
        </div>

        <!-- Bento 3: Interactive Interview Chat Simulator (col-span-6) -->
        <div class="lg:col-span-6 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[400px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Interview Simulator</span>
            <h3 class="text-2xl font-bold text-slate-800">?ㅼ떆媛??ㅽ듃由щ컢 ??뷀삎 硫댁젒愿</h3>
            <p class="text-xs text-slate-400 font-medium">?좏깮?섎뒗 ?듬? 諛⑺뼢??留욎떠 AI媛 ?쇰━??瑗щ━ 吏덈Ц???숈쟻?쇰줈 ?섏쭛?덈떎.</p>
          </div>

          <!-- Interview Chat Box -->
          <div class="mt-6 rounded-2xl border border-slate-100 p-4 bg-slate-950 text-slate-350 space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-white/5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <span class="text-[10px] font-mono text-gray-400">Interview Session ID: MOCK-09</span>
            </div>

            <!-- Chat message -->
            <div class="space-y-3">
              <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-gray-200">
                <span class="text-blue-400 font-bold">AI 硫댁젒愿:</span> {{ activeInterviewQuestion }}
              </div>
            </div>

            <!-- Choice buttons -->
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button
                v-for="(ans, idx) in interviewAnswers"
                :key="idx"
                @click="selectInterviewAnswer(ans)"
                class="py-2 px-3 text-[10px] sm:text-xs text-left bg-white/10 border border-white/15 rounded-lg text-white hover:bg-blue-600 hover:border-transparent transition-all font-semibold"
              >
                {{ ans.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Bento 4: Interactive Semantic Search (col-span-6) -->
        <div class="lg:col-span-6 group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-xs hover:shadow-2xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between min-h-[400px]">
          <div class="space-y-2">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Semantic Vector Search</span>
            <h3 class="text-2xl font-bold text-slate-800">pgvector 湲곕컲 ?대젰 留ㅼ묶 寃??/h3>
            <p class="text-xs text-slate-400 font-medium">?⑥닚 ?띿뒪??留ㅼ묶???섏뼱 ?묒꽦?섏떊 寃쎈젰???좎궗?꾨? 踰≫꽣 留ㅽ븨?섏뿬 理쒖쟻??遺?⑹젏??寃?됲빀?덈떎.</p>
          </div>

          <!-- Dynamic Search Widget -->
          <div class="mt-6 border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-4">
            <div class="flex gap-2">
              <input
                v-model="vectorSearchQuery"
                type="text"
                placeholder="?? ?꾨줎?몄뿏???깅뒫 理쒖쟻??寃쏀뿕"
                class="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button @click="triggerVectorSearch" class="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all">寃??/button>
            </div>

            <!-- Results -->
            <div class="space-y-2 max-h-[110px] overflow-y-auto">
              <div v-for="res in vectorResults" :key="res.company" class="bg-white p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <div>
                  <p class="text-xs font-bold text-slate-800">{{ res.company }}</p>
                  <p class="text-[10px] text-slate-400">{{ res.role }}</p>
                </div>
                <span class="text-xs font-bold font-mono text-indigo-600 bg-blue-50 px-2 py-0.5 rounded-md">{{ res.similarity }}% ?좎궗??/span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Simple Quick Footer -->
    <footer class="max-w-6xl mx-auto px-6 pt-16 text-center text-xs text-slate-400">
      <p>짤 2026 Kairos. All rights reserved.</p>
    </footer>
  </div>

  <!-- ?? Dashboard (?몄쬆?? ?? -->
  <div v-else-if="state.authenticated" class="space-y-8 pb-16">
    <!-- Welcome Banner -->
    <div class="rounded-2xl border border-blue-100/50 p-8 bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-white shadow-sm">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-slate-900">
            {{ state.user?.name }}?? 諛섍컩?듬땲???몝
          </h1>
          <p class="text-sm font-medium text-slate-400 leading-relaxed">{{ greetingMessage }}</p>
        </div>
        <NuxtLink to="/interview" class="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-200">
          <UIcon name="i-lucide-mic" class="w-4 h-4" />
          紐⑥쓽 硫댁젒 諛붾줈媛湲?        </NuxtLink>
      </div>
    </div>

    <!-- Stats Grid (dashboard-style) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink v-for="stat in dashboardStats" :key="stat.label" :to="stat.to"
        class="rounded-2xl border border-slate-100 p-5 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
      >
        <p class="text-xs font-semibold text-slate-400">{{ stat.label }}</p>
        <p class="text-2xl font-extrabold text-slate-800 mt-2">{{ stat.value }}</p>
        <p v-if="stat.trend" class="text-xs mt-3 font-semibold flex items-center gap-1" :class="stat.trendPositive ? 'text-blue-600' : 'text-slate-400'">
          <span v-if="stat.trendPositive">??/span>
          <span>{{ stat.trend }}</span>
        </p>
      </NuxtLink>
    </div>

    <!-- Main Content: Feed + Sidebar -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <!-- Left: Activity feed (Modern timeline) -->
      <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800">異붿쿇 而ㅻ━??怨쇱젣</h2>
          <NuxtLink to="/settings" class="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors">?먯꽭?덈낫湲?/NuxtLink>
        </div>
        <div class="space-y-6">
          <div v-for="(activity, i) in activities" :key="i"
            class="relative flex gap-5"
          >
            <!-- Timeline node line -->
            <div v-if="i < activities.length - 1" class="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100" />
            
            <div class="w-8 h-8 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center shrink-0 z-10">
              <div class="w-2.5 h-2.5 rounded-full" :class="activity.dotClass" />
            </div>
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-slate-700">{{ activity.label }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-600">{{ activity.time }}</span>
              </div>
              <p class="text-xs font-medium text-slate-400 leading-relaxed">{{ activity.desc }}</p>
              <NuxtLink :to="activity.to" class="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block">吏꾪뻾?섍린 &rarr;</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Quick menu & Tips -->
      <div class="space-y-6">
        <!-- Quick links -->
        <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 class="text-xs font-bold text-slate-400 tracking-wider mb-4 uppercase">諛붾줈媛湲?硫붾돱</h3>
          <nav class="space-y-1">
            <NuxtLink v-for="item in quickLinks" :key="item.label" :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200"
            >
              <UIcon :name="item.icon" class="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-600" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Tip card -->
        <div class="rounded-2xl border border-blue-50 p-6 bg-gradient-to-br from-blue-50/20 via-indigo-50/10 to-white shadow-sm space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 shadow-sm">
              <UIcon name="i-lucide-lightbulb" class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-sm font-bold text-slate-800">而ㅻ━??媛?대뱶 ??/h3>
          </div>
          <p class="text-xs font-medium text-slate-400 leading-relaxed">?대젰?쒖뿉 吏?먰븯?ㅻ뒗 援ъ껜???ъ??섏쓽 ?듭떖 ?ㅼ썙?쒕? 理쒖쟻?뷀빐 ?ы븿?쒗궎硫?AI ?꾪꽣留??쒕쪟 ?됯? ?먯닔媛 ?됯퇏 23% ?곸듅?⑸땲??</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ?? Loading ?? -->
  <div v-else class="flex items-center justify-center py-40">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader" class="w-7 h-7 text-blue-500 animate-spin" />
      <p class="text-sm font-semibold text-slate-400">?쒖뒪??濡쒕뵫 以?..</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { state } = useAuth()

const hours = new Date().getHours()
const greetingMessage = hours < 12 ? '醫뗭? ?꾩묠?낅땲?? ?ㅻ뒛??紐⑺몴瑜??ㅼ젙?대낫?몄슂.'
  : hours < 18 ? '醫뗭? ?ㅽ썑?낅땲?? 而ㅻ━?대? ???④퀎 諛쒖쟾?쒗궗 ?쒓컙?낅땲??'
  : '醫뗭? ??곸엯?덈떎. ?댁씪???꾪븳 以鍮꾨? ?대낫?몄슂.'

// Interactive mouse effect states
const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(e: MouseEvent) {
  if (!process.client) return
  const width = window.innerWidth
  const height = window.innerHeight
  mouseX.value = (e.clientX / width) * 2 - 1
  mouseY.value = (e.clientY / height) * 2 - 1
}

// Bento 1: Resume Enhancer Slider State
const evalSliderScore = ref(35)
const sliderPercentage = computed(() => evalSliderScore.value)
const sliderColorClass = computed(() => {
  if (evalSliderScore.value > 85) return 'text-emerald-500'
  if (evalSliderScore.value > 60) return 'text-blue-500'
  return 'text-red-500'
})
const sliderText = computed(() => {
  if (evalSliderScore.value < 55) {
    return '移댁뭅?ㅼ뿉??由ъ븸??媛쒕컻??二쇰줈 ?섏??듬땲?? 踰꾧렇瑜?留롮씠 ?섏젙?덉뒿?덈떎.'
  } else if (evalSliderScore.value < 85) {
    return '移댁뭅???꾨줎?몄뿏????먯꽌 寃곗젣 ?쒕퉬??由ы뙥?좊쭅 諛?荑쇰━ 罹먯떛 ?⑦꽩 ?꾩엯 ?대떦.'
  } else {
    return '移댁뭅???섏씠癒쇳듃 ?쒕퉬??由ъ븸??留덉씠洹몃젅?댁뀡 二쇰룄 (寃곗젣 ?ㅽ뙣??2.3% ??0.05% ?댄븯 ?듭젣, LCP 4.2s ??1.1s 媛쒖꽑 ?꾨즺)'
  }
})

// Bento 2: ATS Chips
const activeJd = ref('')
const jdChips = [
  { name: 'React', matched: true },
  { name: 'TypeScript', matched: true },
  { name: 'Next.js', matched: true },
  { name: 'Terraform', matched: false },
  { name: 'TailwindCSS', matched: true },
  { name: 'Kubernetes', matched: false }
]

// Bento 3: Mock Interview Chat States
const activeInterviewQuestion = ref('諛섍컩?듬땲?? 以鍮꾪븯???꾨줈?앺듃 ?깃낵?????媛꾨왂????臾몄옣?쇰줈 ??듯빐 二쇱떗?쒖삤.')
const interviewAnswers = [
  { label: '由ъ븸???깅뒫??二쇰줈 媛쒖꽑?덉뒿?덈떎.', response: '?대뼡 湲곕쾿(?? 硫붾え?댁젣?댁뀡, 肄붾뱶 ?ㅽ뵆由ы똿)???ъ슜??LCP 吏?쒕? ?⑥텞?섏뀲?듬땲源?' },
  { label: 'MSA 寃곗젣 ?꾪궎?띿쿂瑜??꾩엯?덉뒿?덈떎.', response: '寃곗젣 ?몃옖??뀡 以?諛쒖깮 媛?ν븳 ?숈떆??Race Condition) 臾몄젣???대뼸寃?蹂댁셿?섏뀲?붿? 怨듭쑀?댁＜?몄슂.' }
]
function selectInterviewAnswer(ans: { label: string, response: string }) {
  activeInterviewQuestion.value = ans.response
}

// Bento 4: Vector Search
const vectorSearchQuery = ref('')
const vectorResults = ref<any[]>([
  { company: '?좎뒪', role: '?꾨줎?몄뿏??媛쒕컻??, similarity: 96 },
  { company: '?ㅼ씠踰?, role: '諛깆뿏???붿??덉뼱', similarity: 82 }
])
function triggerVectorSearch() {
  if (!vectorSearchQuery.value.trim()) return
  // Randomize mock similarity to make it look active
  vectorResults.value = [
    { company: '移댁뭅??, role: '?뚮옯???붿??덉뼱', similarity: Math.floor(Math.random() * 15) + 85 },
    { company: '?쇱씤', role: '?쒕쾭 ?꾪궎?랁듃', similarity: Math.floor(Math.random() * 20) + 70 }
  ]
}

// Test login trigger
const router = useRouter()
const { login } = useAuth()
async function fillMockCredentials() {
  const success = await login('testmockup', '12345')
  if (success) {
    router.push('/')
  }
}

const stats = [
  { value: '50媛?', label: '吏곷Т 留ㅼ묶 ?곗씠?? },
  { value: '1536李⑥썝', label: '?꾨쿋??李⑥썝' },
  { value: '98%', label: 'AI ?쇰뱶諛??뺥솗?? },
  { value: '?ㅼ떆媛?, label: '?ㅽ듃由щ컢 硫댁젒愿' },
]

const dashboardStats = [
  { label: '?대젰??, value: '-', to: '/resume', trend: 'AI 怨좊룄???쒖옉?섍린', trendPositive: true },
  { label: '紐⑥쓽 硫댁젒', value: '-', to: '/interview', trend: '泥?硫댁젒 ?쒖옉?섍린', trendPositive: true },
  { label: 'ATS 遺꾩꽍', value: '-', to: '/ats', trend: 'JD 留ㅼ묶 遺꾩꽍', trendPositive: true },
  { label: '寃쎈젰 寃??, value: '-', to: '/career', trend: '踰≫꽣 寃??, trendPositive: false },
]

const activities = [
  { label: '?대젰?쒕? ?묒꽦?대낫?몄슂', time: '異붿쿇', desc: 'AI媛 珥덉븞遺???됯?, ?ъ옉?깃퉴吏 ?꾩?以띾땲??, to: '/resume', dotClass: 'bg-fg-brand' },
  { label: 'AI 硫댁젒???곗뒿?대낫?몄슂', time: '異붿쿇', desc: '吏곷Т蹂?留욎땄 吏덈Ц怨??ㅼ떆媛??쇰뱶諛?, to: '/interview', dotClass: 'bg-fg-brand' },
  { label: 'ATS 留ㅼ묶 ?먯닔瑜??뺤씤?섏꽭??, time: '異붿쿇', desc: 'JD 湲곕컲 ?ㅼ썙??遺꾩꽍?쇰줈 遺議깊븳 ??웾 吏꾨떒', to: '/ats', dotClass: 'bg-fg-brand' },
  { label: '臾몄꽌瑜??낅줈?쒗븯怨?愿由ы븯?몄슂', time: '異붿쿇', desc: 'HWP, PDF, DOCX ?뚯씪 以묒븰 愿由?, to: '/docs', dotClass: 'bg-fg-brand' },
]

const quickLinks = [
  { label: '?대젰??愿由?, icon: 'i-lucide-file-text', to: '/resume' },
  { label: '硫댁젒 ?곗뒿', icon: 'i-lucide-mic', to: '/interview' },
  { label: 'ATS 吏꾨떒', icon: 'i-lucide-crosshair', to: '/ats' },
  { label: '臾몄꽌 蹂닿???, icon: 'i-lucide-folder', to: '/docs' },
  { label: '?ы넗?ㅽ뒠?붿삤', icon: 'i-lucide-palette', to: '/studio' },
  { label: '?ㅼ젙', icon: 'i-lucide-settings', to: '/settings' },
]
</script>

<style scoped>
@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
.animate-bounce-slow {
  animation: bounce-slow 6s ease-in-out infinite;
}
.typing-cursor::after {
  content: '|';
  animation: blink 0.8s step-start infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>


