import { b as useRoute, c as useFetch, _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, unref, mergeProps, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';
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
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const { data } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/api/resumes/${route.params.id}`,
      "$gcqkbk0AwP"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      if (unref(data)) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div class="flex items-center justify-between"><div>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: "/resume",
          class: "text-xs text-purple-400 hover:underline flex items-center gap-1 mb-2"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(` ← 이력서 목록으로 돌아가기 `);
            } else {
              return [
                createTextVNode(" ← 이력서 목록으로 돌아가기 ")
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`<h1 class="text-2xl font-extrabold text-white flex items-center gap-3"><span>📄</span> ${ssrInterpolate(unref(data).resume.title)}</h1></div><div class="text-right"><div class="text-3xl font-extrabold gradient-text">${ssrInterpolate(unref(data).resume.currentScore || 85)}점</div><div class="text-xs text-gray-400">현재 평가 점수</div></div></div>`);
        if (unref(data).refinementHistory && unref(data).refinementHistory.length > 0) {
          _push(`<div class="space-y-6"><h2 class="text-lg font-bold text-white flex items-center gap-2"><span>✨</span> AI 비동기 체인 평가 &amp; 개선 결과 </h2><!--[-->`);
          ssrRenderList(unref(data).refinementHistory, (ref) => {
            _push(`<div class="glass-panel rounded-2xl p-6 space-y-6"><div class="flex items-center justify-between border-b border-white/10 pb-4"><div class="flex items-center gap-2"><span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">${ssrInterpolate(ref.step)} Stage </span><span class="text-xs text-gray-400">점수: ${ssrInterpolate(ref.score)}점</span></div><span class="text-xs text-gray-500">${ssrInterpolate(new Date(ref.createdAt).toLocaleString())}</span></div>`);
            if (ref.evaluationFeedback) {
              _push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2"><div class="text-xs font-bold text-emerald-400">💡 주요 강점 (Strengths)</div><ul class="text-xs text-emerald-200/80 space-y-1 list-disc list-inside"><!--[-->`);
              ssrRenderList(ref.evaluationFeedback.strengths, (s, idx) => {
                _push(`<li>${ssrInterpolate(s)}</li>`);
              });
              _push(`<!--]--></ul></div><div class="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2"><div class="text-xs font-bold text-rose-400">⚠️ 개선 권장사항 (Weaknesses)</div><ul class="text-xs text-rose-200/80 space-y-1 list-disc list-inside"><!--[-->`);
              ssrRenderList(ref.evaluationFeedback.weaknesses, (w, idx) => {
                _push(`<li>${ssrInterpolate(w)}</li>`);
              });
              _push(`<!--]--></ul></div></div>`);
            } else {
              _push(`<!---->`);
            }
            if (ref.improvedContent) {
              _push(`<div class="space-y-2"><div class="text-xs font-bold text-purple-300">✨ AI 최종 고도화 재작성 이력서 본문</div><div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">${ssrInterpolate(ref.improvedContent)}</div></div>`);
            } else {
              _push(`<!---->`);
            }
            _push(`</div>`);
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="glass-card rounded-2xl p-6 space-y-4"><h3 class="text-sm font-bold text-gray-300">원본 이력서 텍스트 (Original Draft)</h3><div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">${ssrInterpolate(unref(data).resume.originalContent)}</div></div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/resume/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-BVwqdbUi.mjs.map
