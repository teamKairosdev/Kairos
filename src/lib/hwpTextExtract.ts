let coreInitPromise: Promise<unknown> | null = null;

function ensureCoreInit() {
  if (!coreInitPromise) {
    if (typeof globalThis !== 'undefined') {
      (globalThis as Record<string, unknown>).measureTextWidth = (font: string, text: string) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return 0;
        ctx.font = font;
        return ctx.measureText(text).width;
      };
    }
    coreInitPromise = import('@rhwp/core').then((m) => m.default({ module_or_path: '/rhwp_bg.wasm' }));
  }
  return coreInitPromise;
}

export async function extractHwpText(bytes: Uint8Array): Promise<string> {
  await ensureCoreInit();
  const { HwpDocument } = await import('@rhwp/core');
  const doc = new HwpDocument(bytes);
  const parts: string[] = [];
  const sectionCount = doc.getSectionCount();
  for (let s = 0; s < sectionCount; s++) {
    const paragraphCount = doc.getParagraphCount(s);
    for (let p = 0; p < paragraphCount; p++) {
      const len = doc.getParagraphLength(s, p);
      if (len > 0) {
        parts.push(doc.getTextRange(s, p, 0, len));
      }
    }
  }
  return parts.join('\n').trim();
}
