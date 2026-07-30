import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export default buildConfig({
  admin: {
    user: 'users',
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'User', value: 'user' },
            { label: 'Recruiter', value: 'recruiter' },
          ],
          defaultValue: 'user',
          required: true,
        },
        {
          name: 'walletAddress',
          type: 'text',
        },
      ],
    },
    {
      slug: 'resumes',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: ['draft', 'evaluating', 'improved'],
          defaultValue: 'draft',
        },
        {
          name: 'originalContent',
          type: 'textarea',
        },
        {
          name: 'currentScore',
          type: 'number',
        },
      ],
    },
    {
      slug: 'careers',
      fields: [
        {
          name: 'company',
          type: 'text',
          required: true,
        },
        {
          name: 'role',
          type: 'text',
          required: true,
        },
        {
          name: 'period',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
      ],
    },
    {
      slug: 'company-meta',
      fields: [
        {
          name: 'companyName',
          type: 'text',
          required: true,
        },
        {
          name: 'industry',
          type: 'text',
        },
        {
          name: 'wlbScore',
          type: 'number',
        },
        {
          name: 'cultureScore',
          type: 'number',
        },
        {
          name: 'salaryScore',
          type: 'number',
        },
        {
          name: 'prosSummary',
          type: 'textarea',
        },
        {
          name: 'consSummary',
          type: 'textarea',
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
