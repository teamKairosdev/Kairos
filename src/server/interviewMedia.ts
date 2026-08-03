import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export const MAX_INTERVIEW_MEDIA_BYTES = 100 * 1024 * 1024;
export const INTERVIEW_MEDIA_RETENTION_DAYS = 30;
export const INTERVIEW_MEDIA_ROOT = resolve(process.cwd(), 'uploads', 'interviews');

export type InterviewMediaType = 'video' | 'audio';

export interface ValidatedInterviewMedia {
  mediaType: InterviewMediaType;
  extension: string;
  contentType: string;
}

interface InterviewMediaFormat {
  extension: string;
  mediaType: InterviewMediaType;
  contentType: string;
}

const INTERVIEW_MEDIA_FORMATS: InterviewMediaFormat[] = [
  { extension: 'webm', mediaType: 'video', contentType: 'video/webm' },
  { extension: 'webm', mediaType: 'audio', contentType: 'audio/webm' },
  { extension: 'mp4', mediaType: 'video', contentType: 'video/mp4' },
  { extension: 'mp4', mediaType: 'audio', contentType: 'audio/mp4' },
  { extension: 'm4a', mediaType: 'audio', contentType: 'audio/mp4' },
  { extension: 'mov', mediaType: 'video', contentType: 'video/quicktime' },
  { extension: 'ogg', mediaType: 'video', contentType: 'video/ogg' },
  { extension: 'ogg', mediaType: 'audio', contentType: 'audio/ogg' },
  { extension: 'ogv', mediaType: 'video', contentType: 'video/ogg' },
  { extension: 'mp3', mediaType: 'audio', contentType: 'audio/mpeg' },
  { extension: 'wav', mediaType: 'audio', contentType: 'audio/wav' },
  { extension: 'aac', mediaType: 'audio', contentType: 'audio/aac' },
];

const MIME_ALIASES: Record<string, string> = {
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
};

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function hasAsciiAt(bytes: Uint8Array, offset: number, value: string): boolean {
  if (bytes.length < offset + value.length) return false;
  return value.split('').every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

export function hasValidInterviewMediaSignature(bytes: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'audio/webm':
    case 'video/webm':
      return startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    case 'audio/mp4':
    case 'video/mp4':
    case 'video/quicktime':
      return hasAsciiAt(bytes, 4, 'ftyp');
    case 'audio/ogg':
    case 'video/ogg':
      return startsWithBytes(bytes, [0x4f, 0x67, 0x67, 0x53]);
    case 'audio/mpeg':
      return startsWithBytes(bytes, [0x49, 0x44, 0x33])
        || (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case 'audio/wav':
      return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) && hasAsciiAt(bytes, 8, 'WAVE');
    case 'audio/aac':
      return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0;
    default:
      return false;
  }
}

function getExtension(fileName: string): string | null {
  const lastPathPart = fileName.trim().split(/[\\/]/).pop() || '';
  const match = /^.+\.([a-z0-9]+)$/i.exec(lastPathPart);
  return match?.[1]?.toLowerCase() || null;
}

function normalizeMimeType(declaredMimeType: string | null | undefined): string {
  const rawMimeType = typeof declaredMimeType === 'string'
    ? declaredMimeType.trim().toLowerCase().split(';', 1)[0]
    : '';
  return MIME_ALIASES[rawMimeType] || rawMimeType;
}

export function validateInterviewMedia(
  fileName: string,
  declaredMimeType: string | null | undefined,
  bytes: Uint8Array
): ValidatedInterviewMedia | null {
  const extension = getExtension(fileName);
  const contentType = normalizeMimeType(declaredMimeType);
  if (!extension || !contentType) return null;

  const format = INTERVIEW_MEDIA_FORMATS.find(
    (candidate) => candidate.extension === extension && candidate.contentType === contentType
  );
  if (!format || !hasValidInterviewMediaSignature(bytes, contentType)) return null;

  return {
    mediaType: format.mediaType,
    extension: format.extension,
    contentType: format.contentType,
  };
}

export function normalizeInterviewMediaFileName(fileName: string): string {
  const lastPathPart = fileName.trim().split(/[\\/]/).pop() || '';
  return (lastPathPart || 'recording').slice(0, 255);
}

function assertSafePathSegment(value: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error('Invalid interview media path segment');
  }
}

export function getInterviewMediaStoragePath(
  interviewId: string,
  mediaId: string,
  extension: string
): string {
  assertSafePathSegment(interviewId);
  assertSafePathSegment(mediaId);
  if (!/^[a-z0-9]+$/.test(extension)) throw new Error('Invalid interview media extension');
  return `interviews/${interviewId}/${mediaId}.${extension}`;
}

export function resolveInterviewMediaPath(storagePath: string): string {
  const prefix = 'interviews/';
  if (!storagePath.startsWith(prefix) || storagePath.includes('\0')) {
    throw new Error('Invalid interview media storage path');
  }

  const relativeStoragePath = storagePath.slice(prefix.length);
  const candidate = resolve(INTERVIEW_MEDIA_ROOT, ...relativeStoragePath.split('/'));
  const relativeCandidate = relative(INTERVIEW_MEDIA_ROOT, candidate);
  if (
    !relativeCandidate
    || isAbsolute(relativeCandidate)
    || relativeCandidate === '..'
    || relativeCandidate.startsWith(`..${sep}`)
  ) {
    throw new Error('Invalid interview media storage path');
  }

  return candidate;
}

export async function writeInterviewMediaFile(storagePath: string, bytes: Uint8Array): Promise<string> {
  const filePath = resolveInterviewMediaPath(storagePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes, { flag: 'wx', mode: 0o600 });
  return filePath;
}

export async function readInterviewMediaFile(storagePath: string): Promise<Buffer> {
  return readFile(resolveInterviewMediaPath(storagePath));
}

export async function deleteInterviewMediaFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveInterviewMediaPath(storagePath));
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}

export function getInterviewMediaExpiryDate(createdAt = new Date()): Date {
  return new Date(createdAt.getTime() + INTERVIEW_MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function isInterviewMediaExpired(
  expiresAt: Date | string | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() <= now.getTime();
}
