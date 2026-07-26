import mammoth from 'mammoth';

export async function parseDocumentText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const fileExt = fileName.split('.').pop()?.toLowerCase();

  if (mimeType.includes('wordprocessingml') || mimeType.includes('docx') || fileExt === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (mimeType.includes('pdf') || fileExt === 'pdf') {
    try {
      // Dynamic import pdfjs-dist for Node server environment
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDocument = await loadingTask.promise;
      
      let textContent = '';
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const tokenContent = await page.getTextContent();
        const pageText = tokenContent.items
          .map((item: any) => item.str)
          .join(' ');
        textContent += pageText + '\n';
      }
      return textContent.trim();
    } catch (err) {
      console.warn('pdfjs extraction notice, extracting printable ASCII fallback:', err);
      // Clean fallback text extraction for standard PDF stream contents
      const rawString = buffer.toString('utf-8');
      const cleaned = rawString.replace(/[^\x20-\x7E\x0A\x0D\uAC00-\uD7A3]/g, ' ').replace(/\s+/g, ' ');
      return cleaned.slice(0, 5000).trim();
    }
  }

  // Plain text fallback
  return buffer.toString('utf-8').trim();
}
