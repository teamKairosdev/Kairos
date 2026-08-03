import { isIP } from 'node:net';
import {
  classifyToolRisk,
  evaluateToolAccess,
  hashValue,
  isToolExecutionProhibited,
  type ToolApprovalSnapshot,
  type ToolAccessDecision,
} from '@/server/harness';
import type { SandboxJobRequest, SandboxNetworkPolicy } from './types';

export const DEFAULT_SANDBOX_TIMEOUT_MS = 10_000;
export const MIN_SANDBOX_TIMEOUT_MS = 100;
export const MAX_SANDBOX_TIMEOUT_MS = 120_000;
export const DEFAULT_SANDBOX_MAX_OUTPUT_BYTES = 64 * 1024;
export const MIN_SANDBOX_MAX_OUTPUT_BYTES = 1;
export const MAX_SANDBOX_MAX_OUTPUT_BYTES = 1024 * 1024;
export const MAX_SANDBOX_INPUT_BYTES = 128 * 1024;

const PROHIBITED_EXECUTION_NAMES = [
  'bash',
  'cmd',
  'command',
  'exec',
  'execute',
  'node',
  'nodejs',
  'powershell',
  'pwsh',
  'process',
  'python',
  'compile',
  'eval',
  'interpret',
  'invoke',
  'run',
  'shell',
  'sh',
  'spawn',
  'terminal',
] as const;

const PROHIBITED_INPUT_KEYS = new Set([
  'cmd',
  'code',
  'command',
  'entrypoint',
  'executable',
  'exec',
  'interpreter',
  'node',
  'nodejs',
  'powershell',
  'program',
  'python',
  'script',
  'shell',
  'sourcecode',
]);

const PATH_KEY_PATTERN = /(?:^|[-_]|(?<=[a-z]))(path|paths|file|files|filename|filenames|cwd|workingdirectory)$/i;
const URL_KEY_PATTERN = /(?:^|[-_]|(?<=[a-z]))(url|urls|uri|uris|endpoint|endpoints|webhook|webhooks|targeturl)$/i;
const ACTION_PATTERN = /^[a-z][a-z0-9._:-]{0,63}$/;
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9._:-]{0,99}$/i;

export class SandboxBoundaryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'SandboxBoundaryError';
  }
}

export interface NormalizedSandboxJobRequest extends SandboxJobRequest {
  toolActionHash: string;
  requiresApproval: boolean;
  riskLevel: ReturnType<typeof classifyToolRisk>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedExecutionName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function hasProhibitedExecutionName(value: string): boolean {
  const normalized = normalizedExecutionName(value);
  const segments = normalized.split('-');
  return PROHIBITED_EXECUTION_NAMES.some((name) =>
    normalized === name || normalized.startsWith(`${name}-`) || normalized.endsWith(`-${name}`) || segments.includes(name),
  );
}

export function isSandboxExecutionProhibited(toolName: string, action?: string): boolean {
  return (
    isToolExecutionProhibited(toolName) ||
    hasProhibitedExecutionName(toolName) ||
    (typeof action === 'string' && hasProhibitedExecutionName(action))
  );
}

const APPROVAL_ACTION_NAMES = new Set([
  'append',
  'copy',
  'create',
  'delete',
  'edit',
  'external',
  'fetch',
  'http',
  'insert',
  'move',
  'patch',
  'post',
  'put',
  'remove',
  'replace',
  'request',
  'save',
  'send',
  'transfer',
  'update',
  'upload',
  'webhook',
  'write',
]);

const NETWORK_ACTION_NAMES = new Set(['external', 'fetch', 'http', 'post', 'request', 'send', 'transfer', 'upload', 'webhook']);

export function sandboxActionRequiresApproval(action: string): boolean {
  const normalized = normalizedExecutionName(action);
  const segments = normalized.split('-');
  return (
    APPROVAL_ACTION_NAMES.has(normalized) ||
    segments.some((segment) => APPROVAL_ACTION_NAMES.has(segment)) ||
    normalized.includes('external') ||
    normalized.includes('send')
  );
}

export function sandboxActionRequiresNetworkAllowlist(action: string): boolean {
  const normalized = normalizedExecutionName(action);
  return normalized.includes('external') || normalized.split('-').some((segment) => NETWORK_ACTION_NAMES.has(segment));
}

function parseBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
  fieldName: string,
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new SandboxBoundaryError(
      `${fieldName}은 ${minimum}~${maximum} 사이의 정수여야 합니다.`,
      `INVALID_${fieldName.toUpperCase()}`,
    );
  }
  return value;
}

function isPrivateIpv4(host: string): boolean {
  const octets = host.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && octets[2] === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113) ||
    first >= 224
  );
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host === 'host.docker.internal' ||
    host === 'kubernetes.default.svc' ||
    host.endsWith('.nip.io') ||
    host.endsWith('.sslip.io') ||
    host.endsWith('.localtest.me') ||
    host.endsWith('.lvh.me')
  ) {
    return true;
  }

  if (/^\d+(?:\.\d+)*$/.test(host)) return true;
  const addressType = isIP(host);
  if (addressType === 4) return isPrivateIpv4(host);
  if (addressType === 6) return true;
  return false;
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function validateHost(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SandboxBoundaryError(`${fieldName}에 유효한 호스트가 필요합니다.`, 'INVALID_NETWORK_HOST');
  }
  const host = normalizeHost(value);
  if (
    host.length > 253 ||
    host.includes('*') ||
    host.includes('/') ||
    host.includes('@') ||
    host.includes(':') ||
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ||
    host.split('.').some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-')) ||
    isPrivateOrLocalHost(host)
  ) {
    throw new SandboxBoundaryError(`${fieldName}에 허용되지 않는 호스트가 포함되어 있습니다.`, 'UNSAFE_NETWORK_HOST');
  }
  return host;
}

export function normalizeSandboxNetworkPolicy(value: unknown): SandboxNetworkPolicy {
  if (value === undefined || value === null || value === 'none') {
    return { mode: 'none', allowedHosts: [] };
  }

  if (!isRecord(value) || (value.mode !== 'none' && value.mode !== 'allowlist')) {
    throw new SandboxBoundaryError(
      'networkPolicy는 none 또는 allowlist 형식이어야 합니다.',
      'INVALID_NETWORK_POLICY',
    );
  }

  const rawHosts = value.allowedHosts === undefined ? [] : value.allowedHosts;
  if (!Array.isArray(rawHosts) || rawHosts.length > 20) {
    throw new SandboxBoundaryError('허용 호스트 목록이 올바르지 않습니다.', 'INVALID_NETWORK_POLICY');
  }
  const allowedHosts = rawHosts.map((host) => validateHost(host, 'allowedHosts'));
  if (value.mode === 'allowlist' && allowedHosts.length === 0) {
    throw new SandboxBoundaryError('allowlist에는 하나 이상의 호스트가 필요합니다.', 'INVALID_NETWORK_POLICY');
  }
  if (value.mode === 'none' && allowedHosts.length > 0) {
    throw new SandboxBoundaryError('none 정책에는 허용 호스트를 지정할 수 없습니다.', 'INVALID_NETWORK_POLICY');
  }
  return { mode: value.mode, allowedHosts: Array.from(new Set(allowedHosts)) };
}

export function validateRemoteEndpoint(value: unknown): { valid: true; url: string } | { valid: false; reason: string } {
  if (typeof value !== 'string' || !value.trim()) return { valid: false, reason: 'endpoint_missing' };
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return { valid: false, reason: 'endpoint_must_use_https' };
    if (url.username || url.password || url.hash) return { valid: false, reason: 'endpoint_credentials_or_fragment' };
    // This URL is trusted deployment configuration, not a request field. Private
    // service DNS is valid here; user-provided URLs still go through SSRF checks.
    if (!url.hostname) return { valid: false, reason: 'endpoint_host_not_allowed' };
    return { valid: true, url: url.toString().replace(/#$/, '') };
  } catch {
    return { valid: false, reason: 'endpoint_invalid' };
  }
}

function validateSafeRelativePath(value: unknown): void {
  if (typeof value !== 'string' || !value.trim() || value.includes('\u0000')) {
    throw new SandboxBoundaryError('파일 경로 형식이 올바르지 않습니다.', 'INVALID_SANDBOX_PATH');
  }
  const path = value.replaceAll('\\', '/');
  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path).replaceAll('\\', '/');
  } catch {
    throw new SandboxBoundaryError('파일 경로 인코딩이 올바르지 않습니다.', 'INVALID_SANDBOX_PATH');
  }
  if (
    path.startsWith('/') ||
    path.startsWith('//') ||
    /^[a-zA-Z]:\//.test(path) ||
    path.split('/').some((segment) => segment === '..') ||
    decodedPath.startsWith('/') ||
    /^[a-zA-Z]:\//.test(decodedPath) ||
    decodedPath.split('/').some((segment) => segment === '..') ||
    decodedPath.includes('\u0000')
  ) {
    throw new SandboxBoundaryError('workspace 밖의 경로는 사용할 수 없습니다.', 'SANDBOX_PATH_TRAVERSAL');
  }
}

export function isSafeRelativePath(value: string): boolean {
  try {
    validateSafeRelativePath(value);
    return true;
  } catch {
    return false;
  }
}

function validateNetworkUrl(value: string, policy: SandboxNetworkPolicy): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SandboxBoundaryError('URL 형식이 올바르지 않습니다.', 'INVALID_NETWORK_URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) {
    throw new SandboxBoundaryError('HTTPS allowlist URL만 사용할 수 있습니다.', 'UNSAFE_NETWORK_URL');
  }
  const host = normalizeHost(url.hostname);
  if (isPrivateOrLocalHost(host)) {
    throw new SandboxBoundaryError('내부 네트워크 대상 URL은 사용할 수 없습니다.', 'SSRF_BLOCKED');
  }
  if (policy.mode !== 'allowlist' || !policy.allowedHosts.includes(host)) {
    throw new SandboxBoundaryError('networkPolicy allowlist에 없는 URL입니다.', 'NETWORK_HOST_NOT_ALLOWED');
  }
}

function validateInputValue(value: unknown, key?: string, depth = 0): void {
  if (depth > 8) throw new SandboxBoundaryError('입력 구조가 너무 깊습니다.', 'SANDBOX_INPUT_TOO_DEEP');
  if (typeof value === 'string') {
    if (key && URL_KEY_PATTERN.test(key) && /^https?:\/\//i.test(value)) {
      // URL policy is checked by validateSandboxInput with the normalized policy.
      return;
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new SandboxBoundaryError('입력 배열이 너무 큽니다.', 'SANDBOX_INPUT_TOO_LARGE');
    value.forEach((item) => validateInputValue(item, key, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  const keys = Object.keys(value);
  if (keys.length > 100) throw new SandboxBoundaryError('입력 객체가 너무 큽니다.', 'SANDBOX_INPUT_TOO_LARGE');
  for (const [childKey, childValue] of Object.entries(value)) {
    const normalizedKey = childKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      PROHIBITED_INPUT_KEYS.has(normalizedKey) ||
      normalizedKey.includes('command') ||
      normalizedKey.endsWith('script') ||
      normalizedKey.endsWith('sourcecode')
    ) {
      throw new SandboxBoundaryError('shell, script, code, command 입력은 지원하지 않습니다.', 'ARBITRARY_EXECUTION_DENIED', 403);
    }
    if (URL_KEY_PATTERN.test(childKey) && typeof childValue !== 'string') {
      throw new SandboxBoundaryError('URL 입력은 문자열이어야 합니다.', 'INVALID_NETWORK_URL');
    }
    if (PATH_KEY_PATTERN.test(childKey)) validateSafeRelativePath(childValue);
    validateInputValue(childValue, childKey, depth + 1);
  }
}

function validateSandboxInput(value: unknown, policy: SandboxNetworkPolicy): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value) ?? 'null';
  } catch {
    throw new SandboxBoundaryError('JSON으로 표현할 수 없는 입력입니다.', 'INVALID_SANDBOX_INPUT');
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_SANDBOX_INPUT_BYTES) {
    throw new SandboxBoundaryError('sandbox 입력 크기가 제한을 초과했습니다.', 'SANDBOX_INPUT_TOO_LARGE', 413);
  }
  validateInputValue(value);

  const visitUrls = (current: unknown, key?: string, depth = 0): void => {
    if (depth > 8 || current === null || current === undefined) return;
    if (typeof current === 'string') {
      if (key && URL_KEY_PATTERN.test(key)) {
        validateNetworkUrl(current, policy);
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item) => visitUrls(item, key, depth + 1));
      return;
    }
    if (!isRecord(current)) return;
    Object.entries(current).forEach(([childKey, childValue]) => visitUrls(childValue, childKey, depth + 1));
  };
  visitUrls(value);
}

export function getSandboxApprovalArguments(request: Pick<SandboxJobRequest, 'action' | 'input'>): Record<string, unknown> {
  return { action: request.action, arguments: request.input };
}

export function getSandboxToolActionHash(
  request: Pick<SandboxJobRequest, 'toolName' | 'action' | 'input'>,
): string {
  return hashValue({ toolName: request.toolName, action: request.action, arguments: request.input });
}

export function normalizeSandboxJobRequest(
  body: Record<string, unknown>,
  userId: string,
): NormalizedSandboxJobRequest {
  const toolName = typeof body.toolName === 'string' ? body.toolName.trim() : '';
  if (!toolName || !TOOL_NAME_PATTERN.test(toolName)) {
    throw new SandboxBoundaryError('toolName이 필요합니다.', 'INVALID_TOOL_NAME');
  }

  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  if (!ACTION_PATTERN.test(action)) {
    throw new SandboxBoundaryError('action은 안전한 식별자여야 합니다.', 'INVALID_SANDBOX_ACTION');
  }
  if (isSandboxExecutionProhibited(toolName, action)) {
    throw new SandboxBoundaryError(
      '임의 shell, PowerShell, Node 또는 프로세스 실행은 sandbox에서 지원하지 않습니다.',
      'ARBITRARY_EXECUTION_DENIED',
      403,
    );
  }

  const input = Object.prototype.hasOwnProperty.call(body, 'arguments') ? body.arguments : body.input ?? {};
  const networkPolicy = normalizeSandboxNetworkPolicy(body.networkPolicy);
  const riskLevel = classifyToolRisk(toolName);
  if (
    (riskLevel === 'external-transfer' || sandboxActionRequiresNetworkAllowlist(action)) &&
    networkPolicy.mode !== 'allowlist'
  ) {
    throw new SandboxBoundaryError(
      'external sandbox 작업에는 명시적인 networkPolicy allowlist가 필요합니다.',
      'NETWORK_POLICY_REQUIRED',
      403,
    );
  }
  validateSandboxInput(input, networkPolicy);
  const timeoutMs = parseBoundedInteger(
    body.timeoutMs,
    DEFAULT_SANDBOX_TIMEOUT_MS,
    MIN_SANDBOX_TIMEOUT_MS,
    MAX_SANDBOX_TIMEOUT_MS,
    'timeoutMs',
  );
  const maxOutputBytes = parseBoundedInteger(
    body.maxOutputBytes,
    DEFAULT_SANDBOX_MAX_OUTPUT_BYTES,
    MIN_SANDBOX_MAX_OUTPUT_BYTES,
    MAX_SANDBOX_MAX_OUTPUT_BYTES,
    'maxOutputBytes',
  );
  const approvalId =
    body.approvalId === undefined || body.approvalId === null || body.approvalId === ''
      ? null
      : typeof body.approvalId === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(body.approvalId)
        ? body.approvalId
        : (() => {
            throw new SandboxBoundaryError('approvalId 형식이 올바르지 않습니다.', 'INVALID_APPROVAL_ID');
          })();

  const requiresApproval = riskLevel !== 'read' || sandboxActionRequiresApproval(action);
  return {
    userId,
    approvalId,
    toolName,
    action,
    input,
    timeoutMs,
    maxOutputBytes,
    networkPolicy,
    toolActionHash: getSandboxToolActionHash({ toolName, action, input }),
    requiresApproval,
    riskLevel,
  };
}

export function checkSandboxToolApproval(
  request: NormalizedSandboxJobRequest,
  approval: ToolApprovalSnapshot | null,
): ToolAccessDecision {
  if (request.approvalId && approval?.id && request.approvalId !== approval.id) {
    throw new SandboxBoundaryError('요청한 approval과 검증된 approval이 다릅니다.', 'TOOL_APPROVAL_ID_MISMATCH', 403);
  }
  if (request.requiresApproval && !approval) {
    throw new SandboxBoundaryError(
      'write, external, shell 작업은 유효한 tool approval이 필요합니다.',
      'TOOL_APPROVAL_REQUIRED',
      403,
    );
  }
  const decision = evaluateToolAccess(request.toolName, {
    arguments: getSandboxApprovalArguments(request),
    approval,
  });
  if (!decision.allowed) {
    throw new SandboxBoundaryError(
      decision.reason || 'tool approval이 유효하지 않습니다.',
      decision.errorCode || 'TOOL_APPROVAL_REQUIRED',
      403,
    );
  }
  return decision;
}

export function isSandboxTimeoutError(error: unknown): boolean {
  return error instanceof SandboxBoundaryError
    ? error.code === 'SANDBOX_TIMEOUT'
    : error instanceof Error && (error.name === 'AbortError' || error.message === 'SANDBOX_TIMEOUT');
}
