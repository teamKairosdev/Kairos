'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

const sizes = [
  { label: '1:1', value: '1024x1024' },
  { label: '16:9', value: '1792x1024' },
  { label: '9:16', value: '1024x1792' },
];

const BLUR_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

interface StudioImage {
  id: string;
  imageUrl: string;
  type: string;
  prompt?: string | null;
  originalFileName?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PhotoStudioPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [images, setImages] = useState<StudioImage[]>([]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setUploadError(null);
    } else if (file) {
      toast.add({ title: '이미지 파일만 업로드할 수 있습니다.', color: 'red' });
    }
  }

  async function loadImages() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch('/api/studio/images');
      if (!res.ok) {
        setLoadError(true);
        toast.add({ title: '이미지 목록을 불러오지 못했습니다.', color: 'red' });
        return;
      }
      const data = (await res.json()) as { images: StudioImage[] };
      setImages(data.images || []);
    } catch {
      setLoadError(true);
      toast.add({ title: '이미지 목록을 불러오지 못했습니다.', description: '잠시 후 다시 시도해주세요.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, []);

  async function generateImage() {
    if (!prompt) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
      });
      if (res.ok) {
        const data = (await res.json()) as { image: StudioImage };
        setImages(prev => [data.image, ...prev]);
        setPrompt('');
        toast.add({ title: '이미지가 생성되었습니다.', color: 'green' });
      } else {
        const err = await res.json().catch(() => null);
        toast.add({ title: '이미지 생성 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '이미지 생성 실패', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setGenerating(false);
    }
  }

  async function uploadImage() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form });
      if (res.ok) {
        const data = (await res.json()) as { image: StudioImage };
        setImages(prev => [data.image, ...prev]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.add({ title: '이미지가 업로드되었습니다.', color: 'green' });
      } else {
        const err = await res.json().catch(() => null);
        const message = err?.error || `업로드에 실패했습니다. (HTTP ${res.status})`;
        setUploadError(message);
        toast.add({ title: '업로드 실패', description: message, color: 'red' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '네트워크 오류로 업로드에 실패했습니다.';
      setUploadError(message);
      toast.add({ title: '업로드 실패', description: message, color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(id: string) {
    try {
      const res = await fetch(`/api/studio/images/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setImages(prev => prev.filter(i => i.id !== id));
        toast.add({ title: '이미지가 삭제되었습니다.', color: 'green' });
      } else {
        const err = await res.json().catch(() => null);
        toast.add({ title: '삭제 실패', description: err?.error || `HTTP ${res.status}`, color: 'red' });
      }
    } catch {
      toast.add({ title: '이미지 삭제에 실패했습니다.', color: 'red' });
    }
  }

  function downloadImage(img: StudioImage) {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = img.prompt ? `${img.prompt.slice(0, 30)}.png` : img.originalFileName || 'image.png';
    a.click();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Photo Studio</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">포토스튜디오</h1>
        <p className="text-sm text-gray-500 mt-1">AI 기반 프로필 사진 생성 및 이미지 보관함</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Generator & Upload */}
        <div className="space-y-6">
          {/* AI Generator */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">AI 프로필 생성</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">프롬프트</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="예: 깔끔한 정장을 입은 소프트웨어 엔지니어 프로필 헤드샷"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">비율</label>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSize(s.value)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        size === s.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={generateImage}
                disabled={!prompt.trim() || generating}
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {generating && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{generating ? '생성 중...' : '이미지 생성'}</span>
              </button>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">이미지 업로드</h2>
            <label
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                  : selectedFile
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <span className="text-xs font-semibold mb-2" aria-hidden="true">{dragOver ? '업로드' : '파일'}</span>
              <p className="text-xs text-gray-500">
                {selectedFile ? selectedFile.name : '클릭 또는 드래그하여 선택'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">JPG · PNG · WEBP 지원</p>
            </label>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 animate-fade-in-up">
                <p className="text-xs font-semibold text-red-600">업로드 실패</p>
                <p className="text-[11px] text-red-500 break-words">{uploadError}</p>
              </div>
            )}

            <button
              onClick={uploadImage}
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {uploading && <Spinner className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />}
              <span>{uploading ? '업로드 중...' : uploadError ? '다시 시도' : '업로드'}</span>
            </button>
          </div>
        </div>

        {/* Right: Gallery */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton animate-pulse aspect-square rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-2xl border border-red-200 p-10 text-center space-y-4 animate-fade-in-up">
              <div className="text-sm font-semibold">주의</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">이미지 목록을 불러오지 못했습니다</p>
                <p className="text-xs text-gray-500 mt-1">서버 연결 상태를 확인하고 다시 시도해주세요.</p>
              </div>
              <button
                onClick={loadImages}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                재시도
              </button>
            </div>
          ) : images.length === 0 ? (
            <EmptyState
              icon="이미지"
              title="아직 작업물이 없어요"
              description="AI로 프로필 사진을 생성하거나 이미지를 업로드해보세요"
              actionLabel="이미지 업로드하기"
              onAction={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {images.map(img => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-100 aspect-square hover:shadow-card transition-all duration-200"
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.prompt || img.originalFileName || '스튜디오 이미지'}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    unoptimized={img.imageUrl.startsWith('/uploads/')}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                      <p className="text-xs text-white/90 line-clamp-2 leading-relaxed font-medium break-words">
                        {img.prompt || img.originalFileName}
                      </p>
                      <p className="text-[10px] text-white/60">{formatDate(img.createdAt)}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadImage(img)}
                          className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          다운로드
                        </button>
                        <button
                          onClick={() => deleteImage(img.id)}
                          className="flex-1 py-1.5 bg-red-500/70 hover:bg-red-600/80 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        img.type === 'generated' ? 'bg-blue-600 text-white' : 'bg-gray-800/70 text-white'
                      }`}
                    >
                      {img.type === 'generated' ? 'AI' : 'UP'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 text-center animate-fade-in-up">
            <Spinner className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm font-semibold text-gray-800">이미지 업로드 중...</p>
              <p className="text-xs text-gray-400 mt-1">{selectedFile?.name}</p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-blue-600 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
