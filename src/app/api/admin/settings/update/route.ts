import { NextRequest, NextResponse } from 'next/server';
import { setSystemConfig } from '@/server/systemConfig';
import { getSession } from '@/server/getSession';
import { badRequest, internalError } from '@/server/http';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    const body = await req.json();
    const { key, value, category, description } = body || {};

    if (!key || value === undefined) {
      return badRequest('설정 키와 값을 모두 입력해주세요.');
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    await setSystemConfig(key, value, category || 'env', description || '', session?.userId, ip);

    return NextResponse.json({
      success: true,
      message: `시스템 설정 [${key}] 항목이 성공적으로 업데이트되었습니다.`,
    });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
