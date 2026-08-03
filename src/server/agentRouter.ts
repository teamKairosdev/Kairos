export const AGENT_TASK_TYPES = [
  'ats',
  'rewrite',
  'interview',
  'context-import',
  'summarize',
] as const;

export type AgentTaskType = (typeof AGENT_TASK_TYPES)[number];
export type AgentProvider = 'gemini' | 'local-deterministic';

export interface AgentRoute {
  taskType: AgentTaskType;
  route: string;
  routeKey: string;
  provider: AgentProvider;
  model: string | null;
  fallbackUsed: boolean;
}

export interface AgentRouterInput {
  taskType: string;
  availableRoutes?: readonly string[];
  availableProviders?: readonly AgentProvider[];
  geminiAvailable?: boolean;
}

interface RouteDefinition {
  route: string;
  geminiCapable: boolean;
}

export const GEMINI_AGENT_MODEL = 'gemini-2.0-flash-001';
export const AGENT_ORCHESTRATION_ROUTE = '/api/agent-orchestration';

const ROUTE_DEFINITIONS: Record<AgentTaskType, RouteDefinition> = {
  ats: { route: '/api/ats/analyze', geminiCapable: false },
  rewrite: { route: '/api/resumes/[id]/refine', geminiCapable: true },
  interview: { route: '/api/interviews/[id]/chat', geminiCapable: true },
  'context-import': { route: AGENT_ORCHESTRATION_ROUTE, geminiCapable: false },
  summarize: { route: '/api/llm/chat', geminiCapable: true },
};

function normalizeTaskType(value: string): AgentTaskType {
  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'ats') return 'ats';
  if (normalized === 'rewrite') return 'rewrite';
  if (normalized === 'interview') return 'interview';
  if (normalized === 'context-import') return 'context-import';
  if (normalized === 'summarize' || normalized === 'summary') return 'summarize';
  throw new Error(`지원하지 않는 agent task type: ${value}`);
}

function isGeminiConfigured(): boolean {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '';
  return key.length > 0 && !key.toLowerCase().includes('your');
}

function resolveAvailableProviders(input: AgentRouterInput): {
  gemini: boolean;
  local: boolean;
} {
  if (input.availableProviders) {
    return {
      gemini: input.availableProviders.includes('gemini'),
      local: input.availableProviders.includes('local-deterministic'),
    };
  }

  return {
    gemini: input.geminiAvailable ?? isGeminiConfigured(),
    local: true,
  };
}

function resolveRoute(
  taskType: AgentTaskType,
  requestedRoutes: readonly string[] | undefined,
): { route: string; fallbackUsed: boolean } {
  const preferredRoute = ROUTE_DEFINITIONS[taskType].route;
  if (!requestedRoutes) return { route: preferredRoute, fallbackUsed: false };

  if (requestedRoutes.includes(preferredRoute)) {
    return { route: preferredRoute, fallbackUsed: false };
  }

  if (requestedRoutes.includes(AGENT_ORCHESTRATION_ROUTE)) {
    return { route: AGENT_ORCHESTRATION_ROUTE, fallbackUsed: true };
  }

  throw new Error(`사용 가능한 route가 없습니다: ${taskType}`);
}

/**
 * Selects one route and one of the two supported providers without probing a
 * model or making a network request.
 */
export function agentRouter(
  input: AgentRouterInput | string,
  options: Omit<AgentRouterInput, 'taskType'> = {},
): AgentRoute {
  const normalizedInput: AgentRouterInput =
    typeof input === 'string' ? { taskType: input, ...options } : input;
  const taskType = normalizeTaskType(normalizedInput.taskType);
  const definition = ROUTE_DEFINITIONS[taskType];
  const providers = resolveAvailableProviders(normalizedInput);
  const selectedRoute = resolveRoute(taskType, normalizedInput.availableRoutes);

  if (!providers.local && (!definition.geminiCapable || !providers.gemini)) {
    throw new Error('사용 가능한 agent provider가 없습니다.');
  }

  const useGemini = definition.geminiCapable && providers.gemini;
  const provider: AgentProvider = useGemini ? 'gemini' : 'local-deterministic';

  return {
    taskType,
    route: selectedRoute.route,
    routeKey: taskType,
    provider,
    model: useGemini ? GEMINI_AGENT_MODEL : null,
    fallbackUsed: selectedRoute.fallbackUsed || (definition.geminiCapable && !useGemini),
  };
}

export const selectAgentRoute = agentRouter;
export const chooseAgentRoute = agentRouter;

export function routeTask(
  taskType: string,
  options: Omit<AgentRouterInput, 'taskType'> = {},
): AgentRoute {
  return agentRouter({ taskType, ...options });
}

export const getAgentRoute = agentRouter;
export default agentRouter;
