'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

const sizes = [
  { label: '1:1', value: '1024x1024' },
  { label: '16:9', value: '1792x1024' },
  { label: '9:16', value: '1024x1792' },
];

export default function PhotoStudioPage() {
  const toast = useToast();
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [images, setImages] = useState<any[]>([]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] || null);
  }

  async function loadImages() {
    try {
      const res = await fetch('/api/studio/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch {} finally {
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
        const data = await res.json();
        setImages(prev => [data.image, ...prev]);
        setPrompt('');
        toast.add({ title: '이미지가 생성되었습니다.', color: 'green' });
      } else {
        toast.add({ title: '생성 실패', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    } finally {
      setGenerating(false);
    }
  }

  async function uploadImage() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        setImages(prev => [data.image, ...prev]);
        setSelectedFile(null);
        toast.add({ title: '이미지가 업로드되었습니다.', color: 'green' });
      } else {
        toast.add({ title: '업로드 실패', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(id: string) {
    try {
      const res = await fetch(`/api/studio/images/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setImages(prev => prev.filter(i => i.id !== id));
        toast.add({ title: '삭제되었습니다.', color: 'green' });
      }
    } catch {
      toast.add({ title: '오류 발생', color: 'red' });
    }
  }

  function downloadImage(img: any) {
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
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
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
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
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
              className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all ${
                selectedFile ? 'border-blue-400 bg-blue-50/50' : ''
              }`}
            >
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <span className="text-2xl mb-2">📁</span>
              <p className="text-xs text-gray-500">{selectedFile ? selectedFile.name : '클릭하여 선택'}</p>
            </label>
            <button
              onClick={uploadImage}
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {uploading && <Spinner className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />}
              <span>{uploading ? '업로드 중...' : '업로드'}</span>
            </button>
          </div>
        </div>

        {/* Right: Gallery */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-16 flex flex-col items-center justify-center gap-3">
              <Spinner className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">이미지 불러오는 중...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-400 text-2xl">
                🎨
              </div>
              <h3 className="text-sm font-semibold text-gray-600">보관함이 비어있습니다</h3>
              <p className="text-xs text-gray-400">좌측 패널에서 이미지를 생성하거나 업로드하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map(img => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square"
                >
                  <img src={img.imageUrl} alt={img.prompt || img.originalFileName} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all">
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                      <p className="text-xs text-white/90 line-clamp-2 leading-relaxed font-medium">
                        {img.prompt || img.originalFileName}
                      </p>
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
    </div>
  );
}
