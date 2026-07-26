import { _ as __nuxt_component_0 } from './server.mjs';
import { defineComponent, mergeProps, withCtx, createTextVNode, createVNode, resolveDirective, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrGetDirectiveProps } from 'vue/server-renderer';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "StatCard",
  __ssrInlineRender: true,
  props: {
    label: {},
    value: {},
    icon: {},
    trend: {},
    trendPositive: { type: Boolean }
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _directive_91if93 = resolveDirective("[if]");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "glass-card rounded-2xl p-5 relative overflow-hidden group" }, _attrs))}><div class="flex items-center justify-between"><div><p class="text-xs font-medium text-gray-400 uppercase tracking-wider">${ssrInterpolate(__props.label)}</p><h3 class="text-2xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform origin-left">${ssrInterpolate(__props.value)}</h3></div><div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">${ssrInterpolate(__props.icon)}</div></div><div${ssrRenderAttrs(mergeProps({
        class: ["mt-3 flex items-center gap-1 text-xs", __props.trendPositive ? "text-emerald-400" : "text-purple-400"]
      }, ssrGetDirectiveProps(_ctx, _directive_91if93, __props.trend)))}><span>${ssrInterpolate(__props.trendPositive ? "↑" : "✦")}</span><span>${ssrInterpolate(__props.trend)}</span></div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/StatCard.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const StatCard = Object.assign(_sfc_main$1, { __name: "StatCard" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "space-y-8" }, _attrs))}><div class="glass-card rounded-3xl p-8 border border-purple-500/20 relative overflow-hidden"><div class="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-purple-600/30 to-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div><div class="max-w-2xl space-y-4 relative z-10"><div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold"><span>🚀</span> AI 커리어 청지기 (Kairos Stewardship) </div><h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"> 당신의 취업 성공을 완성하는 <br><span class="gradient-text">맞춤형 AI 가이던스 플랫폼</span></h1><p class="text-gray-300 text-sm sm:text-base leading-relaxed"> 이력서 비동기 3단계 개선, 실시간 SSE 스트리밍 모의 면접, ATS 분석, AI 문체 자연화 및 pgvector 기반 시맨틱 검색을 제공합니다. </p><div class="pt-2 flex flex-wrap gap-4">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/resume",
        class: "px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition-all"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` 이력서 생성 &amp; 평가 시작 `);
          } else {
            return [
              createTextVNode(" 이력서 생성 & 평가 시작 ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/ats",
        class: "px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-sm font-semibold border border-white/10 transition-all"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` ATS 매칭 분석 `);
          } else {
            return [
              createTextVNode(" ATS 매칭 분석 ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">`);
      _push(ssrRenderComponent(StatCard, {
        label: "등록된 이력서",
        value: "3 건",
        icon: "📝",
        trend: "최근 평가 점수 94점",
        trendPositive: ""
      }, null, _parent));
      _push(ssrRenderComponent(StatCard, {
        label: "완료된 모의 면접",
        value: "8 회",
        icon: "🎙️",
        trend: "평균 답변 완성도 +15%",
        trendPositive: ""
      }, null, _parent));
      _push(ssrRenderComponent(StatCard, {
        label: "ATS 매칭 분석",
        value: "92%",
        icon: "🎯",
        trend: "목표 직무 최적화 완료",
        trendPositive: ""
      }, null, _parent));
      _push(ssrRenderComponent(StatCard, {
        label: "시맨틱 벡터 경력",
        value: "12 개",
        icon: "⚡",
        trend: "pgvector 1536-dim"
      }, null, _parent));
      _push(`</div><div><h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2"><span>⭐</span> Kairos 핵심 AI 기능 </h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/resume",
        class: "glass-card rounded-2xl p-6 hover:border-purple-500/50 transition-all group"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform"${_scopeId}> 📑 </div><h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition-colors"${_scopeId}>Resume Refinement</h3><p class="text-xs text-gray-400 mt-2 leading-relaxed"${_scopeId}> 초안 작성부터 LLM 객관적 평가, 완성본 재작성까지 비동기 3단계 체인으로 자동 고도화합니다. </p>`);
          } else {
            return [
              createVNode("div", { class: "w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform" }, " 📑 "),
              createVNode("h3", { class: "text-lg font-bold text-white group-hover:text-purple-300 transition-colors" }, "Resume Refinement"),
              createVNode("p", { class: "text-xs text-gray-400 mt-2 leading-relaxed" }, " 초안 작성부터 LLM 객관적 평가, 완성본 재작성까지 비동기 3단계 체인으로 자동 고도화합니다. ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/interview",
        class: "glass-card rounded-2xl p-6 hover:border-cyan-500/50 transition-all group"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform"${_scopeId}> 🎙️ </div><h3 class="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors"${_scopeId}>AI Mock Interview</h3><p class="text-xs text-gray-400 mt-2 leading-relaxed"${_scopeId}> SSE 스트리밍 기술로 끊김 없는 실시간 꼬리질문과 답변 세부 피드백을 전달합니다. </p>`);
          } else {
            return [
              createVNode("div", { class: "w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform" }, " 🎙️ "),
              createVNode("h3", { class: "text-lg font-bold text-white group-hover:text-cyan-300 transition-colors" }, "AI Mock Interview"),
              createVNode("p", { class: "text-xs text-gray-400 mt-2 leading-relaxed" }, " SSE 스트리밍 기술로 끊김 없는 실시간 꼬리질문과 답변 세부 피드백을 전달합니다. ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/humanizer",
        class: "glass-card rounded-2xl p-6 hover:border-amber-500/50 transition-all group"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform"${_scopeId}> ✨ </div><h3 class="text-lg font-bold text-white group-hover:text-amber-300 transition-colors"${_scopeId}>AI Humanizer</h3><p class="text-xs text-gray-400 mt-2 leading-relaxed"${_scopeId}> AI 특유의 진부하거나 정형화된 어조를 감쪽같이 자연스러운 전문 인간 문체로 교정합니다. </p>`);
          } else {
            return [
              createVNode("div", { class: "w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform" }, " ✨ "),
              createVNode("h3", { class: "text-lg font-bold text-white group-hover:text-amber-300 transition-colors" }, "AI Humanizer"),
              createVNode("p", { class: "text-xs text-gray-400 mt-2 leading-relaxed" }, " AI 특유의 진부하거나 정형화된 어조를 감쪽같이 자연스러운 전문 인간 문체로 교정합니다. ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-DtGWg1eO.mjs.map
