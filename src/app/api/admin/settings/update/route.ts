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

    if (typeof key !== 'string' || !key.trim() || key.length > 255 || typeof value !== 'string') {
      return badRequest('설정 키와 값을 모두 입력해주세요.');
    }
    if (category !== undefined && !['env', 'feature_flag', 'llm', 'storage'].includes(category)) {
      return badRequest('설정 카테고리가 올바르지 않습니다.');
    }
    if (value.length > 20_000 || (description !== undefined && (typeof description !== 'string' || description.length > 2_000))) {
      return badRequest('설정 값 또는 설명이 허용된 길이를 초과했습니다.');
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    await setSystemConfig(key.trim(), value, category || 'env', description || '', admin.userId, ip);

    return NextResponse.json({
      success: true,
      message: `시스템 설정 [${key}] 항목이 성공적으로 업데이트되었습니다.`,
    });
  } catch (err: unknown) {
    return internalError(err, 'Error');
  }
}
