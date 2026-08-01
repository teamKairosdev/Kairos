let documentIndex: any = null;

export function useLocalVectorSearch() {
  async function initIndex() {
    if (documentIndex) return documentIndex;

    const { LocalDocumentIndex, TransformersEmbeddings, IndexedDBStorage } = await import('vectra/browser');

    const embeddings = await TransformersEmbeddings.create({
      model: 'Xenova/all-MiniLM-L6-v2',
      device: 'auto',
    });

    const storage = new IndexedDBStorage('kairos-vector-db');

    documentIndex = new LocalDocumentIndex({
      folderPath: 'kairos-index',
      embeddings,
      storage,
    });
    return documentIndex;
  }

  async function indexDocument(id: string, text: string, metadata: Record<string, any> = {}) {
    const index = await initIndex();
    await index.upsertDocument(id, text, metadata);
  }

  async function removeDocument(id: string) {
    const index = await initIndex();
    await index.deleteDocument(id);
  }

  async function searchDocuments(query: string, topK: number = 5) {
    const index = await initIndex();
    const results = await index.queryDocuments(query, topK);
    return results;
  }

  return { indexDocument, removeDocument, searchDocuments };
}
