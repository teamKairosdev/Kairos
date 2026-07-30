import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export default buildConfig({
  admin: {
    user: 'users',
    meta: {
      titleSuffix: '- Kairos Admin Dashboard',
    },
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      labels: {
        singular: '사용자',
        plural: '사용자 관리',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: '이름',
        },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: '최고 관리자 (Admin)', value: 'admin' },
            { label: '매니저 (Manager)', value: 'manager' },
            { label: '일반 회원 (User)', value: 'user' },
          ],
          defaultValue: 'user',
          required: true,
          label: '권한 계층',
        },
        {
          name: 'mfaEnabled',
          type: 'checkbox',
          defaultValue: false,
          label: 'MFA 2단계 인증 활성화 여부',
        },
        {
          name: 'googleId',
          type: 'text',
          label: 'Google OAuth ID',
        },
        {
          name: 'walletAddress',
          type: 'text',
          label: 'Web3 지갑 주소',
        },
      ],
    },
    {
      slug: 'system-settings',
      labels: {
        singular: '시스템 환경변수 설정',
        plural: '환경변수 & 백엔드 제어 대시보드',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          label: '환경변수/설정 키 (e.g. GOOGLE_GENERATIVE_AI_API_KEY)',
        },
        {
          name: 'value',
          type: 'textarea',
          required: true,
          label: '설정 값 (Value)',
        },
        {
          name: 'category',
          type: 'select',
          options: [
            { label: '환경변수 (Env)', value: 'env' },
            { label: 'LLM & AI 설정', value: 'llm' },
            { label: '스토리지 (Storage)', value: 'storage' },
            { label: '기능 스위치 (Feature Flag)', value: 'feature_flag' },
          ],
          defaultValue: 'env',
          label: '분류 카테고리',
        },
        {
          name: 'description',
          type: 'text',
          label: '설정 항목 설명',
        },
        {
          name: 'isEncrypted',
          type: 'checkbox',
          defaultValue: false,
          label: '마스킹/암호화 항목 여부',
        },
      ],
    },
    {
      slug: 'audit-logs',
      labels: {
        singular: '감사 로그',
        plural: '백엔드 작업 감사 로그',
      },
      fields: [
        {
          name: 'action',
          type: 'text',
          required: true,
          label: '수행 작업',
        },
        {
          name: 'category',
          type: 'text',
          required: true,
          label: '카테고리',
        },
        {
          name: 'details',
          type: 'json',
          label: '상세 내역',
        },
        {
          name: 'ipAddress',
          type: 'text',
          label: 'IP 주소',
        },
      ],
    },
    {
      slug: 'resumes',
      labels: {
        singular: '이력서 데이터',
        plural: '이력서 관리',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: '이력서 제목',
        },
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: '소유 유저',
        },
        {
          name: 'status',
          type: 'select',
          options: ['draft', 'evaluating', 'improved'],
          defaultValue: 'draft',
          label: '진행 상태',
        },
        {
          name: 'originalContent',
          type: 'textarea',
          label: '원본 텍스트',
        },
        {
          name: 'currentScore',
          type: 'number',
          label: 'AI 점수',
        },
      ],
    },
    {
      slug: 'careers',
      labels: {
        singular: '경력 지식베이스',
        plural: '경력 관리',
      },
      fields: [
        {
          name: 'company',
          type: 'text',
          required: true,
          label: '회사명',
        },
        {
          name: 'role',
          type: 'text',
          required: true,
          label: '직무',
        },
        {
          name: 'period',
          type: 'text',
          label: '근무 기간',
        },
        {
          name: 'description',
          type: 'textarea',
          label: '수행 업무',
        },
      ],
    },
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || 'kairos-payload-admin-secret-2026',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URL || process.env.DATABASE_URL || '',
    },
  }),
});
