function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(value: string): string {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, rawHref: string) => {
    const href = /^https?:\/\//i.test(rawHref) ? rawHref : '#';
    return `<a href="${escapeHtml(href)}" rel="noreferrer noopener">${label}</a>`;
  });
  return html;
}

/** Render the supported Markdown subset and fail closed for malformed fences. */
export function renderMarkdown(markdown: string): string {
  if (typeof markdown !== 'string' || markdown.length > 500_000) {
    throw new Error('Markdown 입력을 렌더링할 수 없습니다.');
  }
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? 'ol' : 'ul';
    output.push(`<${tag}>${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${tag}>`);
    list = null;
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      flushParagraph();
      flushList();
      if (code) {
        output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      } else {
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const item = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (item) {
      flushParagraph();
      const ordered = /^\d/.test(item[1]);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item[2]);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      flushList();
      output.push(`<blockquote>${inlineMarkdown(line.replace(/^\s*>\s?/, ''))}</blockquote>`);
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }

  if (code) throw new Error('닫히지 않은 Markdown 코드 블록입니다.');
  flushParagraph();
  flushList();
  if (!output.length) throw new Error('렌더링할 Markdown 결과가 없습니다.');
  return output.join('');
}
