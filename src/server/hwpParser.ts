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

export async function parseHwp(buffer: Uint8Array): Promise<HwpParseResult> {
  try {
    const file = HWPReader.fromBytes(buffer) as any;
    const section = file.getBodyText().getSectionList()[0];
    const paragraphs = section
      .getParagraphs()
      .map((p: any) => p.getNormalString?.() ?? '');
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

export function isHwpFile(filename: string): boolean {
  return /\.hwp$/i.test(filename);
}

export function isHwpxFile(filename: string): boolean {
  return /\.hwpx$/i.test(filename);
}
