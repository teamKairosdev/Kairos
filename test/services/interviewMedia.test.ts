import { describe, expect, it } from 'vitest';
import {
  getInterviewMediaExpiryDate,
  getInterviewMediaStoragePath,
  hasValidInterviewMediaSignature,
  INTERVIEW_MEDIA_RETENTION_DAYS,
  isInterviewMediaExpired,
  normalizeInterviewMediaFileName,
  resolveInterviewMediaPath,
  validateInterviewMedia,
} from '../../src/server/interviewMedia';

const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]);
const MP4_HEADER = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
const OGG_HEADER = Buffer.from('OggS');

describe('interview media policy', () => {
  it('accepts recorder MIME parameters when the container and extension match', () => {
    expect(validateInterviewMedia('answer.webm', 'video/webm;codecs=vp8,opus', WEBM_HEADER)).toEqual({
      mediaType: 'video',
      extension: 'webm',
      contentType: 'video/webm',
    });
    expect(validateInterviewMedia('answer.ogg', 'audio/ogg;codecs=opus', OGG_HEADER)).toEqual({
      mediaType: 'audio',
      extension: 'ogg',
      contentType: 'audio/ogg',
    });
  });

  it('rejects mismatched MIME, extension, and file signatures', () => {
    expect(validateInterviewMedia('answer.webm', 'audio/mpeg', WEBM_HEADER)).toBeNull();
    expect(validateInterviewMedia('answer.mp4', 'video/mp4', Buffer.from('not an mp4'))).toBeNull();
    expect(validateInterviewMedia('answer.mp4', 'video/webm', WEBM_HEADER)).toBeNull();
    expect(validateInterviewMedia('answer.webm', '', WEBM_HEADER)).toBeNull();
  });

  it('recognizes common local recording signatures', () => {
    expect(hasValidInterviewMediaSignature(WEBM_HEADER, 'video/webm')).toBe(true);
    expect(hasValidInterviewMediaSignature(MP4_HEADER, 'video/mp4')).toBe(true);
    expect(hasValidInterviewMediaSignature(OGG_HEADER, 'audio/ogg')).toBe(true);
  });

  it('keeps storage paths inside the interview media directory', () => {
    expect(getInterviewMediaStoragePath('interview-1', 'media-1', 'webm')).toBe(
      'interviews/interview-1/media-1.webm'
    );
    expect(() => getInterviewMediaStoragePath('../other', 'media-1', 'webm')).toThrow();
    expect(() => resolveInterviewMediaPath('interviews/../../secret')).toThrow();
  });

  it('normalizes the displayed filename and calculates the retention date', () => {
    expect(normalizeInterviewMediaFileName('C:\\private\\answer.webm')).toBe('answer.webm');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const expiry = getInterviewMediaExpiryDate(createdAt);
    expect(expiry.getTime() - createdAt.getTime()).toBe(INTERVIEW_MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    expect(isInterviewMediaExpired(expiry, expiry)).toBe(true);
    expect(isInterviewMediaExpired(expiry, new Date(expiry.getTime() - 1))).toBe(false);
  });
});
