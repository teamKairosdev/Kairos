import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { toolApprovals } from '@/db/schema';
import type { ToolApprovalSnapshot } from '@/server/harness';

type SandboxDb = NonNullable<ReturnType<typeof getDb>>;

export async function findOwnedSandboxApproval(
  db: SandboxDb,
  userId: string,
  approvalId: string,
): Promise<ToolApprovalSnapshot | null> {
  const [approval] = await db
    .select()
    .from(toolApprovals)
    .where(and(eq(toolApprovals.id, approvalId), eq(toolApprovals.userId, userId)));
  return approval || null;
}
