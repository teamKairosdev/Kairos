import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

export const UPLOAD_DIR = join(process.cwd(), 'uploads');
const META_FILE = join(UPLOAD_DIR, '.metadata.json');

export interface DocumentMeta {
  id: string;
  userId: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
  textContent: string;
}

// userId is optional while reading legacy metadata that predates ownership tracking.
export type StoredDocumentMeta = Omit<DocumentMeta, 'userId'> & { userId?: string };

export const LEGACY_DOCUMENT_MESSAGE =
  '문서 소유권을 확인할 수 없습니다. 문서를 재업로드하거나 관리자에게 재귀속을 요청하세요.';

export type DocumentAccess =
  | { status: 'owned'; document: StoredDocumentMeta }
  | { status: 'legacy' }
  | { status: 'not-found' };

export function readDocumentMeta(): StoredDocumentMeta[] {
  if (!existsSync(META_FILE)) return [];

  try {
    const parsed: unknown = JSON.parse(readFileSync(META_FILE, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as StoredDocumentMeta[]) : [];
  } catch {
    return [];
  }
}

export function writeDocumentMeta(meta: StoredDocumentMeta[]): void {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

function hasOwner(entry: StoredDocumentMeta): entry is StoredDocumentMeta & { userId: string } {
  return typeof entry.userId === 'string' && entry.userId.length > 0;
}

function findDocumentById(meta: StoredDocumentMeta[], id: string): StoredDocumentMeta | undefined {
  return meta.find((entry) => entry.id === id);
}

function findDocumentByFileName(meta: StoredDocumentMeta[], fileName: string): StoredDocumentMeta | undefined {
  const requestedFileName = basename(fileName);
  return meta.find((entry) => `${entry.id}.${entry.ext}` === requestedFileName);
}

function resolveAccess(entry: StoredDocumentMeta | undefined, userId: string): DocumentAccess {
  if (!entry) return { status: 'not-found' };
  if (!hasOwner(entry)) return { status: 'legacy' };
  if (entry.userId !== userId) return { status: 'not-found' };
  return { status: 'owned', document: entry };
}

export function getDocumentAccess(
  meta: StoredDocumentMeta[],
  id: string,
  userId: string
): DocumentAccess {
  return resolveAccess(findDocumentById(meta, id), userId);
}

export function getDocumentAccessByFileName(
  meta: StoredDocumentMeta[],
  fileName: string,
  userId: string
): DocumentAccess {
  return resolveAccess(findDocumentByFileName(meta, fileName), userId);
}

export function findOwnedDocument(
  meta: StoredDocumentMeta[],
  id: string,
  userId: string
): StoredDocumentMeta | undefined {
  const access = getDocumentAccess(meta, id, userId);
  return access.status === 'owned' ? access.document : undefined;
}

export function findOwnedDocumentByFileName(
  meta: StoredDocumentMeta[],
  fileName: string,
  userId: string
): StoredDocumentMeta | undefined {
  const access = getDocumentAccessByFileName(meta, fileName, userId);
  return access.status === 'owned' ? access.document : undefined;
}
