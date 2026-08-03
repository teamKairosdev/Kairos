import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock('@/server/getSession', () => ({ getSession: mocks.getSession }));
vi.mock('@/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/db/schema', () => ({
  contextProviders: {
    id: 'contextProviders.id',
    userId: 'contextProviders.userId',
    providerType: 'contextProviders.providerType',
    createdAt: 'contextProviders.createdAt',
  },
  importedContextItems: {
    id: 'importedContextItems.id',
    providerId: 'importedContextItems.providerId',
    userId: 'importedContextItems.userId',
    title: 'importedContextItems.title',
    content: 'importedContextItems.content',
    importedAt: 'importedContextItems.importedAt',
  },
  memoryExportJobs: {
    id: 'memoryExportJobs.id',
    userId: 'memoryExportJobs.userId',
    requestedAt: 'memoryExportJobs.requestedAt',
  },
}));
vi.mock('drizzle-orm', () => ({
  and: vi.fn((...values: unknown[]) => ({ operator: 'and', values })),
  asc: vi.fn((value: unknown) => ({ operator: 'asc', value })),
  desc: vi.fn((value: unknown) => ({ operator: 'desc', value })),
  eq: vi.fn((left: unknown, right: unknown) => ({ operator: 'eq', left, right })),
  ilike: vi.fn((left: unknown, right: unknown) => ({ operator: 'ilike', left, right })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ operator: 'inArray', left, right })),
  or: vi.fn((...values: unknown[]) => ({ operator: 'or', values })),
}));

import { GET as getProviders, POST as postProvider } from '../../src/app/api/contexts/providers/route';
import {
  DELETE as deleteProvider,
  GET as getProvider,
  PATCH as patchProvider,
} from '../../src/app/api/contexts/providers/[id]/route';
import { GET as getItems, POST as postItems } from '../../src/app/api/contexts/items/route';
import { DELETE as deleteItem, GET as getItem } from '../../src/app/api/contexts/items/[id]/route';
import { POST as importFile } from '../../src/app/api/contexts/import/route';
import { POST as syncContexts } from '../../src/app/api/contexts/sync/route';
import { GET as getExports, POST as postExport } from '../../src/app/api/memory-exports/route';
import { GET as getExport } from '../../src/app/api/memory-exports/[id]/route';

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('contexts API authentication and ownership boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(null);
    mocks.getDb.mockReturnValue(null);
  });

  it('rejects every context and export endpoint without the verified session', async () => {
    const calls = [
      () => getProviders(request('/api/contexts/providers')),
      () => postProvider(request('/api/contexts/providers', { method: 'POST', body: '{}' })),
      () => getProvider(request('/api/contexts/providers/provider-1'), params('provider-1')),
      () => patchProvider(request('/api/contexts/providers/provider-1', { method: 'PATCH', body: '{}' }), params('provider-1')),
      () => deleteProvider(request('/api/contexts/providers/provider-1', { method: 'DELETE' }), params('provider-1')),
      () => getItems(request('/api/contexts/items')),
      () => postItems(request('/api/contexts/items', { method: 'POST', body: '{}' })),
      () => getItem(request('/api/contexts/items/item-1'), params('item-1')),
      () => deleteItem(request('/api/contexts/items/item-1', { method: 'DELETE' }), params('item-1')),
      () => importFile(request('/api/contexts/import', { method: 'POST', body: new FormData() })),
      () => syncContexts(request('/api/contexts/sync', { method: 'POST', body: '{}' })),
      () => getExports(request('/api/memory-exports')),
      () => postExport(request('/api/memory-exports', { method: 'POST', body: '{}' })),
      () => getExport(request('/api/memory-exports/job-1'), params('job-1')),
    ];

    for (const call of calls) {
      expect((await call()).status).toBe(401);
    }

    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it('creates a provider with the session owner and not_connected when no key is configured', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });

    const created = {
      id: 'provider-1',
      userId: 'session-user',
      providerType: 'notion',
      displayName: 'Notion',
      status: 'not_connected',
      externalAccountHash: null,
      credentialRef: null,
      settings: { connectionMode: 'official_api', consentScope: ['provider metadata'] },
      lastSyncedAt: null,
      lastErrorCode: 'OFFICIAL_API_NOT_CONFIGURED',
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
    };
    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    }));
    const values = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([created]) }));
    const insert = vi.fn(() => ({ values }));
    mocks.getDb.mockReturnValue({ select, insert });

    const response = await postProvider(request('/api/contexts/providers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerType: 'notion', userId: 'attacker-user' }),
    }));

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: 'session-user', status: 'not_connected', credentialRef: null }));
    expect(await response.json()).toMatchObject({ status: 'not_connected' });
  });

  it('keeps an owned public provider configuration_required without calling fetch', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    delete process.env.WORKNET_API_KEY;
    delete process.env.WORKNET_OPEN_API_KEY;
    const provider = {
      id: 'provider-1',
      userId: 'session-user',
      providerType: 'worknet',
      displayName: '워크넷',
      status: 'not_connected',
      settings: { connectionMode: 'official_api', consentGranted: true },
      lastSyncedAt: null,
      lastErrorCode: null,
    };
    const updated = { ...provider, status: 'not_connected', lastErrorCode: 'CONFIGURATION_REQUIRED', lastSyncedAt: new Date() };
    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([provider]) })),
      })),
    }));
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    mocks.getDb.mockReturnValue({ select, update });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await syncContexts(request('/api/contexts/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerId: 'provider-1', userId: 'attacker-user' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      providers: [{ status: 'configuration_required', errorCode: 'CONFIGURATION_REQUIRED' }],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    const predicate = where.mock.calls[0]?.[0] as { values?: Array<{ right?: unknown }> };
    expect(predicate.values?.some((value) => value.right === 'session-user')).toBe(true);
    fetchSpy.mockRestore();
  });

  it('uses the session owner in item deletion predicates', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'session-user' });
    const where = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) }));
    mocks.getDb.mockReturnValue({ delete: vi.fn(() => ({ where })) });

    const response = await deleteItem(
      request('/api/contexts/items/item-1', { method: 'DELETE' }),
      params('item-1'),
    );

    expect(response.status).toBe(404);
    const predicate = where.mock.calls[0]?.[0] as { values?: Array<{ right?: unknown }> };
    expect(predicate.values?.some((value) => value.right === 'session-user')).toBe(true);
  });
});
