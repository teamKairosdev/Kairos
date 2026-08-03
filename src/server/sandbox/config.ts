import { validateRemoteEndpoint } from './security';
import { SANDBOX_BACKEND_KINDS, type SandboxBackendKind } from './types';

export interface WindowsSandboxConfiguration {
  supportedPlatform: boolean;
  autoExecute: false;
  memoryInMb: number;
  cpus: number;
  networking: 'Enable' | 'Disable';
  vgpu: 'Enable' | 'Disable';
  config: string;
  valid: boolean;
  validationErrors: string[];
}

export interface SandboxConfig {
  backend: SandboxBackendKind;
  platform: NodeJS.Platform;
  configurationError: string | null;
  remoteFirecracker: {
    endpoint: string | null;
    token: string | null;
    configured: boolean;
    validationError: string | null;
  };
  windowsSandbox: WindowsSandboxConfiguration;
}

function parseBoundedEnvInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): { value: number; error: string | null } {
  if (!value || !value.trim()) return { value: fallback, error: null };
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return { value: fallback, error: `must be an integer between ${minimum} and ${maximum}` };
  }
  return { value: parsed, error: null };
}

function xmlEscape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function getWindowsSandboxConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): WindowsSandboxConfiguration {
  const memory = parseBoundedEnvInt(env.SANDBOX_WINDOWS_MEMORY_MB, 2048, 512, 16_384);
  const cpus = parseBoundedEnvInt(env.SANDBOX_WINDOWS_CPUS, 2, 1, 32);
  const networking = env.SANDBOX_WINDOWS_NETWORK === 'Enable' ? 'Enable' : 'Disable';
  const vgpu = env.SANDBOX_WINDOWS_VGPU === 'Enable' ? 'Enable' : 'Disable';
  const validationErrors = [
    memory.error ? `SANDBOX_WINDOWS_MEMORY_MB ${memory.error}` : null,
    cpus.error ? `SANDBOX_WINDOWS_CPUS ${cpus.error}` : null,
  ].filter((error): error is string => Boolean(error));

  const config = [
    '<Configuration>',
    `  <VGpu>${xmlEscape(vgpu)}</VGpu>`,
    `  <Networking>${xmlEscape(networking)}</Networking>`,
    `  <MemoryInMB>${memory.value}</MemoryInMB>`,
    '</Configuration>',
  ].join('\n');

  return {
    supportedPlatform: platform === 'win32',
    autoExecute: false,
    memoryInMb: memory.value,
    cpus: cpus.value,
    networking,
    vgpu,
    config,
    valid: validationErrors.length === 0,
    validationErrors,
  };
}

export function getSandboxConfig(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): SandboxConfig {
  const rawBackend = (env.SANDBOX_BACKEND || 'disabled').trim().toLowerCase();
  const backend = (SANDBOX_BACKEND_KINDS as readonly string[]).includes(rawBackend)
    ? (rawBackend as SandboxBackendKind)
    : 'disabled';
  const configurationError = rawBackend && backend === 'disabled' && rawBackend !== 'disabled'
    ? 'unsupported_backend'
    : null;

  const endpoint = env.SANDBOX_FIRECRACKER_ENDPOINT?.trim() || null;
  const token = env.SANDBOX_FIRECRACKER_TOKEN?.trim() || null;
  const endpointValidation = endpoint ? validateRemoteEndpoint(endpoint) : { valid: false as const, reason: 'endpoint_missing' };
  const validationError = endpointValidation.valid ? null : endpointValidation.reason;
  const remoteConfigured =
    backend === 'remote-firecracker' &&
    platform === 'linux' &&
    endpointValidation.valid &&
    Boolean(token);

  return {
    backend,
    platform,
    configurationError,
    remoteFirecracker: {
      endpoint: endpointValidation.valid ? endpointValidation.url : endpoint,
      token,
      configured: remoteConfigured,
      validationError: !token && endpoint ? 'token_missing' : validationError,
    },
    windowsSandbox: getWindowsSandboxConfiguration(env, platform),
  };
}
