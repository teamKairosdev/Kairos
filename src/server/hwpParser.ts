/**
 * HWP parser service ported from server/services/hwpParser.ts (no Nuxt APIs)
 */
import { HWPReader } from 'hwplib-js';

export interface HwpParseResult {
  text: string;
  paragraphs: string[];
  metadata: {
    title: string;
    author: string;
    pageCount: number;
  };
}

/**
 * hwplib-js의 HWPFile 타입에는 getSummary()/getPageCount()가 없다.
 * (기존 코드가 optional chaining으로 우회해 사용 중 — 없으면 undefined 반환)
 * 사용하는 메서드만 최소 인터페이스로 정의한다.
 */
interface HwpSummaryInfo {
  getTitle?(): string;
  getAuthor?(): string;
}

interface HwpParagraphLike {
  getNormalString?(): string;
}

interface HwpSectionLike {
  getParagraphs(): HwpParagraphLike[];
}

interface HwpBodyTextLike {
  getSectionList(): HwpSectionLike[];
}

interface HwpFileLike {
  getBodyText(): HwpBodyTextLike;
  getSummary?(): HwpSummaryInfo | undefined;
  getPageCount?(): number;
}

export async function parseHwp(buffer: Uint8Array): Promise<HwpParseResult> {
  try {
    const file = HWPReader.fromBytes(buffer) as unknown as HwpFileLike;
    const section = file.getBodyText().getSectionList()[0];
    const paragraphs = section.getParagraphs().map((p) => p.getNormalString?.() ?? '');
    const text = paragraphs.join('\n');

    return {
      text,
      paragraphs: paragraphs.filter(Boolean),
      metadata: {
        title: file.getSummary?.()?.getTitle?.() ?? '',
        author: file.getSummary?.()?.getAuthor?.() ?? '',
        pageCount: file.getPageCount?.() ?? 0,
      },
    };
  } catch (err) {
    console.error('[HwpParser] parse error:', err);
    throw new Error(`HWP 파싱 실패: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}
