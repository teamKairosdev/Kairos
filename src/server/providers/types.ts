import type { ZodType } from 'zod';

export const MODEL_PROVIDER_IDS = ['gemini', 'openrouter', 'ollama', 'generic-openai'] as const;
export const EXTERNAL_AGENT_PROVIDER_IDS = ['hermes', 'openclaw', 'opencode'] as const;
export const AGENT_PROVIDER_IDS = [
  'local-deterministic',
  ...MODEL_PROVIDER_IDS,
  ...EXTERNAL_AGENT_PROVIDER_IDS,
] as const;

export type ModelProviderId = (typeof MODEL_PROVIDER_IDS)[number];
export type ExternalAgentProviderId = (typeof EXTERNAL_AGENT_PROVIDER_IDS)[number];
export type AgentProviderId = (typeof AGENT_PROVIDER_IDS)[number];
export type ProviderId = AgentProviderId;
export type ProviderKind = 'model' | 'external-agent';

export const PROVIDER_CAPABILITIES = ['text', 'structured', 'stream', 'coding'] as const;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export type ProviderLicenseReview = 'unreviewed' | 'reviewed' | 'restricted';

/** Metadata is descriptive only. It is not a license approval decision. */
export interface ProviderLicenseMetadata {
  provider: string | null;
  model: string | null;
  review: ProviderLicenseReview;
  manualReviewRequired: true;
}

export type ProviderAuth =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; token: string }
  | { type: 'basic'; username: string; password: string };

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderRequestOptions {
  instructions?: string;
  prompt?: string;
  temperature?: number;
  model?: string;
  messages?: ProviderMessage[];
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface StructuredProviderRequest<T> extends ProviderRequestOptions {
  schema: ZodType<T>;
}

export type ProviderHealthStatus = 'healthy' | 'unhealthy' | 'not-applicable';

export interface ProviderHealthResult {
  status: ProviderHealthStatus;
  errorCode?: string;
}

export interface ModelProviderAdapter {
  readonly id: ModelProviderId;
  readonly kind: 'model';
  readonly name: string;
  readonly capabilities: readonly ProviderCapability[];
  readonly enabled: boolean;
  readonly license: ProviderLicenseMetadata;
  getDefaultModel(requestedModel?: string): Promise<string>;
  generateText(options: ProviderRequestOptions): Promise<string>;
  generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T>;
  streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>>;
  healthCheck(): Promise<ProviderHealthResult>;
}

export interface ExternalAgentAdapter {
  readonly id: ExternalAgentProviderId;
  readonly kind: 'external-agent';
  readonly name: string;
  readonly capabilities: readonly ProviderCapability[];
  readonly enabled: boolean;
  readonly license: ProviderLicenseMetadata;
  getDefaultModel(requestedModel?: string): Promise<string>;
  generateText(options: ProviderRequestOptions): Promise<string>;
  generateStructured<T>(options: StructuredProviderRequest<T>): Promise<T>;
  streamText(options: ProviderRequestOptions): Promise<ReadableStream<Uint8Array>>;
  healthCheck(): Promise<ProviderHealthResult>;
}

export type AnyProviderAdapter = ModelProviderAdapter | ExternalAgentAdapter;
