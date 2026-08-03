import { afterEach, describe, expect, it } from 'vitest';
import {
  CONTEXT_PROVIDER_TYPES,
  MAX_CONTEXT_CONTENT_LENGTH,
  contentHash,
  deriveProviderStatus,
  formatFromFileName,
  officialApiConfigured,
  parseContextImport,
  redactSecretText,
  renderContextExport,
  sanitizeContextItemForStorage,
  sanitizeForExport,
  sourceReferenceHash,
  utf8ByteLength,
} from '../../src/server/contexts';

describe('Sea of Contexts server policies', () => {
  const originalNotionKey = process.env.NOTION_API_KEY;

  afterEach(() => {
    if (originalNotionKey === undefined) delete process.env.NOTION_API_KEY;
    else process.env.NOTION_API_KEY = originalNotionKey;
  });

  it('hashes normalized content and source references with SHA-256', () => {
    expect(contentHash('hello\r\nworld')).toBe(contentHash('hello\nworld'));
    expect(contentHash('hello')).toHaveLength(64);
    expect(sourceReferenceHash('file:notes.md')).toHaveLength(64);
    expect(sourceReferenceHash('file:notes.md')).not.toBe(sourceReferenceHash('file:other.md'));
  });

  it('parses JSON arrays into importable context items', () => {
    const items = parseContextImport(
      JSON.stringify([
        { title: 'First', content: 'One', sourceReference: 'source-1' },
        { title: 'Second', text: 'Two', metadata: { category: 'work' } },
      ]),
      'json',
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: 'First', content: 'One', sourceReference: 'source-1' });
    expect(items[1]).toMatchObject({ title: 'Second', content: 'Two', metadata: { category: 'work' } });
  });

  it('parses Markdown and text without pretending they are API records', () => {
    expect(parseContextImport('# Notes\n\nBody', 'markdown', 'Exported notes')[0]).toMatchObject({
      itemType: 'markdown',
      title: 'Exported notes',
      content: '# Notes\n\nBody',
    });
    expect(parseContextImport('Plain text', 'text')[0]).toMatchObject({
      itemType: 'text',
      title: null,
    });
    expect(formatFromFileName('context.md')).toBe('markdown');
    expect(formatFromFileName('context.txt')).toBe('text');
    expect(formatFromFileName('context.pdf')).toBeNull();
  });

  it('reports official API readiness without ever reporting connected', () => {
    delete process.env.NOTION_API_KEY;
    expect(officialApiConfigured('notion')).toBe(false);
    expect(deriveProviderStatus('notion', 'official_api')).toBe('not_connected');

    process.env.NOTION_API_KEY = 'server-configured-test-key';
    expect(officialApiConfigured('notion')).toBe(true);
    expect(deriveProviderStatus('notion', 'official_api')).toBe('ready');
    expect(deriveProviderStatus('notion', 'file_import')).toBe('import_only');
  });

  it('exposes only the supported official provider types', () => {
    expect(CONTEXT_PROVIDER_TYPES).toEqual(['notion', 'github', 'worknet', 'dart', 'employment24']);
    expect(CONTEXT_PROVIDER_TYPES).not.toContain('linkedin');
    expect(CONTEXT_PROVIDER_TYPES).not.toContain('samsung_notes');
    expect(CONTEXT_PROVIDER_TYPES).not.toContain('jobkorea');
  });

  it('redacts imported content and metadata before storage', () => {
    const item = sanitizeContextItemForStorage({
      itemType: 'text',
      title: 'Notes',
      content: '{"apiKey":"private-value","safe":"kept"}',
      sourceReference: 'https://example.test/?token=private-value',
      occurredAt: null,
      metadata: { apiKey: 'private-value', nested: { label: 'safe' } },
    });

    expect(item.content).not.toContain('private-value');
    expect(item.sourceReference).not.toContain('private-value');
    expect(JSON.stringify(item.metadata)).not.toContain('private-value');
    expect(item.content).toContain('[REDACTED]');
  });

  it('limits imported text by UTF-8 bytes rather than JavaScript character count', () => {
    const oversized = '가'.repeat(Math.floor(MAX_CONTEXT_CONTENT_LENGTH / 3) + 1);
    expect(utf8ByteLength(oversized)).toBeGreaterThan(MAX_CONTEXT_CONTENT_LENGTH);
    expect(() => parseContextImport(oversized, 'text')).toThrow('허용된 크기');
  });

  it('removes secret fields and secret-looking values from exports', () => {
    const metadata = sanitizeForExport({
      source: 'manual',
      apiKey: 'do-not-export',
      nested: { access_token: 'also-private', label: 'safe' },
    }) as Record<string, unknown>;
    const redacted = redactSecretText('Authorization: Bearer very-secret-token\npassword=hidden');
    expect(JSON.stringify(metadata)).not.toContain('do-not-export');
    expect(JSON.stringify(metadata)).not.toContain('also-private');
    expect(redacted).not.toContain('very-secret-token');
    expect(redacted).not.toContain('hidden');
  });

  it('renders both export formats with ownership scope and no secrets', () => {
    const item = {
      id: 'item-1',
      providerType: 'notion',
      providerDisplayName: 'Notion',
      itemType: 'text',
      title: 'Work note',
      content: 'Useful note\napiKey: private-value',
      contentHash: contentHash('Useful note\napiKey: private-value'),
      sourceReferenceHash: sourceReferenceHash('manual:item-1'),
      metadata: { apiKey: 'private-value', tag: 'career' },
      occurredAt: null,
      importedAt: '2026-08-03T00:00:00.000Z',
      updatedAt: '2026-08-03T00:00:00.000Z',
    };
    const json = renderContextExport('json', [item], new Date('2026-08-03T00:00:00.000Z'));
    const markdown = renderContextExport('markdown', [item], new Date('2026-08-03T00:00:00.000Z'));

    expect(json).toContain('authenticated-user-owned-context-only');
    expect(markdown).toContain('Consent scope: user-selected context items');
    expect(json).not.toContain('private-value');
    expect(markdown).not.toContain('private-value');
  });
});
