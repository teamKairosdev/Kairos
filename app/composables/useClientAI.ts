import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = true;

let embeddingPipeline: any = null;
let classifierPipeline: any = null;

const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
const device = hasWebGPU ? 'webgpu' : 'wasm';

export function useClientAI() {
  async function getEmbedding(text: string): Promise<number[]> {
    if (!embeddingPipeline) {
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1',
        { device }
      );
    }
    const result = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data) as number[];
  }

  async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!embeddingPipeline) {
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1',
        { device }
      );
    }
    const results: number[][] = [];
    for (const text of texts) {
      const result = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
      results.push(Array.from(result.data) as number[]);
    }
    return results;
  }

  async function zeroShotClassify(
    text: string,
    labels: string[]
  ): Promise<{ label: string; score: number }[]> {
    if (!classifierPipeline) {
      classifierPipeline = await pipeline(
        'zero-shot-classification',
        'Xenova/nli-deberta-v3-base',
        { device }
      );
    }
    const result = await classifierPipeline(text, labels);
    return result.labels.map((l: string, i: number) => ({
      label: l,
      score: result.scores[i],
    }));
  }

  return {
    getEmbedding,
    getBatchEmbeddings,
    zeroShotClassify,
    hasWebGPU,
  };
}
