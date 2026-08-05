'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import DiffView from './DiffView';
import MarkdownResult from './MarkdownResult';
import {
  addMockFeedback,
  addMockVersion,
  createMockWorkspaceData,
  readMockWorkspaceList,
  restoreMockVersion,
  runMockTask,
  writeMockWorkspaceList,
} from './local';
import type {
  AgentRunRecord,
  ArtifactRecord,
  ArtifactVersionRecord,
  FeedbackRecord,
  RunDetails,
  RunType,
  ToolStatusRecord,
  WorkspaceData,
  WorkspaceRecord,
} from './types';

const RUN_TYPES: Array<{ value: RunType; label: string; description: string }> = [
  { value: 'draft', label: 'Draft', description: '명령을 Markdown 초안으로 구조화' },
  { value: 'rewrite', label: 'Rewrite', description: '로컬 규칙으로 문장 형식 정리' },
  { value: 'summarize', label: 'Summarize', description: '앞부분 문장을 규칙 기반으로 요약' },
  { value: 'diff', label: 'Diff', description: '이전 내용과 새 내용 비교' },
];

const STATUS_LABELS: Record<string, string> = {
  queued: '대기',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  available: '준비됨',
  unsupported: '미지원',
  disabled: '비활성',
};

const STATUS_CLASSES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  available: 'bg-emerald-50 text-emerald-700',
  unsupported: 'bg-amber-50 text-amber-700',
  disabled: 'bg-slate-100 text-slate-500',
};

interface WorkspaceApiResponse {
  workspace: WorkspaceRecord;
  runs: AgentRunRecord[];
  artifacts: ArtifactRecord[];
  toolStatuses: ToolStatusRecord[];
}

interface ArtifactApiResponse {
  artifact: ArtifactRecord;
  versions: ArtifactVersionRecord[];
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(status: string | null | undefined): string {
  return status ? STATUS_LABELS[status] || status : '알 수 없음';
}

function statusClass(status: string | null | undefined): string {
  return STATUS_CLASSES[status || ''] || 'bg-slate-100 text-slate-600';
}

function payloadError(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error) return error;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message) return message;
    }
  }
  return fallback;
}

function toWorkspaceData(payload: WorkspaceApiResponse): WorkspaceData {
  return {
    workspace: payload.workspace,
    runs: payload.runs,
    artifacts: payload.artifacts,
    toolStatuses: payload.toolStatuses,
    artifactVersions: {},
    runEvents: {},
    feedback: [],
  };
}

export default function WorkspacePage() {
  const { state: authState } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [mockMode, setMockMode] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactDetails, setArtifactDetails] = useState<ArtifactApiResponse | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'result' | 'diff'>('result');
  const [command, setCommand] = useState('');
  const [runType, setRunType] = useState<RunType>('draft');
  const [sourceContent, setSourceContent] = useState('');
  const [targetContent, setTargetContent] = useState('');
  const [running, setRunning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState('quality');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const selectedRun = useMemo(
    () => data?.runs.find((run) => run.id === selectedRunId) || data?.runs[0] || null,
    [data?.runs, selectedRunId],
  );
  const selectedArtifact = useMemo(
    () => data?.artifacts.find((artifact) => artifact.id === selectedArtifactId) || data?.artifacts[0] || null,
    [data?.artifacts, selectedArtifactId],
  );
  const versions = useMemo(() => {
    if (artifactDetails?.versions) return artifactDetails.versions;
    if (selectedArtifact) return data?.artifactVersions[selectedArtifact.id] || [];
    return [];
  }, [artifactDetails?.versions, data?.artifactVersions, selectedArtifact]);
  const displayedVersion = useMemo(() => {
    if (selectedVersion !== null) {
      const exact = versions.find((version) => version.version === selectedVersion);
      if (exact) return exact;
    }
    return runDetails?.version || versions[0] || null;
  }, [runDetails?.version, selectedVersion, versions]);
  const previousVersion = useMemo(() => {
    if (!displayedVersion) return null;
    return versions.find((version) => version.version === displayedVersion.version - 1) || null;
  }, [displayedVersion, versions]);
  const feedbackForRun = useMemo(
    () => runDetails?.feedback || data?.feedback.filter((feedback) => feedback.runId === selectedRun?.id) || [],
    [data?.feedback, runDetails?.feedback, selectedRun?.id],
  );
  const runEvents = runDetails?.events || [];
  const diffBefore = previousVersion?.content || (selectedRun?.runType === 'diff' ? sourceContent : '');
  const diffAfter = displayedVersion?.content || '';

  useEffect(() => {
    if (!authState.loading && !authState.authenticated) router.replace('/auth/login');
  }, [authState.authenticated, authState.loading, router]);

  useEffect(() => {
    if (authState.loading || !authState.authenticated) return;
    const mode = typeof window !== 'undefined' && localStorage.getItem('is_mock_mode') === 'true';
    setMockMode(mode);
    void initialize(mode);
  }, [authState.authenticated, authState.loading]);

  useEffect(() => {
    if (displayedVersion) setEditorContent(displayedVersion.content);
  }, [displayedVersion?.id]);

  async function initialize(mode: boolean) {
    setWorkspaceLoading(true);
    setPageError(null);
    try {
      const requestedWorkspaceId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('workspace')
        : null;
      if (mode) {
        const localData = readMockWorkspaceList();
        setWorkspaces(localData.map((item) => item.workspace));
        const first = localData.find((item) => item.workspace.id === requestedWorkspaceId) || localData[0];
        if (first) await openWorkspace(first.workspace.id, true);
        return;
      }
      const response = await fetch('/api/workspaces');
      const payload = await response.json().catch(() => null) as { workspaces?: WorkspaceRecord[] } | null;
      if (!response.ok) throw new Error(payloadError(payload, '워크스페이스 목록을 불러오지 못했습니다.'));
      const nextWorkspaces = payload?.workspaces || [];
      setWorkspaces(nextWorkspaces);
      const first = nextWorkspaces.find((workspace) => workspace.id === requestedWorkspaceId) || nextWorkspaces[0];
      if (first) await openWorkspace(first.id, false);
    } catch (error: unknown) {
      setPageError(error instanceof Error ? error.message : '워크스페이스를 불러오지 못했습니다.');
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function openWorkspace(workspaceId: string, mode = mockMode) {
    setWorkspaceLoading(true);
    setPageError(null);
    updateWorkspaceUrl(workspaceId);
    try {
      let nextData: WorkspaceData;
      if (mode) {
        const localData = readMockWorkspaceList().find((item) => item.workspace.id === workspaceId);
        if (!localData) throw new Error('워크스페이스를 찾을 수 없습니다.');
        nextData = localData;
        setWorkspaces(readMockWorkspaceList().map((item) => item.workspace));
      } else {
        const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`);
        const payload = await response.json().catch(() => null) as WorkspaceApiResponse & { error?: unknown };
        if (!response.ok) throw new Error(payloadError(payload, '워크스페이스를 불러오지 못했습니다.'));
        nextData = toWorkspaceData(payload);
      }
      setData(nextData);
      setSelectedRunId(nextData.runs[0]?.id || null);
      setSelectedArtifactId(nextData.artifacts[0]?.id || null);
      setRunDetails(null);
      setArtifactDetails(null);
      setSelectedVersion(nextData.artifacts[0]?.currentVersion || null);
      if (nextData.artifacts[0]) await loadArtifactDetails(nextData.artifacts[0].id, mode, nextData);
      if (nextData.runs[0]) await loadRunDetails(nextData.runs[0].id, mode, nextData);
    } catch (error: unknown) {
      setPageError(error instanceof Error ? error.message : '워크스페이스를 불러오지 못했습니다.');
    } finally {
      setWorkspaceLoading(false);
    }
  }

  function updateWorkspaceUrl(workspaceId: string) {
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/workspace?workspace=${encodeURIComponent(workspaceId)}`);
  }

  async function loadArtifactDetails(artifactId: string, mode = mockMode, sourceData = data) {
    setSelectedArtifactId(artifactId);
    if (mode) {
      const localData = readMockWorkspaceList().find((item) => item.workspace.id === sourceData?.workspace.id) || sourceData;
      const artifact = localData?.artifacts.find((item) => item.id === artifactId);
      if (!artifact) return;
      const nextDetails = { artifact, versions: localData?.artifactVersions[artifactId] || [] };
      setArtifactDetails(nextDetails);
      setSelectedVersion(artifact.currentVersion || nextDetails.versions[0]?.version || null);
      return;
    }
    const response = await fetch(`/api/artifacts/${encodeURIComponent(artifactId)}`);
    const payload = await response.json().catch(() => null) as ArtifactApiResponse & { error?: unknown };
    if (!response.ok) throw new Error(payloadError(payload, 'Artifact를 불러오지 못했습니다.'));
    setArtifactDetails(payload);
    setSelectedVersion(payload.artifact.currentVersion || payload.versions[0]?.version || null);
    setData((current) => current ? {
      ...current,
      artifactVersions: { ...current.artifactVersions, [artifactId]: payload.versions },
    } : current);
  }

  async function loadRunDetails(runId: string, mode = mockMode, sourceData = data) {
    setSelectedRunId(runId);
    if (mode) {
      const localData = readMockWorkspaceList().find((item) => item.workspace.id === sourceData?.workspace.id) || sourceData;
      const run = localData?.runs.find((item) => item.id === runId);
      if (!run || !localData) return;
      const events = localData.runEvents[runId] || [];
      const version = Object.values(localData.artifactVersions).flat().find((item) => item.createdByRunId === runId) || null;
      const artifact = version ? localData.artifacts.find((item) => item.id === version.artifactId) || null : null;
      setRunDetails({ run, events, artifact, version, feedback: localData.feedback.filter((item) => item.runId === runId) });
      if (artifact) {
        setSelectedArtifactId(artifact.id);
        setArtifactDetails({ artifact, versions: localData.artifactVersions[artifact.id] || [] });
        setSelectedVersion(version?.version || artifact.currentVersion);
      }
      return;
    }
    const response = await fetch(`/api/agent-runs/${encodeURIComponent(runId)}`);
    const payload = await response.json().catch(() => null) as RunDetails & { error?: unknown };
    if (!response.ok) throw new Error(payloadError(payload, 'Agent run을 불러오지 못했습니다.'));
    setRunDetails(payload);
    if (payload.artifact) {
      setSelectedArtifactId(payload.artifact.id);
      await loadArtifactDetails(payload.artifact.id, false, sourceData);
    }
    if (payload.version) setSelectedVersion(payload.version.version);
  }

  async function createWorkspace() {
    const name = workspaceName.trim() || '새 에이전트 워크스페이스';
    setCreatingWorkspace(true);
    setPageError(null);
    try {
      if (mockMode) {
        const created = createMockWorkspaceData(name, `mock-workspace-${Date.now()}`);
        const localData = [...readMockWorkspaceList(), created];
        writeMockWorkspaceList(localData);
        setWorkspaceName('');
        setWorkspaces(localData.map((item) => item.workspace));
        await openWorkspace(created.workspace.id, true);
      } else {
        const response = await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const payload = await response.json().catch(() => null) as { workspace?: WorkspaceRecord; error?: unknown } | null;
        if (!response.ok || !payload?.workspace) throw new Error(payloadError(payload, '워크스페이스를 생성하지 못했습니다.'));
        setWorkspaceName('');
        setWorkspaces((current) => [payload.workspace!, ...current]);
        await openWorkspace(payload.workspace.id, false);
      }
      toast.add({ title: '워크스페이스가 생성되었습니다.', color: 'green' });
    } catch (error: unknown) {
      setPageError(error instanceof Error ? error.message : '워크스페이스를 생성하지 못했습니다.');
    } finally {
      setCreatingWorkspace(false);
    }
  }

  async function submitRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !command.trim() || running) return;
    setRunning(true);
    setSubmitError(null);
    const input = {
      runType,
      command: command.trim(),
      content: sourceContent,
      baseContent: runType === 'diff' ? sourceContent : '',
      targetContent: runType === 'diff' ? targetContent : '',
      artifactId: selectedArtifact?.id,
    };
    try {
      if (mockMode) {
        const current = readMockWorkspaceList().find((item) => item.workspace.id === data.workspace.id) || data;
        const result = runMockTask(current, input);
        const nextList = readMockWorkspaceList().map((item) => item.workspace.id === result.data.workspace.id ? result.data : item);
        writeMockWorkspaceList(nextList);
        setData(result.data);
        setWorkspaces(nextList.map((item) => item.workspace));
        setRunDetails(result.details);
        setSelectedRunId(result.details.run.id);
        setSelectedArtifactId(result.details.artifact?.id || null);
        setArtifactDetails(result.details.artifact && result.details.version ? { artifact: result.details.artifact, versions: result.data.artifactVersions[result.details.artifact.id] || [] } : null);
        setSelectedVersion(result.details.version?.version || null);
        if (result.details.error) setSubmitError(result.details.error.message);
        else toast.add({ title: '로컬 작업이 완료되었습니다.', color: 'green' });
        return;
      }
      const response = await fetch('/api/agent-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, workspaceId: data.workspace.id }),
      });
      const payload = await response.json().catch(() => null) as Partial<RunDetails> & { error?: unknown };
      if (payload.run && payload.events) {
        setRunDetails(payload as RunDetails);
        setSelectedRunId(payload.run.id);
      }
      if (!response.ok) {
        if (payload.run) {
          setData((current) => current ? { ...current, runs: [payload.run!, ...current.runs.filter((run) => run.id !== payload.run!.id)] } : current);
        }
        setSubmitError(payloadError(payload, 'Agent run을 완료하지 못했습니다.'));
        return;
      }
      if (payload.artifact && payload.version) {
        const artifact = payload.artifact;
        const version = payload.version;
        setSelectedArtifactId(artifact.id);
        setSelectedVersion(version.version);
        setData((current) => current ? {
          ...current,
          runs: payload.run ? [payload.run, ...current.runs.filter((run) => run.id !== payload.run!.id)] : current.runs,
          artifacts: [artifact, ...current.artifacts.filter((currentArtifact) => currentArtifact.id !== artifact.id)],
          artifactVersions: {
            ...current.artifactVersions,
            [artifact.id]: [version, ...(current.artifactVersions[artifact.id] || [])],
          },
        } : current);
        await loadArtifactDetails(artifact.id, false);
        toast.add({ title: '로컬 작업이 완료되었습니다.', color: 'green' });
      }
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Agent run 요청에 실패했습니다.');
    } finally {
      setRunning(false);
    }
  }

  async function restoreVersion(version: number) {
    if (!selectedArtifact) return;
    setRestoringVersion(version);
    try {
      if (mockMode) {
        const current = readMockWorkspaceList().find((item) => item.workspace.id === data?.workspace.id) || data;
        if (!current) return;
        const next = restoreMockVersion(current, selectedArtifact.id, version);
        writeMockWorkspaceList(readMockWorkspaceList().map((item) => item.workspace.id === next.workspace.id ? next : item));
        setData(next);
        setArtifactDetails({ artifact: next.artifacts.find((item) => item.id === selectedArtifact.id)!, versions: next.artifactVersions[selectedArtifact.id] || [] });
        setSelectedVersion(next.artifacts.find((item) => item.id === selectedArtifact.id)?.currentVersion || null);
      } else {
        const response = await fetch(`/api/artifacts/${encodeURIComponent(selectedArtifact.id)}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        });
        const payload = await response.json().catch(() => null) as { artifact?: ArtifactRecord; version?: ArtifactVersionRecord; error?: unknown };
        if (!response.ok || !payload.version) throw new Error(payloadError(payload, 'version을 복원하지 못했습니다.'));
        await loadArtifactDetails(selectedArtifact.id, false);
        setSelectedVersion(payload.version.version);
      }
      toast.add({ title: `${version}번 version을 새 현재 version으로 복원했습니다.`, color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'version 복원 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setRestoringVersion(null);
    }
  }

  async function saveVersion() {
    if (!selectedArtifact || !editorContent.trim() || savingVersion) return;
    setSavingVersion(true);
    try {
      if (mockMode) {
        const current = readMockWorkspaceList().find((item) => item.workspace.id === data?.workspace.id) || data;
        if (!current) return;
        const next = addMockVersion(current, selectedArtifact.id, editorContent);
        writeMockWorkspaceList(readMockWorkspaceList().map((item) => item.workspace.id === next.workspace.id ? next : item));
        const artifact = next.artifacts.find((item) => item.id === selectedArtifact.id)!;
        setData(next);
        setArtifactDetails({ artifact, versions: next.artifactVersions[artifact.id] || [] });
        setSelectedVersion(artifact.currentVersion);
      } else {
        const response = await fetch(`/api/artifacts/${encodeURIComponent(selectedArtifact.id)}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editorContent, metadata: { source: 'manual-edit' } }),
        });
        const payload = await response.json().catch(() => null) as { artifact?: ArtifactRecord; version?: ArtifactVersionRecord; error?: unknown };
        if (!response.ok || !payload.artifact || !payload.version) throw new Error(payloadError(payload, '새 version을 저장하지 못했습니다.'));
        await loadArtifactDetails(selectedArtifact.id, false);
        setSelectedVersion(payload.version.version);
      }
      toast.add({ title: '새 version을 저장했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'version 저장 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setSavingVersion(false);
    }
  }

  async function saveFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRun || savingFeedback) return;
    setSavingFeedback(true);
    try {
      if (mockMode) {
        const current = readMockWorkspaceList().find((item) => item.workspace.id === data?.workspace.id) || data;
        if (!current) return;
        const next = addMockFeedback(current, { runId: selectedRun.id, rating, feedbackType, comment: feedbackComment });
        writeMockWorkspaceList(readMockWorkspaceList().map((item) => item.workspace.id === next.workspace.id ? next : item));
        setData(next);
        setRunDetails((currentDetails) => currentDetails ? { ...currentDetails, feedback: next.feedback.filter((item) => item.runId === selectedRun.id) } : currentDetails);
      } else {
        const response = await fetch('/api/agent-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: selectedRun.id, rating, feedbackType, comment: feedbackComment }),
        });
        const payload = await response.json().catch(() => null) as { feedback?: FeedbackRecord; error?: unknown };
        if (!response.ok || !payload.feedback) throw new Error(payloadError(payload, 'Feedback을 저장하지 못했습니다.'));
        setRunDetails((currentDetails) => currentDetails ? { ...currentDetails, feedback: [payload.feedback!, ...currentDetails.feedback] } : currentDetails);
      }
      setRating(null);
      setFeedbackComment('');
      toast.add({ title: 'Feedback을 저장했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'Feedback 저장 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setSavingFeedback(false);
    }
  }

  if (authState.loading || (workspaceLoading && !data)) {
    return (
      <div className="space-y-6 py-4">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Deep Agent Canvas</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">로컬 에이전트 캔버스</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">명령을 안전한 로컬 텍스트 작업으로 실행하고 결과와 version을 한 화면에서 관리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700">로컬 전용 MVP</span>
          {mockMode && <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">Mock 모드</span>}
        </div>
      </header>

      {(pageError || authState.error) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">
          <span>{pageError || authState.error}</span>
          <button onClick={() => void initialize(mockMode)} className="font-semibold underline">다시 불러오기</button>
        </div>
      )}

      {!data ? (
        <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-slate-800">첫 workspace 만들기</h2>
            <p className="mt-1 text-xs text-slate-500">workspace별 실행, artifact, version, feedback이 분리됩니다.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void createWorkspace(); }}
              placeholder="예: 이직 준비 Canvas"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button onClick={() => void createWorkspace()} disabled={creatingWorkspace} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
              {creatingWorkspace && <Spinner className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              workspace 만들기
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Workspaces</h2>
                <span className="text-[10px] text-slate-500">{workspaces.length}개</span>
              </div>
              <div className="space-y-1.5">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => void openWorkspace(workspace.id, mockMode)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${data.workspace.id === workspace.id ? 'border-blue-400/50 bg-blue-500/20 text-white' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
                  >
                    <span className="block truncate text-xs font-semibold">{workspace.name}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">{formatDate(workspace.updatedAt)}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 border-t border-slate-800 pt-3">
                <label htmlFor="workspace-name" className="mb-1.5 block text-[10px] font-semibold text-slate-500">새 workspace</label>
                <div className="flex gap-1.5">
                  <input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="이름" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-blue-400" />
                  <button onClick={() => void createWorkspace()} disabled={creatingWorkspace} className="rounded-lg bg-blue-600 px-2.5 text-[11px] font-bold text-white hover:bg-blue-500 disabled:opacity-50">추가</button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700">Tool status</h2>
                <span className="text-[10px] text-slate-400">MVP 정책</span>
              </div>
              <div className="space-y-2.5">
                {data.toolStatuses.map((tool) => (
                  <div key={tool.toolName} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] font-semibold text-slate-700">{tool.toolName}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{typeof tool.metadata.description === 'string' ? tool.metadata.description : '상태 정보'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(tool.status)}`}>{statusLabel(tool.status)}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Current workspace</p>
                  <h2 className="mt-1 truncate text-lg font-black text-slate-900">{data.workspace.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{data.workspace.description || '로컬 텍스트 작업을 위한 개인 workspace'}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right text-[10px] leading-4 text-amber-800">
                  외부 실행 없음
                  <br />웹페치, 쉘, VM 미지원
                </div>
              </div>

              <form onSubmit={submitRun} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="run-type" className="mb-1.5 block text-[11px] font-bold text-slate-500">작업 유형</label>
                    <select id="run-type" value={runType} onChange={(event) => setRunType(event.target.value as RunType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      {RUN_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-400">{RUN_TYPES.find((type) => type.value === runType)?.description}</p>
                  </div>
                  <div>
                    <label htmlFor="agent-command" className="mb-1.5 block text-[11px] font-bold text-slate-500">사용자 명령</label>
                    <textarea id="agent-command" value={command} onChange={(event) => setCommand(event.target.value)} rows={3} placeholder="예: 프로젝트 경험을 간결한 Markdown 초안으로 정리해줘" className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="source-content" className="mb-1.5 block text-[11px] font-bold text-slate-500">입력 내용 {runType === 'draft' ? '(선택)' : ''}</label>
                    <textarea id="source-content" value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} rows={runType === 'diff' ? 6 : 5} placeholder={runType === 'diff' ? '이전 version 또는 기준 내용을 입력하세요' : '작업할 Markdown 또는 텍스트를 입력하세요'} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  {runType === 'diff' ? (
                    <div>
                      <label htmlFor="target-content" className="mb-1.5 block text-[11px] font-bold text-slate-500">새 내용</label>
                      <textarea id="target-content" value={targetContent} onChange={(event) => setTargetContent(event.target.value)} rows={6} placeholder="비교할 새 Markdown 또는 텍스트를 입력하세요" className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                  ) : (
                    <div className="hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 md:block">
                      <p className="font-semibold text-slate-700">실행 안전 범위</p>
                      <p className="mt-2 leading-5">입력 텍스트만 메모리에서 변환합니다. 파일 시스템, 쉘, VM, 외부 API, 웹사이트에는 접근하지 않습니다.</p>
                    </div>
                  )}
                </div>

                {submitError && <div className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700" role="alert">{submitError}</div>}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] text-slate-400">실행 결과는 개인 소유 artifact와 version으로 저장됩니다.</p>
                  <button type="submit" disabled={running || !command.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                    {running && <Spinner className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {running ? '실행 중' : 'Run 실행'}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">실행 상태</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">run event가 순서대로 저장됩니다.</p>
                </div>
                {selectedRun && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(selectedRun.status)}`}>{statusLabel(selectedRun.status)}</span>}
              </div>
              {data.runs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-xs text-slate-400">아직 실행한 작업이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {data.runs.slice(0, 12).map((run) => (
                      <button key={run.id} onClick={() => void loadRunDetails(run.id, mockMode)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${selectedRun?.id === run.id ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700">{run.runType}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(run.status)}`}>{statusLabel(run.status)}</span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-500">{typeof run.metadata.command === 'string' ? run.metadata.command : '명령 기록 없음'}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{formatDate(run.createdAt)}</p>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    {selectedRun ? (
                      <>
                        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <span className="font-mono text-[10px] text-slate-400">{selectedRun.id}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(selectedRun.completedAt || selectedRun.createdAt)}</span>
                        </div>
                        <div className="space-y-2">
                          {runEvents.length ? runEvents.map((runEvent) => (
                            <div key={runEvent.id} className="flex items-start gap-2 text-xs">
                              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${runEvent.status === 'failed' ? 'bg-red-500' : runEvent.status === 'completed' ? 'bg-emerald-500' : runEvent.status === 'running' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                                  <span className="font-semibold text-slate-700">{runEvent.eventType}</span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusClass(runEvent.status)}`}>{statusLabel(runEvent.status)}</span>
                                </div>
                                {runEvent.toolName && <p className="mt-0.5 font-mono text-[10px] text-slate-400">tool: {runEvent.toolName}</p>}
                              </div>
                            </div>
                          )) : <p className="text-xs text-slate-400">이 run의 event를 불러오는 중입니다.</p>}
                        </div>
                        {runDetails?.error && <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-700">{runDetails.error.message}</p>}
                      </>
                    ) : <p className="py-8 text-center text-xs text-slate-400">run을 선택하면 event timeline이 표시됩니다.</p>}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Artifact result</p>
                  <h2 className="mt-1 text-sm font-bold text-slate-800">{selectedArtifact?.name || '아직 결과가 없습니다'}</h2>
                </div>
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  <button onClick={() => setViewMode('result')} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${viewMode === 'result' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>결과</button>
                  <button onClick={() => setViewMode('diff')} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${viewMode === 'diff' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Diff</button>
                </div>
              </div>
              {displayedVersion ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-mono text-slate-500">version {displayedVersion.version}</span>
                    <span className="text-slate-400">{formatDate(displayedVersion.createdAt)}</span>
                  </div>
                  {viewMode === 'result' ? <MarkdownResult content={displayedVersion.content} /> : <DiffView before={diffBefore} after={diffAfter} />}
                  <div className="border-t border-slate-100 pt-4">
                    <label htmlFor="artifact-editor" className="mb-1.5 block text-[11px] font-bold text-slate-500">직접 편집 후 새 version 저장</label>
                    <textarea id="artifact-editor" value={editorContent} onChange={(event) => setEditorContent(event.target.value)} rows={6} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => void saveVersion()} disabled={savingVersion || !editorContent.trim()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        {savingVersion && <Spinner className="h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />}
                        새 version 저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400">Run을 실행하면 Markdown 결과와 Diff가 여기에 표시됩니다.</div>
              )}
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Version history</h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">복원은 새 version을 만듭니다.</p>
                </div>
                {selectedArtifact && <span className="font-mono text-[10px] text-slate-400">v{selectedArtifact.currentVersion}</span>}
              </div>
              {data.artifacts.length > 1 && (
                <div className="mb-3 space-y-1.5 border-b border-slate-100 pb-3">
                  {data.artifacts.map((artifact) => <button key={artifact.id} onClick={() => void loadArtifactDetails(artifact.id, mockMode)} className={`block w-full truncate rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold ${selectedArtifact?.id === artifact.id ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>{artifact.name}</button>)}
                </div>
              )}
              {versions.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">저장된 version이 없습니다.</p> : (
                <div className="space-y-1.5">
                  {versions.map((version) => (
                    <div key={version.id} className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 ${displayedVersion?.id === version.id ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100'}`}>
                      <button onClick={() => { setSelectedVersion(version.version); setViewMode('result'); }} className="min-w-0 flex-1 text-left">
                        <span className="block text-xs font-bold text-slate-700">version {version.version}{selectedArtifact?.currentVersion === version.version ? ' · current' : ''}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">{formatDate(version.createdAt)}</span>
                      </button>
                      {selectedArtifact?.currentVersion !== version.version && <button onClick={() => void restoreVersion(version.version)} disabled={restoringVersion !== null} className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-40">{restoringVersion === version.version ? '복원 중' : '복원'}</button>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-800">Run feedback</h2>
                <p className="mt-0.5 text-[10px] text-slate-400">선택한 run에 대한 rating과 comment를 저장합니다.</p>
              </div>
              {selectedRun ? (
                <>
                  <form onSubmit={saveFeedback} className="space-y-3">
                    <div>
                      <span className="mb-1.5 block text-[11px] font-bold text-slate-500">Rating</span>
                      <div className="flex gap-1.5" role="radiogroup" aria-label="실행 rating">
                        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-pressed={rating === value} className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${rating === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}>{value}</button>)}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="feedback-type" className="mb-1.5 block text-[11px] font-bold text-slate-500">Type</label>
                      <select id="feedback-type" value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500">
                        <option value="quality">결과 품질</option>
                        <option value="accuracy">정확성</option>
                        <option value="usability">사용성</option>
                        <option value="other">기타</option>
                      </select>
                    </div>
                    <textarea value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} rows={3} placeholder="다음 실행에 반영할 의견" className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    <button type="submit" disabled={savingFeedback || (rating === null && !feedbackComment.trim())} className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40">{savingFeedback ? '저장 중' : 'Feedback 저장'}</button>
                  </form>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {feedbackForRun.length === 0 ? <p className="text-[11px] text-slate-400">아직 남긴 feedback이 없습니다.</p> : feedbackForRun.slice(0, 5).map((feedback) => (
                      <div key={feedback.id} className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                        <div className="flex justify-between gap-2 font-semibold"><span>{feedback.feedbackType}{feedback.rating ? ` · ${feedback.rating}/5` : ''}</span><span className="font-normal text-slate-400">{formatDate(feedback.createdAt)}</span></div>
                        {feedback.comment && <p className="mt-1 leading-4">{feedback.comment}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">Feedback을 남길 run을 선택하세요.</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
