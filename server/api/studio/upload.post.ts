import { resolve, extname, join } from 'path'
import { getDb } from 'db'
import { studioImages } from 'db/schema'

const STUDIO_DIR = resolve('uploads/studio')

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir(STUDIO_DIR, { recursive: true })

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '파일이 없습니다.' })
  }

  const file = formData[0]
  const ext = extname(file.filename || 'image.png') || '.png'
  const filename = `upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`
  const filePath = join(STUDIO_DIR, filename)
  await writeFile(filePath, file.data)

  const db = getDb()
  if (!db) throw createError({ statusCode: 503, statusMessage: 'Database unavailable' })

  const [record] = await db.insert(studioImages).values({
    userId,
    type: 'uploaded',
    imageUrl: `/uploads/studio/${filename}`,
    originalFileName: file.filename || filename,
  }).returning()

  return { image: record }
})
