import { isIP } from 'node:net';
import { ProviderConfigurationError } from './errors';

export interface ProviderUrlPolicy {
  allowedHosts?: readonly string[];
  allowPrivateNetwork?: boolean;
  localOnly?: boolean;
  requireAllowlist?: boolean;
}

export interface ProviderUrlValidation {
  url: string;
  hostname: string;
  isPrivate: boolean;
  isLoopback: boolean;
}

function canonicalHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return octets;
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = parseIpv4(hostname);
  if (!octets) return false;
  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 192 && second === 0 && third === 0) return true;
  if (first === 198 && (second === 18 || second === 19)) return true;
  return first >= 224;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    return isPrivateHost(normalized.slice('::ffff:'.length));
  }
  return false;
}

export function isLoopbackHost(hostname: string): boolean {
  const normalized = canonicalHost(hostname);
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return parseIpv4(normalized)?.[0] === 127;
  return ipVersion === 6 && normalized.replace(/^\[/, '').replace(/\]$/, '') === '::1';
}

export function isPrivateHost(hostname: string): boolean {
  const normalized = canonicalHost(hostname);
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized === 'local') return true;
  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return isPrivateIpv4(normalized);
  if (ipVersion === 6) return isPrivateIpv6(normalized);
  return false;
}

function normalizedAllowlistHost(value: string): string | null {
  const token = value.trim().toLowerCase();
  if (!token) return null;
  if (token.includes('://')) {
    try {
      return canonicalHost(new URL(token).hostname);
    } catch {
      return null;
    }
  }
  return canonicalHost(token.replace(/^\*\./, ''));
}

export function parseAllowedHosts(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map(normalizedAllowlistHost)
    .filter((host): host is string => Boolean(host));
}

function hostMatchesAllowlist(hostname: string, allowedHosts: readonly string[]): boolean {
  const normalized = canonicalHost(hostname);
  return allowedHosts.some((allowed) => {
    const candidate = canonicalHost(allowed);
    return normalized === candidate || normalized.endsWith(`.${candidate}`);
  });
}

export function validateProviderUrl(value: string, policy: ProviderUrlPolicy = {}): ProviderUrlValidation | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password || parsed.hash || parsed.search) return null;
  const hostname = canonicalHost(parsed.hostname);
  if (!hostname || hostname.includes('%')) return null;

  const privateHost = isPrivateHost(hostname);
  const loopbackHost = isLoopbackHost(hostname);
  const allowedHosts = policy.allowedHosts || [];
  const allowlisted = hostMatchesAllowlist(hostname, allowedHosts);

  if (policy.localOnly) {
    if (!privateHost) return null;
    if (!loopbackHost && !policy.allowPrivateNetwork) return null;
    if (!loopbackHost && allowedHosts.length > 0 && !allowlisted) return null;
    return { url: parsed.toString().replace(/\/$/, ''), hostname, isPrivate: true, isLoopback: loopbackHost };
  }

  if (
    privateHost &&
    (!policy.allowPrivateNetwork || (!policy.localOnly && !allowlisted) || (allowedHosts.length > 0 && !allowlisted))
  ) {
    return null;
  }
  if (policy.requireAllowlist && !allowlisted) return null;

  return {
    url: parsed.toString().replace(/\/$/, ''),
    hostname,
    isPrivate: privateHost,
    isLoopback: loopbackHost,
  };
}

export function assertSafeProviderUrl(value: string, policy: ProviderUrlPolicy = {}): string {
  const validation = validateProviderUrl(value, policy);
  if (!validation) throw new ProviderConfigurationError('ENDPOINT_NOT_ALLOWED');
  return validation.url;
}
