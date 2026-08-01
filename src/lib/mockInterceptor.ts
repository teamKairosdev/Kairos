/**
 * Mock interceptor ported from app/plugins/mock-interceptor.client.ts
 * Patches global fetch when is_mock_mode is set in localStorage.
 * Call initMockInterceptor() in a client-side useEffect.
 */
import { getSimulatedLLMResponse } from '../data/mock/mockup';

const randomScore = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function initMockInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const isMock = localStorage.getItem('is_mock_mode') === 'true';
    if (!isMock) return originalFetch(input, init);

    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method?.toUpperCase() || (input instanceof Request ? input.method?.toUpperCase() : 'GET') || 'GET';

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    // 1. Auth check
    if (url.endsWith('/api/auth/me') || url.includes('/api/auth/me')) {
      const storedUser = localStorage.getItem('mock_user');
      return json({ user: storedUser ? JSON.parse(storedUser) : null });
    }

    if (url.includes('/api/auth/login')) {
      const storedUser = localStorage.getItem('mock_user');
      return json({ user: storedUser ? JSON.parse(storedUser) : null });
    }

    // 2. Resumes Endpoints
    if (url.includes('/api/resumes') && !url.match(/\/api\/resumes\/[^/]+/) && method === 'GET') {
      const resumes = JSON.parse(localStorage.getItem('mock_resumes') || '[]');
      return json(resumes);
    }

    if (url.includes('/api/resumes') && !url.match(/\/api\/resumes\/[^/]+/) && method === 'POST') {
      const resumes = JSON.parse(localStorage.getItem('mock_resumes') || '[]');
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const newResume = {
        id: `mock-res-${Date.now()}`,
        userId: JSON.parse(localStorage.getItem('mock_user') || '{}').id || 'mock-user',
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

    if (url.match(/\/api\/resumes\/[^/]+\/refine/) && method === 'POST') {
      const resumes = JSON.parse(localStorage.getItem('mock_resumes') || '[]');
      const id = url.split('/')[4];
      const idx = resumes.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        resumes[idx].status = 'improved';
        resumes[idx].currentScore = randomScore(85, 98);
        resumes[idx].improvedContent = `# ${resumes[idx].title} | AI 고도화 버전\n\n## 핵심 성과\n- 해당 분야 실무 경험 및 핵심 기술 바탕으로 성과 지표 30% 개선\n- 주요 비즈니스 모듈 설계 및 리팩토링 주도`;
        localStorage.setItem('mock_resumes', JSON.stringify(resumes));
        return json(resumes[idx]);
      }
      return json({ error: 'Resume not found' }, 404);
    }

    if (url.match(/\/api\/resumes\/[^/]+\/chat/) && method === 'POST') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const msg = body.message || '';
      const currentContent = body.currentContent || '';
      const { responseText, suggestedContent } = getSimulatedLLMResponse(msg, currentContent);
      return json({ responseText, suggestedContent });
    }

    if (url.match(/\/api\/resumes\/[^/]+/) && method === 'PUT') {
      const resumes = JSON.parse(localStorage.getItem('mock_resumes') || '[]');
      const id = url.split('/').pop();
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const idx = resumes.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        resumes[idx] = { ...resumes[idx], ...body, updatedAt: new Date().toISOString() };
        localStorage.setItem('mock_resumes', JSON.stringify(resumes));
        return json({ success: true });
      }
      return json({ error: 'Resume not found' }, 404);
    }

    if (url.match(/\/api\/resumes\/[^/]+$/) && method === 'GET') {
      const resumes = JSON.parse(localStorage.getItem('mock_resumes') || '[]');
      const id = url.split('/').pop();
      const resume = resumes.find((r: any) => r.id === id);
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
    if (url.includes('/api/interviews') && !url.match(/\/api\/interviews\/[^/]+/) && method === 'GET') {
      return json(JSON.parse(localStorage.getItem('mock_interviews') || '[]'));
    }

    if (url.includes('/api/interviews') && !url.match(/\/api\/interviews\/[^/]+/) && method === 'POST') {
      const interviews = JSON.parse(localStorage.getItem('mock_interviews') || '[]');
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const newInt = {
        id: `mock-int-${Date.now()}`,
        userId: JSON.parse(localStorage.getItem('mock_user') || '{}').id || 'mock-user',
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
      localStorage.setItem('mock_interviews', JSON.stringify(interviews));
      const chats = JSON.parse(localStorage.getItem('mock_chats') || '{}');
      chats[newInt.id] = [{ role: 'assistant', content: `안녕하세요. ${newInt.companyName}의 ${newInt.jobTitle} 직무 면접에 지원해주셔서 감사드립니다. 먼저 준비하신 자기소개 부탁드립니다.` }];
      localStorage.setItem('mock_chats', JSON.stringify(chats));
      return json({ session: newInt });
    }

    if (url.match(/\/api\/interviews\/[^/]+$/) && method === 'GET') {
      const interviews = JSON.parse(localStorage.getItem('mock_interviews') || '[]');
      const id = url.split('/').pop();
      const interview = interviews.find((i: any) => i.id === id);
      return interview ? json(interview) : json({ error: 'Not found' }, 404);
    }

    if (url.match(/\/api\/interviews\/[^/]+\/chat/) && method === 'POST') {
      const id = url.split('/')[4];
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const userMessage = body.messages?.[body.messages.length - 1]?.content || '';

      const answers = [
        '그 부분에 대한 구현 경험은 매우 중요한 포인트네요. 실제 실무에서 발생할 수 있는 동시성 이슈는 어떻게 예방하셨는지 상세히 말씀해주세요.',
        '답변 감사드립니다. 프로젝트 협업 과정에서 다른 직무(디자이너, PM)와의 의견 조율은 보통 어떤 방식으로 진행하셨나요?',
        '흥미로운 접근이네요. 만약 해당 설계가 실서버에 배포된 후 트래픽이 10배 이상 몰린다면 어떤 보완책을 세우시겠습니까?',
        '마지막 질문입니다. 이번 채용 직무에 있어서 본인만이 가지고 있는 가장 독보적인 역량은 무엇이라고 생각하시나요?',
      ];
      const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          let index = 0;
          const interval = setInterval(() => {
            if (index < randomAnswer.length) {
              controller.enqueue(encoder.encode(`0:"${randomAnswer.slice(index, index + 3)}"\n`));
              index += 3;
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 40);
        },
      });

      const chats = JSON.parse(localStorage.getItem('mock_chats') || '{}');
      if (!chats[id]) chats[id] = [];
      chats[id].push({ role: 'user', content: userMessage });
      chats[id].push({ role: 'assistant', content: randomAnswer });
      localStorage.setItem('mock_chats', JSON.stringify(chats));

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-ai-data-stream': 'v1' } });
    }

    // 4. Careers Endpoints
    if (url.includes('/api/careers/search')) {
      const careers = JSON.parse(localStorage.getItem('mock_careers') || '[]');
      return json({ query: 'search', results: careers.map((c: any) => ({ ...c, similarity: randomScore(75, 96) / 100 })) });
    }

    if (url.includes('/api/careers') && !url.match(/\/api\/careers\/[^/]+/) && method === 'GET') {
      return json(JSON.parse(localStorage.getItem('mock_careers') || '[]'));
    }

    if (url.includes('/api/careers') && !url.match(/\/api\/careers\/[^/]+/) && method === 'POST') {
      const careers = JSON.parse(localStorage.getItem('mock_careers') || '[]');
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const newCareer = { id: `mock-car-${Date.now()}`, userId: 'mock-user', ...body, createdAt: new Date().toISOString() };
      careers.unshift(newCareer);
      localStorage.setItem('mock_careers', JSON.stringify(careers));
      return json(newCareer);
    }

    if (url.match(/\/api\/careers\/[^/]+/) && method === 'DELETE') {
      const careers = JSON.parse(localStorage.getItem('mock_careers') || '[]');
      const id = url.split('/').pop();
      localStorage.setItem('mock_careers', JSON.stringify(careers.filter((c: any) => c.id !== id)));
      return json({ success: true });
    }

    // 5. Docs Endpoints
    if (url.includes('/api/docs') && !url.match(/\/api\/docs\/[^/]+/) && method === 'GET') {
      return json(JSON.parse(localStorage.getItem('mock_docs') || '[]'));
    }

    if (url.includes('/api/docs/upload') && method === 'POST') {
      const docs = JSON.parse(localStorage.getItem('mock_docs') || '[]');
      const newDoc = { id: `mock-doc-${Date.now()}`, name: '신규_문서.pdf', ext: 'pdf', size: 102400, createdAt: new Date().toISOString() };
      docs.unshift(newDoc);
      localStorage.setItem('mock_docs', JSON.stringify(docs));
      return json(newDoc);
    }

    if (url.match(/\/api\/docs\/[^/]+/) && method === 'DELETE') {
      const docs = JSON.parse(localStorage.getItem('mock_docs') || '[]');
      const id = url.split('/').pop();
      localStorage.setItem('mock_docs', JSON.stringify(docs.filter((d: any) => d.id !== id)));
      return json({ success: true });
    }

    // 6. Q&A Generation
    if (url.includes('/api/qa/generate') && method === 'POST') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const role = body.targetRole || '개발자';
      return json({
        qaSet: {
          id: `mock-qa-${Date.now()}`,
          title: `${role} 예상 면접 질문`,
          targetRole: role,
          qaPairs: [
            { question: `${role} 직무를 수행하면서 마주한 가장 큰 기술적 도전은 무엇이었으며 이를 어떻게 극복했나요?`, sampleAnswer: '대용량 트래픽이 몰렸을 때 비동기 큐 시스템을 설계하여 병목 구간의 로드를 60% 이상 줄인 경험이 있습니다.', keyPoints: ['병목 해결', '비동기 큐', '아키텍처 개선'], difficulty: '🌱 주니어' },
            { question: '협업 시 코드 리뷰나 아키텍처에 이견이 생길 때 조율하는 기준은 무엇인가요?', sampleAnswer: '공식 기술 문서와 벤치마킹 데이터를 기준으로 정량적인 장단점을 분석하여 합의점을 도출합니다.', keyPoints: ['객관적 지표', '코드 모범 사례'], difficulty: '⚡ 미들' },
          ],
        },
      });
    }

    // 7. ATS Matching
    if (url.includes('/api/ats/analyze') && method === 'POST') {
      return json({
        analysis: {
          matchScore: randomScore(75, 96),
          missingKeywords: ['CI/CD 자동화 Pipeline 구축 경험', '대규모 분산 아키텍처 설계'],
          foundKeywords: ['TypeScript', 'Next.js', 'Spring Boot', 'TailwindCSS', 'RESTful API 설계'],
          recommendations: ['프로젝트 경험 파트에 Docker 컨테이너 오케스트레이션(Kubernetes) 사례를 상세 기술하세요.'],
          detailedBreakdown: { skillsScore: randomScore(70, 95), experienceScore: randomScore(70, 95), educationScore: randomScore(70, 95), keywordDensityScore: randomScore(70, 95) },
        },
      });
    }

    // 8. Photo Studio & Gallery
    if (url.includes('/api/studio/images') && method === 'GET') {
      return json({ images: JSON.parse(localStorage.getItem('mock_studio_images') || '[]') });
    }

    if (url.includes('/api/studio/generate') && method === 'POST') {
      const images = JSON.parse(localStorage.getItem('mock_studio_images') || '[]');
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const newImg = { id: `mock-img-${Date.now()}`, imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60', width: 1024, height: 1024, type: 'generated', prompt: body.prompt || 'Professional profile photo', createdAt: new Date().toISOString() };
      images.unshift(newImg);
      localStorage.setItem('mock_studio_images', JSON.stringify(images));
      return json({ image: newImg });
    }

    if (url.includes('/api/studio/upload') && method === 'POST') {
      const images = JSON.parse(localStorage.getItem('mock_studio_images') || '[]');
      const newImg = { id: `mock-img-${Date.now()}`, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60', width: 1024, height: 1024, type: 'uploaded', originalFileName: 'profile.jpg', createdAt: new Date().toISOString() };
      images.unshift(newImg);
      localStorage.setItem('mock_studio_images', JSON.stringify(images));
      return json({ image: newImg });
    }

    if (url.match(/\/api\/studio\/images\/[^/]+/) && method === 'DELETE') {
      const images = JSON.parse(localStorage.getItem('mock_studio_images') || '[]');
      const id = url.split('/').pop();
      localStorage.setItem('mock_studio_images', JSON.stringify(images.filter((img: any) => img.id !== id)));
      return json({ success: true });
    }

    // 9. LLM Chat
    if (url.includes('/api/llm/chat') && method === 'POST') {
      return json({ text: '요청하신 커리어 조언 생성을 마쳤습니다. 이력서를 구체적인 수치와 성과 중심으로 작성하시고, ATS 키워드를 최적화하세요.', reply: '' });
    }

    // 10. Humanizer
    if (url.includes('/api/humanizer/process') && method === 'POST') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      const text = body.text || '';
      return json({ humanizedText: text.replace(/AI/g, '').replace(/자동화/g, '체계화') + '\n\n(휴머나이저 처리 완료)' });
    }

    // 11. Chat save/get
    if (url.includes('/api/chat/save') && method === 'POST') {
      const chatId = `mock-chat-${Date.now()}`;
      return json({ url: `/r/${chatId}`, id: chatId });
    }

    return originalFetch(input, init);
  };

  // Auto-process offline queue when back online
  window.addEventListener('online', () => {
    // handled by useOfflineQueue hook
  });
}
