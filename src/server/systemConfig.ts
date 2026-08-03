/**
 * SystemConfig service ported from server/services/systemConfig.ts
 * Uses same DB imports via @/db
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getDb } from '@/db';
import { systemSettings, auditLogs } from '@/db/schema';
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
const ENCRYPTED_PREFIX = 'enc:v1:';

function encryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32) throw new Error('JWT_SECRET가 설정되지 않았거나 32자 미만입니다.');
  return createHash('sha256').update(secret, 'utf8').digest();
}

function encryptConfigValue(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptConfigValue(value: string, encrypted: boolean): string {
  // Rows written before encryption was introduced are still readable and are
  // re-encrypted the next time an administrator updates them.
  if (!encrypted || !value.startsWith(ENCRYPTED_PREFIX)) return value;
  const parts = value.slice(ENCRYPTED_PREFIX.length).split('.');
  if (parts.length !== 3) throw new Error('암호화된 시스템 설정 형식이 올바르지 않습니다.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(parts[0], 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[2], 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export async function getAllSystemConfigs(): Promise<SystemConfigItem[]> {
  try {
    const db = getDb();
    if (!db) return getDefaultConfigs();

    const dbSettings = await db.select().from(systemSettings);
    const result: SystemConfigItem[] = dbSettings.map((s) => ({
      key: s.key,
      value: s.isEncrypted ? '••••••••' : decryptConfigValue(s.value, false),
      category: s.category as SystemConfigItem['category'],
      description: s.description || '',
      isEncrypted: s.isEncrypted,
    }));

    for (const s of dbSettings) {
      configCache.set(s.key, decryptConfigValue(s.value, s.isEncrypted));
    }

    return result;
  } catch {
    return getDefaultConfigs();
  }
}

export async function getSystemConfig(key: string, defaultValue = ''): Promise<string> {
  if (configCache.has(key)) return configCache.get(key)!;

  try {
    const db = getDb();
    if (db) {
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
      if (setting?.value) {
         const value = decryptConfigValue(setting.value, setting.isEncrypted);
         configCache.set(key, value);
         return value;
      }
    }
  } catch {}

  const envValue = process.env[key] || defaultValue;
  if (envValue) configCache.set(key, envValue);
  return envValue;
}

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

  const isEncrypted =
    key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD');
  const storedValue = isEncrypted ? encryptConfigValue(value) : value;

  const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));

  if (existing) {
    await db
      .update(systemSettings)
      .set({
        value: storedValue,
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
        value: storedValue,
      category,
      description: description || '',
      isEncrypted,
      updatedBy: updatedByUserId || null,
    });
  }

  configCache.set(key, value);

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
    { key: 'GOOGLE_GENERATIVE_AI_API_KEY', value: '••••••••', category: 'llm', description: 'Google Gemini API Key', isEncrypted: true },
    { key: 'VERCEL_AI_GATEWAY_URL', value: process.env.VERCEL_AI_GATEWAY_URL || '', category: 'llm', description: 'Vercel AI Gateway Base URL', isEncrypted: false },
    { key: 'VERCEL_AI_GATEWAY_KEY', value: '••••••••', category: 'llm', description: 'Vercel AI Gateway API Key', isEncrypted: true },
    { key: 'BLOB_READ_WRITE_TOKEN', value: '••••••••', category: 'storage', description: 'Vercel Blob Storage Token', isEncrypted: true },
    { key: 'FEATURE_MOCK_INTERVIEW', value: 'true', category: 'feature_flag', description: 'AI 모의면접 기능 활성화 여부' },
    { key: 'FEATURE_ATS_ANALYSIS', value: 'true', category: 'feature_flag', description: 'ATS 분석 기능 활성화 여부' },
    { key: 'FEATURE_MAINTENANCE_MODE', value: 'false', category: 'feature_flag', description: '사이트 점검 모드 활성화 여부' },
  ];
}
