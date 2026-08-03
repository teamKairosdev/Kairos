/**
 * Mock interceptor ported from app/plugins/mock-interceptor.client.ts
 * Patches global fetch when is_mock_mode is set in localStorage.
 * Call initMockInterceptor() in a client-side useEffect.
 */
import { getSimulatedLLMResponse } from '../data/mock/mockup';
import { analyzeATSCompatibility } from '../server/ats';

function deterministicScore(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
}

interface MockResume {
  id: string;
  userId: string;
  title: string;
  originalContent: string;
  improvedContent?: string;
  status: string;
  currentScore: number;
  createdAt: string;
  updatedAt?: string;
  demo?: boolean;
}

interface MockInterview {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  difficulty: string;
  status: string;
  overallScore: number | null;
  overallFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MockCareer {
  id: string;
  userId: string;
  createdAt: string;
  company?: string;
  role?: string;
  period?: string;
  description?: string;
  achievements?: string[];
  updatedAt?: string;
}

interface MockDoc {
  id: string;
  name: string;
  title: string;
  ext: string;
  size: number;
  createdAt: string;
  textContent?: string;
}

interface MockStudioImage {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  type: string;
  prompt?: string;
  originalFileName?: string;
  createdAt: string;
}

interface MockChatMessage {
  role: string;
  content: string;
  parts?: Array<{ type?: string; text?: string }>;
}

interface MockHumanizerEntry {
  id: string;
  originalText: string;
  humanizedText: string;
  createdAt: string;
}

interface MockRequestBody {
  title?: string;
  originalContent?: string;
  message?: string;
  currentContent?: string;
  messages?: MockChatMessage[];
  targetRole?: string;
  prompt?: string;
  text?: string;
  jobTitle?: string;
  difficulty?: string;
  companyName?: string;
  company?: string;
  role?: string;
  period?: string;
  description?: string;
  achievements?: string[];
  status?: string;
  overallScore?: number | null;
  overallFeedback?: string | null;
  originalText?: string;
  careerSummary?: string;
  count?: number;
  jobDescription?: string;
  resumeText?: string;
  resumeId?: string;
}

const DB_NAME = 'kairos-mock';
const DB_VERSION = 2;
const DOCUMENT_STORE = 'documents';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DOCUMENT_STORE)) {
        req.result.createObjectStore(DOCUMENT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DOCUMENT_STORE, 'readwrite');
    tx.objectStore(DOCUMENT_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCUMENT_STORE, 'readonly');
    const req = tx.objectStore(DOCUMENT_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DOCUMENT_STORE, 'readwrite');
    tx.objectStore(DOCUMENT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let installed = false;

export function initMockInterceptor() {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const isMock = localStorage.getItem('is_mock_mode') === 'true';
    if (!isMock) return originalFetch(input, init);

    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method?.toUpperCase() || (input instanceof Request ? input.method?.toUpperCase() : 'GET') || 'GET';
    const pathname = new URL(url, window.location.origin).pathname;
    const resumeRefineMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/refine$/);
    const resumeChatMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/chat$/);
    const interviewDetailMatch = pathname.match(/^\/api\/interviews\/([^/]+)$/);
    const interviewChatMatch = pathname.match(/^\/api\/interviews\/([^/]+)\/chat$/);

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    const readArray = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]') as T[];
    const readObject = <T>(key: string): T => JSON.parse(localStorage.getItem(key) || '{}') as T;
    const getBody = (init?: RequestInit): MockRequestBody => {
      const raw = init?.body;
      return (typeof raw === 'string' ? JSON.parse(raw) : {}) as MockRequestBody;
    };
    const getFormFile = (init?: RequestInit): { name?: string; ext: string } => {
      const raw = init?.body;
      if (!(raw instanceof FormData)) return { ext: '' };
      const file = raw.get('file');
      const name = file instanceof File ? file.name : String(raw.get('title') || '');
      const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
      return { name, ext };
    };
    const deleteById = <T extends { id?: string }>(key: string) => {
      const id = url.split('/').pop();
      const list = readArray<T>(key);
      localStorage.setItem(key, JSON.stringify(list.filter((item) => item.id !== id)));
    };

    // 1. Auth check
    if (url.includes('/api/auth/me') || url.includes('/api/auth/login')) {
      const storedUser = localStorage.getItem('mock_user');
      return json({ user: storedUser ? JSON.parse(storedUser) : null });
    }

    // 2. Resumes Endpoints
    if (pathname === '/api/resumes' && method === 'GET') {
      return json(readArray('mock_resumes'));
    }

    if (pathname === '/api/resumes' && method === 'POST') {
      const resumes = readArray<MockResume>('mock_resumes');
      const body = getBody(init);
      const newResume: MockResume = {
        id: `mock-res-${Date.now()}`,
        userId: readObject<{ id?: string }>('mock_user').id || 'mock-user',
        title: body.title || '새 이력서',
        originalContent: body.originalContent || '',
        improvedContent: '',
        status: 'draft',
        currentScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      resumes.unshift(newResume);
      localStorage.setItem('mock_resumes', JSON.stringify(resumes));
      return json(newResume);
    }

    if (resumeRefineMatch && method === 'POST') {
      const resumes = readArray<MockResume>('mock_resumes');
      const id = decodeURIComponent(resumeRefineMatch[1]);
      const idx = resumes.findIndex((r) => r.id === id);
      if (idx !== -1) {
        resumes[idx].status = 'improved';
        resumes[idx].currentScore = deterministicScore(resumes[idx].originalContent, 85, 98);
        resumes[idx].demo = true;
        resumes[idx].improvedContent = `# ${resumes[idx].title} | AI 고도화 버전\n\n## 핵심 성과\n- 해당 분야 실무 경험 및 핵심 기술 바탕으로 성과 지표 30% 개선\n- 주요 비즈니스 모듈 설계 및 리팩토링 주도`;
        localStorage.setItem('mock_resumes', JSON.stringify(resumes));
        return json(resumes[idx]);
      }
      return json({ error: 'Resume not found' }, 404);
    }

    if (resumeChatMatch && method === 'POST') {
      const body = getBody(init);
      const msg = body.message || '';
      const currentContent = body.currentContent || '';
      const { responseText, suggestedContent } = getSimulatedLLMResponse(msg, currentContent);
      return json({ responseText, suggestedContent });
    }

    if (url.match(/\/api\/resumes\/[^/]+/) && method === 'PUT') {
      const resumes = readArray<MockResume>('mock_resumes');
      const id = url.split('/').pop();
      const body = getBody(init);
      const idx = resumes.findIndex((r) => r.id === id);
      if (idx !== -1) {
        resumes[idx] = { ...resumes[idx], ...body, updatedAt: new Date().toISOString() };
        localStorage.setItem('mock_resumes', JSON.stringify(resumes));
        return json({ success: true });
      }
      return json({ error: 'Resume not found' }, 404);
    }

    if (url.match(/\/api\/resumes\/[^/]+$/) && method === 'GET') {
      const resumes = readArray<MockResume>('mock_resumes');
      const id = url.split('/').pop();
      const resume = resumes.find((r) => r.id === id);
      if (resume) {
        const refinementHistory = [
          {
            id: `refine-${id}`,
            resumeId: id,
            step: 'improve',
            draftContent: resume.originalContent,
            score: resume.currentScore || 85,
            improvedContent: resume.improvedContent || resume.originalContent,
            createdAt: resume.createdAt,
            evaluationFeedback: {
              strengths: [
                '구체적인 수치(23% 전환율 향상, LCP 1.1초)를 제시하여 성과를 명확히 입증함.',
                'React 및 Next.js 등 최신 프론트엔드 스택에 대한 깊은 지식과 리팩토링 능력이 드러남.',
                'Storybook 컴포넌트 라이브러리 설계 등 협업과 표준화를 고려한 역량이 강조됨.',
              ],
              weaknesses: [
                '각 프로젝트의 기술적 의사결정 과정과 발생했던 트러블슈팅 경험에 대한 서술이 다소 부족함.',
                '협업 구조에서 PM/디자이너 등 타 직군과의 커뮤니케이션 및 조율 방식이 잘 보이지 않음.',
              ],
              suggestions: [
                '결제 플로우 리팩토링 과정에서 구체적으로 어떤 기술적 이슈(예: Race Condition, 상태 동기화)를 해결했는지 1문장 추가하세요.',
                '컴포넌트 라이브러리 구축이 팀 전체의 배포 생산성에 미친 영향(예: UI 개발 주기 30% 단축)을 수치로 표현하세요.',
              ],
            },
          },
        ];
        return json({ resume, refinementHistory });
      }
      return json({ error: 'Resume not found' }, 404);
    }

    // 3. Interviews Endpoints
    if (pathname === '/api/interviews' && method === 'GET') {
      return json(readArray('mock_interviews'));
    }

    if (pathname === '/api/interviews' && method === 'POST') {
      const interviews = readArray<MockInterview>('mock_interviews');
      const body = getBody(init);
      const newInt: MockInterview = {
        id: `mock-int-${Date.now()}`,
        userId: readObject<{ id?: string }>('mock_user').id || 'mock-user',
        jobTitle: body.jobTitle || '기술 면접',
        companyName: body.companyName || 'Kairos',
        difficulty: body.difficulty || 'medium',
        status: 'in_progress',
        overallScore: null,
        overallFeedback: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      interviews.unshift(newInt);
      const previousInterviews = localStorage.getItem('mock_interviews');
      const previousChats = localStorage.getItem('mock_chats');
      const chats = readObject<Record<string, MockChatMessage[]>>('mock_chats');
      chats[newInt.id] = [{ role: 'assistant', content: `안녕하세요. ${newInt.companyName}의 ${newInt.jobTitle} 직무 면접에 지원해주셔서 감사드립니다. 먼저 준비하신 자기소개 부탁드립니다.` }];
      try {
        localStorage.setItem('mock_interviews', JSON.stringify(interviews));
        localStorage.setItem('mock_chats', JSON.stringify(chats));
      } catch (error) {
        try {
          if (previousInterviews === null) localStorage.removeItem('mock_interviews');
          else localStorage.setItem('mock_interviews', previousInterviews);
          if (previousChats === null) localStorage.removeItem('mock_chats');
          else localStorage.setItem('mock_chats', previousChats);
        } catch {
          // Best-effort rollback for storage failures.
        }
        throw error;
      }
      return json({ session: newInt });
    }

    if (interviewDetailMatch && method === 'GET') {
      const interviews = readArray<MockInterview>('mock_interviews');
      const id = decodeURIComponent(interviewDetailMatch[1]);
      const interview = interviews.find((i) => i.id === id);
      if (!interview) return json({ error: 'Not found' }, 404);
      const chats = readObject<Record<string, MockChatMessage[]>>('mock_chats');
      const messages = (chats[id || ''] || []).map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
      }));
      return json({ ...interview, messages });
    }

    if (interviewDetailMatch && method === 'PATCH') {
      const interviews = readArray<MockInterview>('mock_interviews');
      const id = decodeURIComponent(interviewDetailMatch[1]);
      const idx = interviews.findIndex((i) => i.id === id);
      if (idx === -1) return json({ error: 'Not found' }, 404);
      const body = getBody(init);
      if (body.status !== undefined) {
        if (body.status !== 'completed') {
          return json({ error: 'Only in-progress interviews can be completed' }, 400);
        }
        if (interviews[idx].status !== 'in_progress') {
          return json({ error: '면접이 이미 종료되었습니다.' }, 409);
        }
      }
      interviews[idx] = {
        ...interviews[idx],
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.overallScore !== undefined ? { overallScore: body.overallScore } : {}),
        ...(body.overallFeedback !== undefined ? { overallFeedback: body.overallFeedback } : {}),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('mock_interviews', JSON.stringify(interviews));
      return json({ success: true });
    }

    if (interviewChatMatch && method === 'POST') {
      const id = decodeURIComponent(interviewChatMatch[1]);
      const body = getBody(init);
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return json({ error: 'Messages are required' }, 400);
      }

      const interviews = readArray<MockInterview>('mock_interviews');
      const interview = interviews.find((item) => item.id === id);
      if (!interview) return json({ error: '면접 세션을 찾을 수 없습니다.' }, 404);
      if (interview.status !== 'in_progress') {
        return json({ error: '면접이 이미 종료되었습니다.' }, 409);
      }

      const lastMessage = body.messages[body.messages.length - 1];
      const userMessage = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
      const chats = readObject<Record<string, MockChatMessage[]>>('mock_chats');
      if (!chats[id]) chats[id] = [];
      const candidateTurn = chats[id].filter((message) => message.role === 'user').length;

      const answers = [
        '그 부분에 대한 구현 경험은 매우 중요한 포인트네요. 실제 실무에서 발생할 수 있는 동시성 이슈는 어떻게 예방하셨는지 상세히 말씀해주세요.',
        '답변 감사드립니다. 프로젝트 협업 과정에서 다른 직무(디자이너, PM)와의 의견 조율은 보통 어떤 방식으로 진행하셨나요?',
        '흥미로운 접근이네요. 만약 해당 설계가 실서버에 배포된 후 트래픽이 10배 이상 몰린다면 어떤 보완책을 세우시겠습니까?',
        '마지막 질문입니다. 이번 채용 직무에 있어서 본인만이 가지고 있는 가장 독보적인 역량은 무엇이라고 생각하시나요?',
      ];
      const answer = answers[Math.min(candidateTurn, answers.length - 1)];

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          let index = 0;
          const interval = setInterval(() => {
            if (index < answer.length) {
              controller.enqueue(encoder.encode(answer.slice(index, index + 3)));
              index += 3;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 40);
        },
      });

      chats[id].push({ role: 'user', content: userMessage });
      chats[id].push({ role: 'assistant', content: answer });
      localStorage.setItem('mock_chats', JSON.stringify(chats));

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // 4. Careers Endpoints
    if (url.includes('/api/careers/search')) {
      const careers = readArray<MockCareer>('mock_careers');
      const query = new URL(url, window.location.origin).searchParams.get('q') || '';
      return json({
        query,
        demo: true,
        results: careers.map((career) => ({
          ...career,
          similarity: deterministicScore(`${query}:${career.id}`, 75, 96) / 100,
        })),
      });
    }

    if (url.includes('/api/careers') && !url.match(/\/api\/careers\/[^/]+/) && method === 'GET') {
      return json(readArray<MockCareer>('mock_careers'));
    }

    if (url.includes('/api/careers') && !url.match(/\/api\/careers\/[^/]+/) && method === 'POST') {
      const careers = readArray<MockCareer>('mock_careers');
      const body = getBody(init);
      const newCareer: MockCareer = { id: `mock-car-${Date.now()}`, userId: 'mock-user', ...body, createdAt: new Date().toISOString() };
      careers.unshift(newCareer);
      localStorage.setItem('mock_careers', JSON.stringify(careers));
      return json(newCareer);
    }

    if (url.match(/\/api\/careers\/[^/]+$/) && method === 'PUT') {
      const careers = readArray<MockCareer>('mock_careers');
      const id = url.split('/').pop();
      const body = getBody(init);
      const idx = careers.findIndex((career) => career.id === id);
      if (idx === -1) return json({ error: 'Career not found' }, 404);
      careers[idx] = {
        ...careers[idx],
        ...body,
        period: body.period || '기타',
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('mock_careers', JSON.stringify(careers));
      return json({ id: careers[idx].id });
    }

    if (url.match(/\/api\/careers\/[^/]+/) && method === 'DELETE') {
      deleteById<MockCareer>('mock_careers');
      return json({ success: true });
    }

    // 5. Docs Endpoints
    if (url.includes('/api/docs/parse') && method === 'POST') {
      const raw = init?.body instanceof FormData ? init.body.get('file') : null;
      if (!(raw instanceof File)) return json({ error: 'File is required' }, 400);
      const ext = raw.name.split('.').pop()?.toLowerCase() || '';
      if (ext !== 'hwp' && ext !== 'hwpx') return json({ error: 'Unsupported format' }, 422);
      try {
        const { extractHwpText } = await import('@/lib/hwpTextExtract');
        const text = await extractHwpText(new Uint8Array(await raw.arrayBuffer()));
        return json({ text, demo: true });
      } catch {
        return json({ error: 'HWP 파싱 실패' }, 422);
      }
    }

    if (url.includes('/api/docs') && !url.match(/\/api\/docs\/[^/]+/) && method === 'GET') {
      return json(readArray<MockDoc>('mock_docs'));
    }

    if (url.includes('/api/docs/upload') && method === 'POST') {
      const docs = readArray<MockDoc>('mock_docs');
      const { name, ext } = getFormFile(init);
      const fileName = name || '신규_문서.pdf';
      const fileExt = ext || 'pdf';
      const id = `mock-doc-${Date.now()}`;
      const raw = init?.body instanceof FormData ? init.body.get('file') : null;
      let textContent = '';
      let size = 102400;
      if (raw instanceof File) {
        size = raw.size;
        if (fileExt === 'hwp' || fileExt === 'hwpx') {
          try {
            const { extractHwpText } = await import('@/lib/hwpTextExtract');
            textContent = await extractHwpText(new Uint8Array(await raw.arrayBuffer()));
          } catch {}
        }
        await idbPut(id, await raw.arrayBuffer());
      }
      const newDoc: MockDoc = { id, name: fileName, title: fileName, ext: fileExt, size, createdAt: new Date().toISOString(), textContent };
      docs.unshift(newDoc);
      localStorage.setItem('mock_docs', JSON.stringify(docs));
      return json(newDoc);
    }

    if (url.match(/\/api\/docs\/[^/]+/) && method === 'GET' && url.includes('text=1')) {
      const docs = readArray<MockDoc>('mock_docs');
      const id = url.split('/').pop()?.split('?')[0];
      const entry = docs.find((d) => d.id === id);
      if (!entry) return json({ error: 'Document not found' }, 404);
      return json({ id: entry.id, title: entry.name, ext: entry.ext, size: entry.size, createdAt: entry.createdAt, textContent: entry.textContent || '' });
    }

    if (url.match(/\/api\/docs\/[^/]+/) && method === 'GET') {
      const id = url.split('/').pop();
      if (!id) return originalFetch(input, init);
      const bytes = await idbGet(id);
      if (!(bytes instanceof ArrayBuffer)) return originalFetch(input, init);
      return new Response(bytes, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    }

    if (url.match(/\/api\/docs\/[^/]+/) && method === 'DELETE') {
      const id = url.split('/').pop();
      if (id) await idbDel(id);
      deleteById<MockDoc>('mock_docs');
      return json({ success: true });
    }

    // 6. Q&A Generation
    if (url.includes('/api/qa/list') && method === 'GET') {
      return json(readArray('mock_qa'));
    }

    if (url.includes('/api/qa/generate') && method === 'POST') {
      const body = getBody(init);
      const role = body.targetRole || '개발자';
      const qaSet = {
        id: `mock-qa-${Date.now()}`,
        title: `${role} 예상 면접 질문`,
        targetRole: role,
        qaPairs: [
          { question: `${role} 직무를 수행하면서 마주한 가장 큰 기술적 도전은 무엇이었으며 이를 어떻게 극복했나요?`, sampleAnswer: '대용량 트래픽이 몰렸을 때 비동기 큐 시스템을 설계하여 병목 구간의 로드를 60% 이상 줄인 경험이 있습니다.', keyPoints: ['병목 해결', '비동기 큐', '아키텍처 개선'], difficulty: 'easy' },
          { question: '협업 시 코드 리뷰나 아키텍처에 이견이 생길 때 조율하는 기준은 무엇인가요?', sampleAnswer: '공식 기술 문서와 벤치마킹 데이터를 기준으로 정량적인 장단점을 분석하여 합의점을 도출합니다.', keyPoints: ['객관적 지표', '코드 모범 사례'], difficulty: 'medium' },
        ],
        createdAt: new Date().toISOString(),
      };
      const qaSets = readArray('mock_qa');
      qaSets.unshift(qaSet);
      localStorage.setItem('mock_qa', JSON.stringify(qaSets));
      return json(qaSet);
    }

    // 7. ATS Matching
    if (url.includes('/api/ats/analyze') && method === 'POST') {
      const body = getBody(init);
      return json({
        analysis: analyzeATSCompatibility(body.resumeText || '', body.jobDescription || ''),
        demo: true,
      });
    }

    // 8. Photo Studio & Gallery
    if (url.includes('/api/studio/images') && method === 'GET') {
      return json({ images: readArray<MockStudioImage>('mock_studio_images') });
    }

    if (url.includes('/api/studio/generate') && method === 'POST') {
      const images = readArray<MockStudioImage>('mock_studio_images');
      const body = getBody(init);
      const newImg: MockStudioImage = { id: `mock-img-${Date.now()}`, imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60', width: 1024, height: 1024, type: 'generated', prompt: body.prompt || 'Professional profile photo', createdAt: new Date().toISOString() };
      images.unshift(newImg);
      localStorage.setItem('mock_studio_images', JSON.stringify(images));
      return json({ image: newImg });
    }

    if (url.includes('/api/studio/upload') && method === 'POST') {
      const images = readArray<MockStudioImage>('mock_studio_images');
      const newImg: MockStudioImage = { id: `mock-img-${Date.now()}`, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60', width: 1024, height: 1024, type: 'uploaded', originalFileName: 'profile.jpg', createdAt: new Date().toISOString() };
      images.unshift(newImg);
      localStorage.setItem('mock_studio_images', JSON.stringify(images));
      return json({ image: newImg });
    }

    if (url.match(/\/api\/studio\/images\/[^/]+/) && method === 'DELETE') {
      deleteById<MockStudioImage>('mock_studio_images');
      return json({ success: true });
    }

    // 9. LLM Chat
    if (url.includes('/api/llm/chat') && method === 'POST') {
      return json({ text: '요청하신 커리어 조언 생성을 마쳤습니다. 이력서를 구체적인 수치와 성과 중심으로 작성하시고, ATS 키워드를 최적화하세요.', reply: '' });
    }

    // 10. Humanizer
    if (url.includes('/api/humanizer/history') && method === 'GET') {
      return json(readArray<MockHumanizerEntry>('mock_humanizer'));
    }

    if (url.includes('/api/humanizer/process') && method === 'POST') {
      const body = getBody(init);
      const originalText = body.originalText || '';
      if (!originalText.trim()) return json({ error: '변환할 문장을 입력해 주세요.' }, 400);
      const entry: MockHumanizerEntry = {
        id: `mock-hum-${Date.now()}`,
        originalText,
        humanizedText: originalText.replace(/AI/g, '').replace(/자동화/g, '체계화') + '\n\n(휴머나이저 처리 완료)',
        createdAt: new Date().toISOString(),
      };
      const history = readArray<MockHumanizerEntry>('mock_humanizer');
      history.unshift(entry);
      localStorage.setItem('mock_humanizer', JSON.stringify(history));
      return json(entry);
    }

    // 11. Chat save/get
    if (url.includes('/api/chat/save') && method === 'POST') {
      const chatId = `mock-chat-${Date.now()}`;
      return json({ url: `/r/${chatId}`, id: chatId });
    }

    return originalFetch(input, init);
  };
}
