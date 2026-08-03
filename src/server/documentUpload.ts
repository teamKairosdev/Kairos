const DOCUMENT_EXTENSIONS = new Set(['hwp', 'hwpx', 'docx', 'doc', 'pdf']);

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_TEXT_BYTES = 1 * 1024 * 1024;

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function startsWithAscii(bytes: Uint8Array, value: string): boolean {
  return startsWithBytes(bytes, Array.from(value, (character) => character.charCodeAt(0)));
}

export function documentExtension(fileName: string): string | null {
  const lastPathPart = fileName.trim().split(/[\\/]/).pop() || '';
  const match = /^.+\.([a-z0-9]+)$/i.exec(lastPathPart);
  const extension = match?.[1]?.toLowerCase() || '';
  return DOCUMENT_EXTENSIONS.has(extension) ? extension : null;
}

export function hasValidDocumentSignature(bytes: Uint8Array, extension: string): boolean {
  if (extension === 'pdf') return startsWithAscii(bytes, '%PDF-');

  const isOle = startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === 'doc' || extension === 'hwp') return isOle;

  // DOCX and HWPX are ZIP containers.
  return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])
    || startsWithBytes(bytes, [0x50, 0x4b, 0x05, 0x06])
    || startsWithBytes(bytes, [0x50, 0x4b, 0x07, 0x08]);
}

export function validateDocumentUpload(
  fileName: string,
  bytes: Uint8Array,
): { extension: string } | null {
  if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) return null;
  const extension = documentExtension(fileName);
  return extension && hasValidDocumentSignature(bytes, extension) ? { extension } : null;
}
