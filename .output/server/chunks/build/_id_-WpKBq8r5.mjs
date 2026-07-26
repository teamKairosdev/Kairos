import { b as useRoute, _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, ref, mergeProps, withCtx, createTextVNode, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrIncludeBooleanAttr } from 'vue/server-renderer';
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
  setup(__props) {
    const route = useRoute();
    route.params.id;
    const messages = ref([
      {
        sender: "interviewer",
        message: "안녕하세요! Kairos AI 면접에 오신 것을 환영합니다. 먼저 지원하신 직무와 핵심 경험에 대해 간단히 소개해 주시겠습니까?"
      }
    ]);
    const inputMessage = ref("");
    const isStreaming = ref(false);
    ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-6 flex flex-col h-[calc(100vh-140px)]" }, _attrs))}><div class="glass-panel rounded-2xl p-4 flex items-center justify-between border border-cyan-500/20 shrink-0"><div class="flex items-center gap-3">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/interview",
        class: "text-xs text-cyan-400 hover:underline"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` ← 면접 목록 `);
          } else {
            return [
              createTextVNode(" ← 면접 목록 ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<div class="h-4 w-[1px] bg-white/10"></div><h1 class="text-lg font-bold text-white flex items-center gap-2"><span>🎙️</span> AI 면접 스튜디오 실시간 세션 </h1></div><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span><span class="text-xs text-emerald-300 font-semibold">SSE Streaming Active</span></div></div><div class="flex-1 glass-panel rounded-2xl p-6 overflow-y-auto space-y-6 border border-white/10"><!--[-->`);
      ssrRenderList(unref(messages), (msg, idx) => {
        _push(`<div class="${ssrRenderClass([msg.sender === "candidate" ? "flex-row-reverse" : "", "flex gap-4"])}"><div class="${ssrRenderClass([msg.sender === "candidate" ? "bg-purple-600 text-white" : "bg-cyan-600 text-white", "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm shadow-md"])}">${ssrInterpolate(msg.sender === "candidate" ? "나" : "AI")}</div><div class="max-w-2xl space-y-2"><div class="${ssrRenderClass([msg.sender === "candidate" ? "bg-purple-600/30 border border-purple-500/40 text-purple-100 rounded-tr-none" : "bg-slate-900/90 border border-cyan-500/30 text-gray-200 rounded-tl-none", "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"])}">${ssrInterpolate(msg.message)}</div>`);
        if (msg.feedback) {
          _push(`<div class="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-1"><div class="flex items-center justify-between text-cyan-300 font-bold"><span>💡 AI 답변 피드백</span><span>${ssrInterpolate(msg.feedback.score)}점</span></div><p class="text-gray-300">${ssrInterpolate(msg.feedback.summary)}</p><p class="text-cyan-200/70 font-mono text-[11px]">Tip: ${ssrInterpolate(msg.feedback.tip)}</p></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      });
      _push(`<!--]-->`);
      if (unref(isStreaming)) {
        _push(`<div class="flex gap-4"><div class="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-sm"> AI </div><div class="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-sm text-cyan-300 animate-pulse"> 면접관이 다음 질문을 실시간 스트리밍으로 작성 중입니다... </div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="glass-panel rounded-2xl p-4 border border-white/10 shrink-0"><form class="flex items-center gap-3"><textarea rows="2" placeholder="면접관의 질문에 답변을 입력하세요 (Shift + Enter로 줄바꿈)..." class="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none">${ssrInterpolate(unref(inputMessage))}</textarea><button type="submit"${ssrIncludeBooleanAttr(unref(isStreaming) || !unref(inputMessage).trim()) ? " disabled" : ""} class="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50 h-full"> 답변 제출 ⚡ </button></form></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/interview/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-WpKBq8r5.mjs.map
