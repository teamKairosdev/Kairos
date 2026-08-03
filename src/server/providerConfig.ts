import {
  AGENT_PROVIDER_IDS,
  EXTERNAL_AGENT_PROVIDER_IDS,
  MODEL_PROVIDER_IDS,
  type AgentProviderId,
  type ExternalAgentProviderId,
  type ModelProviderId,
  type ProviderAuth,
  type ProviderCapability,
  type ProviderId,
  type ProviderKind,
  type ProviderLicenseMetadata,
  type ProviderLicenseReview,
} from './providers/types';
import { assertSafeProviderUrl, parseAllowedHosts } from './providers/security';

export const PROVIDER_DEFAULT_TIMEOUT_MS = 30_000;
export const PROVIDER_DEFAULT_MAX_OUTPUT_TOKENS = 4_096;
export const PROVIDER_MAX_OUTPUT_TOKENS = 32_768;

export interface ProviderRuntimeConfig {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  capabilities: readonly ProviderCapability[];
  enabled: boolean;
  model: string | null;
  license: ProviderLicenseMetadata;
  baseUrl?: string;
  auth?: ProviderAuth;
  chatPath?: string;
  healthPath?: string;
  responseFormat?: 'json-schema' | 'json-object';
  maxOutputTokens: number;
}

export interface PublicProviderConfig {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  capabilities: readonly ProviderCapability[];
  enabled: boolean;
  license: ProviderLicenseMetadata;
}

const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

function envValue(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function validSecret(value: string): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return !normalized.includes('your') && !normalized.includes('changeme') && !normalized.includes('<your');
}

function envBoolean(...keys: string[]): boolean {
  const value = envValue(...keys).toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

function maxOutputTokens(): number {
  const parsed = Number.parseInt(envValue('PROVIDER_MAX_OUTPUT_TOKENS'), 10);
  if (!Number.isFinite(parsed)) return PROVIDER_DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(PROVIDER_MAX_OUTPUT_TOKENS, Math.max(256, parsed));
}

function safeReview(value: string): ProviderLicenseReview {
  if (value === 'reviewed' || value === 'restricted') return value;
  return 'unreviewed';
}

function licenseMetadata(prefix: string, aliases: readonly string[] = []): ProviderLicenseMetadata {
  const providerKeys = [`${prefix}_PROVIDER_LICENSE`, ...aliases.map((alias) => `${alias}_PROVIDER_LICENSE`)];
  const modelKeys = [`${prefix}_MODEL_LICENSE`, ...aliases.map((alias) => `${alias}_MODEL_LICENSE`)];
  const reviewKeys = [`${prefix}_LICENSE_REVIEW`, ...aliases.map((alias) => `${alias}_LICENSE_REVIEW`)];
  return {
    provider: envValue(...providerKeys) || null,
    model: envValue(...modelKeys) || null,
    review: safeReview(envValue(...reviewKeys).toLowerCase()),
    manualReviewRequired: true,
  };
}

function privateNetworkAllowed(): boolean {
  return envBoolean('PROVIDER_ALLOW_PRIVATE_NETWORK', 'AI_PROVIDER_ALLOW_PRIVATE_NETWORK');
}

function globalAllowedHosts(): string[] {
  return parseAllowedHosts(envValue('PROVIDER_ALLOWED_HOSTS', 'AI_PROVIDER_ALLOWED_HOSTS'));
}

function genericAllowedHosts(): string[] {
  return [
    ...globalAllowedHosts(),
    ...parseAllowedHosts(envValue('GENERIC_OPENAI_ALLOWED_HOSTS')),
  ];
}

function safePublicEndpoint(value: string, allowedHosts: readonly string[], allowPrivate = false): string | undefined {
  if (!value) return undefined;
  try {
    return assertSafeProviderUrl(value, {
      allowedHosts,
      allowPrivateNetwork: allowPrivate,
      requireAllowlist: true,
    });
  } catch {
    return undefined;
  }
}

function safeLocalEndpoint(value: string): string | undefined {
  if (!value) return undefined;
  try {
    return assertSafeProviderUrl(value, {
      allowedHosts: globalAllowedHosts(),
      allowPrivateNetwork: privateNetworkAllowed(),
      localOnly: true,
    });
  } catch {
    return undefined;
  }
}

function safeRelativePath(value: string, fallback: string): string {
  const candidate = value.trim();
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('://')) return fallback;
  return candidate.slice(0, 200);
}

function baseDescriptor(
  id: ProviderId,
  name: string,
  kind: ProviderKind,
  capabilities: readonly ProviderCapability[],
  license: ProviderLicenseMetadata,
  enabled: boolean,
  model: string | null = null,
): ProviderRuntimeConfig {
  return {
    id,
    name,
    kind,
    capabilities,
    enabled,
    model,
    license,
    maxOutputTokens: maxOutputTokens(),
  };
}

function geminiConfig(): ProviderRuntimeConfig {
  const key = envValue('GOOGLE_GENERATIVE_AI_API_KEY');
  return baseDescriptor(
    'gemini',
    'Gemini',
    'model',
    ['text', 'structured', 'stream'],
    licenseMetadata('GEMINI', ['GOOGLE']),
    validSecret(key),
    envValue('GEMINI_MODEL') || 'gemini-2.0-flash-001',
  );
}

function openRouterConfig(): ProviderRuntimeConfig {
  const key = envValue('OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY');
  const configuredUrl = envValue('OPENROUTER_BASE_URL');
  const baseUrl = safePublicEndpoint(
    configuredUrl || OPENROUTER_DEFAULT_BASE_URL,
    ['openrouter.ai', ...globalAllowedHosts()],
  );
  const enabled = validSecret(key) && Boolean(baseUrl);
  return {
    ...baseDescriptor(
      'openrouter',
      'OpenRouter',
      'model',
      ['text', 'structured', 'stream'],
      licenseMetadata('OPENROUTER'),
      enabled,
      envValue('OPENROUTER_MODEL') || 'openai/gpt-4o-mini',
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    ...(enabled ? { auth: { type: 'bearer', token: key } as ProviderAuth } : {}),
    chatPath: '/chat/completions',
    healthPath: '/models',
    responseFormat: 'json-schema',
  };
}

function ollamaConfig(): ProviderRuntimeConfig {
  const configuredUrl = envValue('OLLAMA_BASE_URL', 'LLAMACPP_BASE_URL', 'LLAMA_CPP_BASE_URL');
  const isLlamaCpp = !envValue('OLLAMA_BASE_URL') && Boolean(envValue('LLAMACPP_BASE_URL', 'LLAMA_CPP_BASE_URL'));
  const baseUrl = safeLocalEndpoint(configuredUrl);
  const enabled = Boolean(baseUrl);
  return {
    ...baseDescriptor(
      'ollama',
      isLlamaCpp ? 'llama.cpp local SLM' : 'Ollama local SLM',
      'model',
      ['text', 'structured', 'stream'],
      licenseMetadata('OLLAMA', ['LLAMACPP', 'LLAMA_CPP']),
      enabled,
      envValue('OLLAMA_MODEL', 'LLAMACPP_MODEL', 'LLAMA_CPP_MODEL') || 'llama3.2',
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    auth: { type: 'none' },
    chatPath: '/chat/completions',
    healthPath: '/models',
    responseFormat: 'json-object',
  };
}

function genericOpenAiConfig(): ProviderRuntimeConfig {
  const baseUrl = safePublicEndpoint(
    envValue('GENERIC_OPENAI_BASE_URL', 'OPENAI_COMPATIBLE_BASE_URL'),
    genericAllowedHosts(),
    privateNetworkAllowed(),
  );
  const token = envValue('GENERIC_OPENAI_API_KEY', 'OPENAI_COMPATIBLE_API_KEY');
  const enabled = envBoolean('GENERIC_OPENAI_ENABLED') && Boolean(baseUrl);
  return {
    ...baseDescriptor(
      'generic-openai',
      'Generic OpenAI-compatible endpoint',
      'model',
      ['text', 'structured', 'stream'],
      licenseMetadata('GENERIC_OPENAI', ['OPENAI_COMPATIBLE']),
      enabled,
      envValue('GENERIC_OPENAI_MODEL', 'OPENAI_COMPATIBLE_MODEL') || 'default',
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    ...(enabled
      ? { auth: validSecret(token) ? ({ type: 'bearer', token } as ProviderAuth) : ({ type: 'none' } as ProviderAuth) }
      : {}),
    chatPath: '/chat/completions',
    healthPath: '/models',
    responseFormat: 'json-schema',
  };
}

function hermesConfig(): ProviderRuntimeConfig {
  const token = envValue('HERMES_API_KEY', 'HERMES_BEARER_TOKEN');
  const baseUrl = safePublicEndpoint(envValue('HERMES_BASE_URL', 'HERMES_API_BASE_URL'), globalAllowedHosts(), privateNetworkAllowed());
  const enabled = envBoolean('HERMES_ENABLED') && validSecret(token) && Boolean(baseUrl);
  return {
    ...baseDescriptor(
      'hermes',
      'Hermes Agent API Server',
      'external-agent',
      ['text', 'structured', 'stream'],
      licenseMetadata('HERMES'),
      enabled,
      envValue('HERMES_MODEL') || 'hermes',
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    ...(enabled ? { auth: { type: 'bearer', token } as ProviderAuth } : {}),
    chatPath: '/chat/completions',
    healthPath: '/models',
    responseFormat: 'json-schema',
  };
}

function openClawConfig(): ProviderRuntimeConfig {
  const token = envValue('OPENCLAW_API_KEY', 'OPENCLAW_BEARER_TOKEN', 'OPENCLAW_GATEWAY_TOKEN');
  const baseUrl = safeLocalEndpoint(envValue('OPENCLAW_BASE_URL', 'OPENCLAW_GATEWAY_URL'));
  const enabled = envBoolean('OPENCLAW_ENABLED') && validSecret(token) && Boolean(baseUrl);
  return {
    ...baseDescriptor(
      'openclaw',
      'OpenClaw Gateway',
      'external-agent',
      ['text', 'structured', 'stream'],
      licenseMetadata('OPENCLAW'),
      enabled,
      envValue('OPENCLAW_MODEL') || 'openclaw',
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    ...(enabled ? { auth: { type: 'bearer', token } as ProviderAuth } : {}),
    chatPath: safeRelativePath(envValue('OPENCLAW_CHAT_PATH'), '/v1/chat/completions'),
    healthPath: safeRelativePath(envValue('OPENCLAW_HEALTH_PATH'), '/health'),
    responseFormat: 'json-schema',
  };
}

function openCodeConfig(): ProviderRuntimeConfig {
  const baseUrl = safeLocalEndpoint(envValue('OPENCODE_BASE_URL', 'OPENCODE_SERVER_URL'));
  const bearer = envValue('OPENCODE_API_KEY', 'OPENCODE_BEARER_TOKEN');
  const username = envValue('OPENCODE_USERNAME', 'OPENCODE_BASIC_USERNAME', 'OPENCODE_SERVER_USERNAME');
  const password = envValue('OPENCODE_PASSWORD', 'OPENCODE_BASIC_PASSWORD', 'OPENCODE_SERVER_PASSWORD');
  const authMode = envValue('OPENCODE_AUTH_MODE').toLowerCase();
  const auth: ProviderAuth | undefined =
    authMode === 'basic' && username && validSecret(password)
      ? { type: 'basic', username, password }
      : validSecret(bearer)
        ? { type: 'bearer', token: bearer }
        : username && validSecret(password)
          ? { type: 'basic', username, password }
          : undefined;
  const enabled = envBoolean('OPENCODE_ENABLED') && Boolean(baseUrl) && Boolean(auth);
  return {
    ...baseDescriptor(
      'opencode',
      'OpenCode server',
      'external-agent',
      ['text', 'stream', 'coding'],
      licenseMetadata('OPENCODE'),
      enabled,
      envValue('OPENCODE_MODEL') || null,
    ),
    ...(enabled && baseUrl ? { baseUrl } : {}),
    ...(enabled && auth ? { auth } : {}),
    healthPath: '/session',
  };
}

export function getProviderRuntimeConfigs(): ProviderRuntimeConfig[] {
  const local = baseDescriptor(
    'local-deterministic',
    'Local deterministic fallback',
    'model',
    ['text', 'structured', 'stream'],
    licenseMetadata('LOCAL_DETERMINISTIC'),
    true,
  );
  return [
    local,
    geminiConfig(),
    openRouterConfig(),
    ollamaConfig(),
    genericOpenAiConfig(),
    hermesConfig(),
    openClawConfig(),
    openCodeConfig(),
  ];
}

export function getProviderRuntimeConfig(id: ProviderId): ProviderRuntimeConfig | null {
  return getProviderRuntimeConfigs().find((config) => config.id === id) || null;
}

export function getPublicProviderConfigs(): PublicProviderConfig[] {
  return getProviderRuntimeConfigs().map(({ id, name, kind, capabilities, enabled, license }) => ({
    id,
    name,
    kind,
    capabilities,
    enabled,
    license,
  }));
}

export function getProviderAvailability(): Record<AgentProviderId, boolean> {
  const availability = {} as Record<AgentProviderId, boolean>;
  for (const id of AGENT_PROVIDER_IDS) availability[id] = false;
  for (const config of getProviderRuntimeConfigs()) availability[config.id] = config.enabled;
  return availability;
}

export function getProviderCapabilities(id: ProviderId): readonly ProviderCapability[] {
  return getProviderRuntimeConfig(id)?.capabilities || [];
}

export function getProviderModel(id: ProviderId): string | null {
  return getProviderRuntimeConfig(id)?.model || null;
}

export function getProviderKind(id: ProviderId): ProviderKind | null {
  return getProviderRuntimeConfig(id)?.kind || null;
}

export function getDefaultModelProviderId(): ModelProviderId | null {
  const requested = envValue('AI_DEFAULT_MODEL_PROVIDER', 'DEFAULT_MODEL_PROVIDER') as ModelProviderId;
  if (MODEL_PROVIDER_IDS.includes(requested) && getProviderRuntimeConfig(requested)?.enabled) return requested;

  for (const id of MODEL_PROVIDER_IDS) {
    if (getProviderRuntimeConfig(id)?.enabled) return id;
  }
  return null;
}

export function isAgentProviderId(value: unknown): value is AgentProviderId {
  return typeof value === 'string' && (AGENT_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isModelProviderId(value: unknown): value is ModelProviderId {
  return typeof value === 'string' && (MODEL_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isExternalAgentProviderId(value: unknown): value is ExternalAgentProviderId {
  return typeof value === 'string' && (EXTERNAL_AGENT_PROVIDER_IDS as readonly string[]).includes(value);
}
