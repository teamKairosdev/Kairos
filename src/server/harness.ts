import { createHash } from 'node:crypto';

export type ToolRiskLevel = 'read' | 'write' | 'external-transfer';
export type SubtaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ToolApprovalSnapshot {
  id?: string;
  toolName: string;
  argumentsHash?: string | null;
  riskLevel?: ToolRiskLevel | string;
  status: string;
  expiresAt?: Date | string | null;
}

export interface ToolAccessDecision {
  toolName: string;
  riskLevel: ToolRiskLevel;
  allowed: boolean;
  automatic: boolean;
  requiresApproval: boolean;
  errorCode?: string;
  reason?: string;
}

export interface IndependentSubtask<TInput, TOutput> {
  taskKey: string;
  agentRole?: string;
  input: TInput;
  execute?: (input: TInput) => Promise<TOutput> | TOutput;
}

export interface SubtaskStatusRecord<TOutput> {
  taskKey: string;
  agentRole: string;
  status: SubtaskStatus;
  inputHash: string;
  outputHash?: string;
  result?: TOutput;
  errorCode?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface RunIndependentSubtasksOptions<TOutput> {
  onStatusChange?: (
    record: SubtaskStatusRecord<TOutput>,
  ) => void | Promise<void>;
}

const EXTERNAL_TRANSFER_PATTERNS = [
  'send',
  'email',
  'export',
  'publish',
  'upload',
  'webhook',
  'transfer',
  'share',
  'sync',
  'connector',
  'post',
  'external',
  'http',
  'request',
];

const WRITE_PATTERNS = [
  'write',
  'create',
  'update',
  'delete',
  'remove',
  'insert',
  'save',
  'edit',
  'append',
  'replace',
  'move',
  'copy',
  'patch',
  'put',
];

const READ_PATTERNS = [
  'read',
  'get',
  'list',
  'search',
  'query',
  'fetch',
  'inspect',
  'lookup',
  'describe',
];

const PROHIBITED_EXECUTION_PATTERNS = [
  'shell',
  'command',
  'exec',
  'terminal',
  'process',
  'spawn',
  'sandbox',
  'kernel',
];

function normalizedToolName(toolName: string): string {
  return toolName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function includesPattern(value: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

export function classifyToolRisk(toolName: string): ToolRiskLevel {
  const normalized = normalizedToolName(toolName);
  if (includesPattern(normalized, EXTERNAL_TRANSFER_PATTERNS)) {
    return 'external-transfer';
  }
  if (includesPattern(normalized, WRITE_PATTERNS)) return 'write';
  if (includesPattern(normalized, READ_PATTERNS)) return 'read';

  // Unknown tools fail closed instead of receiving automatic read access.
  return 'write';
}

export function isToolExecutionProhibited(toolName: string): boolean {
  return includesPattern(normalizedToolName(toolName), PROHIBITED_EXECUTION_PATTERNS);
}

function isExpired(expiresAt: Date | string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const timestamp = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
}

export function evaluateToolAccess(
  toolName: string,
  options: {
    arguments?: unknown;
    approval?: ToolApprovalSnapshot | null;
    now?: Date;
  } = {},
): ToolAccessDecision {
  const riskLevel = classifyToolRisk(toolName);

  if (isToolExecutionProhibited(toolName)) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: false,
      errorCode: 'TOOL_EXECUTION_NOT_SUPPORTED',
      reason: '이 MVP에서 실행형 도구는 지원하지 않습니다.',
    };
  }

  if (riskLevel === 'read') {
    return {
      toolName,
      riskLevel,
      allowed: true,
      automatic: true,
      requiresApproval: false,
    };
  }

  const approval = options.approval;
  if (!approval) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_REQUIRED',
      reason: 'write 또는 external-transfer 도구는 사용자 승인이 필요합니다.',
    };
  }

  if (approval.status !== 'approved') {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: approval.status === 'rejected' ? 'TOOL_APPROVAL_REJECTED' : 'TOOL_APPROVAL_PENDING',
      reason: '유효한 tool approval이 없습니다.',
    };
  }

  if (approval.riskLevel && approval.riskLevel !== riskLevel) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_RISK_MISMATCH',
      reason: '승인된 도구 위험 등급과 요청 위험 등급이 다릅니다.',
    };
  }

  const expectedArgumentsHash = hashValue(options.arguments ?? null);
  if (
    expectedArgumentsHash &&
    approval.argumentsHash &&
    expectedArgumentsHash !== approval.argumentsHash
  ) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_ARGUMENT_MISMATCH',
      reason: '승인된 도구 인자와 요청 인자가 다릅니다.',
    };
  }

  if (isExpired(approval.expiresAt, options.now ?? new Date())) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_EXPIRED',
      reason: 'tool approval이 만료되었습니다.',
    };
  }

  if (approval.toolName !== toolName) {
    return {
      toolName,
      riskLevel,
      allowed: false,
      automatic: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_TOOL_MISMATCH',
      reason: '승인된 도구와 요청 도구가 다릅니다.',
    };
  }

  return {
    toolName,
    riskLevel,
    allowed: true,
    automatic: false,
    requiresApproval: false,
  };
}

export const checkToolAccess = evaluateToolAccess;

function stableValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'undefined') return '[undefined]';
    if (typeof value === 'number' && Number.isNaN(value)) return '[NaN]';
    return value;
  }

  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => stableValue(item, seen));

  const objectValue = value as Record<string, unknown>;
  return Object.keys(objectValue)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue(objectValue[key], seen);
      return result;
    }, {});
}

export function hashValue(value: unknown): string {
  const canonical = JSON.stringify(stableValue(value, new WeakSet<object>())) ?? 'undefined';
  return createHash('sha256').update(canonical).digest('hex');
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.slice(0, 100);
  }
  return 'SUBTASK_FAILED';
}

async function notify<TOutput>(
  callback: RunIndependentSubtasksOptions<TOutput>['onStatusChange'],
  record: SubtaskStatusRecord<TOutput>,
): Promise<void> {
  if (callback) await callback(record);
}

/**
 * Runs independent computations concurrently. A task failure is converted to
 * a failed record so it cannot reject or cancel the other tasks.
 */
export async function runIndependentSubtasks<TInput, TOutput>(
  tasks: readonly IndependentSubtask<TInput, TOutput>[],
  options: RunIndependentSubtasksOptions<TOutput> = {},
): Promise<SubtaskStatusRecord<TOutput>[]> {
  return Promise.all(
    tasks.map(async (task): Promise<SubtaskStatusRecord<TOutput>> => {
      const agentRole = task.agentRole || task.taskKey;
      const inputHash = hashValue(task.input);
      const startedAt = new Date();
      const runningRecord: SubtaskStatusRecord<TOutput> = {
        taskKey: task.taskKey,
        agentRole,
        status: 'running',
        inputHash,
        startedAt,
      };

      await notify(options.onStatusChange, runningRecord);

      try {
        if (!task.execute) throw new Error('SUBTASK_EXECUTOR_MISSING');
        const result = await task.execute(task.input);
        const completedAt = new Date();
        const succeededRecord: SubtaskStatusRecord<TOutput> = {
          ...runningRecord,
          status: 'succeeded',
          outputHash: hashValue(result),
          result,
          completedAt,
        };
        await notify(options.onStatusChange, succeededRecord);
        return succeededRecord;
      } catch (error) {
        const completedAt = new Date();
        const failedRecord: SubtaskStatusRecord<TOutput> = {
          ...runningRecord,
          status: 'failed',
          errorCode: errorCode(error),
          completedAt,
        };
        await notify(options.onStatusChange, failedRecord);
        return failedRecord;
      }
    }),
  );
}

export const executeIndependentSubtasks = runIndependentSubtasks;
