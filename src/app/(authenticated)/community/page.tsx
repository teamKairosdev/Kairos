'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

type Category = 'interview_pass' | 'career_tip' | 'qna';

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'interview_pass', label: '합격 후기' },
  { value: 'career_tip', label: '커리어 팁' },
  { value: 'qna', label: 'Q&A' },
];

const CATEGORY_LABELS: Record<Category, string> = {
  interview_pass: '합격 후기',
  career_tip: '커리어 팁',
  qna: 'Q&A',
};

const CATEGORY_COLORS: Record<Category, string> = {
  interview_pass: 'bg-emerald-50 text-emerald-600',
  career_tip: 'bg-sky-50 text-sky-600',
  qna: 'bg-violet-50 text-violet-600',
};

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];

const TITLE_MAX = 50;
const CONTENT_MAX = 1000;

interface CommunityUser {
  name: string | null;
  avatarUrl: string | null;
}

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: Category;
  isAnonymous: boolean;
  likesCount: number;
  createdAt: string;
  user: CommunityUser | null;
  isOwner?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CommunityMatch {
  displayName: string;
  role: string;
  experienceLevel: string;
  score: number;
  reasonCodes: string[];
  reasons: string[];
  community: {
    postCount: number;
    categories: Category[];
  };
}

type MatchEmptyReason =
  | 'DATABASE_UNAVAILABLE'
  | 'NO_CAREER_RECORD'
  | 'NO_OTHER_CAREERS'
  | 'NO_SIMILAR_MATCHES';

interface ReputationSummary {
  reputationPoints: number;
  answerCount: number;
  feedbackCount: number;
  policy?: {
    rewardStatus?: string;
  };
}

interface MissionSummary {
  mission: {
    id: string;
    title: string;
    verification: string;
  };
  completedCount: number;
  streakDays: number;
  reward: {
    status: string;
    label: string;
  };
}

const LIMIT = 10;
const MATCH_LIMIT = 3;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function UserAvatar({ post }: { post: CommunityPost }) {
  const name = post.isAnonymous ? '익명 사용자' : post.user?.name || '알 수 없음';
  const color = AVATAR_COLORS[(post.id.charCodeAt(0) + post.id.length) % AVATAR_COLORS.length];
  if (!post.isAnonymous && post.user?.avatarUrl) {
    return (
      <img src={post.user.avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
      {post.isAnonymous ? '익' : name === '알 수 없음' ? '?' : name.charAt(0)}
    </span>
  );
}

export default function CommunityPage() {
  const { state } = useAuth();
  const toast = useToast();
  const addToast = useMemo(() => ({ add: toast.add }), []);
  const toastRef = useRef(addToast);
  toastRef.current = addToast;

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, limit: LIMIT, total: 0, totalPages: 0 });
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<CommunityMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesEmptyReason, setMatchesEmptyReason] = useState<MatchEmptyReason | null>(null);
  const [reputation, setReputation] = useState<ReputationSummary>({ reputationPoints: 0, answerCount: 0, feedbackCount: 0 });
  const [mission, setMission] = useState<MissionSummary | null>(null);
  const [missionLoading, setMissionLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('career_tip');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CommunityPost | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      try {
        const res = await fetch(`/api/community/matches?limit=${MATCH_LIMIT}`);
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json() as {
          matches?: CommunityMatch[];
          meta?: { emptyReason?: MatchEmptyReason | null };
        };

        if (cancelled) return;
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setMatchesEmptyReason(data.meta?.emptyReason ?? null);
      } catch {
        if (cancelled) return;
        setMatches([]);
        setMatchesEmptyReason('DATABASE_UNAVAILABLE');
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    }

    loadMatches();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityProgress() {
      try {
        const [reputationResponse, missionResponse] = await Promise.all([
          fetch('/api/community/reputation'),
          fetch('/api/growth-events/check-ins?missionId=daily_economy_news'),
        ]);
        if (cancelled) return;
        if (reputationResponse.ok) {
          const data = await reputationResponse.json() as Partial<ReputationSummary>;
          setReputation({
            reputationPoints: typeof data.reputationPoints === 'number' ? data.reputationPoints : 0,
            answerCount: typeof data.answerCount === 'number' ? data.answerCount : 0,
            feedbackCount: typeof data.feedbackCount === 'number' ? data.feedbackCount : 0,
            policy: data.policy,
          });
        }
        if (missionResponse.ok) setMission(await missionResponse.json() as MissionSummary);
      } catch {
        // 활동 요약은 게시글 목록을 막지 않는 선택 영역입니다.
      } finally {
        if (!cancelled) setMissionLoading(false);
      }
    }

    void loadCommunityProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPosts = useCallback(async (page: number, cat: Category | 'all', append: boolean) => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (cat !== 'all') params.set('category', cat);
    try {
      const res = await fetch(`/api/community?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      const next = data.posts || [];
      setPosts(prev => (append ? [...prev, ...next] : next));
      setPagination(data.pagination || { page, limit: LIMIT, total: next.length, totalPages: Math.ceil(next.length / LIMIT) });
    } catch (err: unknown) {
      toastRef.current.add({ title: '게시글을 불러오지 못했습니다.', description: (err as Error).message, color: 'red' });
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setExpandedId(null);
    loadPosts(1, category, false);
  }, [category, loadPosts]);

  function loadMore() {
    if (!pagination.totalPages || pagination.page >= pagination.totalPages) return;
    setLoadingMore(true);
    loadPosts(pagination.page + 1, category, true);
  }

  function openProgressComposer() {
    setNewCategory('career_tip');
    setShowForm(true);
  }

  async function checkInMission() {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await fetch('/api/growth-events/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: 'daily_economy_news' }),
      });
      const data = await res.json().catch(() => null) as MissionSummary | null;
      if (!res.ok) {
        toastRef.current.add({ title: '미션 체크인에 실패했습니다.', description: (data as { error?: string } | null)?.error, color: 'red' });
        return;
      }
      if (data) setMission(data);
      toastRef.current.add({ title: '오늘의 체크인이 기록되었습니다.', color: 'green' });
    } catch (err: unknown) {
      toastRef.current.add({ title: '미션 체크인에 실패했습니다.', description: (err as Error).message, color: 'red' });
    } finally {
      setCheckingIn(false);
    }
  }

  async function submitPost() {
    if (!title.trim() || !content.trim()) {
      toastRef.current.add({ title: '제목과 내용을 입력해주세요.', color: 'red' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category: newCategory,
          isAnonymous,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toastRef.current.add({ title: '작성에 실패했습니다.', description: data?.error, color: 'red' });
        return;
      }
      const post = await res.json();
      const withUser = {
        ...post,
        user: post.isAnonymous
          ? null
          : { name: state.user?.name ?? null, avatarUrl: state.user?.avatarUrl ?? null },
      } as CommunityPost;
      if (category === 'all' || category === post.category) {
        setPosts(prev => [withUser, ...prev]);
      } else {
        loadPosts(1, category, false);
      }
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setShowForm(false);
      toastRef.current.add({ title: '게시글이 등록되었습니다.', color: 'green' });
    } catch (err: unknown) {
      toastRef.current.add({ title: '작성에 실패했습니다.', description: (err as Error).message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePost() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/community/${confirmDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toastRef.current.add({ title: '삭제에 실패했습니다.', description: data?.error, color: 'red' });
        return;
      }
      setPosts(prev => prev.filter(p => p.id !== confirmDelete.id));
      if (expandedId === confirmDelete.id) setExpandedId(null);
      setConfirmDelete(null);
      toastRef.current.add({ title: '게시글이 삭제되었습니다.', color: 'green' });
    } catch (err: unknown) {
      toastRef.current.add({ title: '삭제에 실패했습니다.', description: (err as Error).message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;
  const matchEmptyDescription = matchesEmptyReason === 'NO_CAREER_RECORD'
    ? '내 경력 기록을 추가하면 비슷한 커리어 방향을 찾아볼 수 있어요.'
    : matchesEmptyReason === 'DATABASE_UNAVAILABLE'
      ? '현재 매칭 정보를 준비할 수 없습니다. 잠시 후 다시 확인해주세요.'
      : matchesEmptyReason === 'NO_SIMILAR_MATCHES'
        ? '비슷한 경력 흐름을 가진 공개 기록을 아직 찾지 못했어요.'
        : '비교할 수 있는 공개 커리어 기록이 아직 없습니다.';
  const chip =
    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Community</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">커뮤니티</h1>
          <p className="text-sm text-gray-500 mt-1">합격 후기와 커리어 팁을 공유하고 질문에 답해보세요</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]"
        >
          {showForm ? '닫기' : '새 글 작성'}
        </button>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 shadow-xs" aria-labelledby="career-match-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Career direction</p>
            <h2 id="career-match-title" className="text-lg font-bold text-gray-900">나와 비슷한 커리어 방향</h2>
            <p className="text-sm text-gray-500 mt-1">직무와 경험 흐름이 비슷한 커뮤니티 사용자를 찾아보세요.</p>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-600">개인정보 보호형 매칭</span>
        </div>

        {matchesLoading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3" aria-label="매칭 불러오는 중">
            {Array.from({ length: MATCH_LIMIT }).map((_, index) => (
              <div key={index} className="rounded-xl border border-blue-100 bg-white/80 p-4 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : matches.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {matches.map((match, index) => (
              <article key={`${match.displayName}-${match.role}-${index}`} className="rounded-xl border border-blue-100 bg-white/90 p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-gray-900">{match.displayName}</h3>
                    <p className="mt-1 truncate text-xs text-gray-500">{match.role} · {match.experienceLevel}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600" aria-label={`유사도 ${match.score}%`}>
                    {match.score}%
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {match.reasons.map(reason => (
                    <span key={reason} className="rounded-full bg-gray-50 px-2 py-1 text-[11px] text-gray-600">{reason}</span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  공개 커뮤니티 글 {match.community.postCount}개
                  {match.community.categories.length > 0
                    ? ` · ${match.community.categories.map(item => CATEGORY_LABELS[item]).join(', ')}`
                    : ''}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-5">
            <p className="text-sm font-semibold text-gray-700">아직 보여드릴 매칭이 없어요</p>
            <p className="mt-1 text-sm text-gray-500">{matchEmptyDescription}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4">
          <p className="max-w-2xl text-xs leading-relaxed text-gray-500">비슷한 경험을 발견했다면 회사명이나 개인 정보를 쓰지 않고 현재 목표와 진행 상황을 커뮤니티에 공유해보세요.</p>
          <button
            type="button"
            onClick={openProgressComposer}
            className="min-h-[40px] rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
          >
            진전 공유하기
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="커뮤니티 활동과 미션">
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-violet-500 uppercase mb-1">My activity</p>
              <h2 className="text-lg font-bold text-gray-900">내 커뮤니티 활동 점수</h2>
              <p className="mt-1 text-sm text-gray-500">답변과 피드백 기록을 기준으로 한 개인 활동 점수입니다.</p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">비공개</span>
          </div>
          <div className="mt-5 flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold tracking-tight text-gray-900">{reputation.reputationPoints}</p>
              <p className="mt-1 text-xs text-gray-400">reputation points</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-800">{reputation.answerCount}</p>
                <p className="mt-1 text-xs text-gray-400">답변 기록</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{reputation.feedbackCount}</p>
                <p className="mt-1 text-xs text-gray-400">피드백 기록</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">취업 결과나 능력을 평가하는 점수가 아니며, 다른 사용자에게 공개하거나 순위를 매기지 않습니다.</p>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Small mission</p>
              <h2 className="text-lg font-bold text-gray-900">{mission?.mission.title || '매일 경제뉴스 읽기'}</h2>
              <p className="mt-1 text-sm text-gray-500">외부 뉴스 열람 여부를 검증하지 않는 사용자 체크인입니다.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">MVP</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900">{mission?.completedCount ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">완료 횟수</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900">{mission?.streakDays ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">연속일</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-400">보상: {mission?.reward.label || '보상 정책 대기'}</p>
            <button
              type="button"
              onClick={checkInMission}
              disabled={checkingIn || missionLoading}
              className="min-h-[40px] rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
            >
              {checkingIn ? '기록 중…' : '오늘 체크인'}
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="community-policy-title">
        <h2 id="community-policy-title" className="text-sm font-bold text-gray-900">커뮤니티 이용 안내</h2>
        <div className="mt-4 grid gap-4 text-xs leading-relaxed text-gray-600 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-gray-800">익명성</h3>
            <p className="mt-1">익명 게시글은 다른 사용자에게 이름, 이메일, 원문 사용자 식별자를 표시하지 않습니다. 본인 삭제와 운영 처리를 위해 내부 연결 정보는 보관됩니다.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">신고</h3>
            <p className="mt-1">개인정보 노출, 괴롭힘, 광고성 글은 신고 대상입니다. 신고 내용은 운영 검토에만 사용하며 익명 작성자의 신원을 공개하지 않습니다.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">보상 정책</h3>
            <p className="mt-1">활동 점수와 미션 체크인은 정책 확정 전 기록 단계입니다. 현재 쿠폰을 발행하지 않으며, 보상은 정책 대기 상태로 표시합니다.</p>
          </div>
        </div>
      </section>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4 animate-fade-in-up">
          <h2 className="text-sm font-semibold text-gray-700">새 글 작성</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewCategory(c.value as Category)}
                  className={`${chip} ${
                    newCategory === c.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="제목을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{title.length}/{TITLE_MAX}</p>
          </div>
           <div>
             <label className="block text-xs font-semibold text-gray-500 mb-1.5">내용 *</label>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={CONTENT_MAX}
              placeholder="내용을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
             <p className="text-xs text-gray-400 text-right mt-1">{content.length}/{CONTENT_MAX}</p>
           </div>
           <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
             <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
               <input
                 type="checkbox"
                 checked={isAnonymous}
                 onChange={event => setIsAnonymous(event.target.checked)}
                 className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
               />
               익명으로 게시
             </label>
             <p className="mt-1 pl-6 text-xs leading-relaxed text-gray-500">이름과 이메일은 공개하지 않습니다. 운영상 본인 삭제를 위해 내부적으로 작성자 연결을 유지합니다.</p>
           </div>
           <div className="flex justify-end">
            <button
              onClick={submitPost}
              disabled={!canSubmit}
              className="px-5 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2 active:scale-[0.98]"
            >
              {submitting && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`${chip} ${
              category === c.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
           icon="소통"
          title="아직 게시글이 없습니다"
          description="첫 게시글을 작성해 커뮤니티를 시작해보세요"
          actionLabel="새 글 작성"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                className="w-full px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${CATEGORY_COLORS[post.category]}`}>
                      {CATEGORY_LABELS[post.category]}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-800 break-words">{post.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      {post.likesCount}
                    </span>
                    <span className={`text-gray-400 text-xs transition-transform shrink-0 ${expandedId === post.id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <UserAvatar post={post} />
                  <span className="font-medium text-gray-500">{post.isAnonymous ? '익명 사용자' : post.user?.name || '알 수 없음'}</span>
                  <span>·</span>
                  <span>{relativeTime(post.createdAt)}</span>
                </div>
              </button>
              {expandedId === post.id && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                    {post.isOwner && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setConfirmDelete(post)}
                          disabled={deletingId === post.id}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {pagination.totalPages > pagination.page && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 min-h-[44px] bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40 flex items-center gap-2 active:scale-[0.98]"
              >
                {loadingMore && <Spinner className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                {loadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && deletingId === null && setConfirmDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900">게시글 삭제</h2>
            <p className="text-sm text-gray-500">
              &apos;{confirmDelete.title}&apos; 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={deletePost}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors duration-200 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {deletingId !== null && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deletingId !== null ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
