import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPrivateProvider, privateApiConfigured } from '../../src/server/privateProviders';

const ENV_KEYS = ['NOTION_API_KEY', 'NOTION_TOKEN', 'GITHUB_TOKEN', 'GITHUB_API_KEY'] as const;

describe('private context provider adapters', () => {
  const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  it('normalizes Notion search results without storing the raw payload', async () => {
    process.env.NOTION_API_KEY = 'notion-test-key';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [{
        id: 'page-1',
        url: 'https://notion.so/page-1',
        last_edited_time: '2026-08-05T10:00:00.000Z',
        properties: { Name: { type: 'title', title: [{ plain_text: 'Kairos 회고' }] } },
        secret_payload: 'do-not-store',
      }],
    }), { status: 200 }));

    const result = await fetchPrivateProvider('notion', { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.items[0]).toMatchObject({ itemType: 'notion_page', title: 'Kairos 회고' });
    expect(result.items[0].content).toContain('Notion URL: https://notion.so/page-1');
    expect(JSON.stringify(result.items)).not.toContain('do-not-store');
    expect(privateApiConfigured('notion')).toBe(true);
  });

  it('normalizes GitHub repositories', async () => {
    process.env.GITHUB_TOKEN = 'github-test-token';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([
      {
        full_name: 'kairos/team-project',
        description: 'Career context workspace',
        language: 'TypeScript',
        topics: ['career', 'ai'],
        html_url: 'https://github.com/kairos/team-project',
        updated_at: '2026-08-05T10:00:00.000Z',
      },
    ]), { status: 200 }));

    const result = await fetchPrivateProvider('github', { fetchImpl });

    expect(result.items[0]).toMatchObject({ itemType: 'github_repository', title: 'kairos/team-project' });
    expect(result.items[0].content).toContain('Language: TypeScript');
    expect(result.items[0].sourceReference).toBe('https://github.com/kairos/team-project');
  });

  it('fails closed when credentials are absent', async () => {
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_TOKEN;
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(fetchPrivateProvider('notion', { fetchImpl })).rejects.toMatchObject({ code: 'CONFIGURATION_REQUIRED' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(privateApiConfigured('notion')).toBe(false);
  });
});
