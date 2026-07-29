import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const META_FILE = join(UPLOAD_DIR, '.metadata.json')

const MIME_MAP: Record<string, string> = {
  hwp: 'application/x-hwp',
  hwpx: 'application/x-hwp+xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pdf: 'application/pdf',
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Document ID required' })

  const meta = existsSync(META_FILE) ? JSON.parse(readFileSync(META_FILE, 'utf-8')) : []
  const entry = meta.find((m: any) => m.id === id)
  if (!entry) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  const filePath = join(UPLOAD_DIR, `${id}.${entry.ext}`)
  if (!existsSync(filePath)) throw createError({ statusCode: 404, statusMessage: 'File not found' })

  const file = readFileSync(filePath)
  setHeader(event, 'Content-Type', MIME_MAP[entry.ext] || 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `inline; filename="${entry.title}.${entry.ext}"`)
  return file
})
