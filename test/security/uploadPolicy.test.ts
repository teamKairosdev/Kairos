import { describe, expect, it } from 'vitest';
import {
  getValidatedUploadMimeType,
  hasValidFileSignature,
  validateUpload,
} from '../../src/server/uploadPolicy';

describe('public upload MIME policy', () => {
  it('allows supported browser MIME types', () => {
    expect(getValidatedUploadMimeType('avatar.png', 'image/png')).toBe('image/png');
    expect(getValidatedUploadMimeType('avatar.webp', 'image/webp')).toBe('image/webp');
  });

  it('keeps demo files with an omitted or generic MIME type compatible', () => {
    expect(getValidatedUploadMimeType('avatar.png', '')).toBe('image/png');
    expect(getValidatedUploadMimeType('avatar.png', 'application/octet-stream')).toBe('image/png');
  });

  it('rejects unsupported and extension-mismatched MIME types', () => {
    expect(getValidatedUploadMimeType('payload.exe', 'application/x-msdownload')).toBeNull();
    expect(getValidatedUploadMimeType('resume.pdf', 'application/pdf')).toBeNull();
    expect(getValidatedUploadMimeType('avatar.png', 'application/pdf')).toBeNull();
  });

  it('requires a supported extension even when the declared MIME type is allowed', () => {
    expect(getValidatedUploadMimeType('avatar', 'image/png')).toBeNull();
    expect(getValidatedUploadMimeType('avatar.png.exe', 'image/png')).toBeNull();
    expect(getValidatedUploadMimeType('avatar.constructor', 'image/png')).toBeNull();
  });

  it('recognizes signatures for the supported image formats', () => {
    expect(hasValidFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true);
    expect(hasValidFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')).toBe(true);
    expect(hasValidFileSignature(Buffer.from('GIF89a'), 'image/gif')).toBe(true);
    expect(hasValidFileSignature(Buffer.from('RIFF1234WEBP'), 'image/webp')).toBe(true);
  });

  it('rejects a payload whose bytes do not match its name and MIME type', () => {
    expect(validateUpload('avatar.png', 'image/png', Buffer.from('not a PNG'))).toBeNull();
    expect(validateUpload('avatar.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({
      extension: 'png',
      contentType: 'image/png',
    });
  });
});
