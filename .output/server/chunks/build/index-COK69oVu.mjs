import { defineComponent, withAsyncContext, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
import { c as useFetch } from './server.mjs';
import '../_/nitro.mjs';
import 'node:crypto';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:async_hooks';
import 'node:fs';
import 'node:url';
import 'jsonwebtoken';
import '@iconify/utils';
import 'consola';
import 'node:path';
import 'vue-router';
import '@vueuse/core';
import 'tailwind-merge';
import '@iconify/vue';
import '@vue/shared';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data: careersList, refresh } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/careers",
      "$buP42VQQk5"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    const showCreateModal = ref(false);
    const company = ref("");
    const role = ref("");
    const period = ref("2024 - 현재");
    const description = ref("");
    const searchQuery = ref("");
    const searching = ref(false);
    const searchResults = ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 class="text-2xl font-extrabold text-white flex items-center gap-2"><span>🔍</span> 경력 포트폴리오 &amp; pgvector 시맨틱 검색 </h1><p class="text-xs text-gray-400 mt-1"> 저장된 경력 이력과 프로젝트 성과를 1536 차원 고성능 pgvector 벡터 검색으로 자유롭게 탐색하세요. </p></div><button class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2"><span>+</span> 신규 경력 등록 (임베딩 자동 생성) </button></div><div class="glass-panel rounded-2xl p-6 space-y-4 border border-cyan-500/20"><h3 class="text-sm font-bold text-cyan-300 flex items-center gap-2"><span>⚡</span> pgvector 1536-dim Cosine Similarity Semantic Search </h3><div class="flex items-center gap-3"><input${ssrRenderAttr("value", unref(searchQuery))} type="text" placeholder="예: 백엔드 노드 노하우나 pgvector 데이터베이스 검색..." class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"><button${ssrIncludeBooleanAttr(unref(searching) || !unref(searchQuery).trim()) ? " disabled" : ""} class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50">`);
      if (unref(searching)) {
        _push(`<span>검색 중...</span>`);
      } else {
        _push(`<span>벡터 검색 ⚡</span>`);
      }
      _push(`</button></div>`);
      if (unref(searchResults)) {
        _push(`<div class="pt-4 border-t border-white/10 space-y-3"><div class="text-xs font-bold text-gray-300 flex items-center justify-between"><span>&quot;${ssrInterpolate(unref(searchResults).query)}&quot; 시맨틱 검색 결과</span><span class="text-cyan-400">${ssrInterpolate(unref(searchResults).results.length)} 건 발견</span></div><!--[-->`);
        ssrRenderList(unref(searchResults).results, (res) => {
          _push(`<div class="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2"><div class="flex items-center justify-between"><span class="text-sm font-bold text-white">${ssrInterpolate(res.company)} · ${ssrInterpolate(res.role)}</span>`);
          if (res.similarity) {
            _push(`<span class="text-xs font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30"> 유사도: ${ssrInterpolate((res.similarity * 100).toFixed(1))}% </span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div><p class="text-xs text-gray-300">${ssrInterpolate(res.description)}</p></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="space-y-4"><h2 class="text-lg font-bold text-white">등록된 경력 항목</h2>`);
      if (unref(careersList) && unref(careersList).length > 0) {
        _push(`<div class="space-y-4"><!--[-->`);
        ssrRenderList(unref(careersList), (c) => {
          _push(`<div class="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/40 transition-all"><div class="flex items-start justify-between"><div><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">${ssrInterpolate(c.period)}</span><h3 class="text-lg font-bold text-white mt-1">${ssrInterpolate(c.company)} — <span class="text-purple-300">${ssrInterpolate(c.role)}</span></h3></div><span class="text-xs text-emerald-400 font-mono">pgvector Embedded</span></div><p class="text-xs text-gray-300 leading-relaxed">${ssrInterpolate(c.description)}</p>`);
          if (c.achievements && c.achievements.length > 0) {
            _push(`<div class="pt-2 border-t border-white/5 space-y-1"><div class="text-[11px] font-bold text-gray-400">주요 성과:</div><ul class="text-xs text-gray-300 space-y-1 list-disc list-inside"><!--[-->`);
            ssrRenderList(c.achievements, (a, aIdx) => {
              _push(`<li>${ssrInterpolate(a)}</li>`);
            });
            _push(`<!--]--></ul></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-3"><div class="text-4xl">🏢</div><p class="text-sm">등록된 경력이 없습니다. 경력을 추가해 보세요.</p></div>`);
      }
      _push(`</div>`);
      if (unref(showCreateModal)) {
        _push(`<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"><div class="glass-panel rounded-3xl p-8 max-w-lg w-full space-y-6 border border-white/15"><div class="flex items-center justify-between"><h2 class="text-xl font-bold text-white">신규 경력 추가</h2><button class="text-gray-400 hover:text-white">✕</button></div><form class="space-y-4"><div class="grid grid-cols-2 gap-4"><div><label class="block text-xs font-semibold text-gray-300 mb-1">회사명</label><input${ssrRenderAttr("value", unref(company))} type="text" required placeholder="예: Kairos Labs" class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">직무명</label><input${ssrRenderAttr("value", unref(role))} type="text" required placeholder="예: Full-Stack Architect" class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"></div></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">근무 기간</label><input${ssrRenderAttr("value", unref(period))} type="text" placeholder="예: 2023.01 - 2026.07" class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">주요 역량 및 역할 설명</label><textarea rows="4" required placeholder="수행한 업무와 주요 프로그래밍 경험을 기술해 주세요..." class="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">${ssrInterpolate(unref(description))}</textarea></div><div class="flex justify-end gap-3 pt-2"><button type="button" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"> 취소 </button><button type="submit" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md shadow-purple-600/30"> 저장 및 임베딩 생성 </button></div></form></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/career/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-COK69oVu.mjs.map
