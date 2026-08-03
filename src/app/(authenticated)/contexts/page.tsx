'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';

type ProviderType = 'notion' | 'github' | 'worknet' | 'dart' | 'employment24' | 'qnet';
type ConnectionMode = 'official_api' | 'file_import';
type ProviderStatus = 'not_connected' | 'ready' | 'import_only' | 'paused' | 'error';

interface ContextProvider {
  id: string;
  providerType: ProviderType;
  displayName: string | null;
  connectionMode: ConnectionMode;
  status: ProviderStatus;
  connectionState: string;
  officialApi: string | null;
  officialApiConfigured: boolean;
  consentScope: string[];
  consentGranted: boolean;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContextItem {
  id: string;
  providerId: string;
  providerType: ProviderType;
  providerDisplayName: string | null;
  itemType: string;
  title: string | null;
  content: string;
  contentHash: string;
  sourceReferenceHash: string | null;
  occurredAt: string | null;
  importedAt: string;
  updatedAt: string;
}

interface ExportJob {
  id: string;
  status: string;
  format: string;
  itemCount: number;
  completedAt: string | null;
}

const PROVIDERS: Array<{ type: ProviderType; label: string; api: string }> = [
  { type: 'notion', label: 'Notion', api: 'Notion API' },
  { type: 'github', label: 'GitHub', api: 'GitHub REST API' },
  { type: 'worknet', label: '워크넷', api: '워크넷 Open API' },
  { type: 'dart', label: 'DART', api: 'OpenDART API' },
  { type: 'employment24', label: '고용24', api: '고용24 Open API' },
  { type: 'qnet', label: '큐넷', api: '한국산업인력공단 큐넷 Open API' },
];

const PUBLIC_PROVIDER_TYPES: ProviderType[] = ['worknet', 'employment24', 'qnet', 'dart'];

const STATUS_LABELS: Record<ProviderStatus, string> = {
  not_connected: '미연결',
  ready: '공식 API 준비',
  import_only: '파일 import 사용 중',
  paused: '일시 중지',
  error: '오류',
};

const STATUS_STYLES: Record<ProviderStatus, string> = {
  not_connected: 'bg-slate-100 text-slate-600',
  ready: 'bg-blue-50 text-blue-700',
  import_only: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
};

function providerLabel(type: ProviderType): string {
  return PROVIDERS.find((provider) => provider.type === type)?.label || type;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '기록 없음';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function itemPreview(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

export default function ContextsPage() {
  const { state } = useAuth();
  const toast = useToast();
  const [providers, setProviders] = useState<ContextProvider[]>([]);
  const [items, setItems] = useState<ContextItem[]>([]);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingProviderId, setUpdatingProviderId] = useState<string | null>(null);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>('notion');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('official_api');
  const [registerConsent, setRegisterConsent] = useState(false);
  const [importConsent, setImportConsent] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualFormat, setManualFormat] = useState<'json' | 'markdown' | 'text'>('text');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');

  async function readError(response: Response): Promise<string> {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    return data?.error || `요청에 실패했습니다. (${response.status})`;
  }

  async function loadProviders() {
    const response = await fetch('/api/contexts/providers');
    if (!response.ok) throw new Error(await readError(response));
    setProviders(await response.json() as ContextProvider[]);
  }

  async function loadItems(nextQuery = query) {
    setLoadingItems(true);
    try {
      const suffix = nextQuery.trim() ? `?q=${encodeURIComponent(nextQuery.trim())}` : '';
      const response = await fetch(`/api/contexts/items${suffix}`);
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as { items: ContextItem[] };
      setItems(data.items || []);
    } finally {
      setLoadingItems(false);
    }
  }

  async function loadJobs() {
    const response = await fetch('/api/memory-exports');
    if (!response.ok) return;
    setJobs(await response.json() as ExportJob[]);
  }

  useEffect(() => {
    Promise.all([loadProviders(), loadItems(''), loadJobs()])
      .catch((error: unknown) => {
        toast.add({
          title: 'Sea of Contexts를 불러오지 못했습니다.',
          description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
          color: 'red',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selected = providers.find((provider) => provider.id === selectedProviderId);
    if (!selectedProviderId || !selected) {
      setSelectedProviderId(providers[0]?.id || '');
    }
  }, [providers, selectedProviderId]);

  async function registerProvider() {
    if (!registerConsent) return;
    setRegistering(true);
    try {
      const response = await fetch('/api/contexts/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType,
          connectionMode,
          consentScope: ['provider registration', 'user-selected context items', 'user-requested export'],
          consentGranted: true,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const created = await response.json() as ContextProvider;
      setProviders((current) => [...current, created]);
      setSelectedProviderId(created.id);
      setRegisterConsent(false);
      toast.add({ title: `${providerLabel(providerType)} provider가 등록되었습니다.`, color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'provider 등록 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setRegistering(false);
    }
  }

  async function syncProvider(provider: ContextProvider) {
    setSyncingProviderId(provider.id);
    try {
      const response = await fetch('/api/contexts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as {
        providers?: Array<{ status: string; importedCount: number; errorCode: string | null }>;
      };
      const result = data.providers?.[0];
      await Promise.all([loadProviders(), loadItems(query)]);
      if (result?.status === 'configuration_required') {
        toast.add({ title: '공식 API 설정이 필요합니다.', description: '서버 환경변수 설정 후 다시 동기화하세요.', color: 'yellow' });
      } else if (result?.status === 'error') {
        toast.add({ title: '공공 API 동기화 실패', description: result.errorCode || '오류 코드 없음', color: 'red' });
      } else {
        toast.add({ title: `${result?.importedCount || 0}개 context item을 동기화했습니다.`, color: 'green' });
      }
    } catch (error: unknown) {
      toast.add({ title: '공공 API 동기화 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setSyncingProviderId(null);
    }
  }

  async function importFile() {
    if (!selectedProviderId || !selectedFile || !importConsent) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('providerId', selectedProviderId);
      if (importTitle.trim()) formData.append('title', importTitle.trim());
      const response = await fetch('/api/contexts/import', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as { importedCount: number };
      setSelectedFile(null);
      setImportTitle('');
      setImportConsent(false);
      const input = document.getElementById('context-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await Promise.all([loadProviders(), loadItems(query)]);
      toast.add({ title: `${data.importedCount}개 context item을 가져왔습니다.`, color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '파일 import 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setImporting(false);
    }
  }

  async function importManualContent() {
    if (!selectedProviderId || !manualContent.trim() || !importConsent) return;
    setImporting(true);
    try {
      const response = await fetch('/api/contexts/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProviderId,
          format: manualFormat,
          content: manualContent,
          title: importTitle.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json() as { importedCount: number };
      setManualContent('');
      setImportTitle('');
      setImportConsent(false);
      await Promise.all([loadProviders(), loadItems(query)]);
      toast.add({ title: `${data.importedCount}개 context item을 저장했습니다.`, color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: '직접 import 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setImporting(false);
    }
  }

  async function toggleProvider(provider: ContextProvider) {
    setUpdatingProviderId(provider.id);
    try {
      const response = await fetch(`/api/contexts/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: provider.status === 'paused' ? 'ready' : 'paused' }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const updated = await response.json() as ContextProvider;
      setProviders((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (error: unknown) {
      toast.add({ title: 'provider 상태 변경 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setUpdatingProviderId(null);
    }
  }

  async function deleteItem(item: ContextItem) {
    if (!window.confirm(`"${item.title || item.itemType}" context item을 삭제할까요?`)) return;
    setDeletingItemId(item.id);
    try {
      const response = await fetch(`/api/contexts/items/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.add({ title: 'context item을 삭제했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'context item 삭제 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setDeletingItemId(null);
    }
  }

  async function searchItems(event?: React.FormEvent) {
    event?.preventDefault();
    const nextQuery = searchInput.trim();
    setQuery(nextQuery);
    try {
      await loadItems(nextQuery);
    } catch (error: unknown) {
      toast.add({ title: 'context 검색 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    }
  }

  async function exportItems() {
    setExporting(true);
    try {
      const response = await fetch('/api/memory-exports?download=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat, q: query || undefined, download: true }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kairos-context-export.${exportFormat}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      await loadJobs();
      toast.add({ title: 'context export 파일을 다운로드했습니다.', color: 'green' });
    } catch (error: unknown) {
      toast.add({ title: 'context export 실패', description: error instanceof Error ? error.message : undefined, color: 'red' });
    } finally {
      setExporting(false);
    }
  }

  const registeredTypes = new Set(providers.map((provider) => provider.providerType));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-blue-600 uppercase">Sea of Contexts</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">개인 context 보관함</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              공식 API 준비 상태를 확인하고, 사용자가 선택한 JSON·Markdown·텍스트만 안전하게 가져오고 내보냅니다.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-900">소유권</span>
            <span className="mx-2 text-slate-300">|</span>
            userId {state.user?.id || '현재 인증 세션'} 전용
          </div>
        </div>
        <p className="text-xs leading-5 text-slate-500">
           LinkedIn, 잡플래닛, 잡코리아는 연결하거나 수집하지 않습니다. 이 화면은 공식 API 또는 사용자가 직접 내보낸 파일만 사용합니다.
        </p>
      </header>

       <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" aria-label="provider 상태">
        {PROVIDERS.map((definition) => {
          const provider = providers.find((entry) => entry.providerType === definition.type);
          return (
            <article key={definition.type} className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{definition.label}</h2>
                  <p className="mt-1 text-xs text-slate-500">{definition.api}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">공식</span>
              </div>
              <div className="mt-5 flex-1">
                {provider ? (
                  <>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[provider.status]}`}>
                      {STATUS_LABELS[provider.status]}
                    </span>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {provider.connectionMode === 'file_import'
                        ? '사용자 파일 import 방식입니다.'
                        : provider.officialApiConfigured
                          ? '서버에 공식 API 설정이 있어 준비되었습니다. 실제 연결 성공을 가장하지 않습니다.'
                          : 'API key가 없어 미연결 상태입니다.'}
                    </p>
                     <p className="mt-2 text-[11px] text-slate-400">최근 동기화 시각: {formatDate(provider.lastSyncedAt)}</p>
                     {provider.lastErrorCode && <p className="mt-1 break-all text-[11px] text-red-500">오류 코드: {provider.lastErrorCode}</p>}
                  </>
                ) : (
                  <>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES.not_connected}`}>
                      {STATUS_LABELS.not_connected}
                    </span>
                    <p className="mt-3 text-xs leading-5 text-slate-500">아직 등록하지 않았습니다. API key를 저장하지 않고 준비 상태만 관리합니다.</p>
                  </>
                )}
              </div>
              {provider && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {PUBLIC_PROVIDER_TYPES.includes(provider.providerType) && (
                    <button
                      type="button"
                      onClick={() => syncProvider(provider)}
                      disabled={syncingProviderId === provider.id || provider.status === 'paused' || !provider.officialApiConfigured}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {syncingProviderId === provider.id ? <Spinner className="h-3.5 w-3.5 border-2 border-blue-200 border-t-white" /> : '공식 API 동기화'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleProvider(provider)}
                    disabled={updatingProviderId === provider.id}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                  >
                    {updatingProviderId === provider.id ? <Spinner className="h-3.5 w-3.5 border-2 border-slate-300 border-t-blue-600" /> : provider.status === 'paused' ? '사용 재개' : '일시 중지'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Provider Setup</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">provider 등록</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">공식 API 자격 증명 원문은 입력하지 않습니다. 서버 설정이 없으면 미연결로 표시됩니다.</p>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-600">
              provider
              <select
                value={providerType}
                onChange={(event) => setProviderType(event.target.value as ProviderType)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {PROVIDERS.map((provider) => <option key={provider.type} value={provider.type}>{provider.label}</option>)}
              </select>
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-600">등록 방식</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([
                  ['file_import', '사용자 파일 import', 'JSON, Markdown, 텍스트'],
                  ['official_api', '공식 API 준비', '서버 설정이 있을 때만 준비 상태'],
                ] as const).map(([value, label, description]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-3 ${connectionMode === value ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="context-connection-mode"
                      value={value}
                      checked={connectionMode === value}
                      onChange={() => setConnectionMode(value)}
                      className="sr-only"
                    />
                    <span className="block text-xs font-semibold text-slate-800">{label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={registerConsent} onChange={(event) => setRegisterConsent(event.target.checked)} className="mt-1 accent-blue-600" />
              현재 userId가 선택한 provider의 메타데이터와 사용자가 선택한 context item을 저장하고, 요청한 export에 포함하는 것에 동의합니다.
            </label>
            <button
              type="button"
              onClick={registerProvider}
              disabled={registering || !registerConsent || registeredTypes.has(providerType)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {registering && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />}
              {registeredTypes.has(providerType) ? '이미 등록됨' : registering ? '등록 중...' : 'provider 등록'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Import</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">context 가져오기</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">파일은 5MB 이하이며 내용과 source reference hash를 저장합니다.</p>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-600">
              대상 provider
              <select
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
                disabled={providers.length === 0}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
              >
                {providers.length === 0 ? <option value="">먼저 provider를 등록하세요</option> : providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName || providerLabel(provider.providerType)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              파일
              <input
                id="context-file"
                type="file"
                accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="mt-1.5 block w-full rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              제목 (선택)
              <input value={importTitle} onChange={(event) => setImportTitle(event.target.value)} maxLength={255} placeholder="파일 또는 직접 입력 제목" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block text-xs font-semibold text-slate-600">
                직접 입력
                <textarea value={manualContent} onChange={(event) => setManualContent(event.target.value)} rows={4} placeholder="텍스트, Markdown 또는 JSON을 붙여넣으세요" className="mt-1.5 min-h-28 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                형식
                <select value={manualFormat} onChange={(event) => setManualFormat(event.target.value as typeof manualFormat)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                  <option value="text">텍스트</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={importConsent} onChange={(event) => setImportConsent(event.target.checked)} className="mt-1 accent-emerald-600" />
              이 파일 또는 직접 입력 내용의 저장 범위를 확인했습니다. 다른 사용자의 자료를 업로드하지 않습니다.
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={importFile} disabled={importing || !selectedProviderId || !selectedFile || !importConsent} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                {importing && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />}
                파일 import
              </button>
              <button type="button" onClick={importManualContent} disabled={importing || !selectedProviderId || !manualContent.trim() || !importConsent} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">
                직접 입력 저장
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Memory Items</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">import된 context item</h2>
            <p className="mt-1 text-sm text-slate-500">현재 인증된 userId의 item만 검색하고 삭제할 수 있습니다.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <form onSubmit={searchItems} className="flex min-w-0 flex-1 gap-2">
              <label className="sr-only" htmlFor="context-search">context 검색</label>
              <input id="context-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="제목 또는 내용 검색" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              <button type="submit" disabled={loadingItems} className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">검색</button>
            </form>
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400">
              <option value="json">JSON export</option>
              <option value="markdown">Markdown export</option>
            </select>
            <button type="button" onClick={exportItems} disabled={exporting || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
              {exporting && <Spinner className="h-4 w-4 border-2 border-white border-t-transparent" />}
              export 다운로드
            </button>
          </div>
        </div>
        {loading || loadingItems ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-slate-500"><Spinner className="mr-2 h-5 w-5 border-2 border-slate-200 border-t-violet-600" />목록을 불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">검색 조건에 맞는 context item이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{item.title || '제목 없는 context item'}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{item.itemType}</span>
                    <span className="text-xs text-slate-400">{item.providerDisplayName || providerLabel(item.providerType)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-600">{itemPreview(item.content)}</p>
                  <div className="mt-3 grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
                     <span className="break-all">contentHash: {item.contentHash}</span>
                     <span className="break-all">sourceReferenceHash: {item.sourceReferenceHash || 'none'}</span>
                     <span>occurred: {formatDate(item.occurredAt)}</span>
                     <span>imported: {formatDate(item.importedAt)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => deleteItem(item)} disabled={deletingItemId === item.id} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 md:self-center">
                  {deletingItemId === item.id ? '삭제 중...' : '삭제'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {jobs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">최근 export job</h2>
              <p className="mt-1 text-xs text-slate-500">export는 요청한 userId의 item만 처리합니다.</p>
            </div>
            <p className="text-xs text-slate-500">{jobs[0].status} · {jobs[0].itemCount}개 · {formatDate(jobs[0].completedAt)}</p>
          </div>
        </section>
      )}
    </div>
  );
}
