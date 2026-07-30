# ChaekList — 학습 기록 및 Kairos 적용 방안

> 분석일: 2026-07-30 | Java + React 프로젝트
> 원본: https://github.com/kyechan99/ChaekList

---

## 1. 전체 아키텍처

### 레이어드 아키텍처 (Backend)
```
Controller → Service → Repository (JPA + JdbcTemplate 혼용)
     │           │            │
     │      ┌────┘            └── Entity
     │      ▼
     DTO  Domain (Entity)
```

### 컴포넌트 기반 아키텍처 (Frontend)
```
App.jsx (Context + Router + Layout)
  ├── Header (global nav + search + auth)
  ├── Pages (feature modules)
  │     └── 각 페이지는 재사용 컴포넌트로 구성
  └── Footer
```

### 핵심 설계 원칙
- **Package-by-domain**: backend를 기술 계층이 아닌 도메인 단위로 분할
- **단일 DTO 파일**: 모든 DTO를 `dto/` 아래 단일 파일(또는 도메인별 파일)에 집중
- **하이브리드 데이터 액세스**: JPA Repository + JdbcTemplate 혼용 (복잡한 통계/랭킹 쿼리는 JdbcTemplate)
- **Custom Exception 계층**: 비즈니스 예외를 도메인별로 세분화 (RuntimeException extends)
- **Idempotency Key**: 모든 쓰기 작업에 타임스탬프 기반 idempotencyKey 전송 → 중복 요청 방지

---

## 2. Frontend 설계 패턴

### 2.1 4-State 데이터 로딩 패턴 (필수 도입)
모든 페이지가 일관된 4가지 상태를 가짐:

```
loading   → "불러오는 중입니다." 텍스트 또는 Skeleton UI
ready     → 실제 데이터 렌더링
error     → fallback 데이터 + notice 배너
empty     → action-oriented CTA ("아직 없습니다. OO하러 가기")
```

**코드 패턴:**
```jsx
const [items, setItems] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState("");

// Cleanup flag (race condition 방지)
useEffect(() => {
  let ignore = false;
  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/...");
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      if (!ignore) setItems(data);
    } catch (e) {
      if (!ignore) setErrorMessage(e.message);
    } finally {
      if (!ignore) setIsLoading(false);
    }
  }
  load();
  return () => { ignore = true; };
}, []);
```

### 2.2 Normalizer Pattern
API 응답을 컴포넌트에 맞게 정규화하는 함수:
```jsx
function withDisplayDefaults(book) {
  if (!book) return null;
  return {
    ...book,
    cover: book.cover ?? coverPalette[book.category] ?? "bg-[#1E2A38]",
    keywords: book.keywords ?? [],
    saved: Boolean(book.saved),
  };
}
```

### 2.3 Fallback Data Pattern
API 실패 시 정적 fallback 데이터로 전환:
```jsx
const fallbackData = useMemo(() => createFallbackData(), []);
const [data, setData] = useState(fallbackData);
// API 성공 시 갱신, 실패 시 fallback 유지
```

### 2.4 Action-Oriented Empty State
```jsx
function EmptyState({ message, actionLabel, to }) {
  return (
    <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm text-[#6B7280]">
      <p>{message}</p>
      <Link className="mt-4 inline-flex rounded-md bg-[#1E2A38] px-4 py-2 text-sm font-semibold text-white" to={to}>
        {actionLabel}
      </Link>
    </div>
  );
}
```

### 2.5 401 Auto-Logout Pattern
모든 API 호출에서 401 수신 시 자동 로그아웃 + 리디렉션:
```jsx
if (response.status === 401) {
  logout(); // localStorage clear + state reset
  return;
}
```

### 2.6 상태 관리
- **Auth만 Context** (createContext + useContext), 나머지는 **모두 로컬 useState**
- 전역 상태 라이브러리 불필요 (Redux/Zustand 없음)
- localStorage에 auth session 저장 (`chaeklist.auth` key)

### 2.7 반응형 레이아웃 패턴
```jsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
  <aside>사이드바</aside>
  <div>메인 콘텐츠</div>
</div>
```

---

## 3. Backend 설계 패턴

### 3.1 Controller 패턴
```java
@RestController
@RequestMapping("/api/domain")
public class DomainController {
    @GetMapping
    public ApiResponse<List<DTO>> list() { ... }
    
    @GetMapping("/{id}")
    public ApiResponse<DTO> get(@PathVariable Long id) { ... }
    
    @PostMapping
    public ApiResponse<DTO> create(@Valid @RequestBody Req req) { ... }
}
```
- 일관된 `ApiResponse<T>` 래퍼 사용
- @Valid로 입력 검증
- 비즈니스 예외는 Service에서 throw, ControllerAdvice에서 처리

### 3.2 Service 패턴
- `@Transactional(readOnly = true)` 기본
- 쓰기 메서드만 `@Transactional`
- DTO ↔ Entity 변환은 Service 계층에서
- 복잡한 비즈니스 로직은 private 메서드로 분할

### 3.3 Idempotency (멱등성) 패턴
```java
// 클라이언트가 보낸 idempotencyKey로 중복 체크
Optional<Entity> existing = repository.findByIdempotencyKey(key);
if (existing.isPresent()) return existing.get();
```

### 3.4 Custom Exception 계층
```java
public abstract class BusinessException extends RuntimeException {
    private final int statusCode;
    private final String errorCode;
}

public class ResourceNotFoundException extends BusinessException { ... }
public class DuplicateResourceException extends BusinessException { ... }
public class UnauthorizedException extends BusinessException { ... }
```

### 3.5 스코어링 엔진 패턴 (추천 시스템)
```java
public class RecommendationEngine {
    public List<Book> recommend(User user) {
        int score = 0;
        score += calculateCategoryMatch(user.getInterests());
        score += calculateAuthorMatch(user.getReadHistory());
        score += calculateDifficultyMatch(user.getReadingLevel());
        return rankByScore(books, score);
    }
}
```

---

## 4. UI/UX 디자인 패턴

### 4.1 컬러 팔레트
| 역할 | 값 | 용도 |
|------|------|------|
| 배경 | `#F5F3EF` (warm beige) | 페이지 전체 배경 |
| 카드 배경 | `#FFFFFF` | 컨텐츠 카드 |
| 테두리 | `#E5E7EB` | border, divider |
| 프라이머리 | `#1E2A38` (dark navy) | 헤딩, 버튼, 활성 nav |
| 세컨더리 | `#6B7280` (gray) | 보조 텍스트, muted |
| 초록 | `#4CAF50` | 배지, 성공, 긍정 지표 |
| 호박색 | `#F59E0B` | 트렌딩, 성장률, 1등 |
| 빨강 | `#991B1B` | 위험, 탈퇴 |

### 4.2 카드 스타일
```css
.rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm
```
모든 페이지 동일한 카드 스타일 사용

### 4.3 타이포그래피
- 폰트: Pretendard (한글 최적화)
- 본문: text-sm (14px) / text-base (16px)
- 헤딩: text-xl ~ text-3xl
- 라인 높이: leading-6 (24px) 본문, leading-tight 헤딩

### 4.4 반응형 그리드
```
mobile: 1열
md:     2열
lg:     3열 (sidebar 280px + main fluid)
xl:     3열 이상
```

### 4.5 Skeleton Loading (랭킹 페이지)
```jsx
{Array.from({ length: 5 }).map((_, i) => (
  <div className="flex gap-4 p-5" key={i}>
    <div className="h-14 w-14 shrink-0 rounded-md bg-[#E5E7EB]" />
    <div className="min-w-0 flex-1 space-y-3">
      <div className="h-4 w-2/3 rounded bg-[#E5E7EB]" />
      <div className="h-3 w-1/3 rounded bg-[#E5E7EB]" />
    </div>
  </div>
))}
```

---

## 5. Kairos 적용 방안

### 즉시 적용 가능 (높은 영향도)
1. **4-State 패턴 도입**: 모든 Kairos 페이지에 loading/ready/error/empty 상태 일관 적용
2. **Cleanup Flag**: useEffect에 `let ignore = false` 패턴 → race condition 방지
3. **Action-Oriented Empty State**: "데이터가 없습니다" 대신 "OO하러 가기" CTA
4. **401 Auto-Logout**: 모든 API 호출에서 401 감지 시 자동 로그아웃

### 단기 적용 (중간 영향도)
5. **Normalizer Pattern**: API 응답 정규화 함수 도입 (withDisplayDefaults)
6. **Idempotency Key**: 쓰기 API에 중복 요청 방지 키 추가
7. **Skeleton Loading**: 데이터 로딩 중 스켈레톤 UI 표시
8. **Fallback Data**: 모든 페이지에 정적 fallback 데이터 준비

### 장기 적용 (아키텍처 개선)
9. **일관된 API 응답 래퍼**: ApiResponse<T> 패턴 도입
10. **Custom Exception 계층**: 비즈니스 예외 세분화
11. **스코어링 엔진**: 추천/매칭 시스템에 점수 기반 알고리즘 도입
