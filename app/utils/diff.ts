import { diffWords } from 'diff';

/**
 * 두 텍스트(이전 버전 vs 새 버전)의 차이점을 분석하여
 * 추가된 단어는 초록색, 삭제된 단어는 빨간색 줄이 그어진 HTML 문자열을 리턴합니다.
 */
export function renderDiffHtml(oldText: string, newText: string): string {
  const safeOld = oldText || '';
  const safeNew = newText || '';

  if (!safeOld && !safeNew) return '';
  if (!safeOld) {
    return `<span class="bg-green-100 text-green-800 px-1 rounded">${escapeHtml(safeNew)}</span>`;
  }
  if (!safeNew) {
    return `<span class="bg-red-100 text-red-800 line-through px-1 rounded">${escapeHtml(safeOld)}</span>`;
  }

  const diffResult = diffWords(safeOld, safeNew);
  let html = '';

  for (const part of diffResult) {
    const escapedValue = escapeHtml(part.value);

    if (part.added) {
      html += `<span class="bg-green-50 text-green-700 font-semibold px-1 rounded mx-0.5" style="background-color: #f0fdf4; color: #15803d;">${escapedValue}</span>`;
    } else if (part.removed) {
      html += `<span class="bg-red-50 text-red-700 line-through px-1 rounded mx-0.5" style="background-color: #fef2f2; color: #b91c1c; text-decoration: line-through;">${escapedValue}</span>`;
    } else {
      html += escapedValue;
    }
  }

  // 줄바꿈 보존 처리
  return html.replace(/\n/g, '<br>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
