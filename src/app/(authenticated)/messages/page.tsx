'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Room {
  id: string;
  title: string;
  roomType: string;
  status: string;
  updatedAt?: string;
  isPersonal?: boolean;
}

interface PreparationMessage {
  id: string;
  roomId: string;
  sequence: number;
  senderType: string;
  content: string;
  createdAt?: string;
}

interface DeterministicResult {
  profanity: { detected: boolean; matches: string[] };
  personalInformation: {
    detected: boolean;
    types: string[];
    matches: Array<{ type: string; label: string; maskedValue: string }>;
  };
}

interface ToneCorrection {
  correctedText: string;
  summary: string;
  changes: string[];
  tone: string;
  riskNotes: string[];
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || `${fallback} (${response.status})`;
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PreparationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [sending, setSending] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toneError, setToneError] = useState<string | null>(null);
  const [deterministic, setDeterministic] = useState<DeterministicResult | null>(null);
  const [correction, setCorrection] = useState<ToneCorrection | null>(null);

  useEffect(() => {
    let active = true;
    async function loadRooms() {
      setLoading(true);
      try {
        const response = await fetch('/api/preparation-rooms');
        if (!response.ok) throw new Error(await responseError(response, '준비방을 불러오지 못했습니다.'));
        const nextRooms = (await response.json()) as Room[];
        if (!active) return;
        setRooms(nextRooms);
        setSelectedRoomId(nextRooms[0]?.id || null);
        setEditingTitle(nextRooms[0]?.title || '');
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : '준비방을 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadRooms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
    setEditingTitle(selectedRoom?.title || '');
    setDeterministic(null);
    setCorrection(null);
    setToneError(null);
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    const roomId = selectedRoomId;

    let active = true;
    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const response = await fetch(`/api/preparation-messages?roomId=${encodeURIComponent(roomId)}`);
        if (!response.ok) throw new Error(await responseError(response, '메시지를 불러오지 못했습니다.'));
        if (active) setMessages((await response.json()) as PreparationMessage[]);
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : '메시지를 불러오지 못했습니다.');
      } finally {
        if (active) setLoadingMessages(false);
      }
    }
    void loadMessages();
    return () => {
      active = false;
    };
  }, [selectedRoomId, rooms]);

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newRoomTitle.trim()) return;
    setCreatingRoom(true);
    setError(null);
    try {
      const response = await fetch('/api/preparation-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newRoomTitle.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response, '준비방을 만들지 못했습니다.'));
      const room = await response.json() as Room;
      setRooms((current) => [room, ...current]);
      setSelectedRoomId(room.id);
      setNewRoomTitle('');
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : '준비방을 만들지 못했습니다.');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function saveRoomTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoomId || !editingTitle.trim()) return;
    try {
      const response = await fetch(`/api/preparation-rooms/${selectedRoomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response, '준비방 제목을 저장하지 못했습니다.'));
      const room = await response.json() as Room;
      setRooms((current) => current.map((item) => item.id === room.id ? room : item));
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '준비방 제목을 저장하지 못했습니다.');
    }
  }

  async function deleteRoom() {
    if (!selectedRoomId || !window.confirm('이 개인 준비방과 메시지를 모두 삭제하시겠습니까?')) return;
    setDeletingRoom(true);
    try {
      const response = await fetch(`/api/preparation-rooms/${selectedRoomId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response, '준비방을 삭제하지 못했습니다.'));
      const nextRooms = rooms.filter((room) => room.id !== selectedRoomId);
      setRooms(nextRooms);
      setSelectedRoomId(nextRooms[0]?.id || null);
      setMessages([]);
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : '준비방을 삭제하지 못했습니다.');
    } finally {
      setDeletingRoom(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoomId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/preparation-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoomId, content: draft.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response, '메시지를 저장하지 못했습니다.'));
      const message = await response.json() as PreparationMessage;
      setMessages((current) => [...current, message]);
      setDraft('');
      setCorrection(null);
      setDeterministic(null);
      setRooms((current) => current.map((room) => room.id === selectedRoomId ? { ...room, updatedAt: message.createdAt } : room));
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : '메시지를 저장하지 못했습니다.');
    } finally {
      setSending(false);
    }
  }

  async function correctTone() {
    if (!draft.trim()) return;
    setCorrecting(true);
    setToneError(null);
    setCorrection(null);
    try {
      const response = await fetch('/api/preparation-messages/tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const data = await response.json() as {
        error?: string;
        deterministic?: DeterministicResult;
        correction?: ToneCorrection | null;
      };
      if (data.deterministic) setDeterministic(data.deterministic);
      if (!response.ok) {
        setToneError(data.error || '톤 교정을 사용할 수 없습니다.');
        return;
      }
      setCorrection(data.correction || null);
    } catch (correctionError: unknown) {
      setToneError(correctionError instanceof Error ? correctionError.message : '톤 교정을 사용할 수 없습니다.');
    } finally {
      setCorrecting(false);
    }
  }

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Preparation Messages</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">취업 준비 메시지</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">지원 전 연락, 자기소개, 질문 문장을 개인 준비방에서 다듬어보세요.</p>
      </header>

      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => setError(null)} className="font-semibold hover:underline">닫기</button></div>}

      <div className="grid min-h-[620px] grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-gray-800">개인 준비방</h2><span className="text-xs text-gray-400">{rooms.length}개</span></div>
          <p className="mt-2 text-xs leading-5 text-gray-400">기업 담당자 공개방이 아닙니다. 모든 대화는 내 계정에만 연결됩니다.</p>
          <form onSubmit={createRoom} className="mt-4 space-y-2">
            <label htmlFor="room-title" className="sr-only">새 준비방 제목</label>
            <input id="room-title" value={newRoomTitle} onChange={(event) => setNewRoomTitle(event.target.value)} placeholder="새 준비방 제목" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <button type="submit" disabled={creatingRoom || !newRoomTitle.trim()} className="w-full rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">{creatingRoom ? '만드는 중' : '개인 준비방 만들기'}</button>
          </form>
          <div className="mt-5 flex-1 space-y-2 overflow-y-auto">
            {loading ? <><div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" /></> : rooms.length === 0 ? <div className="rounded-xl bg-gray-50 px-3 py-8 text-center text-xs leading-5 text-gray-500">대화를 시작하려면<br />준비방을 먼저 만드세요.</div> : rooms.map((room) => <button type="button" key={room.id} onClick={() => setSelectedRoomId(room.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selectedRoomId === room.id ? 'border-blue-200 bg-blue-50/70' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}><span className={`block truncate text-sm font-semibold ${selectedRoomId === room.id ? 'text-blue-700' : 'text-gray-700'}`}>{room.title}</span><span className="mt-1 block text-[11px] text-gray-400">개인 · {formatDate(room.updatedAt)}</span></button>)}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {selectedRoom ? (
            <>
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Private preparation room</p><p className="mt-1 text-sm text-gray-500">나만 보기</p></div>
                <div className="flex items-center gap-2">
                  <form onSubmit={saveRoomTitle} className="flex min-w-0 items-center gap-2"><label htmlFor="editing-room-title" className="sr-only">준비방 제목</label><input id="editing-room-title" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400 sm:w-48" /><button type="submit" className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">저장</button></form>
                  <button type="button" onClick={() => void deleteRoom()} disabled={deletingRoom} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600">삭제</button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 p-4 sm:p-6" aria-live="polite">
                {loadingMessages ? <div className="space-y-3"><div className="skeleton ml-auto h-16 w-3/4 rounded-2xl" /><div className="skeleton h-16 w-2/3 rounded-2xl" /></div> : messages.length === 0 ? <div className="flex h-full min-h-60 items-center justify-center text-center"><div><p className="text-sm font-semibold text-gray-600">아직 저장된 메시지가 없습니다.</p><p className="mt-2 text-xs leading-5 text-gray-400">입력창에 작성한 뒤 직접 전송할 때만<br />이 준비방에 기록됩니다.</p></div></div> : messages.map((message) => <div key={message.id} className="ml-auto max-w-[85%] sm:max-w-[72%]"><div className="rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white shadow-sm">{message.content}</div><p className="mt-1 text-right text-[11px] text-gray-400">내 메시지 · {formatDate(message.createdAt)}</p></div>)}
              </div>

              <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-400">전송 버튼을 누른 메시지만 저장됩니다. 자동 전송하지 않습니다.</p><button type="button" onClick={() => void correctTone()} disabled={correcting || !draft.trim()} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40">{correcting ? '교정 중' : '톤앤매너 교정'}</button></div>
                <form onSubmit={sendMessage}>
                  <label htmlFor="message-draft" className="sr-only">메시지 입력</label>
                  <textarea id="message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} placeholder="대화할 내용을 입력하세요" className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  <div className="mt-2 flex items-center justify-end"><button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{sending ? '저장 중' : '메시지 전송 및 저장'}</button></div>
                </form>

                {(deterministic || correction || toneError) && <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-gray-800">교정 제안</h3><span className="text-[11px] font-semibold text-gray-400">저장하지 않은 미리보기</span></div>
                  {deterministic && <div className="flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 font-semibold ${deterministic.profanity.detected ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{deterministic.profanity.detected ? '욕설 가능성 발견' : '욕설 탐지 없음'}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${deterministic.personalInformation.detected ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{deterministic.personalInformation.detected ? `개인정보 확인: ${deterministic.personalInformation.types.join(', ')}` : '개인정보 탐지 없음'}</span></div>}
                  {toneError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"><p>{toneError}</p><button type="button" onClick={() => void correctTone()} disabled={correcting} className="mt-1 font-semibold underline">다시 시도</button></div>}
                  {correction && <div className="space-y-3"><p className="rounded-lg bg-white px-3 py-3 text-sm leading-6 text-gray-700">{correction.correctedText}</p><p className="text-xs leading-5 text-gray-500">{correction.summary}</p>{correction.changes.length > 0 && <div><p className="text-xs font-semibold text-gray-500">변경 내용</p><ul className="mt-1 space-y-1">{correction.changes.map((change) => <li key={change} className="text-xs text-gray-500">{change}</li>)}</ul></div>}<button type="button" onClick={() => { setDraft(correction.correctedText); setToneError(null); }} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800">교정 결과를 입력창에 반영</button></div>}
                  <p className="text-[11px] leading-5 text-gray-400">교정 결과를 입력창에 반영해도 저장되지 않습니다. 전송을 눌렀을 때만 메시지가 저장됩니다.</p>
                </div>}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center"><div><p className="text-lg font-bold text-gray-800">개인 준비방을 선택하세요.</p><p className="mt-2 text-sm leading-6 text-gray-500">왼쪽에서 준비방을 만들면<br />메시지 작성과 톤 교정을 사용할 수 있습니다.</p></div></div>
          )}
        </section>
      </div>
    </div>
  );
}
