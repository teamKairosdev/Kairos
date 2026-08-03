import type { ProviderId } from './types';

export type ProviderErrorCode =
  | 'CONFIGURATION_REQUIRED'
  | 'ENDPOINT_NOT_ALLOWED'
  | 'TIMEOUT'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_ERROR'
  | 'INVALID_RESPONSE'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'UNSUPPORTED_CAPABILITY';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: ProviderErrorCode,
    public readonly providerId: ProviderId | string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderConfigurationError extends Error {
  constructor(public readonly code: 'CONFIGURATION_REQUIRED' | 'ENDPOINT_NOT_ALLOWED') {
    super(code === 'ENDPOINT_NOT_ALLOWED' ? 'Provider endpoint is not allowed.' : 'Provider configuration is required.');
    this.name = 'ProviderConfigurationError';
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.name === 'TimeoutError' || /timed? ?out|timeout/i.test(error.message);
}

export function normalizeProviderError(
  error: unknown,
  providerId: ProviderId | string,
  fallbackCode: ProviderErrorCode = 'UPSTREAM_ERROR',
): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof ProviderConfigurationError) {
    return new ProviderError(error.message, error.code, providerId, 503);
  }
  if (isTimeoutError(error)) {
    return new ProviderError('Provider request timed out.', 'TIMEOUT', providerId, 504);
  }
  return new ProviderError('Provider request failed.', fallbackCode, providerId, 502);
}

export function providerErrorForStatus(providerId: ProviderId | string, status: number): ProviderError {
  if (status === 401 || status === 403) {
    return new ProviderError('Provider authentication failed.', 'AUTHENTICATION_FAILED', providerId, 502);
  }
  if (status === 408 || status === 504) {
    return new ProviderError('Provider request timed out.', 'TIMEOUT', providerId, 504);
  }
  if (status === 429) {
    return new ProviderError('Provider rate limit reached.', 'RATE_LIMITED', providerId, 429);
  }
  if (status >= 500) {
    return new ProviderError('Provider is unavailable.', 'UPSTREAM_UNAVAILABLE', providerId, 502);
  }
  return new ProviderError('Provider request failed.', 'UPSTREAM_ERROR', providerId, 502);
}
