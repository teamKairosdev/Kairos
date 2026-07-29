export function useSEOMeta(opts: {
  title: string
  description?: string
  image?: string
}) {
  const title = computed(() => `${opts.title} | Kairos`)
  const description = computed(() => opts.description || 'Kairos — AI 기반 커리어 플랫폼. 이력서 고도화, 모의 면접, ATS 분석.')
  const image = computed(() => opts.image || '/og-default.png')

  useHead({
    title,
    meta: [
      { name: 'description', content: description.value },
      { property: 'og:title', content: title.value },
      { property: 'og:description', content: description.value },
      { property: 'og:image', content: image.value },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title.value },
      { name: 'twitter:description', content: description.value },
    ],
  })
}
