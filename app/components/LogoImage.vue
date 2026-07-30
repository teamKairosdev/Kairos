<template>
  <!-- Logo image with custom right-click context menu -->
  <div class="relative inline-flex" @contextmenu.prevent="openMenu">
    <img
      :src="src"
      :alt="alt"
      :class="imgClass"
      :style="imgStyle"
      draggable="true"
      @dragstart="onDragStart"
    />

    <!-- Custom Context Menu -->
    <Teleport to="body">
      <div
        v-if="menuVisible"
        ref="menuRef"
        class="logo-context-menu fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[180px] overflow-hidden"
        :style="{ top: menuY + 'px', left: menuX + 'px' }"
      >
        <button
          @click="copySvg"
          class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
        >
          <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span class="flex-1">SVG로 복사하기</span>
          <span v-if="copiedSvg" class="text-xs text-green-600 font-semibold">✓</span>
        </button>
        <button
          @click="copyPng"
          class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
        >
          <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="flex-1">PNG로 복사하기</span>
          <span v-if="copiedPng" class="text-xs text-green-600 font-semibold">✓</span>
        </button>
        <div class="border-t border-gray-100 my-1"></div>
        <button
          @click="closeMenu"
          class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 transition-colors text-left"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          닫기
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src?: string
  alt?: string
  imgClass?: string
  imgStyle?: string | Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  src: '/logo.svg',
  alt: 'Kairos Logo',
  imgClass: 'h-6 w-auto object-contain',
  imgStyle: '',
})

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuRef = ref<HTMLElement | null>(null)
const copiedSvg = ref(false)
const copiedPng = ref(false)

function openMenu(e: MouseEvent) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  nextTick(() => {
    if (!menuRef.value) return
    const rect = menuRef.value.getBoundingClientRect()
    if (rect.right > window.innerWidth) menuX.value = window.innerWidth - rect.width - 8
    if (rect.bottom > window.innerHeight) menuY.value = window.innerHeight - rect.height - 8
  })
}

function closeMenu() {
  menuVisible.value = false
  copiedSvg.value = false
  copiedPng.value = false
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) closeMenu()
}

watch(menuVisible, (val) => {
  if (val) {
    setTimeout(() => document.addEventListener('click', onClickOutside), 0)
    document.addEventListener('keydown', onEsc)
  } else {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('keydown', onEsc)
  }
})

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onEsc)
})

async function fetchSvgText(): Promise<string> {
  const res = await fetch(props.src)
  return res.text()
}

async function copySvg() {
  try {
    const svgText = await fetchSvgText()
    await navigator.clipboard.writeText(svgText)
    copiedSvg.value = true
    setTimeout(() => { copiedSvg.value = false; closeMenu() }, 1200)
  } catch (e) {
    console.error('SVG copy failed', e)
  }
}

async function copyPng() {
  try {
    const svgText = await fetchSvgText()
    const blob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.src = url
    await new Promise<void>((resolve) => { img.onload = () => resolve() })
    const scale = 4
    const canvas = document.createElement('canvas')
    canvas.width = (img.naturalWidth || 200) * scale
    canvas.height = (img.naturalHeight || 60) * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob(async (pngBlob) => {
      if (!pngBlob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
        copiedPng.value = true
        setTimeout(() => { copiedPng.value = false; closeMenu() }, 1200)
      } catch (e) {
        console.error('PNG clipboard write failed', e)
      }
    }, 'image/png')
  } catch (e) {
    console.error('PNG copy failed', e)
  }
}

function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/uri-list', window.location.origin + props.src)
  e.dataTransfer?.setData('text/plain', window.location.origin + props.src)
}
</script>

<style scoped>
.logo-context-menu {
  animation: ctx-in 0.12s ease;
  transform-origin: top left;
}
@keyframes ctx-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
