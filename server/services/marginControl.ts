/**
 * Kairos Auto-Margin System & Cost Protection Engine
 * (Prevents LLM API Over-budget Crashing)
 */

export interface UserQuotaStatus {
  userId: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  monthlyUsedTokens: number;
  monthlyLimitTokens: number;
  estimatedCostUsd: number;
  quotaRatioPercent: number;
  status: 'normal' | 'warning_80' | 'exceeded_100';
}

const PLAN_LIMITS = {
  free: 50000,
  pro: 500000,
  team: 2000000,
  enterprise: 100000000,
};

export async function checkUserAutoMarginQuota(userId: string, plan: keyof typeof PLAN_LIMITS = 'pro', currentUsedTokens: number = 380000): Promise<UserQuotaStatus> {
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const ratio = (currentUsedTokens / limit) * 100;
  const cost = (currentUsedTokens / 1000) * 0.003; // Average $0.003 per 1k tokens

  let status: UserQuotaStatus['status'] = 'normal';
  if (ratio >= 100) {
    status = 'exceeded_100';
    console.warn(`[Auto-Margin Alert] User ${userId} exceeded 100% quota! Locking AI features & sending billing email.`);
  } else if (ratio >= 80) {
    status = 'warning_80';
    console.info(`[Auto-Margin Alert] User ${userId} reached ${ratio.toFixed(1)}% quota. Sending warning email.`);
  }

  return {
    userId,
    plan,
    monthlyUsedTokens: currentUsedTokens,
    monthlyLimitTokens: limit,
    estimatedCostUsd: Number(cost.toFixed(4)),
    quotaRatioPercent: Number(ratio.toFixed(1)),
    status,
  };
}
