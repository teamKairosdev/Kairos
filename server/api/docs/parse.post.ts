export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const filePart = body.find(p => p.name === 'file')
  if (!filePart?.data) throw createError({ statusCode: 400, statusMessage: 'File is required' })

  const ext = filePart.filename?.split('.').pop()?.toLowerCase() || ''

  try {
    if (ext === 'hwp' || ext === 'hwpx') {
      const { parseHwp } = await import('server/services/hwpParser')
      const result = await parseHwp(new Uint8Array(filePart.data as ArrayBuffer))
      return { text: result.text }
    }
    throw new Error('Unsupported format')
  } catch (err) {
    throw createError({ statusCode: 422, statusMessage: `HWP 파싱 실패: ${(err as Error).message}` })
  }
})
