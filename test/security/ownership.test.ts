import { describe, expect, it } from 'vitest';
import {
  findOwnedDocument,
  findOwnedDocumentByFileName,
  getDocumentAccess,
  getDocumentAccessByFileName,
} from '../../src/server/documentStore';

const metadata = [
  {
    id: 'doc-a',
    userId: 'user-a',
    title: 'A',
    ext: 'pdf',
    size: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    textContent: 'private',
  },
  {
    id: 'legacy-doc',
    title: 'Legacy',
    ext: 'pdf',
    size: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    textContent: 'unassigned',
  },
];

describe('document ownership', () => {
  it('only resolves a document for its exact owner', () => {
    expect(findOwnedDocument(metadata, 'doc-a', 'user-a')?.id).toBe('doc-a');
    expect(findOwnedDocument(metadata, 'doc-a', 'user-b')).toBeUndefined();
  });

  it('does not assign legacy metadata to a requesting user', () => {
    expect(findOwnedDocument(metadata, 'legacy-doc', 'user-a')).toBeUndefined();
    expect(findOwnedDocumentByFileName(metadata, 'legacy-doc.pdf', 'user-a')).toBeUndefined();
  });

  it('classifies legacy metadata separately so callers can offer recovery', () => {
    expect(getDocumentAccess(metadata, 'legacy-doc', 'user-a')).toEqual({ status: 'legacy' });
    expect(getDocumentAccessByFileName(metadata, 'legacy-doc.pdf', 'user-a')).toEqual({ status: 'legacy' });
  });

  it('does not reveal another owner through the access result', () => {
    expect(getDocumentAccess(metadata, 'doc-a', 'user-b')).toEqual({ status: 'not-found' });
  });
});
