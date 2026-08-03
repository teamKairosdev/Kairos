import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DisabledSandboxBackend,
  getSandboxConfig,
  getSandboxToolActionHash,
  getWindowsSandboxConfiguration,
  normalizeSandboxJobRequest,
  normalizeSandboxNetworkPolicy,
  RemoteFirecrackerBackend,
  SandboxBoundaryError,
  SandboxControlPlane,
  type SandboxBackend,
} from '../../src/server/sandbox';

function expectBoundary(action: () => unknown, code: string) {
  try {
    action();
    throw new Error('expected sandbox boundary error');
  } catch (error) {
    expect(error).toBeInstanceOf(SandboxBoundaryError);
    expect((error as SandboxBoundaryError).code).toBe(code);
  }
}

function baseRequest(overrides: Record<string, unknown> = {}) {
  return normalizeSandboxJobRequest({
    toolName: 'text-editor',
    action: 'write',
    arguments: { path: 'notes/result.txt', content: 'safe text' },
    timeoutMs: 100,
    maxOutputBytes: 64,
    ...overrides,
  }, 'user-1');
}

function availableBackend(submit: SandboxBackend['submit']): SandboxBackend {
  return {
    kind: 'remote-firecracker',
    getStatus: () => ({
      backend: 'remote-firecracker',
      status: 'available',
      availability: 'available',
      execution: 'remote-adapter',
      code: 'SANDBOX_REMOTE_READY',
      reason: 'test backend',
    }),
    getCapabilities: () => ({
      backend: 'remote-firecracker',
      availability: 'available',
      execution: 'remote-adapter',
      canSubmit: true,
      canCancel: true,
      canReadResults: true,
      arbitraryCodeExecution: false,
      shellExecution: false,
      powershellExecution: false,
      nodeExecution: false,
      network: { defaultPolicy: 'none', allowlistOnly: true },
      supportedActions: ['structured-read'],
    }),
    submit,
    cancel: vi.fn(async () => undefined),
  };
}

describe('sandbox request boundary', () => {
  it('rejects shell-like tools, commands, scripts, and execution actions', () => {
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'text-editor;whoami',
      action: 'write',
      arguments: {},
    }, 'user-1'), 'INVALID_TOOL_NAME');
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'shell',
      action: 'write',
      arguments: {},
    }, 'user-1'), 'ARBITRARY_EXECUTION_DENIED');
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'text-editor',
      action: 'run-tests',
      arguments: {},
    }, 'user-1'), 'ARBITRARY_EXECUTION_DENIED');
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'text-editor',
      action: 'write',
      arguments: { command: 'echo safe && whoami' },
    }, 'user-1'), 'ARBITRARY_EXECUTION_DENIED');
  });

  it('rejects traversal in POSIX, Windows, and camel-case path fields', () => {
    for (const path of ['../../etc/passwd', '..\\..\\Windows\\System32', 'C:\\Windows\\System32']) {
      expectBoundary(() => normalizeSandboxJobRequest({
        toolName: 'text-editor',
        action: 'read',
        arguments: { filePath: path },
      }, 'user-1'), 'SANDBOX_PATH_TRAVERSAL');
    }
  });

  it('requires HTTPS allowlisted hosts and blocks SSRF targets', () => {
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'web-fetch',
      action: 'fetch',
      arguments: { url: 'https://127.0.0.1:3000/private' },
      networkPolicy: { mode: 'allowlist', allowedHosts: ['127.0.0.1'] },
    }, 'user-1'), 'UNSAFE_NETWORK_HOST');
    expectBoundary(() => normalizeSandboxJobRequest({
      toolName: 'web-fetch',
      action: 'fetch',
      arguments: { url: 'http://api.example.com/data' },
      networkPolicy: { mode: 'allowlist', allowedHosts: ['api.example.com'] },
    }, 'user-1'), 'UNSAFE_NETWORK_URL');

    const request = normalizeSandboxJobRequest({
      toolName: 'web-fetch',
      action: 'fetch',
      arguments: { url: 'https://api.example.com/data' },
      networkPolicy: { mode: 'allowlist', allowedHosts: ['api.example.com'] },
    }, 'user-1');
    expect(request.networkPolicy).toEqual({ mode: 'allowlist', allowedHosts: ['api.example.com'] });
  });

  it('bounds timeout and output controls and binds exact tool/action input', () => {
    expectBoundary(() => baseRequest({ timeoutMs: 0 }), 'INVALID_TIMEOUTMS');
    expectBoundary(() => baseRequest({ timeoutMs: 120_001 }), 'INVALID_TIMEOUTMS');
    expectBoundary(() => baseRequest({ maxOutputBytes: 0 }), 'INVALID_MAXOUTPUTBYTES');
    expect(getSandboxToolActionHash({
      toolName: 'text-editor',
      action: 'write',
      input: { path: 'a.txt' },
    })).not.toBe(getSandboxToolActionHash({
      toolName: 'text-editor',
      action: 'write',
      input: { path: 'b.txt' },
    }));
    expect(normalizeSandboxNetworkPolicy('none')).toEqual({ mode: 'none', allowedHosts: [] });
  });
});

describe('sandbox backend configuration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never makes a request when disabled or when Windows is config-only', async () => {
    const disabled = new DisabledSandboxBackend(getSandboxConfig({ SANDBOX_BACKEND: 'disabled' }, 'win32'));
    expect(disabled.getStatus()).toMatchObject({ availability: 'not_configured', code: 'SANDBOX_NOT_CONFIGURED' });
    await expect(disabled.submit()).rejects.toMatchObject({ code: 'SANDBOX_NOT_CONFIGURED' });

    const windows = getWindowsSandboxConfiguration({ SANDBOX_WINDOWS_NETWORK: 'Enable' }, 'win32');
    expect(windows).toMatchObject({ supportedPlatform: true, autoExecute: false, valid: true });
    expect(windows.config).toContain('<Networking>Enable</Networking>');
  });

  it('only reports remote Firecracker available on Linux with server endpoint and token', () => {
    const windowsConfig = getSandboxConfig({
      SANDBOX_BACKEND: 'remote-firecracker',
      SANDBOX_FIRECRACKER_ENDPOINT: 'https://firecracker.example.com/jobs',
      SANDBOX_FIRECRACKER_TOKEN: 'server-only-token',
    }, 'win32');
    expect(new RemoteFirecrackerBackend(windowsConfig).getStatus()).toMatchObject({
      availability: 'not_configured',
      code: 'SANDBOX_LINUX_REQUIRED',
    });

    const linuxConfig = getSandboxConfig({
      SANDBOX_BACKEND: 'remote-firecracker',
      SANDBOX_FIRECRACKER_ENDPOINT: 'https://firecracker.example.com/jobs',
      SANDBOX_FIRECRACKER_TOKEN: 'server-only-token',
    }, 'linux');
    expect(new RemoteFirecrackerBackend(linuxConfig).getStatus()).toMatchObject({
      availability: 'available',
      execution: 'remote-adapter',
    });
  });
});

describe('sandbox control-plane lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps disabled jobs explicit instead of claiming completion', async () => {
    const plane = new SandboxControlPlane(() => new DisabledSandboxBackend(getSandboxConfig({ SANDBOX_BACKEND: 'disabled' }, 'win32')));
    const request = baseRequest();
    const job = await plane.submit({ ...request, toolActionHash: request.toolActionHash });
    expect(job).toMatchObject({
      userId: 'user-1',
      approvalId: null,
      status: 'disabled',
      errorCode: 'SANDBOX_NOT_CONFIGURED',
      timeoutMs: 100,
      maxOutputBytes: 64,
      networkPolicy: { mode: 'none', allowedHosts: [] },
      resultAvailable: false,
    });
  });

  it('expires a job when the backend does not return before the timeout', async () => {
    vi.useFakeTimers();
    const plane = new SandboxControlPlane(() => availableBackend(async () => new Promise(() => undefined)));
    const request = baseRequest({ timeoutMs: 100 });
    const job = await plane.submit({ ...request, toolActionHash: request.toolActionHash });
    await vi.advanceTimersByTimeAsync(151);
    expect(plane.getJob('user-1', job.id)).toMatchObject({ status: 'expired', errorCode: 'SANDBOX_TIMEOUT' });
    plane.clear();
  });

  it('fails closed when a backend returns more output than the job limit', async () => {
    const plane = new SandboxControlPlane(() => availableBackend(async () => ({
      status: 'completed',
      output: 'too much output',
    })));
    const request = baseRequest({ maxOutputBytes: 1 });
    const job = await plane.submit({ ...request, toolActionHash: request.toolActionHash });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(plane.getJob('user-1', job.id)).toMatchObject({
      status: 'failed',
      errorCode: 'SANDBOX_OUTPUT_LIMIT_EXCEEDED',
      resultAvailable: false,
    });
    plane.clear();
  });
});
