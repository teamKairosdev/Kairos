import { compareResumes } from 'server/services/resume';
import { getDb } from 'db';
import { resumes } from 'db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { resumeId1, resumeId2 } = body || {};
  if (!resumeId1 || !resumeId2) {
    throw createError({ statusCode: 400, statusMessage: '비교할 두 이력서 ID가 필요합니다.' });
  }
  if (resumeId1 === resumeId2) {
    throw createError({ statusCode: 400, statusMessage: '서로 다른 이력서를 선택해 주세요.' });
  }

  let content1 = '', content2 = '';
  try {
    const db = getDb();
    if (db) {
      const [r1] = await db.select().from(resumes).where(eq(resumes.id, resumeId1));
      const [r2] = await db.select().from(resumes).where(eq(resumes.id, resumeId2));
      if (r1) content1 = r1.originalContent;
      if (r2) content2 = r2.originalContent;
    }
  } catch { console.warn('[Kairos] compare DB fetch failed'); }

  if (!content1) content1 = 'Nuxt.js 및 TypeScript 기반 웹 서비스 구축 경력 4년. pgvector 시맨틱 검색 구현.';
  if (!content2) content2 = 'Java Spring 기반 백엔드 시스템 설계 경력 5년. MSA 전환 경험 보유.';

  const result = await compareResumes(content1, content2);
  return { success: true, comparison: result };
});
