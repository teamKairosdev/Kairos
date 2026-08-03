import {
  getProviderAvailability,
  getProviderCapabilities,
  getProviderKind,
  getProviderModel,
} from './providerConfig';
import {
  AGENT_PROVIDER_IDS,
  type AgentProviderId,
  type ProviderCapability,
} from './providers/types';

export const AGENT_TASK_TYPES = [
  'ats',
  'rewrite',
  'interview',
  'context-import',
  'summarize',
  'coding',
] as const;

export type AgentTaskType = (typeof AGENT_TASK_TYPES)[number];
export type AgentProvider = AgentProviderId;

export interface AgentRoute {
  taskType: AgentTaskType;
  route: string;
  routeKey: string;
  provider: AgentProvider;
  providerKind: 'model' | 'external-agent' | 'local';
  capability: ProviderCapability;
  model: string | null;
  fallbackUsed: boolean;
}

export interface AgentRouterInput {
  taskType: string;
  availableRoutes?: readonly string[];
  availableProviders?: readonly AgentProvider[];
  providerEnabled?: Partial<Record<AgentProvider, boolean>>;
  geminiAvailable?: boolean;
}

interface RouteDefinition {
  route: string;
  requiredCapability: ProviderCapability;
  preferredProviders: readonly AgentProvider[];
}

export const GEMINI_AGENT_MODEL = 'gemini-2.0-flash-001';
export const AGENT_ORCHESTRATION_ROUTE = '/api/agent-orchestration';

const MODEL_AND_AGENT_PROVIDERS: readonly AgentProvider[] = [
  'gemini',
  'openrouter',
  'ollama',
  'generic-openai',
  'hermes',
  'openclaw',
];

const ROUTE_DEFINITIONS: Record<AgentTaskType, RouteDefinition> = {
  // Preserve the existing deterministic ATS route unless a compatible
  // external model/agent is explicitly enabled.
  ats: {
    route: '/api/ats/analyze',
    requiredCapability: 'structured',
    preferredProviders: ['openrouter', 'ollama', 'generic-openai', 'hermes', 'openclaw'],
  },
  rewrite: {
    route: '/api/resumes/[id]/refine',
    requiredCapability: 'text',
    preferredProviders: MODEL_AND_AGENT_PROVIDERS,
  },
  interview: {
    route: '/api/interviews/[id]/chat',
    requiredCapability: 'stream',
    preferredProviders: MODEL_AND_AGENT_PROVIDERS,
  },
  'context-import': {
    route: AGENT_ORCHESTRATION_ROUTE,
    requiredCapability: 'text',
    preferredProviders: [],
  },
  summarize: {
    route: '/api/llm/chat',
    requiredCapability: 'text',
    preferredProviders: MODEL_AND_AGENT_PROVIDERS,
  },
  coding: {
    route: AGENT_ORCHESTRATION_ROUTE,
    requiredCapability: 'coding',
    preferredProviders: ['opencode'],
  },
};

function normalizeTaskType(value: string): AgentTaskType {
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'ats') return 'ats';
  if (normalized === 'rewrite') return 'rewrite';
  if (normalized === 'interview') return 'interview';
  if (normalized === 'context-import') return 'context-import';
  if (normalized === 'summarize' || normalized === 'summary') return 'summarize';
  if (normalized === 'coding' || normalized === 'code') return 'coding';
  throw new Error(`지원하지 않는 agent task type: ${value}`);
}

function resolveAvailableProviders(input: AgentRouterInput): Record<AgentProvider, boolean> {
  const configured = getProviderAvailability();
  const result = {} as Record<AgentProvider, boolean>;
  for (const provider of AGENT_PROVIDER_IDS) result[provider] = configured[provider];

  if (input.availableProviders) {
    for (const provider of AGENT_PROVIDER_IDS) result[provider] = input.availableProviders.includes(provider);
  } else if (input.geminiAvailable !== undefined) {
    result.gemini = input.geminiAvailable;
  }

  for (const [provider, enabled] of Object.entries(input.providerEnabled || {})) {
    if ((AGENT_PROVIDER_IDS as readonly string[]).includes(provider)) {
      result[provider as AgentProvider] = enabled === true;
    }
  }

  // The deterministic engine is available unless a caller supplied an
  // explicit provider list that intentionally omits it.
  if (!input.availableProviders && input.providerEnabled?.['local-deterministic'] === undefined) {
    result['local-deterministic'] = true;
  }
  return result;
}

function providerSupports(provider: AgentProvider, capability: ProviderCapability): boolean {
  if (provider === 'local-deterministic') return true;
  return getProviderCapabilities(provider).includes(capability);
}

function resolveRoute(
  taskType: AgentTaskType,
  requestedRoutes: readonly string[] | undefined,
): { route: string; fallbackUsed: boolean } {
  const preferredRoute = ROUTE_DEFINITIONS[taskType].route;
  if (!requestedRoutes) return { route: preferredRoute, fallbackUsed: false };

  if (requestedRoutes.includes(preferredRoute)) return { route: preferredRoute, fallbackUsed: false };
  if (requestedRoutes.includes(AGENT_ORCHESTRATION_ROUTE)) {
    return { route: AGENT_ORCHESTRATION_ROUTE, fallbackUsed: true };
  }
  throw new Error(`사용 가능한 route가 없습니다: ${taskType}`);
}

/** Select an enabled provider without probing or making a network request. */
export function agentRouter(input: AgentRouterInput | string, options: Omit<AgentRouterInput, 'taskType'> = {}): AgentRoute {
  const normalizedInput: AgentRouterInput = typeof input === 'string' ? { taskType: input, ...options } : input;
  const taskType = normalizeTaskType(normalizedInput.taskType);
  const definition = ROUTE_DEFINITIONS[taskType];
  const providers = resolveAvailableProviders(normalizedInput);
  const selectedRoute = resolveRoute(taskType, normalizedInput.availableRoutes);

  const selectedProvider = definition.preferredProviders.find(
    (provider) => providers[provider] && providerSupports(provider, definition.requiredCapability),
  );
  const provider: AgentProvider = selectedProvider || 'local-deterministic';

  if (!providers['local-deterministic'] && !selectedProvider) {
    throw new Error('사용 가능한 agent provider가 없습니다.');
  }

  const providerKind =
    provider === 'local-deterministic'
      ? 'local'
      : getProviderKind(provider) === 'external-agent'
        ? 'external-agent'
        : 'model';
  const model =
    provider === 'gemini'
      ? GEMINI_AGENT_MODEL
      : provider === 'local-deterministic'
        ? null
        : getProviderModel(provider);

  return {
    taskType,
    route: selectedRoute.route,
    routeKey: taskType,
    provider,
    providerKind,
    capability: definition.requiredCapability,
    model,
    fallbackUsed: selectedRoute.fallbackUsed || (provider === 'local-deterministic' && definition.preferredProviders.length > 0),
  };
}

export const selectAgentRoute = agentRouter;
export const chooseAgentRoute = agentRouter;

export function routeTask(taskType: string, options: Omit<AgentRouterInput, 'taskType'> = {}): AgentRoute {
  return agentRouter({ taskType, ...options });
}

export const getAgentRoute = agentRouter;
export default agentRouter;
