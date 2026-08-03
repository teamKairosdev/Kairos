import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/db/schema', () => ({
  agentWorkspaces: {},
  agentRuns: {},
  agentArtifacts: {},
  agentArtifactVersions: {},
  agentRunEvents: {},
  agentToolStatus: {},
  agentFeedback: {},
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  sql: vi.fn(),
}));

import { GET as getWorkspaces, POST as postWorkspace } from '../../src/app/api/workspaces/route';
import { POST as postRun } from '../../src/app/api/agent-runs/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

describe('Deep Agent Canvas API authentication boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
  });

  it('rejects workspace reads and writes without a verified session', async () => {
    expect((await getWorkspaces(request('/api/workspaces'))).status).toBe(401);
    expect((await postWorkspace(request('/api/workspaces', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'attacker workspace', userId: 'other-user' }),
    }))).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('rejects agent runs before reading a body user id or database', async () => {
    const response = await postRun(request('/api/agent-runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'attacker-user', workspaceId: 'workspace', runType: 'draft', command: 'run' }),
    }));
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
