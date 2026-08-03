const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
};

const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream']);
const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

export const MAX_PUBLIC_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface ValidatedUpload {
  extension: string;
  contentType: string;
}

export function getUploadExtension(fileName: string): string | null {
  const lastPathPart = fileName.trim().split(/[\\/]/).pop() || '';
  const match = /^.+\.([a-z0-9]+)$/i.exec(lastPathPart);
  const extension = match?.[1]?.toLowerCase() || '';
  return extension && Object.prototype.hasOwnProperty.call(MIME_BY_EXTENSION, extension)
    ? extension
    : null;
}

export function getValidatedUploadMimeType(
  fileName: string,
  declaredMimeType: string | null | undefined
): string | null {
  const extension = getUploadExtension(fileName);
  if (!extension) return null;

  const inferredMimeType = MIME_BY_EXTENSION[extension];
  const rawDeclared = typeof declaredMimeType === 'string'
    ? declaredMimeType.trim().toLowerCase()
    : '';

  // Some browser and demo File objects omit the type or use the generic type.
  if (GENERIC_MIME_TYPES.has(rawDeclared)) return inferredMimeType;

  const declared = MIME_ALIASES[rawDeclared] || rawDeclared;
  if (!ALLOWED_MIME_TYPES.has(declared) || declared !== inferredMimeType) return null;

  return declared;
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

export function hasValidFileSignature(bytes: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'image/jpeg':
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46])
        && bytes.length >= 12
        && bytes[8] === 0x57
        && bytes[9] === 0x45
        && bytes[10] === 0x42
        && bytes[11] === 0x50;
    case 'image/gif':
      return startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38])
        && (bytes[4] === 0x37 || bytes[4] === 0x39)
        && bytes[5] === 0x61;
    default:
      return false;
  }
}

export function validateUpload(
  fileName: string,
  declaredMimeType: string | null | undefined,
  bytes: Uint8Array
): ValidatedUpload | null {
  const extension = getUploadExtension(fileName);
  const contentType = getValidatedUploadMimeType(fileName, declaredMimeType);
  if (!extension || !contentType || !hasValidFileSignature(bytes, contentType)) return null;

  return { extension, contentType };
}
