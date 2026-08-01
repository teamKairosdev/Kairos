/**
 * Blob service ported from server/services/blob.ts
 * useRuntimeConfig() → process.env 직접 접근으로 변환 (Next.js)
 */
import { put } from '@vercel/blob';

export async function uploadToBlob(
  filename: string,
  body: Buffer | ReadableStream | string,
  options?: { access?: 'public'; contentType?: string }
) {
  return put(filename, body, {
    access: options?.access || 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: options?.contentType,
  });
}
