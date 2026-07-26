import { c as useFetch, a as useRouter, _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, ref, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrInterpolate, ssrRenderComponent, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
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
    const { data: interviews } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/interviews",
      "$xiO7YwzXEV"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    const showCreateModal = ref(false);
    const jobTitle = ref("");
    const companyName = ref("");
    const difficulty = ref("medium");
    const loading = ref(false);
    useRouter();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 class="text-2xl font-extrabold text-white flex items-center gap-2"><span>🎙️</span> AI 모의 면접 (Mock Interview via SSE) </h1><p class="text-xs text-gray-400 mt-1"> 실시간 SSE 스트리밍 기술로 끊김 없는 맞춤형 면접관 LLM과의 일대일 면접 세션을 진행하세요. </p></div><button class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-md shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"><span>⚡</span> 신규 모의 면접 시작 </button></div><div class="space-y-4"><h2 class="text-lg font-bold text-white">진행 중 및 이전 면접 세션</h2>`);
      if (unref(interviews) && unref(interviews).length > 0) {
        _push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><!--[-->`);
        ssrRenderList(unref(interviews), (item) => {
          _push(`<div class="glass-panel rounded-2xl p-6 hover:border-cyan-500/40 transition-all space-y-4"><div class="flex items-start justify-between"><div><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${ssrInterpolate(item.difficulty)} 난이도 </span><h3 class="text-lg font-bold text-white mt-2">${ssrInterpolate(item.jobTitle)}</h3><p class="text-xs text-gray-400">${ssrInterpolate(item.companyName || "목표 기업")}</p></div><div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center text-xl"> 🎙️ </div></div><div class="pt-2 flex items-center justify-between border-t border-white/5"><span class="text-[11px] text-gray-500">${ssrInterpolate(new Date(item.createdAt).toLocaleDateString())}</span>`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            to: `/interview/${item.id}`,
            class: "px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(` 면접장 입장 ⚡ `);
              } else {
                return [
                  createTextVNode(" 면접장 입장 ⚡ ")
                ];
              }
            }),
            _: 2
          }, _parent));
          _push(`</div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<div class="glass-panel rounded-2xl p-12 text-center text-gray-400 space-y-3"><div class="text-4xl">🎙️</div><p class="text-sm">생성된 모의 면접 세션이 없습니다. 신규 면접을 시작해 보세요.</p></div>`);
      }
      _push(`</div>`);
      if (unref(showCreateModal)) {
        _push(`<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"><div class="glass-panel rounded-3xl p-8 max-w-md w-full space-y-6 border border-white/15"><div class="flex items-center justify-between"><h2 class="text-xl font-bold text-white">신규 모의 면접 설정</h2><button class="text-gray-400 hover:text-white">✕</button></div><form class="space-y-4"><div><label class="block text-xs font-semibold text-gray-300 mb-1">지원 직무명</label><input${ssrRenderAttr("value", unref(jobTitle))} type="text" required placeholder="예: 시니어 풀스택 엔지니어" class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">목표 기업명 (선택)</label><input${ssrRenderAttr("value", unref(companyName))} type="text" placeholder="예: 카카오, 네이버, Kairos Labs" class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">면접 난이도</label><select class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"><option value="junior"${ssrIncludeBooleanAttr(Array.isArray(unref(difficulty)) ? ssrLooseContain(unref(difficulty), "junior") : ssrLooseEqual(unref(difficulty), "junior")) ? " selected" : ""}>주니어 (기초 꼬리질문)</option><option value="medium"${ssrIncludeBooleanAttr(Array.isArray(unref(difficulty)) ? ssrLooseContain(unref(difficulty), "medium") : ssrLooseEqual(unref(difficulty), "medium")) ? " selected" : ""}>미들 (실무 및 행동질문 중심)</option><option value="senior"${ssrIncludeBooleanAttr(Array.isArray(unref(difficulty)) ? ssrLooseContain(unref(difficulty), "senior") : ssrLooseEqual(unref(difficulty), "senior")) ? " selected" : ""}>시니어 (아키텍처 및 심층 기술 질문)</option></select></div><div class="flex justify-end gap-3 pt-2"><button type="button" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"> 취소 </button><button type="submit"${ssrIncludeBooleanAttr(unref(loading)) ? " disabled" : ""} class="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50">`);
        if (unref(loading)) {
          _push(`<span>면접 세션 생성 중...</span>`);
        } else {
          _push(`<span>면접장 입장 ⚡</span>`);
        }
        _push(`</button></div></form></div></div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/interview/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-CbhH4RYr.mjs.map
