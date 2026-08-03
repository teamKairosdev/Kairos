import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSession: vi.fn(),
  validateInterviewMedia: vi.fn(),
  writeInterviewMediaFile: vi.fn(),
  deleteInterviewMediaFile: vi.fn(),
  getInterviewMediaStoragePath: vi.fn(),
  getInterviewMediaExpiryDate: vi.fn(),
  isInterviewMediaExpired: vi.fn(),
  readInterviewMediaFile: vi.fn(),
}));

vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db/schema', () => ({
  interviewMedia: {
    id: 'media.id',
    interviewId: 'media.interviewId',
    userId: 'media.userId',
    createdAt: 'media.createdAt',
  },
  mockInterviews: {
    id: 'interview.id',
    userId: 'interview.userId',
  },
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@/server/interviewMedia', () => ({
  MAX_INTERVIEW_MEDIA_BYTES: 100 * 1024 * 1024,
  deleteInterviewMediaFile: mocks.deleteInterviewMediaFile,
  getInterviewMediaExpiryDate: mocks.getInterviewMediaExpiryDate,
  getInterviewMediaStoragePath: mocks.getInterviewMediaStoragePath,
  isInterviewMediaExpired: mocks.isInterviewMediaExpired,
  normalizeInterviewMediaFileName: vi.fn((fileName: string) => fileName),
  readInterviewMediaFile: mocks.readInterviewMediaFile,
  validateInterviewMedia: mocks.validateInterviewMedia,
  writeInterviewMediaFile: mocks.writeInterviewMediaFile,
}));

function selectBuilder(result: unknown) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function mediaRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'media-1',
    interviewId: 'interview-1',
    userId: 'user-1',
    mediaType: 'video',
    mimeType: 'video/webm',
    originalFileName: 'answer.webm',
    storagePath: 'interviews/interview-1/media-1.webm',
    sizeBytes: 5,
    durationMs: 1200,
    analysisStatus: 'pending',
    transcript: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-01-31T00:00:00.000Z'),
    ...overrides,
  };
}

function makeFormRequest(file = new File([new Uint8Array([1, 2, 3])], 'answer.webm', { type: 'video/webm' })) {
  const form = new FormData();
  form.append('file', file);
  form.append('durationMs', '1200');
  return new NextRequest('http://localhost/api/interviews/interview-1/media', {
    method: 'POST',
    body: form,
  });
}

describe('interview media API ownership and storage boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 'user-1' });
    mocks.isInterviewMediaExpired.mockReturnValue(false);
    mocks.getInterviewMediaStoragePath.mockReturnValue('interviews/interview-1/media-1.webm');
    mocks.getInterviewMediaExpiryDate.mockReturnValue(new Date('2026-01-31T00:00:00.000Z'));
    mocks.validateInterviewMedia.mockReturnValue({
      mediaType: 'video',
      extension: 'webm',
      contentType: 'video/webm',
    });
    mocks.writeInterviewMediaFile.mockResolvedValue('uploads/interviews/interview-1/media-1.webm');
  });

  it('rejects unauthenticated list, upload, and playback requests before database access', async () => {
    mocks.getSession.mockResolvedValue(null);
    const { GET: list } = await import('../../src/app/api/interviews/[id]/media/route');
    const { POST: upload } = await import('../../src/app/api/interviews/[id]/media/route');
    const { GET: playback } = await import('../../src/app/api/interviews/[id]/media/[mediaId]/route');

    const listResponse = await list(
      new NextRequest('http://localhost/api/interviews/interview-1/media'),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    const uploadResponse = await upload(
      makeFormRequest(),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );
    const playbackResponse = await playback(
      new NextRequest('http://localhost/api/interviews/interview-1/media/media-1'),
      { params: Promise.resolve({ id: 'interview-1', mediaId: 'media-1' }) },
    );

    expect(listResponse.status).toBe(401);
    expect(uploadResponse.status).toBe(401);
    expect(playbackResponse.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('returns not found for an interview owned by another user', async () => {
    const db = {
      select: vi.fn(() => selectBuilder([])),
    };
    mocks.getDb.mockReturnValue(db);
    const { GET } = await import('../../src/app/api/interviews/[id]/media/route');

    const response = await GET(
      new NextRequest('http://localhost/api/interviews/interview-1/media'),
      { params: Promise.resolve({ id: 'interview-1' }) },
    );

    expect(response.status).toBe(404);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('stores only the authenticated owner and exposes pending metadata', async () => {
    const record = mediaRecord();
    const values = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([record]) }));
    const db = {
      select: vi.fn(() => selectBuilder([{ id: 'interview-1' }])),
      insert: vi.fn(() => ({ values })),
    };
    mocks.getDb.mockReturnValue(db);

    const { POST } = await import('../../src/app/api/interviews/[id]/media/route');
    const response = await POST(makeFormRequest(), {
      params: Promise.resolve({ id: 'interview-1' }),
    });

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      interviewId: 'interview-1',
      userId: 'user-1',
      mediaType: 'video',
      mimeType: 'video/webm',
      analysisStatus: 'pending',
      durationMs: 1200,
    }));
    expect(await response.json()).toMatchObject({
      media: {
        id: 'media-1',
        analysisStatus: 'pending',
        url: '/api/interviews/interview-1/media/media-1',
      },
    });
  });

  it('does not play a media row that is not owned by the requester', async () => {
    const db = {
      select: vi.fn()
        .mockImplementationOnce(() => selectBuilder([{ id: 'interview-1' }]))
        .mockImplementationOnce(() => selectBuilder([])),
    };
    mocks.getDb.mockReturnValue(db);
    const { GET } = await import('../../src/app/api/interviews/[id]/media/[mediaId]/route');

    const response = await GET(
      new NextRequest('http://localhost/api/interviews/interview-1/media/media-2'),
      { params: Promise.resolve({ id: 'interview-1', mediaId: 'media-2' }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.readInterviewMediaFile).not.toHaveBeenCalled();
  });
});
