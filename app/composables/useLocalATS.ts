export function useLocalATS() {
  function extractKeywords(text: string): string[] {
    const patterns = [
      /\b(JavaScript|TypeScript|Python|Java|Go|Rust|C\+\+|C#|Ruby|PHP|Swift|Kotlin)\b/gi,
      /\b(React|Vue\.?|Nuxt|Next\.?js|Angular|Svelte|Remix|Astro)\b/gi,
      /\b(Node\.?js|Express|Fastify|NestJS|FastAPI|Django|Spring|Flask)\b/gi,
      /\b(PostgreSQL|MySQL|MongoDB|Redis|DynamoDB|Cassandra|Elasticsearch|SQLite)\b/gi,
      /\b(AWS|GCP|Azure|Docker|Kubernetes|Terraform|Ansible|Jenkins|GitHub Actions)\b/gi,
      /\b(REST|GraphQL|gRPC|WebSocket|HTTP\/2)\b/gi,
      /\b(Tailwind CSS|CSS3|HTML5|Webpack|Vite|ESBuild)\b/gi,
      /\b(Git|Linux|CI\/CD|Agile|Scrum|Jira)\b/gi,
      /\b(OpenAI|Anthropic|LangChain|TensorFlow|PyTorch|Hugging Face)\b/gi,
    ];

    const keywords = new Set<string>();
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        keywords.add(match[0]);
      }
    }
    return Array.from(keywords);
  }

  function calculateLocalATS(
    resumeText: string,
    jobDescription: string
  ): {
    matchScore: number;
    foundKeywords: string[];
    missingKeywords: string[];
    keywordDensity: number;
  } {
    const jdKeywords = extractKeywords(jobDescription);
    const resumeLower = resumeText.toLowerCase();

    const foundKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const kw of jdKeywords) {
      if (resumeLower.includes(kw.toLowerCase())) {
        foundKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }

    const matchScore = jdKeywords.length > 0
      ? Math.round((foundKeywords.length / jdKeywords.length) * 100)
      : 0;

    const wordCount = resumeText.split(/\s+/).length;
    let keywordHits = 0;
    for (const kw of foundKeywords) {
      keywordHits += (resumeLower.split(kw.toLowerCase()).length - 1);
    }
    const keywordDensity = wordCount > 0
      ? parseFloat(((keywordHits / wordCount) * 100).toFixed(2))
      : 0;

    return { matchScore, foundKeywords, missingKeywords, keywordDensity };
  }

  return { extractKeywords, calculateLocalATS };
}
