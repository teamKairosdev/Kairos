import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export function useDocumentParser() {
  async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text.trim();
  }

  async function parseDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  async function parseResumeFile(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return parsePDF(arrayBuffer);
    }

    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      return parseDOCX(arrayBuffer);
    }

    return new TextDecoder().decode(arrayBuffer);
  }

  return { parsePDF, parseDOCX, parseResumeFile };
}
