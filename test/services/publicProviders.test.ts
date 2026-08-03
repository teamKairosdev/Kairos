import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPublicProvider,
  publicApiConfigured,
  type PublicProviderType,
} from '../../src/server/publicProviders';

const ENV_KEYS = [
  'WORKNET_API_KEY',
  'WORKNET_OPEN_API_KEY',
  'EMPLOYMENT24_API_KEY',
  'EMP24_API_KEY',
  'WORK24_API_KEY',
  'QNET_API_KEY',
  'QNET_SERVICE_KEY',
  'DART_API_KEY',
  'OPENDART_API_KEY',
] as const;

describe('public provider adapters', () => {
  const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  it('does not call an official API when its server key is absent', async () => {
    delete process.env.WORKNET_API_KEY;
    delete process.env.WORKNET_OPEN_API_KEY;
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(fetchPublicProvider('worknet', { fetchImpl })).rejects.toMatchObject({
      code: 'CONFIGURATION_REQUIRED',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(publicApiConfigured('worknet')).toBe(false);
  });

  it('normalizes a DART JSON list without retaining unknown payload fields', async () => {
    process.env.DART_API_KEY = 'test-dart-key';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      status: '000',
      message: '정상',
      list: [{
        corp_name: '예시회사',
        report_nm: '분기보고서',
        rcept_no: '20260804000001',
        rcept_dt: '20260804',
        private_payload: 'do-not-store',
      }],
    }), { status: 200 }));

    const result = await fetchPublicProvider('dart', {
      fetchImpl,
      now: new Date('2026-08-04T12:00:00.000Z'),
    });
    const item = result.items[0];

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(item).toMatchObject({
      itemType: 'dart',
      title: '예시회사 - 분기보고서',
      occurredAt: '2026-08-04T00:00:00.000Z',
    });
    expect(item.content).toContain('회사: 예시회사');
    expect(item.sourceReference).toContain('rcpNo=20260804000001');
    expect(JSON.stringify(item)).not.toContain('do-not-store');
  });

  it('normalizes official XML items from Worknet and Q-Net', async () => {
    const cases: Array<{ provider: PublicProviderType; envKey: keyof typeof process.env; xml: string }> = [
      {
        provider: 'worknet',
        envKey: 'WORKNET_API_KEY',
        xml: '<wantedRoot><messageCd>000</messageCd><wanted><wantedAuthNo>W-1</wantedAuthNo><company>공식회사</company><title>개발자 채용</title><regDt>20260804</regDt></wanted></wantedRoot>',
      },
      {
        provider: 'qnet',
        envKey: 'QNET_API_KEY',
        xml: '<response><header><resultCode>00</resultCode></header><body><items><item><cfmnCd>01</cfmnCd><cfmnNm>자격 확인서</cfmnNm><seriesNm>기술사</seriesNm></item></items></body></response>',
      },
    ];

    for (const testCase of cases) {
      process.env[testCase.envKey] = 'test-provider-key';
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(testCase.xml, { status: 200 }));
      const result = await fetchPublicProvider(testCase.provider, { fetchImpl });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBeTruthy();
      expect(result.items[0].content).toBeTruthy();
      expect(result.items[0].sourceReference || result.items[0].title).toBeTruthy();
      delete process.env[testCase.envKey];
    }
  });

  it('enforces timeout and response byte limits', async () => {
    process.env.QNET_API_KEY = 'test-qnet-key';
    const timeoutFetch = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(fetchPublicProvider('qnet', { fetchImpl: timeoutFetch, timeoutMs: 5 })).rejects.toMatchObject({
      code: 'SYNC_TIMEOUT',
    });

    const oversizedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(32), { status: 200 }));
    await expect(fetchPublicProvider('qnet', { fetchImpl: oversizedFetch, maxResponseBytes: 8 })).rejects.toMatchObject({
      code: 'RESPONSE_TOO_LARGE',
    });
  });

  it('turns an official provider error code into a stable error code', async () => {
    process.env.DART_API_KEY = 'test-dart-key';
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      status: '010',
      message: '등록되지 않은 인증키입니다.',
    }), { status: 200 }));

    await expect(fetchPublicProvider('dart', { fetchImpl })).rejects.toMatchObject({
      code: 'UPSTREAM_010',
    });
  });
});
