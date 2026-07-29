import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const META_FILE = join(UPLOAD_DIR, '.metadata.json')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Document ID required' })

  const meta = existsSync(META_FILE) ? JSON.parse(readFileSync(META_FILE, 'utf-8')) : []
  const idx = meta.findIndex((m: any) => m.id === id)
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  const entry = meta[idx]
  const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`)
  if (existsSync(filePath)) unlinkSync(filePath)

  meta.splice(idx, 1)
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2))

  return { success: true }
})
