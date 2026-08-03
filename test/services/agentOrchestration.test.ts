import { describe, expect, it } from 'vitest';
import { agentRouter } from '../../src/server/agentRouter';
import {
  classifyToolRisk,
  evaluateToolAccess,
  hashValue,
  runIndependentSubtasks,
} from '../../src/server/harness';

describe('agentRouter', () => {
  it('selects deterministic routes for all supported task types', () => {
    expect(agentRouter({ taskType: 'ATS', geminiAvailable: true })).toMatchObject({
      taskType: 'ats',
      route: '/api/ats/analyze',
      provider: 'local-deterministic',
    });
    expect(agentRouter({ taskType: 'rewrite', geminiAvailable: true })).toMatchObject({
      taskType: 'rewrite',
      route: '/api/resumes/[id]/refine',
      provider: 'gemini',
    });
    expect(agentRouter({ taskType: 'interview', geminiAvailable: false })).toMatchObject({
      taskType: 'interview',
      provider: 'local-deterministic',
    });
    expect(agentRouter({ taskType: 'context-import' })).toMatchObject({
      taskType: 'context-import',
      route: '/api/agent-orchestration',
      provider: 'local-deterministic',
    });
    expect(agentRouter({ taskType: 'summarize', geminiAvailable: false })).toMatchObject({
      taskType: 'summarize',
      provider: 'local-deterministic',
    });
  });

  it('uses the orchestration route as a deterministic route fallback', () => {
    expect(
      agentRouter({
        taskType: 'rewrite',
        availableRoutes: ['/api/agent-orchestration'],
        geminiAvailable: false,
      }),
    ).toMatchObject({
      route: '/api/agent-orchestration',
      fallbackUsed: true,
    });
  });
});

describe('tool harness', () => {
  it('classifies read, write, and external transfer tools', () => {
    expect(classifyToolRisk('read_file')).toBe('read');
    expect(classifyToolRisk('write_file')).toBe('write');
    expect(classifyToolRisk('send_email')).toBe('external-transfer');
    expect(classifyToolRisk('unknown_tool')).toBe('write');
  });

  it('automatically allows read and gates risky tools on approval', () => {
    expect(evaluateToolAccess('read_file').allowed).toBe(true);
    expect(evaluateToolAccess('write_file')).toMatchObject({
      allowed: false,
      requiresApproval: true,
      errorCode: 'TOOL_APPROVAL_REQUIRED',
    });

    const args = { path: 'resume.txt' };
    expect(
      evaluateToolAccess('write_file', {
        arguments: args,
        approval: {
          toolName: 'write_file',
          argumentsHash: hashValue(args),
          status: 'approved',
        },
      }).allowed,
    ).toBe(true);
    expect(
      evaluateToolAccess('write_file', {
        arguments: { path: 'other.txt' },
        approval: {
          toolName: 'write_file',
          argumentsHash: hashValue(args),
          status: 'approved',
        },
      }),
    ).toMatchObject({ allowed: false, errorCode: 'TOOL_APPROVAL_ARGUMENT_MISMATCH' });
  });
});

describe('independent subtasks', () => {
  it('keeps a failed subtask separate and records independent hashes', async () => {
    const statusEvents: string[] = [];
    const results = await runIndependentSubtasks([
      {
        taskKey: 'successful-task',
        agentRole: 'reader',
        input: { value: 1 },
        execute: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { value: input.value + 1 };
        },
      },
      {
        taskKey: 'failed-task',
        agentRole: 'writer',
        input: { value: 2 },
        execute: () => {
          throw new Error('EXPECTED_FAILURE');
        },
      },
    ], {
      onStatusChange: (record) => {
        statusEvents.push(`${record.taskKey}:${record.status}`);
      },
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      taskKey: 'successful-task',
      status: 'succeeded',
      inputHash: hashValue({ value: 1 }),
      outputHash: hashValue({ value: 2 }),
      result: { value: 2 },
    });
    expect(results[1]).toMatchObject({
      taskKey: 'failed-task',
      status: 'failed',
      inputHash: hashValue({ value: 2 }),
      errorCode: 'EXPECTED_FAILURE',
    });
    expect(results[1].outputHash).toBeUndefined();
    expect(statusEvents).toEqual([
      'successful-task:running',
      'failed-task:running',
      'failed-task:failed',
      'successful-task:succeeded',
    ]);
  });
});
