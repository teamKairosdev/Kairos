import {
  getDefaultModelProviderId,
  getProviderRuntimeConfig,
  getPublicProviderConfigs,
  type ProviderRuntimeConfig,
} from '../providerConfig';
import { ProviderError } from './errors';
import { HermesAgentAdapter, OpenClawGatewayAdapter, OpenCodeServerAdapter } from './externalAgents';
import { GeminiNativeAdapter } from './gemini';
import { OpenAICompatibleModelProviderAdapter, type OpenAICompatibleConfig } from './openaiCompatible';
import type {
  AgentProviderId,
  AnyProviderAdapter,
  ExternalAgentAdapter,
  ExternalAgentProviderId,
  ModelProviderAdapter,
  ModelProviderId,
  ProviderHealthResult,
  ProviderRequestOptions,
} from './types';

function runtimeConfig(id: AgentProviderId): ProviderRuntimeConfig | null {
  return getProviderRuntimeConfig(id);
}

function compatibleConfig(config: ProviderRuntimeConfig): OpenAICompatibleConfig | null {
  if (!config.baseUrl) return null;
  return {
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    auth: config.auth,
    model: config.model,
    enabled: config.enabled,
    license: config.license,
    capabilities: config.capabilities,
    maxOutputTokens: config.maxOutputTokens,
    chatPath: config.chatPath,
    healthPath: config.healthPath,
    responseFormat: config.responseFormat,
  };
}

export function getModelProviderAdapter(id?: ModelProviderId): ModelProviderAdapter | null {
  const selectedId = id || getDefaultModelProviderId();
  if (!selectedId) return null;
  if (selectedId === 'gemini') return new GeminiNativeAdapter();

  const config = runtimeConfig(selectedId);
  if (!config || !config.enabled) return null;
  const compatible = compatibleConfig(config);
  return compatible ? new OpenAICompatibleModelProviderAdapter(compatible) : null;
}

export function getExternalAgentAdapter(id: ExternalAgentProviderId): ExternalAgentAdapter | null {
  const config = runtimeConfig(id);
  if (!config || !config.enabled || !config.baseUrl || !config.auth) return null;
  if (id === 'hermes') return new HermesAgentAdapter(config);
  if (id === 'openclaw') return new OpenClawGatewayAdapter(config);
  return new OpenCodeServerAdapter(config);
}

export function getProviderAdapter(id: Exclude<AgentProviderId, 'local-deterministic'>): AnyProviderAdapter | null {
  if (id === 'gemini' || id === 'openrouter' || id === 'ollama' || id === 'generic-openai') {
    return getModelProviderAdapter(id);
  }
  return getExternalAgentAdapter(id);
}

export async function callProviderText(
  id: Exclude<AgentProviderId, 'local-deterministic'>,
  options: ProviderRequestOptions,
): Promise<string> {
  const adapter = getProviderAdapter(id);
  if (!adapter || !adapter.enabled) {
    throw new ProviderError('Provider is disabled.', 'CONFIGURATION_REQUIRED', id, 503);
  }
  return adapter.generateText(options);
}

export async function healthCheckProvider(id: AgentProviderId): Promise<ProviderHealthResult> {
  if (id === 'local-deterministic') return { status: 'not-applicable' };
  const adapter = getProviderAdapter(id);
  if (!adapter || !adapter.enabled) return { status: 'not-applicable' };
  return adapter.healthCheck();
}

export function listPublicProviders() {
  return getPublicProviderConfigs();
}

export * from './errors';
export * from './types';
