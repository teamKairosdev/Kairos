import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { memoryExportJobs } from '@/db/schema';
import { getSession } from '@/server/getSession';
import {
  isMemoryExportFormat,
  readMemoryExport,
  type MemoryExportFormat,
} from '@/server/contexts';
import { badRequest, internalError, notFound, serviceUnavailable, unauthorized } from '@/server/http';
import { buildExportContent, normalizeSelection, serializeMemoryExportJob } from '../route';

function fileResponse(content: string, format: MemoryExportFormat, jobId: string): NextResponse {
  return new NextResponse(content, {
    headers: {
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="kairos-context-export-${jobId}.${format}"`,
      'Cache-Control': 'private, no-store',
      'X-Memory-Export-Job-Id': jobId,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession(req);
    if (!session?.userId) return unauthorized();
    const { id } = await params;
    if (!id) return badRequest('memory export job ID가 필요합니다.');

    const db = getDb();
    if (!db) return serviceUnavailable('데이터베이스에 연결할 수 없습니다.');
    const rows = await db
      .select()
      .from(memoryExportJobs)
      .where(and(eq(memoryExportJobs.id, id), eq(memoryExportJobs.userId, session.userId)))
      .limit(1);
    const job = rows[0];
    if (!job) return notFound('memory export job을 찾을 수 없거나 권한이 없습니다.');
    if (req.nextUrl.searchParams.get('status') === '1') {
      return NextResponse.json({ job: serializeMemoryExportJob(job) });
    }
    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'export가 아직 다운로드 가능한 상태가 아닙니다.', status: job.status }, { status: 409 });
    }
    if (!isMemoryExportFormat(job.format)) {
      return NextResponse.json({ error: '저장된 export 형식이 올바르지 않습니다.' }, { status: 500 });
    }
    const format: MemoryExportFormat = job.format;
    const expectedOutputRef = `${job.id}.${format}`;
    let content = job.outputRef === expectedOutputRef ? readMemoryExport(job.outputRef) : null;
    if (!content) {
      const rendered = await buildExportContent(db, session.userId, normalizeSelection(job.selection), format);
      content = rendered.content;
    }
    return fileResponse(content, format, job.id);
  } catch (err: unknown) {
    return internalError(err, 'memory export를 다운로드하지 못했습니다.');
  }
}
