# KAIROS_MASTER_PLAN.md — 작성 완료 보고

**파일 위치**: [KAIROS_MASTER_PLAN.md](file:///home/rheehoselenovo2/orca/Kairos/docs/Idea-Real_tion/계획서/KAIROS_MASTER_PLAN.md)  
**커밋**: `a306144` — `docs: Kairos 마스터 계획서 초판 작성`  
**총 라인**: 937줄 (약 45,000자)

---

## 계획서 구조 요약

| 챕터 | 내용 |
|------|------|
| **1. 이름의 의미** | 카이로스(Καιρός) — 결정적 순간, 여호와의 시간 |
| **2. 비전 선언문** | "AI 자소서가 아니다. 커리어 OS + SNS + AI 에이전트" |
| **3. 5대 기능 도메인** | 커리어개발관리(으뜸) / 업무자동화 / 배포&개발 / 미술창작 / 업무대리에이전트 |
| **4. 플랫폼 전략** | Web(Astro+Nuxt) → Mobile(React Native) → Desktop(Tauri v2) → Ext/CLI/IDE |
| **5. 기술 아키텍처** | Astro 아일랜드 + Nuxt 4 + Neon pgvector + Redis Cloud 시맨틱 캐싱 |
| **6. 에이전트 생태계** | MCP허브, 다중에이전트 오케스트레이터, 외부연동(Make/n8n/Zapier/Kakao) |
| **7. 수익 모델** | Free/Pro/Team/Enterprise + 자동마진장치(사용량 기반 자동메일) |
| **8. 데이터 영속성** | 고유URL 공개 옵션(ChatGPT처럼), Cloudflare R2, DB스키마 확장 계획 |
| **9. 현재 상태** | Phase 0-8 완료, 10가지 프로덕션 갭 |
| **10. 단기 로드맵** | Sprint 1-4 구체적 체크리스트 (예선 D-2 대응) |
| **11. 중장기 비전** | Phase A(0-6m) → B(6-12m) → C(12-24m) → D(24m+) |
| **12. Web3/Blockchain** | Solidity + Polygon + MetaMask, 초초베타 → 정식 |
| **13. 디자인 원칙** | 우주 메타포, Glassmorphism, CUI는 보조적으로 |
| **14. AI 보완 항목** | HWP편집, 영상면접, MCP자체서버, SNS기능, 보안정책, a11y |

---

## 핵심 인사이트

> **Kairos = 커리어OS + 커리어SNS + AI 에이전트 오케스트레이터 + 창작스튜디오 + 업무자동화 + 배포/개발허브**

### AI가 추가로 채워 넣은 항목들

1. **HWP/HWPX 편집 구현 전략** (3가지 옵션 + 권장사항)
2. **영상/음성 면접** 기술 스택 (WebRTC + Whisper + MediaPipe)
3. **Kairos를 MCP 서버로 노출** — 다른 AI 에이전트가 Kairos를 도구로 사용
4. **SNS 기능 상세** — 커리어 인증 배지, 멘토-멘티 연결, 성장 타임라인
5. **보안 & 개인정보 정책** — AES-256 암호화, GDPR 대응
6. **AI 윤리 & 환각 방지** — RAG, confidence score, 인용 표시
7. **접근성 (a11y)** — WCAG AA, 스크린 리더, 키보드 네비
8. **자동마진장치 상세** — 경고 1/2단계, 설정 파라미터, 월별 손익 대시보드
