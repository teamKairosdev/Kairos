import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db', () => ({ getDb: mocks.getDb }));

import { DELETE, GET, POST } from '../../src/app/api/sandbox/route';
import { resetSandboxControlPlaneForTests } from '../../src/server/sandbox';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

describe('sandbox API security boundary', () => {
  beforeEach(() => {
    vi.stubEnv('SANDBOX_BACKEND', 'disabled');
    vi.stubEnv('SANDBOX_FIRECRACKER_ENDPOINT', '');
    vi.stubEnv('SANDBOX_FIRECRACKER_TOKEN', '');
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
    resetSandboxControlPlaneForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetSandboxControlPlaneForTests();
  });

  it('authenticates status, job, and cancellation operations before reading state', async () => {
    expect((await GET(request('/api/sandbox'))).status).toBe(401);
    expect((await POST(request('/api/sandbox', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect((await DELETE(request('/api/sandbox?jobId=job-1', { method: 'DELETE' }))).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('uses the verified session user and reports not_configured without a fake result', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    const response = await POST(request('/api/sandbox', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'attacker-user',
        toolName: 'read_file',
        action: 'read',
        arguments: { path: 'notes.txt' },
      }),
    }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: 'not_configured', code: 'SANDBOX_NOT_CONFIGURED' });
    expect(body.job).toMatchObject({ userId: 'session-user', status: 'disabled', resultAvailable: false });
    expect(body.job.result).toBeUndefined();
  });

  it('rejects risky jobs before an approval lookup when approvalId is absent', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    const response = await POST(request('/api/sandbox', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        toolName: 'text-editor',
        action: 'write',
        arguments: { path: 'notes.txt', content: 'change' },
      }),
    }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'TOOL_APPROVAL_REQUIRED' });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
