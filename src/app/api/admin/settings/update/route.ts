import { NextRequest, NextResponse } from 'next/server';
import { setSystemConfig } from '@/server/systemConfig';
import { badRequest, internalError } from '@/server/http';
import { requireAdmin } from '@/server/admin';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const { key, value, category, description } = body || {};

    if (!key || value === undefined) {
      return badRequest('설정 키와 값을 모두 입력해주세요.');
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    await setSystemConfig(key, value, category || 'env', description || '', admin.userId, ip);

    return NextResponse.json({
      success: true,
      message: `시스템 설정 [${key}] 항목이 성공적으로 업데이트되었습니다.`,
    });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
