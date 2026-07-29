import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const META_FILE = join(UPLOAD_DIR, '.metadata.json')

interface DocMeta {
  id: string
  title: string
  ext: string
  size: number
  createdAt: string
}

function readMeta(): DocMeta[] {
  if (!existsSync(META_FILE)) return []
  return JSON.parse(readFileSync(META_FILE, 'utf-8'))
}

function writeMeta(meta: DocMeta[]) {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2))
}

export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const filePart = body.find(p => p.name === 'file')
  const titlePart = body.find(p => p.name === 'title')

  if (!filePart?.filename || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  const ext = filePart.filename.split('.').pop()?.toLowerCase() || 'hwp'
  const supportedExts = ['hwp', 'hwpx', 'docx', 'doc', 'pdf']
  if (!supportedExts.includes(ext)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported format: .${ext}` })
  }

  const id = crypto.randomUUID()
  const title = titlePart?.data ? Buffer.from(titlePart.data as ArrayBuffer).toString('utf-8').trim() || filePart.filename : filePart.filename
  const destPath = join(UPLOAD_DIR, `${id}.${ext}`)

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
  writeFileSync(destPath, Buffer.from(filePart.data as ArrayBuffer))

  const meta = readMeta()
  meta.push({ id, title, ext, size: filePart.data.byteLength, createdAt: new Date().toISOString() })
  writeMeta(meta)

  // Parse text content for supported formats
  let textContent = ''
  try {
    if (ext === 'hwp') {
      const { parseHwp } = await import('server/services/hwpParser')
      const result = await parseHwp(new Uint8Array(filePart.data as ArrayBuffer))
      textContent = result.text
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: Buffer.from(filePart.data as ArrayBuffer) })
      textContent = result.value
    }
  } catch (e) {
    console.warn('[Docs] Text extraction failed:', (e as Error).message)
  }

  return { id, title, ext, size: filePart.data.byteLength, textContent }
})
