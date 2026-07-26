import { defineComponent, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderList } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const originalText = ref(`본 지원자는 지난 3년간 웹 프론트엔드 개발 프로젝트 수행에 있어 프론트엔드 성능 최적화 관점에서 다각도로 접근하여 효율적인 리팩토링을 완수함에 있어 큰 성과를 거두었습니다.`);
    const loading = ref(false);
    const result = ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div><h1 class="text-2xl font-extrabold text-white flex items-center gap-2"><span>✨</span> AI 문장 휴머니자이저 (Humanizer) </h1><p class="text-xs text-gray-400 mt-1"> AI 특유의 진부한 어조(~에 대한, ~의 관점에서, 피동형 표현)를 감쪽같이 걷어내고 설득력 높은 자연스러운 인간 문체로 리라이팅합니다. </p></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="glass-panel rounded-2xl p-6 space-y-4"><h3 class="text-sm font-bold text-white flex items-center gap-2"><span>🤖</span> 원본 AI/정형화된 문장 입력 </h3><textarea rows="12" placeholder="교정할 자기소개서, 이력서 문장 또는 커버레터를 입력하세요..." class="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 leading-relaxed resize-none">${ssrInterpolate(unref(originalText))}</textarea><button${ssrIncludeBooleanAttr(unref(loading) || !unref(originalText).trim()) ? " disabled" : ""} class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50">`);
      if (unref(loading)) {
        _push(`<span>인간 문체로 자연스럽게 리라이팅 중...</span>`);
      } else {
        _push(`<span>AI 문체 휴머니즈 변환 ⚡</span>`);
      }
      _push(`</button></div><div class="glass-panel rounded-2xl p-6 space-y-4 border border-amber-500/20"><div class="flex items-center justify-between"><h3 class="text-sm font-bold text-amber-300 flex items-center gap-2"><span>✨</span> 자연스러운 인간 작성 변환 결과 </h3>`);
      if (unref(result)) {
        _push(`<div class="text-right"><span class="text-xs text-gray-400">자연스러움 지수: </span><span class="text-lg font-bold text-amber-400">${ssrInterpolate(unref(result).styleScore)}점</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      if (unref(result)) {
        _push(`<div class="space-y-4"><div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">${ssrInterpolate(unref(result).humanizedText)}</div><div class="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-2"><div class="font-bold text-amber-300">💡 변환 요약 &amp; 제거된 상투적 표현</div><p class="text-gray-300">${ssrInterpolate(unref(result).changesSummary)}</p>`);
        if (unref(result).removedClichés && unref(result).removedClichés.length > 0) {
          _push(`<div class="flex flex-wrap gap-1.5 pt-1"><!--[-->`);
          ssrRenderList(unref(result).removedClichés, (c, idx) => {
            _push(`<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[11px]"><s>${ssrInterpolate(c)}</s></span>`);
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      } else {
        _push(`<div class="h-64 flex flex-col items-center justify-center text-center text-gray-500 space-y-2"><div class="text-3xl">✨</div><p class="text-xs">왼쪽에서 문장을 입력하고 변환 버튼을 누르면 이곳에 세련된 변환 결과가 표시됩니다.</p></div>`);
      }
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/humanizer/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-BE8XKFwA.mjs.map
