interface ATSBreakdown {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  keywordDensityScore: number;
}

export interface ATSAnalysisResult {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  detailedBreakdown: ATSBreakdown;
}

const SKILL_TAXONOMY: Record<string, { category: string; aliases: string[] }> = {
  // Frontend
  'react': { category: 'frontend', aliases: ['react.js', 'reactjs', 'react js'] },
  'vue': { category: 'frontend', aliases: ['vue.js', 'vuejs', 'vue js', 'nuxt', 'nuxt.js', 'nuxtjs'] },
  'angular': { category: 'frontend', aliases: ['angular.js', 'angularjs', 'angular 2'] },
  'typescript': { category: 'frontend', aliases: ['ts', 'type script'] },
  'javascript': { category: 'frontend', aliases: ['js', 'ecmascript', 'es6', 'es2015'] },
  'nextjs': { category: 'frontend', aliases: ['next.js', 'next', 'next js'] },
  'html': { category: 'frontend', aliases: ['html5'] },
  'css': { category: 'frontend', aliases: ['css3', 'scss', 'sass', 'less', 'tailwind', 'tailwindcss'] },
  'webpack': { category: 'frontend', aliases: ['vite', 'rollup', 'esbuild', 'bundler'] },
  'redux': { category: 'frontend', aliases: ['redux.js', 'redux toolkit', 'rtk'] },
  'graphql': { category: 'frontend', aliases: ['apollo', 'relay', 'gql'] },
  'webgl': { category: 'frontend', aliases: ['three.js', 'threejs', 'babylon'] },
  'pwa': { category: 'frontend', aliases: ['progressive web app', 'service worker', 'workbox'] },
  'responsive': { category: 'frontend', aliases: ['responsive design', 'mobile first', 'adaptive'] },

  // Backend
  'node.js': { category: 'backend', aliases: ['node', 'nodejs', 'express', 'express.js', 'nestjs', 'nest'] },
  'python': { category: 'backend', aliases: ['django', 'flask', 'fastapi', 'python3'] },
  'java': { category: 'backend', aliases: ['spring', 'spring boot', 'jvm', 'kotlin'] },
  'go': { category: 'backend', aliases: ['golang'] },
  'rust': { category: 'backend', aliases: ['cargo'] },
  'graphql-api': { category: 'backend', aliases: ['graphql api', 'gql'] },
  'rest': { category: 'backend', aliases: ['rest api', 'restful', 'restapi'] },
  'grpc': { category: 'backend', aliases: ['protobuf', 'protocol buffers'] },
  'microservices': { category: 'backend', aliases: ['micro service', 'msa', 'service mesh'] },
  'message queue': { category: 'backend', aliases: ['kafka', 'rabbitmq', 'pub/sub', 'sqs', 'event bus'] },

  // Database
  'postgresql': { category: 'database', aliases: ['postgres', 'pgsql', 'pgvector'] },
  'mysql': { category: 'database', aliases: ['mariadb'] },
  'mongodb': { category: 'database', aliases: ['mongo', 'nosql', 'document db'] },
  'redis': { category: 'database', aliases: ['redis cache', 'valkey'] },
  'elasticsearch': { category: 'database', aliases: ['es', 'elastic', 'opensearch'] },
  'dynamodb': { category: 'database', aliases: ['dynamo'] },
  'oracle': { category: 'database', aliases: ['oracle db'] },
  'sqlite': { category: 'database', aliases: ['sqlite3'] },
  'prisma': { category: 'database', aliases: ['prisma orm', 'prisma.io'] },
  'drizzle': { category: 'database', aliases: ['drizzle orm'] },
  'typeorm': { category: 'database', aliases: ['type orm'] },

  // DevOps & Cloud
  'docker': { category: 'devops', aliases: ['container', 'docker compose', 'dockerfile'] },
  'kubernetes': { category: 'devops', aliases: ['k8s', 'eks', 'aks', 'gke', 'container orchestration'] },
  'aws': { category: 'devops', aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks'] },
  'gcp': { category: 'devops', aliases: ['google cloud', 'gcs', 'cloud run', 'cloud functions'] },
  'azure': { category: 'devops', aliases: ['microsoft azure', 'az'] },
  'terraform': { category: 'devops', aliases: ['iac', 'infrastructure as code', 'pulumi'] },
  'ansible': { category: 'devops', aliases: ['configuration management'] },
  'jenkins': { category: 'devops', aliases: ['ci/cd', 'github actions', 'gitlab ci', 'circleci', 'argocd'] },
  'monitoring': { category: 'devops', aliases: ['prometheus', 'grafana', 'datadog', 'sentry', 'new relic'] },
  'nginx': { category: 'devops', aliases: ['apache', 'caddy', 'reverse proxy', 'load balancer'] },
  'linux': { category: 'devops', aliases: ['unix', 'bash', 'shell', 'ubuntu', 'centos'] },

  // AI & ML
  'machine learning': { category: 'aiml', aliases: ['ml', 'deep learning', 'neural network'] },
  'tensorflow': { category: 'aiml', aliases: ['tf', 'keras'] },
  'pytorch': { category: 'aiml', aliases: ['torch'] },
  'llm': { category: 'aiml', aliases: ['large language model', 'gpt', 'claude', 'gemini', 'ai sdk'] },
  'rag': { category: 'aiml', aliases: ['retrieval augmented generation', 'vector search', 'semantic search'] },
  'langchain': { category: 'aiml', aliases: ['lang chain', 'llamaindex'] },
  'embedding': { category: 'aiml', aliases: ['vector embedding', 'text embedding', 'openai embedding'] },
  'nlp': { category: 'aiml', aliases: ['natural language processing', 'text mining'] },
  'chatbot': { category: 'aiml', aliases: ['conversational ai', 'ai assistant', 'agent'] },
  'recommendation': { category: 'aiml', aliases: ['recommender', 'recommendation system', 'collaborative filtering'] },

  // Mobile
  'react native': { category: 'mobile', aliases: ['reactnative', 'rn'] },
  'flutter': { category: 'mobile', aliases: ['dart', 'flutter sdk'] },
  'ios': { category: 'mobile', aliases: ['swift', 'objective-c', 'xcode', 'swiftui'] },
  'android': { category: 'mobile', aliases: ['kotlin', 'android studio', 'jetpack'] },

  // Tools & Methodology
  'git': { category: 'tools', aliases: ['github', 'gitlab', 'bitbucket', 'version control'] },
  'agile': { category: 'tools', aliases: ['scrum', 'sprint', 'jira', 'confluence', 'kanban'] },
  'testing': { category: 'tools', aliases: ['jest', 'vitest', 'pytest', 'junit', 'cypress', 'playwright'] },
  'tdd': { category: 'tools', aliases: ['test driven', 'unit test', 'integration test'] },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s#.+/-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTokens(text: string): Set<string> {
  const normalized = normalize(text);
  const words = normalized.split(' ');
  const tokens = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    tokens.add(words[i]);
    if (i + 1 < words.length) tokens.add(`${words[i]} ${words[i + 1]}`);
  }

  for (const [canonical, entry] of Object.entries(SKILL_TAXONOMY)) {
    const normalizedCanonical = normalize(canonical);
    const allForms = [normalizedCanonical, ...entry.aliases.map(normalize)];
    for (const form of allForms) {
      if (normalized.includes(form)) {
        tokens.add(normalizedCanonical);
        break;
      }
    }
  }

  return tokens;
}

function detectSkills(text: string): Map<string, number> {
  const normalized = normalize(text);
  const skills = new Map<string, number>();

  for (const [canonical, entry] of Object.entries(SKILL_TAXONOMY)) {
    const normalizedCanonical = normalize(canonical);
    const allForms = [normalizedCanonical, ...entry.aliases.map(normalize)];
    let count = 0;
    for (const form of allForms) {
      let pos = 0;
      while (true) {
        const idx = normalized.indexOf(form, pos);
        if (idx === -1) break;
        count++;
        pos = idx + form.length;
      }
    }
    if (count > 0) {
      skills.set(canonical, count);
    }
  }

  return skills;
}

function detectSection(text: string, patterns: RegExp[]): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) return trimmed;
    }
  }
  return '';
}

function extractEducationLevel(text: string): number {
  const normalized = normalize(text);
  const hasBachelors = /\b(bachelor|학사|b\.s|b\.a)\b/.test(normalized);
  const hasMasters = /\b(master|석사|m\.s|m\.a|msc)\b/.test(normalized);
  const hasPhd = /\b(phd|doctor|박사)\b/.test(normalized);
  if (hasPhd) return 3;
  if (hasMasters) return 2;
  if (hasBachelors) return 1;
  return 0;
}

function extractYearsOfExperience(text: string): number {
  const normalized = normalize(text);
  const patterns = [
    /(\d+)[+]?\s*(?:years?|yrs?|년)\s*(?:of\s+)?experience/i,
    /experience\s*(?:of\s+)?(\d+)[+]?\s*(?:years?|yrs?|년)/i,
  ];
  for (const pat of patterns) {
    const match = normalized.match(pat);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function generateRecommendations(
  missingKeywords: string[],
  foundKeywords: string[],
  hasExperience: boolean,
  hasEducation: boolean,
): string[] {
  const recs: string[] = [];
  const missingCategories = new Map<string, string[]>();

  for (const kw of missingKeywords) {
    const entry = SKILL_TAXONOMY[kw];
    if (entry) {
      const existing = missingCategories.get(entry.category) || [];
      existing.push(kw);
      missingCategories.set(entry.category, existing);
    }
  }

  if (missingCategories.has('frontend')) {
    recs.push(`프론트엔드 기술 스택 (${missingCategories.get('frontend')?.join(', ')})을 이력서에 명시적으로 추가하세요.`);
  }
  if (missingCategories.has('backend')) {
    recs.push(`백엔드 프레임워크 및 언어 경험 (${missingCategories.get('backend')?.join(', ')})을 구체적인 프로젝트와 함께 기술하세요.`);
  }
  if (missingCategories.has('database')) {
    recs.push(`데이터베이스 경험 (${missingCategories.get('database')?.join(', ')})을 추가하면 ATS 통과율이 향상됩니다.`);
  }
  if (missingCategories.has('devops')) {
    recs.push(`DevOps 및 클라우드 기술 (${missingCategories.get('devops')?.join(', ')})을 수치와 함께 기재하세요.`);
  }
  if (missingCategories.has('aiml')) {
    recs.push(`AI/ML 관련 키워드 (${missingCategories.get('aiml')?.join(', ')})를 프로젝트 경험에 포함시키세요.`);
  }

  if (!hasExperience) {
    recs.push('경력 사항 섹션이 감지되지 않았습니다. 근무 기간과 주요 성과를 STAR 형식으로 추가하세요.');
  }
  if (!hasEducation) {
    recs.push('학력 섹션이 감지되지 않았습니다. 최종 학력, 전공, 졸업 연도를 포함하세요.');
  }
  if (foundKeywords.length < 5) {
    recs.push('JD 핵심 키워드 매칭이 낮습니다. 채용 공고의 필수 역량을 중심으로 이력서를 재구성하세요.');
  }
  if (recs.length === 0) {
    recs.push('ATS 매칭 점수가 양호합니다. 성과 수치를 구체적으로 기재하면 더 높은 점수를 받을 수 있습니다.');
  }

  return recs;
}

export function analyzeATSCompatibility(resumeText: string, jobDescription: string): ATSAnalysisResult {
  const jdSkills = detectSkills(jobDescription);
  const resumeSkills = detectSkills(resumeText);

  const jdTokens = extractTokens(jobDescription);
  const resumeTokens = extractTokens(resumeText);

  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const [skill] of jdSkills) {
    if (resumeSkills.has(skill)) {
      foundKeywords.push(skill);
    } else {
      missingKeywords.push(skill);
    }
  }

  const jdSkillCount = jdSkills.size;
  const matchedCount = foundKeywords.length;
  const keywordMatchRate = jdSkillCount > 0 ? matchedCount / jdSkillCount : 0;

  // Category-weighted calculation
  const categoryWeights: Record<string, number> = {
    frontend: 25, backend: 25, database: 15, devops: 15, aiml: 10, mobile: 5, tools: 5,
  };
  let weightedScore = 0;
  let totalWeight = 0;
  const categoryHits = new Map<string, { matched: number; total: number }>();

  for (const [canonical, entry] of Object.entries(SKILL_TAXONOMY)) {
    if (!jdSkills.has(canonical)) continue;
    const cat = entry.category;
    const hit = categoryHits.get(cat) || { matched: 0, total: 0 };
    hit.total++;
    if (resumeSkills.has(canonical)) hit.matched++;
    categoryHits.set(cat, hit);
  }

  for (const [cat, hits] of categoryHits) {
    const weight = categoryWeights[cat] || 10;
    const rate = hits.total > 0 ? hits.matched / hits.total : 0;
    weightedScore += rate * weight;
    totalWeight += weight;
  }

  const skillsScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  const jdYears = extractYearsOfExperience(jobDescription);
  const resumeYears = extractYearsOfExperience(resumeText);
  const experienceScore = jdYears > 0 ? Math.min(100, Math.round((resumeYears / jdYears) * 100)) : 70;

  const hasEducation = extractEducationLevel(resumeText) > 0;
  const jdEducation = extractEducationLevel(jobDescription);
  const educationScore = jdEducation > 0 ? (hasEducation ? 90 : 30) : 70;

  const keywordDensityScore = Math.min(100, Math.round(keywordMatchRate * 100));

  const rawScore = Math.round(skillsScore * 0.4 + experienceScore * 0.3 + educationScore * 0.15 + keywordDensityScore * 0.15);
  const matchScore = Math.min(100, Math.max(0, rawScore));

  const recommendations = generateRecommendations(missingKeywords, foundKeywords, resumeYears > 0, hasEducation);

  return {
    matchScore,
    foundKeywords,
    missingKeywords,
    recommendations,
    detailedBreakdown: { skillsScore, experienceScore, educationScore, keywordDensityScore },
  };
}
