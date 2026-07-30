import { getDb } from '../../db';
import { systemSettings, auditLogs } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface SystemConfigItem {
  key: string;
  value: string;
  category: 'env' | 'feature_flag' | 'llm' | 'storage';
  description?: string;
  isEncrypted?: boolean;
}

// Memory cache for hyper-fast config retrieval
const configCache = new Map<string, string>();

/** 모든 시스템 설정 및 환경변수 매칭 항목 조회 */
export async function getAllSystemConfigs(): Promise<SystemConfigItem[]> {
  try {
    const db = getDb();
    if (!db) return getDefaultConfigs();

    const dbSettings = await db.select().from(systemSettings);
    const result: SystemConfigItem[] = dbSettings.map((s) => ({
      key: s.key,
      value: s.isEncrypted ? '••••••••' : s.value,
      category: s.category as SystemConfigItem['category'],
      description: s.description || '',
      isEncrypted: s.isEncrypted,
    }));

    // Update cache
    for (const s of dbSettings) {
      configCache.set(s.key, s.value);
    }

    return result;
  } catch {
    return getDefaultConfigs();
  }
}

/** 단일 시스템 설정/환경변수 가져오기 (DB > process.env > Default 순) */
export async function getSystemConfig(key: string, defaultValue: string = ''): Promise<string> {
  if (configCache.has(key)) {
    return configCache.get(key)!;
  }

  try {
    const db = getDb();
    if (db) {
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      if (setting && setting.value) {
        configCache.set(key, setting.value);
        return setting.value;
      }
    }
  } catch {}

  const envValue = process.env[key] || defaultValue;
  if (envValue) configCache.set(key, envValue);
  return envValue;
}

/** 시스템 설정 및 환경변수 대시보드에서 동적 저장/업데이트 */
export async function setSystemConfig(
  key: string,
  value: string,
  category: SystemConfigItem['category'] = 'env',
  description?: string,
  updatedByUserId?: string,
  ipAddress?: string
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('DB 연결 실패');

  const isEncrypted = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD');

  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));

  if (existing) {
    await db
      .update(systemSettings)
      .set({
        value,
        category,
        description: description || existing.description,
        isEncrypted,
        updatedBy: updatedByUserId || null,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({
      key,
      value,
      category,
      description: description || '',
      isEncrypted,
      updatedBy: updatedByUserId || null,
    });
  }

  // Update memory cache
  configCache.set(key, value);

  // Record audit log
  try {
    await db.insert(auditLogs).values({
      userId: updatedByUserId || null,
      action: `UPDATE_SETTING_${key}`,
      category: 'ADMIN_CONFIG',
      details: { key, category, isEncrypted },
      ipAddress: ipAddress || '127.0.0.1',
    });
  } catch {}
}

function getDefaultConfigs(): SystemConfigItem[] {
  return [
    { key: 'GOOGLE_GENERATIVE_AI_API_KEY', value: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '', category: 'llm', description: 'Google Gemini API Key', isEncrypted: true },
    { key: 'VERCEL_AI_GATEWAY_URL', value: process.env.VERCEL_AI_GATEWAY_URL || '', category: 'llm', description: 'Vercel AI Gateway Base URL', isEncrypted: false },
    { key: 'VERCEL_AI_GATEWAY_KEY', value: process.env.VERCEL_AI_GATEWAY_KEY || '', category: 'llm', description: 'Vercel AI Gateway API Key', isEncrypted: true },
    { key: 'BLOB_READ_WRITE_TOKEN', value: process.env.BLOB_READ_WRITE_TOKEN || '', category: 'storage', description: 'Vercel Blob Storage Token', isEncrypted: true },
    { key: 'FEATURE_MOCK_INTERVIEW', value: 'true', category: 'feature_flag', description: 'AI 모의면접 기능 활성화 여부' },
    { key: 'FEATURE_ATS_ANALYSIS', value: 'true', category: 'feature_flag', description: 'ATS 분석 기능 활성화 여부' },
    { key: 'FEATURE_MAINTENANCE_MODE', value: 'false', category: 'feature_flag', description: '사이트 점검 모드 활성화 여부' },
  ];
}
