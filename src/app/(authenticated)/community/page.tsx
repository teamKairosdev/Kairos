'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

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

interface CommunityUser {
  name: string | null;
  avatarUrl: string | null;
}

interface CommunityPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: Category;
  likesCount: number;
  createdAt: string;
  user: CommunityUser | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const LIMIT = 10;

export default function CommunityPage() {
  const { state } = useAuth();
  const toast = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, limit: LIMIT, total: 0, totalPages: 0 });
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('career_tip');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      toast.add({ title: '게시글을 불러오지 못했습니다.', description: (err as Error).message, color: 'red' });
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast]);

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

  async function submitPost() {
    if (!title.trim() || !content.trim()) {
      toast.add({ title: '제목과 내용을 입력해주세요.', color: 'red' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category: newCategory }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.add({ title: '작성에 실패했습니다.', description: data?.error, color: 'red' });
        return;
      }
      const post = await res.json();
      setPosts(prev => [post, ...prev]);
      setTitle('');
      setContent('');
      setShowForm(false);
      toast.add({ title: '게시글이 등록되었습니다.', color: 'green' });
    } catch (err: unknown) {
      toast.add({ title: '작성에 실패했습니다.', description: (err as Error).message, color: 'red' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePost(id: string) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/community/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.add({ title: '삭제에 실패했습니다.', description: data?.error, color: 'red' });
        return;
      }
      setPosts(prev => prev.filter(p => p.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.add({ title: '게시글이 삭제되었습니다.', color: 'green' });
    } catch (err: unknown) {
      toast.add({ title: '삭제에 실패했습니다.', description: (err as Error).message, color: 'red' });
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  const currentUserId = state.user?.id;

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
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          {showForm ? '닫기' : '새 글 작성'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">새 글 작성</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">카테고리</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">내용 *</label>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={submitPost}
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {submitting && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              category === c.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-16 flex items-center justify-center">
          <Spinner />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="💬"
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
                    <span className="text-xs text-gray-400">👍 {post.likesCount}</span>
                    <span className={`text-gray-400 text-xs transition-transform shrink-0 ${expandedId === post.id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">{post.user?.name || '알 수 없음'}</span>
                  <span>·</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </button>
              {expandedId === post.id && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
                    {currentUserId === post.userId && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => deletePost(post.id)}
                          disabled={deletingId === post.id}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          {deletingId === post.id ? '삭제 중...' : '삭제'}
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
                className="px-5 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {loadingMore && <Spinner className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                {loadingMore ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
