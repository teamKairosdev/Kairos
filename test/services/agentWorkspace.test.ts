import { describe, expect, it } from 'vitest';
import {
  executeLocalTask,
  hashContent,
  isSupportedRunType,
  normalizeRunType,
} from '../../src/server/agentWorkspace';
import { MAX_MARKDOWN_RETRIES } from '../../src/app/(authenticated)/workspace/MarkdownResult';
import { renderMarkdown } from '../../src/app/(authenticated)/workspace/markdown';

describe('Deep Agent Canvas local task engine', () => {
  it('only accepts the four safe local run types', () => {
    expect(isSupportedRunType('draft')).toBe(true);
    expect(isSupportedRunType('rewrite')).toBe(true);
    expect(isSupportedRunType('summarize')).toBe(true);
    expect(isSupportedRunType('diff')).toBe(true);
    expect(isSupportedRunType('shell')).toBe(false);
    expect(normalizeRunType('web-fetch')).toBeNull();
  });

  it('produces a deterministic local draft without a model call', () => {
    const result = executeLocalTask({ runType: 'draft', command: '프로젝트 소개 초안', content: '핵심 경험' });
    expect(result.content).toContain('# 프로젝트 소개 초안');
    expect(result.content).toContain('핵심 경험');
    expect(result.metadata.mode).toBe('local-template');
  });

  it('normalizes rewrite and extracts a bounded summary locally', () => {
    const rewrite = executeLocalTask({ runType: 'rewrite', command: '형식 정리', content: '* 첫 항목   \n\n\n둘째 문장' });
    expect(rewrite.content).toContain('- 첫 항목');
    expect(rewrite.content).not.toContain('\n\n\n');

    const summary = executeLocalTask({
      runType: 'summarize',
      command: '요약',
      content: '첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다. 넷째 문장입니다. 다섯째 문장입니다. 여섯째 문장입니다.',
    });
    expect(summary.content.match(/^- /gm)?.length).toBe(5);
  });

  it('returns the target content for a local line diff and rejects empty sides', () => {
    const result = executeLocalTask({
      runType: 'diff',
      command: '새 내용 적용',
      baseContent: 'old line',
      targetContent: 'new line',
    });
    expect(result.content).toBe('new line');
    expect(result.metadata.addedLines).toBe(1);
    expect(result.metadata.removedLines).toBe(1);
    expect(() => executeLocalTask({ runType: 'diff', command: '비교' })).toThrow('이전 내용과 새 내용');
  });

  it('hashes content deterministically for run and artifact audit fields', () => {
    expect(hashContent('same')).toBe(hashContent('same'));
    expect(hashContent('same')).not.toBe(hashContent('different'));
  });
});

describe('Canvas Markdown renderer', () => {
  it('renders supported Markdown as escaped HTML', () => {
    const html = renderMarkdown('# 제목\n\n- **안전한** 결과\n\n<script>alert(1)</script>');
    expect(html).toContain('<h1>제목</h1>');
    expect(html).toContain('<strong>안전한</strong>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('fails closed for an unclosed code fence so the UI can retry', () => {
    expect(() => renderMarkdown('```ts\nconst value = 1;')).toThrow();
    expect(MAX_MARKDOWN_RETRIES).toBe(3);
  });
});
