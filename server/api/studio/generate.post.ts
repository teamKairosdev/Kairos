import { resolve, join } from 'path'
import { getDb } from 'db'
import { studioImages } from 'db/schema'
import { generateImage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const STUDIO_DIR = resolve('uploads/studio')

async function ensureStudioDir() {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(STUDIO_DIR, { recursive: true })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const googleApiKey = config.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!googleApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.' })
  }

  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const { prompt, n = 1, size = '1024x1024' } = await readBody(event)

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: '프롬프트를 입력해주세요.' })
  }

  await ensureStudioDir()

  const google = createGoogleGenerativeAI({ apiKey: googleApiKey })
  const { images } = await generateImage({
    model: google.image('imagen-3.0-generate-001'),
    prompt,
    n: Math.min(n, 1),
    size,
  })

  const imageData = images[0]
  const revisedPrompt = imageData.revisedPrompt || prompt
  const base64Data = imageData.base64

  if (!base64Data) {
    throw createError({ statusCode: 502, statusMessage: '이미지 생성 실패: base64 데이터가 없습니다.' })
  }

  const filename = `gen-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`
  const { writeFile } = await import('node:fs/promises')
  const filePath = join(STUDIO_DIR, filename)
  await writeFile(filePath, Buffer.from(base64Data, 'base64'))
  const localUrl = `/uploads/studio/${filename}`

  const db = getDb()
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })

  const [record] = await db.insert(studioImages).values({
    userId,
    type: 'generated',
    prompt: revisedPrompt,
    imageUrl: localUrl,
    width: parseInt(size.split('x')[0]),
    height: parseInt(size.split('x')[1]),
  }).returning()

  return { image: record }
})
