interface MammothLike {
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}

let mammoth: MammothLike | null = null;

async function getMammoth(): Promise<MammothLike> {
  if (!mammoth) {
    const mod = await import('mammoth');
    mammoth = (mod.default ?? mod) as unknown as MammothLike;
  }
  return mammoth;
}

export function useDocumentParser() {
  async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ') + '\n';
    }
    return text.trim();
  }

  async function parseDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
    const m = await getMammoth();
    const result = await m.extractRawText({ arrayBuffer });
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
