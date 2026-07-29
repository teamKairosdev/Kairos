import { resolve, join } from 'path'
import { getDb } from 'db'
import { studioImages } from 'db/schema'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const STUDIO_DIR = resolve('uploads/studio')

async function ensureStudioDir() {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(STUDIO_DIR, { recursive: true })
}

async function downloadImage(url: string, filename: string): Promise<string> {
  const { writeFile } = await import('node:fs/promises')
  const resp = await fetch(url)
  const buffer = Buffer.from(await resp.arrayBuffer())
  const path = join(STUDIO_DIR, filename)
  await writeFile(path, buffer)
  return `/uploads/studio/${filename}`
}

export default defineEventHandler(async (event) => {
  if (!OPENAI_API_KEY) {
    throw createError({ statusCode: 503, statusMessage: 'OPENAI_API_KEY가 설정되지 않았습니다.' })
  }

  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const { prompt, n = 1, size = '1024x1024' } = await readBody(event)

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: '프롬프트를 입력해주세요.' })
  }

  await ensureStudioDir()

  // Call DALL-E 3 API
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: Math.min(n, 1), // DALL-E 3 only supports n=1
      size,
      response_format: 'url',
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw createError({ statusCode: 502, statusMessage: `이미지 생성 실패: ${err}` })
  }

  const data = await resp.json()
  const imageUrl = data.data[0].url
  const revisedPrompt = data.data[0].revised_prompt

  // Download and store locally
  const filename = `gen-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`
  const localUrl = await downloadImage(imageUrl, filename)

  const db = getDb()
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })

  const [record] = await db.insert(studioImages).values({
    userId,
    type: 'generated',
    prompt: revisedPrompt || prompt,
    imageUrl: localUrl,
    width: parseInt(size.split('x')[0]),
    height: parseInt(size.split('x')[1]),
  }).returning()

  return { image: record }
})
