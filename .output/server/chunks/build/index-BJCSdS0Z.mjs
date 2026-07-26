import { defineComponent, ref, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate, ssrRenderList } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const targetRole = ref("시니어 풀스택 개발자");
    const questionCount = ref(5);
    const careerSummary = ref(`TypeScript, Nuxt 4, Node.js 기반 Web App 구축 4년 경력. PostgreSQL 및 pgvector 시맨틱 검색 엔진 구현 경험 보유.`);
    const loading = ref(false);
    const qaSet = ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div><h1 class="text-2xl font-extrabold text-white flex items-center gap-2"><span>💡</span> 예상 면접 Q&amp;A 플래시카드 생성기 </h1><p class="text-xs text-gray-400 mt-1"> 지원 직무와 경력 사항을 기반으로 적중률 높고 심도 있는 예상 질문과 최고 품질 모범 답안 세트를 생성합니다. </p></div><div class="glass-panel rounded-2xl p-6 space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-xs font-semibold text-gray-300 mb-1">목표 지원 직무</label><input${ssrRenderAttr("value", unref(targetRole))} type="text" placeholder="예: 백엔드 테크 리드" class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">생성할 질문 개수</label><select class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"><option${ssrRenderAttr("value", 3)}${ssrIncludeBooleanAttr(Array.isArray(unref(questionCount)) ? ssrLooseContain(unref(questionCount), 3) : ssrLooseEqual(unref(questionCount), 3)) ? " selected" : ""}>3 개 질문 세트</option><option${ssrRenderAttr("value", 5)}${ssrIncludeBooleanAttr(Array.isArray(unref(questionCount)) ? ssrLooseContain(unref(questionCount), 5) : ssrLooseEqual(unref(questionCount), 5)) ? " selected" : ""}>5 개 질문 세트</option><option${ssrRenderAttr("value", 7)}${ssrIncludeBooleanAttr(Array.isArray(unref(questionCount)) ? ssrLooseContain(unref(questionCount), 7) : ssrLooseEqual(unref(questionCount), 7)) ? " selected" : ""}>7 개 질문 세트</option></select></div></div><div><label class="block text-xs font-semibold text-gray-300 mb-1">본인 경력 요약 또는 기술 배경</label><textarea rows="4" placeholder="주요 프로젝트, 사용 언어/프레임워크, 해결한 난관 등을 요약해 입력하세요..." class="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500">${ssrInterpolate(unref(careerSummary))}</textarea></div><button${ssrIncludeBooleanAttr(unref(loading) || !unref(targetRole) || !unref(careerSummary)) ? " disabled" : ""} class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50">`);
      if (unref(loading)) {
        _push(`<span>맞춤형 Q&amp;A 세트 생성 중...</span>`);
      } else {
        _push(`<span>Q&amp;A 질문/모범답안 세트 생성 ⚡</span>`);
      }
      _push(`</button></div>`);
      if (unref(qaSet)) {
        _push(`<div class="space-y-4"><h2 class="text-lg font-bold text-white flex items-center gap-2"><span>📚</span> ${ssrInterpolate(unref(qaSet).targetRole)} 맞춤형 Q&amp;A 플래시카드 </h2><div class="space-y-4"><!--[-->`);
        ssrRenderList(unref(qaSet).qaPairs, (qa, idx) => {
          _push(`<div class="glass-card rounded-2xl p-6 space-y-4 hover:border-purple-500/40 transition-all"><div class="flex items-start justify-between gap-4"><div class="space-y-1"><div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30"> Q${ssrInterpolate(idx + 1)} · ${ssrInterpolate(qa.questionCategory)}</span><span class="text-[10px] text-gray-400">난이도: ${ssrInterpolate(qa.difficulty)}</span></div><h3 class="text-base font-bold text-white leading-relaxed">${ssrInterpolate(qa.question)}</h3></div></div><div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2"><div class="text-xs font-bold text-emerald-400">✅ 추천 모범 답변 (Model Answer)</div><p class="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">${ssrInterpolate(qa.sampleAnswer)}</p></div>`);
          if (qa.keyPoints && qa.keyPoints.length > 0) {
            _push(`<div class="flex flex-wrap gap-2 pt-1"><span class="text-xs text-purple-300 font-semibold">핵심 수록 포인트:</span><!--[-->`);
            ssrRenderList(qa.keyPoints, (kp, kIdx) => {
              _push(`<span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-200 border border-purple-500/20 text-[11px]"> #${ssrInterpolate(kp)}</span>`);
            });
            _push(`<!--]--></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        });
        _push(`<!--]--></div></div>`);
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/qa/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-BJCSdS0Z.mjs.map
