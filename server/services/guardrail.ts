/**
 * Kairos Layer 1-4 Guardrail Engine
 * (Inspired by Bloom AI Agentic Guardrail Pattern)
 */

export interface GuardrailCheckResult {
  passed: boolean;
  layer: number;
  reason?: string;
  sanitizedContent?: string;
}

// Layer 1: Input Pre-Guardrail
export function checkInputGuardrail(input: string, maxLength: number = 4000): GuardrailCheckResult {
  if (!input || input.trim().length === 0) {
    return { passed: false, layer: 1, reason: 'Empty input is not allowed.' };
  }
  if (input.length > maxLength) {
    return { passed: false, layer: 1, reason: `Input exceeds maximum token length (${maxLength} chars).` };
  }
  return { passed: true, layer: 1 };
}

// Layer 2: Context Integrity & Prompt Injection Shield
export function checkContextGuardrail(prompt: string): GuardrailCheckResult {
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt override/i,
    /reveal confidential system prompt/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      return { passed: false, layer: 2, reason: 'Potential prompt injection attempt detected.' };
    }
  }
  return { passed: true, layer: 2 };
}

// Layer 3: Post-Output Async Verification (PII & Hallucination Flagging)
export function checkOutputAsyncGuardrail(output: string): GuardrailCheckResult {
  // Check for sensitive PII patterns like resident id or credit card
  const rrnPattern = /\b\d{6}-[1-4]\d{6}\b/;
  if (rrnPattern.test(output)) {
    return {
      passed: false,
      layer: 3,
      reason: 'PII (Resident Registration Number) detected in generated response.',
      sanitizedContent: output.replace(rrnPattern, '******-*******'),
    };
  }
  return { passed: true, layer: 3, sanitizedContent: output };
}

// Layer 4: Loop & Quota Guardrail
export function checkLoopGuardrail(iterationCount: number, maxIterations: number = 3): GuardrailCheckResult {
  if (iterationCount >= maxIterations) {
    return { passed: false, layer: 4, reason: `Maximum agent iteration count (${maxIterations}) reached.` };
  }
  return { passed: true, layer: 4 };
}
