import { readdirSync, statSync, existsSync } from 'fs'
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
  return JSON.parse(require('fs').readFileSync(META_FILE, 'utf-8'))
}

export default defineEventHandler(async () => {
  if (!existsSync(UPLOAD_DIR)) return []
  const meta = readMeta()
  return meta.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})
