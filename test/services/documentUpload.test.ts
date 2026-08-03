import { describe, expect, it } from 'vitest';
import {
  MAX_DOCUMENT_BYTES,
  hasValidDocumentSignature,
  validateDocumentUpload,
} from '../../src/server/documentUpload';

describe('document upload policy', () => {
  it('requires a container signature that matches the extension', () => {
    expect(validateDocumentUpload('resume.pdf', Buffer.from('%PDF-1.7'))).toEqual({ extension: 'pdf' });
    expect(validateDocumentUpload('resume.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toEqual({ extension: 'docx' });
    expect(validateDocumentUpload('resume.hwp', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toEqual({ extension: 'hwp' });
    expect(validateDocumentUpload('resume.pdf', Buffer.from('not a PDF'))).toBeNull();
    expect(validateDocumentUpload('resume.exe', Buffer.from('%PDF-1.7'))).toBeNull();
  });

  it('rejects empty and oversized documents', () => {
    expect(hasValidDocumentSignature(new Uint8Array(), 'pdf')).toBe(false);
    expect(validateDocumentUpload('resume.pdf', new Uint8Array(MAX_DOCUMENT_BYTES + 1))).toBeNull();
  });
});
