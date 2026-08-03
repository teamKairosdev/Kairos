import { describe, expect, it } from 'vitest';
import { buildWalletSignInMessage, normalizeEmail } from '../../src/server/auth';
import { GET as issueNonce } from '../../src/app/api/auth/nonce/route';

describe('wallet authentication challenge', () => {
  it('binds the signed message to the exact nonce and normalized address', () => {
    expect(buildWalletSignInMessage('nonce-1', '0xAbC')).toBe('Kairos Sign-In\nnonce-1\n0xabc');
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('issues a cryptographically random, httpOnly nonce cookie', async () => {
    const response = await issueNonce();
    const body = await response.json() as { nonce: string };
    const setCookie = response.headers.get('set-cookie') || '';

    expect(body.nonce).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(setCookie).toContain('kairos_wallet_nonce=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie).toContain('Max-Age=600');
    expect(setCookie).toContain('Path=/api/auth');
  });
});
