import { put, del, list } from '@vercel/blob';

export async function uploadToBlob(filename: string, body: Buffer | ReadableStream | string, options?: { access?: 'public'; contentType?: string }) {
  const config = useRuntimeConfig();
  const token = config.blobReadWriteToken as string;

  return put(filename, body, {
    access: options?.access || 'public',
    token: token || process.env.BLOB_READ_WRITE_TOKEN,
    contentType: options?.contentType,
  });
}

export async function deleteFromBlob(url: string) {
  const config = useRuntimeConfig();
  const token = config.blobReadWriteToken as string;

  return del(url, {
    token: token || process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function listBlobFiles(options?: { prefix?: string; limit?: number }) {
  const config = useRuntimeConfig();
  const token = config.blobReadWriteToken as string;

  return list({
    token: token || process.env.BLOB_READ_WRITE_TOKEN,
    prefix: options?.prefix,
    limit: options?.limit,
  });
}
